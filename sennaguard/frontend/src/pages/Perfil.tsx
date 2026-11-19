import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Camera, Check, TelegramLogo, Trash } from '@phosphor-icons/react'
import { api, enviarArquivo, type Notificacoes } from '../lib/api'
import { useSessao } from '../lib/sessao'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { Botao, Card, Chave, Segmentado } from '../components/ui'
import { ACENTOS, acentoAtual, acentoHex, definirAcento, definirHex, type Acento } from '../lib/cores'
import { definirTema, temaAtual, type Tema } from '../lib/tema'
import { definirDensidade, densidadeAtual, type Densidade } from '../lib/densidade'
import { salvar as salvarAparencia } from '../lib/aparencia'
import { avisosLigados, desligarAvisos, ligarAvisos } from '../lib/avisoNavegador'
import { toast } from '../lib/toast'

const campo = 'h-9 w-full rounded-lg border border-fio bg-fenda px-3 text-tinta placeholder:text-tinta-4 focus:border-fibra/60 focus:outline-none'

/** Recorta o centro da imagem em quadrado e reduz para 256 px: a foto chega leve e já no formato do círculo. */
async function recortar(arquivo: File): Promise<Blob> {
  const img = await createImageBitmap(arquivo)
  const lado = Math.min(img.width, img.height)
  const tela = Object.assign(document.createElement('canvas'), { width: 256, height: 256 })
  tela.getContext('2d')!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256)
  return new Promise((ok, falha) => tela.toBlob(b => (b ? ok(b) : falha(new Error('Não foi possível ler a imagem.'))), 'image/webp', 0.88))
}

export default function Perfil() {
  const { eu } = useSessao()
  if (!eu) return null
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="titulo-pagina">Meu perfil</h1>
        <p className="mt-1 text-tinta-3">Sua foto, seu e-mail de acesso, sua senha e o que chega no seu Telegram.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Conta />
          <Aparencia />
          <Card titulo="Senha"><TrocarSenha /></Card>
        </div>
        <Avisos />
      </div>
    </div>
  )
}

