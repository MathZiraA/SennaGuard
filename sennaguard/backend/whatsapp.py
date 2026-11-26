"""Atendimento por WhatsApp (modelo Trinity): caixa única da equipe dentro do painel.

O cliente fala do WhatsApp dele para o número da SennaGuard. Um bot de triagem de script fixo pergunta
nome e unidade e joga a conversa pro painel; 1 a 3 técnicos veem todas, o primeiro assume, pode transferir
e concluir. Os técnicos respondem só pelo painel — o número do cliente fica oculto (mostra nome + unidade).
O histórico é só-anexar (não apaga).

Integração oficial: WhatsApp Cloud API da Meta. Variáveis de ambiente (sem elas, vira no-op como o Telegram):
  WHATSAPP_TOKEN         token de acesso (Bearer) da Cloud API
  WHATSAPP_PHONE_ID      id do número (ex.: 1537740289414072)
  WHATSAPP_VERIFY_TOKEN  segredo que a Meta devolve na verificação do webhook (GET)
  WHATSAPP_APP_SECRET    (opcional) segredo do app p/ conferir a assinatura X-Hub-Signature-256
"""
import hashlib
import hmac
import json
import logging
import os
import threading
import time
import urllib.request

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

import auth
import tempo_real
from banco import coluna, db

TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
PHONE_ID = os.environ.get("WHATSAPP_PHONE_ID", "")
VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "")
APP_SECRET = os.environ.get("WHATSAPP_APP_SECRET", "")
GRAPH = os.environ.get("WHATSAPP_GRAPH", "v23.0")
JANELA_24H = 24 * 3600  # fora dela a Cloud API só deixa enviar template, não texto livre

log = logging.getLogger("sennaguard.whatsapp")
router = APIRouter()

ESTADOS = ("triagem", "fila", "atendimento", "concluida")


def ativo():
    return bool(TOKEN and PHONE_ID)


# ---------------------------------------------------------------- banco
def criar_tabelas(con):
    con.execute("""create table if not exists wa_conversas (
        id integer primary key, wa_id text unique not null, nome text, unidade text,
        estado text not null default 'triagem', triagem_passo integer not null default 0,
        responsavel integer, criado_em integer not null, atualizado_em integer not null,
        ultima_cliente_em integer, concluida_em integer)""")
    con.execute("""create table if not exists wa_mensagens (
        seq integer primary key, conversa_id integer not null, direcao text not null,
        autor_id integer, autor_nome text, texto text, wamid text, status text, em integer not null)""")


def _publica(row, nao_lidas=0):
    """Conversa como o técnico vê: sem o número de telefone (wa_id fica oculto)."""
    c = dict(row)
    c.pop("wa_id", None)
    c["nao_lidas"] = nao_lidas
    return c


def _janela_aberta(con, conversa_id):
    r = con.execute("select ultima_cliente_em from wa_conversas where id=?", (conversa_id,)).fetchone()
    return bool(r and r[0] and time.time() - r[0] < JANELA_24H)


# ---------------------------------------------------------------- Cloud API (envio)
def _em_segundo_plano(fn, *a):
    threading.Thread(target=fn, args=a, daemon=True).start()


def _post_cloud(payload: dict):
    req = urllib.request.Request(
        f"https://graph.facebook.com/{GRAPH}/{PHONE_ID}/messages",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def _gravar(con, conversa_id, direcao, texto, autor=None, wamid=None, status=None):
    seq = con.execute("select coalesce(max(seq),0) from wa_mensagens").fetchone()[0] + 1
    con.execute("""insert into wa_mensagens (seq,conversa_id,direcao,autor_id,autor_nome,texto,wamid,status,em)
                   values (?,?,?,?,?,?,?,?,?)""",
                (seq, conversa_id, direcao, autor["id"] if autor else None,
                 autor["nome"] if autor else None, texto, wamid, status, int(time.time())))
    con.execute("update wa_conversas set atualizado_em=? where id=?", (int(time.time()), conversa_id))
    return seq


def enviar_texto(conversa_id, wa_id, texto, autor=None):
    """Manda um texto pelo WhatsApp e registra na conversa. Erros não derrubam quem está no painel."""
    if not ativo():
        return
    wamid, status = None, "enviando"
    try:
        r = _post_cloud({"messaging_product": "whatsapp", "to": wa_id, "type": "text",
                         "text": {"preview_url": False, "body": texto}})
        wamid = (r.get("messages") or [{}])[0].get("id")
        status = "aceita"  # a entrega (ou falha) chega depois pelo webhook de status
    except Exception as e:
        status = "falha"
        log.warning("falha ao enviar WhatsApp para a conversa %s: %s", conversa_id, e)
    with db() as con:
        _gravar(con, conversa_id, "saida", texto, autor=autor, wamid=wamid, status=status)
    tempo_real.avisar("whatsapp")


# ---------------------------------------------------------------- bot de triagem (script fixo)
SAUDACAO = ("Olá! 👋 Aqui é o atendimento do *SennaGuard NOC*. "
            "Para encaminhar você ao time certo, me diga: qual é o seu *nome*?")
PERGUNTA_UNIDADE = "Obrigado, {nome}! E qual é a sua *unidade ou setor*?"
ENCERRA_TRIAGEM = ("Perfeito, {nome}. Já estou passando sua conversa para a nossa equipe. "
                   "Em instantes alguém te atende por aqui. ✅")
FORA_HORARIO = ("Perfeito, {nome}. Recebemos sua mensagem! Nosso horário de atendimento é de "
                "segunda a sexta, das 8h às 18h. Você já está na fila e retornaremos assim que possível. 🌙")


def _em_horario():
    t = time.localtime()
    return t.tm_wday < 5 and 8 <= t.tm_hour < 18


def _triagem(con, conversa, texto):
    """Avança o roteiro da triagem conforme o passo atual. Devolve (resposta_ao_cliente | None)."""
    cid, passo = conversa["id"], conversa["triagem_passo"]
    if passo == 0:  # primeira mensagem do cliente: cumprimenta e pede o nome
        con.execute("update wa_conversas set triagem_passo=1 where id=?", (cid,))
        return SAUDACAO
    if passo == 1:  # a mensagem é o nome
        nome = (texto or "").strip()[:80] or "cliente"
        con.execute("update wa_conversas set nome=?, triagem_passo=2 where id=?", (nome, cid))
        return PERGUNTA_UNIDADE.format(nome=nome)
    if passo == 2:  # a mensagem é a unidade: fecha a triagem e joga pra fila
        unidade = (texto or "").strip()[:80] or "não informada"
        nome = conversa["nome"] or "cliente"
        con.execute("update wa_conversas set unidade=?, estado='fila', triagem_passo=3 where id=?", (unidade, cid))
        modelo = ENCERRA_TRIAGEM if _em_horario() else FORA_HORARIO
        return modelo.format(nome=nome)
    return None  # triagem concluída: mensagens seguem direto pro painel


def _entrou_mensagem(wa_id, texto, perfil_nome):
    """Processa uma mensagem de texto que chegou do cliente."""
    with db() as con:
        row = con.execute("select * from wa_conversas where wa_id=?", (wa_id,)).fetchone()
        agora = int(time.time())
        if not row:
            cid = con.execute("""insert into wa_conversas (wa_id,estado,triagem_passo,criado_em,atualizado_em,ultima_cliente_em)
                                 values (?,?,?,?,?,?)""", (wa_id, "triagem", 0, agora, agora, agora)).lastrowid
            row = con.execute("select * from wa_conversas where id=?", (cid,)).fetchone()
        else:
            con.execute("update wa_conversas set ultima_cliente_em=? where id=?", (agora, row["id"]))
            # Cliente respondeu numa conversa concluída: reabre na fila
            if row["estado"] == "concluida":
                con.execute("update wa_conversas set estado='fila', concluida_em=null where id=?", (row["id"],))
        conversa = dict(row)
        _gravar(con, conversa["id"], "entrada", texto, autor={"id": None, "nome": conversa.get("nome") or perfil_nome})
        resposta = _triagem(con, conversa, texto) if conversa["estado"] in ("triagem",) or conversa["triagem_passo"] < 3 else None
        estado_novo = con.execute("select estado from wa_conversas where id=?", (conversa["id"],)).fetchone()[0]
    tempo_real.avisar("whatsapp")
    if resposta:  # o bot responde (registro + envio) fora da transação do banco
        _em_segundo_plano(enviar_texto, conversa["id"], wa_id, resposta)
    if estado_novo == "fila" and conversa["estado"] == "triagem":
        import telegram
        nome = conversa.get("nome") or perfil_nome or "cliente"
        telegram.para_equipe(f"💬 <b>Nova conversa no WhatsApp</b>\n{nome} entrou na fila de atendimento.",
                             tipo="chamados")


# ---------------------------------------------------------------- webhook
@router.get("/api/whatsapp/webhook")
async def verificar(request: Request):
    """Verificação do webhook pela Meta: devolve o hub.challenge se o verify_token bater."""
    p = request.query_params
    if p.get("hub.mode") == "subscribe" and p.get("hub.verify_token") == VERIFY_TOKEN and VERIFY_TOKEN:
        return Response(content=p.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(403, "Verificação inválida.")


def _assinatura_ok(corpo: bytes, cabecalho: str | None) -> bool:
    if not APP_SECRET:  # sem segredo configurado, não dá pra conferir (aceita no protótipo)
        return True
    if not cabecalho or not cabecalho.startswith("sha256="):
        return False
    esperado = hmac.new(APP_SECRET.encode(), corpo, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, cabecalho.split("=", 1)[1])


@router.post("/api/whatsapp/webhook")
async def receber(request: Request):
    corpo = await request.body()
    if not _assinatura_ok(corpo, request.headers.get("x-hub-signature-256")):
        raise HTTPException(403, "Assinatura inválida.")
    try:
        dados = json.loads(corpo)
    except ValueError:
        return {"ok": True}
    for entry in dados.get("entry", []):
        for ch in entry.get("changes", []):
            v = ch.get("value", {})
            # Perfil do cliente (só para a saudação; o número em si fica guardado mas oculto no painel)
            nomes = {c.get("wa_id"): (c.get("profile") or {}).get("name") for c in v.get("contacts", [])}
            for m in v.get("messages", []):
                if m.get("type") != "text":  # protótipo: trata texto; mídia entra como aviso
                    texto = f"[{m.get('type', 'mensagem')} recebida — não suportada no protótipo]"
                else:
                    texto = (m.get("text") or {}).get("body", "")
                try:
                    _entrou_mensagem(m.get("from"), texto, nomes.get(m.get("from")))
                except Exception:
                    log.exception("falha ao processar mensagem recebida do WhatsApp")
            for s in v.get("statuses", []):  # entrega/leitura/falha de algo que ENVIAMOS
                _atualizar_status(s)
    return {"ok": True}


def _atualizar_status(s: dict):
    wamid, status = s.get("id"), s.get("status")
    if not wamid or not status:
        return
    detalhe = status
    if status == "failed":
        err = (s.get("errors") or [{}])[0]
        detalhe = f"falha: {err.get('title') or err.get('message') or 'desconhecida'}"
    with db() as con:
        con.execute("update wa_mensagens set status=? where wamid=?", (detalhe, wamid))
    tempo_real.avisar("whatsapp")


# ---------------------------------------------------------------- painel (só a equipe)
@router.get("/api/whatsapp/estado")
def estado(_=auth.exigir("whatsapp")):
    return {"ativo": ativo()}


@router.get("/api/whatsapp/equipe")
def equipe(_=auth.exigir("whatsapp")):
    """Integrantes que podem receber uma conversa transferida (quem tem a permissão de WhatsApp)."""
    papeis = [p for p, perms in auth.PERMISSOES.items() if "whatsapp" in perms]
    with db() as con:
        marca = ",".join("?" * len(papeis))
        return [dict(r) for r in con.execute(
            f"select id, nome, papel from usuarios where ativo=1 and papel in ({marca}) order by nome", papeis)]


@router.get("/api/whatsapp/conversas")
def listar_conversas(_=auth.exigir("whatsapp")):
    with db() as con:
        saida = []
        for row in con.execute("select * from wa_conversas order by (estado='concluida'), atualizado_em desc"):
            c = dict(row)
            ult = con.execute("""select texto, direcao, em from wa_mensagens where conversa_id=?
                                 order by seq desc limit 1""", (c["id"],)).fetchone()
            c["ultima"] = {"texto": ult["texto"], "direcao": ult["direcao"], "em": ult["em"]} if ult else None
            saida.append(_publica(c))
        return saida


@router.get("/api/whatsapp/conversas/{cid}")
def ver_conversa(cid: int, _=auth.exigir("whatsapp")):
    with db() as con:
        row = con.execute("select * from wa_conversas where id=?", (cid,)).fetchone()
        if not row:
            raise HTTPException(404, "Conversa não encontrada.")
        c = _publica(row)
        c["janela_aberta"] = _janela_aberta(con, cid)
        c["mensagens"] = [dict(m) for m in con.execute(
            "select seq, direcao, autor_id, autor_nome, texto, status, em from wa_mensagens where conversa_id=? order by seq", (cid,))]
        resp = c.get("responsavel")
        c["responsavel_nome"] = con.execute("select nome from usuarios where id=?", (resp,)).fetchone()[0] if resp else None
    return c


@router.post("/api/whatsapp/conversas/{cid}/assumir")
def assumir(cid: int, u=auth.exigir("whatsapp")):
    with db() as con:
        row = con.execute("select * from wa_conversas where id=?", (cid,)).fetchone()
        if not row:
            raise HTTPException(404, "Conversa não encontrada.")
        # O primeiro que assume vira responsável; se já tem dono, não rouba
        con.execute("update wa_conversas set estado='atendimento', responsavel=coalesce(responsavel, ?) where id=?", (u["id"], cid))
        _gravar(con, cid, "sistema", f"{u['nome']} assumiu o atendimento.")
    tempo_real.avisar("whatsapp")
    return ver_conversa(cid, u)


class Transferir(BaseModel):
    para: int


@router.post("/api/whatsapp/conversas/{cid}/transferir")
def transferir(cid: int, dados: Transferir, u=auth.exigir("whatsapp")):
    with db() as con:
        alvo = con.execute("select nome, papel from usuarios where id=? and ativo=1", (dados.para,)).fetchone()
        if not alvo or "whatsapp" not in auth.PERMISSOES.get(alvo["papel"], set()):
            raise HTTPException(422, "Escolha um integrante da equipe para receber a conversa.")
        con.execute("update wa_conversas set responsavel=?, estado='atendimento' where id=?", (dados.para, cid))
        _gravar(con, cid, "sistema", f"{u['nome']} transferiu a conversa para {alvo['nome']}.")
    tempo_real.avisar("whatsapp")
    return ver_conversa(cid, u)


class Resposta(BaseModel):
    texto: str = Field(min_length=1, max_length=4000)


@router.post("/api/whatsapp/conversas/{cid}/responder")
def responder(cid: int, r: Resposta, u=auth.exigir("whatsapp")):
    with db() as con:
        row = con.execute("select * from wa_conversas where id=?", (cid,)).fetchone()
        if not row:
            raise HTTPException(404, "Conversa não encontrada.")
        if not _janela_aberta(con, cid):
            raise HTTPException(409, "A janela de 24h desta conversa fechou. O cliente precisa enviar uma nova mensagem antes de você responder.")
        wa_id = row["wa_id"]
        if row["estado"] in ("triagem", "fila"):  # responder assume automaticamente
            con.execute("update wa_conversas set estado='atendimento', responsavel=coalesce(responsavel, ?) where id=?", (u["id"], cid))
    enviar_texto(cid, wa_id, r.texto, autor=u)
    return ver_conversa(cid, u)


@router.post("/api/whatsapp/conversas/{cid}/concluir")
def concluir(cid: int, u=auth.exigir("whatsapp")):
    with db() as con:
        if not con.execute("select 1 from wa_conversas where id=?", (cid,)).fetchone():
            raise HTTPException(404, "Conversa não encontrada.")
        con.execute("update wa_conversas set estado='concluida', concluida_em=? where id=?", (int(time.time()), cid))
        _gravar(con, cid, "sistema", f"{u['nome']} concluiu o atendimento.")
    tempo_real.avisar("whatsapp")
    return ver_conversa(cid, u)