/** Aparência: cor de acento e tema. Vale só neste navegador (guardado no localStorage). */
function Aparencia() {
  const [acento, setAcento] = useState<Acento>(acentoAtual)
  const [hex, setHex] = useState(acentoHex)
  const [tema, setTema] = useState<Tema>(temaAtual)
  const [densidade, setDensidade] = useState<Densidade>(densidadeAtual)
  const [avisoNav, setAvisoNav] = useState(avisosLigados)
  // Salva sempre a aparência inteira (o servidor substitui a coluna), com o campo novo por cima dos atuais.
  const sync = (patch: Partial<{ tema: Tema; acento: Acento; acentoHex: string; densidade: Densidade }>) =>
    salvarAparencia({ tema, acento, acentoHex: hex, densidade, ...patch })
  const trocarAcento = (a: Acento) => { setAcento(a); definirAcento(a); sync({ acento: a }) }
  const trocarTema = (t: Tema) => { setTema(t); definirTema(t); sync({ tema: t }) }
  const trocarDensidade = (d: Densidade) => { setDensidade(d); definirDensidade(d); sync({ densidade: d }) }
  const trocarHex = (h: string) => { setHex(h); setAcento('custom'); definirHex(h); sync({ acento: 'custom', acentoHex: h }) }
  const trocarAviso = async (v: boolean) => {
    if (v) { const ok = await ligarAvisos(); setAvisoNav(ok); if (!ok) toast('Permita as notificações do navegador para este site.', 'erro') }
    else { desligarAvisos(); setAvisoNav(false) }
  }
  const custom = acento === 'custom'
  return (
    <Card titulo="Aparência">
      <p className="-mt-2 mb-4 text-[12px] text-tinta-3">A cor e o tema valem só neste navegador.</p>
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-tinta-2">Cor de acento</span>
        <div className="flex flex-wrap gap-2.5">
          {ACENTOS.map(a => {
            const ativo = acento === a.v
            return (
              <button key={a.v} type="button" onClick={() => trocarAcento(a.v)} title={a.rotulo} aria-pressed={ativo}
                className={`group flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[12px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${ativo ? 'border-fibra/60 bg-fibra/10 text-tinta' : 'border-fio bg-painel-alto text-tinta-2 hover:border-fio-forte hover:text-tinta'}`}>
                <span className="grid size-5 place-items-center rounded-full ring-1 ring-inset ring-white/15" style={{ background: a.amostra }}>
                  {ativo && <Check size={12} weight="bold" className={a.v === 'grafite' ? 'text-black' : 'text-white'} />}
                </span>
                {a.rotulo}
              </button>
            )
          })}
          {/* Cor livre: a pessoa escolhe qualquer tom pelo seletor nativo. */}
          <label title="Escolher qualquer cor" aria-pressed={custom}
            className={`group flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[12px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${custom ? 'border-fibra/60 bg-fibra/10 text-tinta' : 'border-fio bg-painel-alto text-tinta-2 hover:border-fio-forte hover:text-tinta'}`}>
            <span className="grid size-5 place-items-center rounded-full ring-1 ring-inset ring-white/15"
              style={{ background: custom ? hex : 'conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #38bdf8, #a78bfa, #f472b6, #f87171)' }}>
              {custom && <Check size={12} weight="bold" className="text-white" />}
            </span>
            {custom ? 'Personalizada' : 'Outra cor'}
            <input type="color" value={hex} onChange={e => trocarHex(e.target.value)} className="sr-only" />
          </label>
        </div>
        {custom && <span className="num text-[11px] text-tinta-3">Cor atual: {hex.toUpperCase()}</span>}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-fio pt-4">
        <span className="text-[12px] font-medium text-tinta-2">Tema</span>
        <Segmentado rotulo="Tema" valor={tema} onChange={trocarTema}
          opcoes={[{ v: 'escuro', rotulo: 'Escuro' }, { v: 'claro', rotulo: 'Claro' }]} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-fio pt-4">
        <span className="min-w-0 text-[12px] font-medium text-tinta-2">Densidade<span className="mt-0.5 block text-[11px] font-normal text-tinta-3">Compacto mostra mais dados por tela.</span></span>
        <Segmentado rotulo="Densidade" valor={densidade} onChange={trocarDensidade}
          opcoes={[{ v: 'confortavel', rotulo: 'Confortável' }, { v: 'compacto', rotulo: 'Compacto' }]} />
      </div>
      <div className="mt-4 border-t border-fio pt-4">
        <Chave rotulo="Avisos do navegador" dica="Um alerta crítico aparece mesmo com a aba em segundo plano (vale só neste navegador)." ligado={avisoNav} onChange={trocarAviso} />
      </div>
    </Card>
  )
}

function Conta() {
  const { eu, recarregar } = useSessao()
  const entrada = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [email, setEmail] = useState(eu!.email)
  const [senha, setSenha] = useState('')
  const [msgEmail, setMsgEmail] = useState('')

  const trocarFoto = async (arquivo?: File) => {
    setErro('')
    if (!arquivo) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) return setErro('Use uma imagem JPG, PNG ou WEBP.')
    if (arquivo.size > 2 * 1024 * 1024) return setErro('A foto pode ter no máximo 2 MB.')
    setEnviando(true)
    try { await enviarArquivo('/api/eu/foto', await recortar(arquivo), 'PUT'); await recarregar(); toast('Foto atualizada') }
    catch (e) { setErro((e as Error).message) } finally { setEnviando(false); if (entrada.current) entrada.current.value = '' }
  }
  const salvarEmail = async (e: FormEvent) => {
    e.preventDefault(); setMsgEmail('')
    try { await api('/api/eu/email', { method: 'PUT', body: JSON.stringify({ email, senha }) }); setSenha(''); await recarregar(); setMsgEmail('ok'); toast('E-mail atualizado') }
    catch (x) { setMsgEmail((x as Error).message) }
  }

  return (
    <Card titulo="Conta">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar id={eu!.id} nome={eu!.nome} foto={eu!.foto} tamanho={84} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">{eu!.nome}</div>
          <div className="text-tinta-3">{eu!.papel}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="foto" onChange={e => trocarFoto(e.target.files?.[0])} />
            <Botao onClick={() => entrada.current?.click()} disabled={enviando}><Camera />{enviando ? 'Enviando…' : eu!.foto ? 'Trocar foto' : 'Enviar foto'}</Botao>
            {eu!.foto && <Botao variante="perigo" onClick={() => api('/api/eu/foto', { method: 'DELETE' }).then(recarregar)}><Trash />Remover</Botao>}
          </div>
          {erro && <p className="mt-2 text-[12px] text-desastre">{erro}</p>}
          <p className="mt-2 text-[11px] text-tinta-3">JPG, PNG ou WEBP até 2 MB. O centro da imagem vira o círculo.</p>
        </div>
      </div>

      <form onSubmit={salvarEmail} className="mt-6 flex flex-col gap-3 border-t border-fio pt-5">
        <label className="flex flex-col gap-1.5 text-[12px] font-medium text-tinta-2">E-mail de acesso
          <input type="email" required value={email} onChange={e => { setEmail(e.target.value); setMsgEmail('') }} className={campo} /></label>
        {email.toLowerCase() !== eu!.email.toLowerCase() && <>
          <label className="flex flex-col gap-1.5 text-[12px] font-medium text-tinta-2">Confirme com sua senha atual
            <input type="password" required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} className={campo} /></label>
          <Botao type="submit" variante="primario" className="self-end">Trocar e-mail</Botao>
        </>}
        {msgEmail === 'ok' ? <p className="flex items-center gap-1.5 text-[12px] text-led"><Check weight="bold" />E-mail trocado. Use o novo no próximo login.</p>
          : msgEmail && <p className="text-[12px] text-desastre">{msgEmail}</p>}
      </form>
    </Card>
  )
}

export function TrocarSenha({ onFim }: { onFim?: () => void }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [msg, setMsg] = useState('')
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    try { await api('/api/eu/senha', { method: 'PUT', body: JSON.stringify({ atual, nova }) }); setAtual(''); setNova(''); setMsg('ok'); toast('Senha trocada'); onFim?.() }
    catch (x) { setMsg((x as Error).message) }
  }
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[12px] font-medium text-tinta-2">Senha atual
        <input type="password" required autoComplete="current-password" value={atual} onChange={e => setAtual(e.target.value)} className={campo} /></label>
      <label className="flex flex-col gap-1.5 text-[12px] font-medium text-tinta-2">Nova senha (mínimo 8 caracteres)
        <input type="password" required minLength={8} autoComplete="new-password" value={nova} onChange={e => setNova(e.target.value)} className={campo} /></label>
      {msg === 'ok' ? <p className="flex items-center gap-1.5 text-[12px] text-led"><Check weight="bold" />Senha trocada.</p>
        : msg && <p className="text-[12px] text-desastre">{msg}</p>}
      <Botao type="submit" variante="primario" className="self-end">Salvar senha</Botao>
    </form>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-fio pt-4 first-of-type:border-0 first-of-type:pt-0">
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-tinta-3">{titulo}</legend>
      {children}
    </fieldset>
  )
}

/** Cada interruptor salva na hora; o servidor filtra os avisos por estas escolhas. */
function Avisos() {
  const { eu, pode, recarregar } = useSessao()
  const [n, setN] = useState<Notificacoes>(eu!.notificacoes)
  const [salvo, setSalvo] = useState(false)
  const [conectando, setConectando] = useState(false)
  const equipe = pode('alertas')
  const mudar = (k: keyof Notificacoes) => async (v: boolean) => {
    const novo = { ...n, [k]: v }
    setN(novo); setSalvo(false)
    await api('/api/eu/notificacoes', { method: 'PUT', body: JSON.stringify(novo) })
    setSalvo(true); recarregar()
  }
  return (
    <Card titulo="Avisos no Telegram" extra={salvo && <span className="flex items-center gap-1 text-[11px] text-led"><Check weight="bold" />salvo</span>}>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-fenda px-4 py-3">
        <TelegramLogo size={20} weight="fill" className="text-[#2aabee]" />
        <span className="min-w-0 flex-1 text-tinta-2">{eu!.telegram ? 'Seu Telegram está conectado.' : 'Conecte o Telegram para receber os avisos.'}</span>
        <Botao onClick={() => setConectando(true)}>{eu!.telegram ? 'Gerenciar' : 'Conectar'}</Botao>
      </div>
      <div className={`flex flex-col gap-4 ${eu!.telegram ? '' : 'opacity-60'}`}>
        {equipe && (
          <Grupo titulo="Rede">
            <Chave rotulo="Alertas do Zabbix" dica="Se desligar, nenhum alerta chega." ligado={n.alertas} onChange={mudar('alertas')} />
            <div className="ml-4 flex flex-col gap-3 border-l border-fio pl-4">
              <Chave rotulo="Desastre" ligado={n.desastre} onChange={mudar('desastre')} desligado={!n.alertas} />
              <Chave rotulo="Alta" ligado={n.alta} onChange={mudar('alta')} desligado={!n.alertas} />
              <Chave rotulo="Média" ligado={n.media} onChange={mudar('media')} desligado={!n.alertas} />
              <Chave rotulo="Troca fibra ⇄ rádio" dica="Quando a Filial passa para o rádio e quando volta." ligado={n.caminho} onChange={mudar('caminho')} desligado={!n.alertas} />
            </div>
          </Grupo>
        )}
        <Grupo titulo="Chamados">
          {equipe && <Chave rotulo="Chamados novos" dica="Todo chamado aberto pela Filial ou pela equipe." ligado={n.chamados_equipe} onChange={mudar('chamados_equipe')} />}
          <Chave rotulo={equipe ? 'Respostas nos chamados em que estou' : 'Respostas da equipe nos meus chamados'} ligado={n.chamados} onChange={mudar('chamados')} />
        </Grupo>
        <Grupo titulo="Outros">
          <Chave rotulo="Manutenções programadas" ligado={n.manutencao} onChange={mudar('manutencao')} />
          {eu!.papel === 'Administrador' && <Chave rotulo="Relatório mensal de SLA (PDF)" dica="Dia 1º, às 8 h." ligado={n.relatorio} onChange={mudar('relatorio')} />}
          <Chave rotulo="Não perturbe das 22 h às 7 h" dica={equipe ? 'Alertas de Desastre chegam mesmo assim.' : undefined} ligado={n.silencio} onChange={mudar('silencio')} />
        </Grupo>
      </div>
      <Modal aberto={conectando} onClose={() => { setConectando(false); recarregar() }} titulo="Avisos no Telegram"
        descricao="Chamados, respostas e alertas chegam direto no seu Telegram.">
        <ConectarTelegram conectado={eu!.telegram} disponivel={eu!.telegram_disponivel} />
      </Modal>
    </Card>
  )
}

export function ConectarTelegram({ conectado, disponivel }: { conectado: boolean; disponivel: boolean }) {
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  if (!disponivel) return <p className="leading-relaxed text-tinta-2">O bot do Telegram ainda não foi configurado no servidor. Peça ao administrador para definir <code className="font-mono text-[12px]">TELEGRAM_TOKEN</code>.</p>
  if (conectado) return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-tinta-2"><span className="size-2 rounded-full bg-led" />Seu Telegram está conectado.</p>
      <div className="flex justify-end"><Botao variante="perigo" onClick={() => api('/api/eu/telegram', { method: 'DELETE' }).then(() => location.reload())}>Desconectar</Botao></div>
    </div>
  )
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 leading-relaxed text-tinta-2">
        <li>Clique em <b className="text-tinta">Abrir no Telegram</b>.</li>
        <li>No Telegram, toque em <b className="text-tinta">Iniciar</b>.</li>
        <li>Pronto: o bot confirma e você começa a receber os avisos.</li>
      </ol>
      {erro && <p className="text-[12px] text-desastre">{erro}</p>}
      <div className="flex justify-end">
        {link
          ? <a href={link} target="_blank" rel="noreferrer"><Botao variante="primario"><TelegramLogo weight="fill" />Abrir no Telegram</Botao></a>
          : <Botao variante="primario" onClick={() => api<{ link: string }>('/api/eu/telegram', { method: 'POST' }).then(r => setLink(r.link)).catch(e => setErro(e.message))}>Gerar link</Botao>}
      </div>
      <p className="text-[11px] text-tinta-3">O link vale por 15 minutos e só serve para a sua conta.</p>
    </div>
  )
}
