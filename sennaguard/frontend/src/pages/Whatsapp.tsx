import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowsLeftRight, CaretLeft, CheckCircle, EyeSlash, PaperPlaneRight, UserCirclePlus, WhatsappLogo } from '@phosphor-icons/react'
import { Loader2 } from 'lucide-react'
import { api, useApi, type WaConversa, type WaConversaDetalhe, type WaEstado } from '../lib/api'
import { dataHora, desde } from '../lib/fmt'
import { useSessao } from '../lib/sessao'
import { Botao, Card, Carregando, Led, Vazio } from '../components/ui'
import Modal from '../components/Modal'

const ESTADO: Record<WaEstado, { rotulo: string; cor: string }> = {
  triagem: { rotulo: 'Triagem', cor: 'var(--color-tinta-3)' },
  fila: { rotulo: 'Na fila', cor: 'var(--color-media)' },
  atendimento: { rotulo: 'Em atendimento', cor: 'var(--color-fibra)' },
  concluida: { rotulo: 'Concluída', cor: 'var(--color-led)' },
}
const FILTROS: { v: string; r: string }[] = [
  { v: 'ativas', r: 'Ativas' }, { v: 'fila', r: 'Na fila' }, { v: 'atendimento', r: 'Em atendimento' },
  { v: 'concluida', r: 'Concluídas' }, { v: 'todas', r: 'Todas' },
]

function nomeExibido(c: { nome: string | null; estado: WaEstado }) {
  return c.nome || (c.estado === 'triagem' ? 'Novo contato (triagem)' : 'Contato sem nome')
}

export default function Whatsapp() {
  const { dados: conversas, erro, recarregar } = useApi<WaConversa[]>('/api/whatsapp/conversas', 20000, ['whatsapp'])
  const { dados: estado } = useApi<{ ativo: boolean }>('/api/whatsapp/estado')
  const [params, setParams] = useSearchParams()
  const [filtro, setFiltro] = useState('ativas')
  const sel = params.get('c')
  if (!conversas) return <Carregando erro={erro} onTentar={recarregar} />

  const visiveis = conversas.filter(c =>
    filtro === 'todas' ? true
      : filtro === 'ativas' ? c.estado !== 'concluida'
        : c.estado === filtro)
  const naFila = conversas.filter(c => c.estado === 'fila').length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo-pagina flex items-center gap-2"><WhatsappLogo weight="fill" className="text-fibra" />WhatsApp</h1>
          <p className="mt-1 text-tinta-3">Conversas dos clientes num número único. O primeiro da equipe assume; dá para transferir e concluir.</p>
        </div>
        {naFila > 0 && <span className="inline-flex items-center gap-2 rounded-full border border-media/30 bg-media/[0.08] px-3 py-1.5 text-[12.5px] font-medium"><Led cor="var(--color-media)" pulsa />{naFila} na fila</span>}
      </div>

      {estado && !estado.ativo && (
        <div className="rounded-xl border border-media/30 bg-media/[0.08] px-4 py-3 text-[12.5px] text-tinta-2">
          A integração do WhatsApp ainda não está configurada no servidor (variáveis <code className="num">WHATSAPP_TOKEN</code> e <code className="num">WHATSAPP_PHONE_ID</code>). As conversas aparecem aqui assim que o webhook estiver no ar.
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            className={`pilula-x h-7 rounded-md px-3 text-[12px] font-medium transition-colors ${filtro === f.v ? 'bg-ativo text-tinta' : 'text-tinta-3 hover:bg-realce hover:text-tinta'}`}>
            {f.r}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Lista: no celular some quando uma conversa está aberta */}
        <div className={sel ? 'hidden md:block' : 'block'}>
          {visiveis.length === 0
            ? <Vazio icone={<WhatsappLogo weight="fill" />}>Nenhuma conversa {filtro === 'concluida' ? 'concluída' : 'por aqui'} ainda.</Vazio>
            : (
              <Card className="sem-lift !p-0">
                <ul className="max-h-[70vh] overflow-y-auto">
                  {visiveis.map(c => {
                    const ativa = String(c.id) === sel
                    const e = ESTADO[c.estado]
                    return (
                      <li key={c.id} className="border-b border-fio last:border-0">
                        <button onClick={() => setParams({ c: String(c.id) })}
                          className={`linha-hover flex w-full flex-col gap-1 px-4 py-3 text-left ${ativa ? 'bg-ativo' : ''}`}>
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{nomeExibido(c)}</span>
                            <span className="num ml-auto shrink-0 text-[10.5px] text-tinta-4">{c.ultima ? desde(c.ultima.em) : desde(c.criado_em)}</span>
                          </span>
                          <span className="flex items-center gap-2 text-[11.5px] text-tinta-3">
                            <Led cor={e.cor} pulsa={c.estado === 'fila'} />{e.rotulo}
                            {c.unidade && <span className="truncate">· {c.unidade}</span>}
                          </span>
                          {c.ultima && <span className="truncate text-[12px] text-tinta-3">{c.ultima.direcao === 'saida' ? 'Você: ' : c.ultima.direcao === 'sistema' ? '' : ''}{c.ultima.texto}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
        </div>

        {/* Conversa */}
        <div className={sel ? 'block' : 'hidden md:block'}>
          {sel
            ? <Conversa id={Number(sel)} onVoltar={() => setParams({})} onMudou={recarregar} />
            : <div className="grid h-full min-h-[320px] place-items-center rounded-2xl border border-dashed border-fio-forte text-tinta-3">
                <div className="flex flex-col items-center gap-2 text-[13px]"><WhatsappLogo size={30} className="text-tinta-4" />Escolha uma conversa à esquerda.</div>
              </div>}
        </div>
      </div>
    </div>
  )
}

function statusTexto(s: string | null) {
  if (!s) return ''
  if (s.startsWith('falha')) return s.replace('falha:', 'falhou:')
  return { enviando: 'enviando…', aceita: 'enviada', sent: 'enviada', delivered: 'entregue', read: 'lida' }[s] ?? s
}

function Conversa({ id, onVoltar, onMudou }: { id: number; onVoltar: () => void; onMudou: () => void }) {
  const { eu } = useSessao()
  const [c, setC] = useState<WaConversaDetalhe | null>(null)
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [transferir, setTransferir] = useState(false)
  const fim = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const carregar = () => api<WaConversaDetalhe>(`/api/whatsapp/conversas/${id}`).then(setC).catch(() => {})
    carregar()
    window.addEventListener('sg:whatsapp', carregar)
    return () => window.removeEventListener('sg:whatsapp', carregar)
  }, [id])
  const nMsg = c?.mensagens.length ?? 0
  useEffect(() => { fim.current?.scrollIntoView({ block: 'nearest' }) }, [nMsg])

  const agir = async (url: string, corpo?: object) => {
    setOcupado(true); setErro('')
    try { setC(await api<WaConversaDetalhe>(url, { method: 'POST', body: corpo ? JSON.stringify(corpo) : undefined })); onMudou(); return true }
    catch (e) { setErro((e as Error).message); return false } finally { setOcupado(false) }
  }
  const responder = async (e: FormEvent) => {
    e.preventDefault()
    if (ocupado || !texto.trim()) return
    if (await agir(`/api/whatsapp/conversas/${id}/responder`, { texto })) setTexto('')
  }
  if (!c) return <div className="grid h-40 place-items-center text-tinta-3"><Loader2 className="size-5 animate-spin" /></div>
  const e = ESTADO[c.estado]
  const semDono = !c.responsavel

  return (
    <Card className="sem-lift flex max-h-[76vh] flex-col !p-0">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2.5 border-b border-fio px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button onClick={onVoltar} className="grid size-8 shrink-0 place-items-center rounded-lg text-tinta-2 hover:bg-realce md:hidden"><CaretLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate font-semibold">{nomeExibido(c)}</span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: e.cor }}><Led cor={e.cor} pulsa={c.estado === 'fila'} />{e.rotulo}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-tinta-3">
              {c.unidade && <span className="truncate">{c.unidade}</span>}
              <span className="inline-flex items-center gap-1" title="O número do cliente não é mostrado à equipe"><EyeSlash size={12} />número oculto</span>
              {c.responsavel_nome && <span className="truncate">· {c.responsavel_nome}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {semDono && c.estado !== 'concluida' && <Botao variante="primario" disabled={ocupado} onClick={() => agir(`/api/whatsapp/conversas/${id}/assumir`)}><UserCirclePlus />Assumir</Botao>}
          {c.estado !== 'concluida' && <Botao disabled={ocupado} onClick={() => setTransferir(true)}><ArrowsLeftRight />Transferir</Botao>}
          {c.estado !== 'concluida' && <Botao disabled={ocupado} onClick={() => agir(`/api/whatsapp/conversas/${id}/concluir`)}><CheckCircle />Concluir</Botao>}
        </div>
      </div>

      {/* Mensagens */}
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {c.mensagens.map(m => m.direcao === 'sistema'
          ? <li key={m.seq} className="flex items-center gap-3 text-[11px] text-tinta-3">
              <span className="h-px flex-1 bg-fio" /><span>{m.texto} · {dataHora(m.em)}</span><span className="h-px flex-1 bg-fio" />
            </li>
          : <li key={m.seq} className={`flex flex-col ${m.direcao === 'saida' ? 'items-end' : 'items-start'}`}>
              <div className="mb-1 text-[11px] text-tinta-3">{m.direcao === 'saida' ? (m.autor_nome ?? 'Equipe') : nomeExibido(c)} · {dataHora(m.em)}</div>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed text-tinta ${m.direcao === 'saida' ? 'rounded-tr-md bg-fibra/15' : 'rounded-tl-md bg-painel-alto'}`}>{m.texto}</div>
              {m.direcao === 'saida' && m.status && (
                <div className={`mt-1 text-[10.5px] ${m.status.startsWith('falha') ? 'text-desastre' : 'text-tinta-4'}`}>{statusTexto(m.status)}</div>
              )}
            </li>)}
        <div ref={fim} />
      </ol>

      {/* Resposta */}
      <div className="border-t border-fio p-3">
        {c.estado === 'concluida'
          ? <p className="py-1 text-center text-[12px] text-tinta-3">Conversa concluída. Se o cliente escrever de novo, ela reabre na fila.</p>
          : !c.janela_aberta
            ? <p className="py-1 text-center text-[12px] text-tinta-3">A janela de 24h fechou. Só é possível responder depois que o cliente enviar uma nova mensagem.</p>
            : (
              <form onSubmit={responder} className="flex flex-col gap-2">
                <textarea rows={2} value={texto} onChange={ev => setTexto(ev.target.value)} maxLength={4000}
                  onKeyDown={ev => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.nativeEvent.isComposing) { ev.preventDefault(); responder(ev) } }}
                  placeholder="Responder ao cliente pelo WhatsApp…"
                  className="w-full resize-none rounded-lg border border-fio bg-fenda px-3 py-2 text-tinta placeholder:text-tinta-4 focus:border-fibra/60 focus:outline-none" />
                {erro && <p className="text-[12px] text-desastre">{erro}</p>}
                <div className="flex items-center justify-between">
                  <span className="hidden text-[11px] text-tinta-4 sm:inline">Enter envia · Shift+Enter pula linha</span>
                  <Botao type="submit" variante="primario" className="ml-auto" disabled={ocupado || !texto.trim()}><PaperPlaneRight />Enviar</Botao>
                </div>
              </form>
            )}
      </div>

      <Modal aberto={transferir} onClose={() => setTransferir(false)} titulo="Transferir conversa" descricao="Escolha quem assume este atendimento.">
        <Transferir atual={c.responsavel} meuId={eu?.id} onEscolher={async alvo => { setTransferir(false); await agir(`/api/whatsapp/conversas/${id}/transferir`, { para: alvo }) }} />
      </Modal>
    </Card>
  )
}

function Transferir({ atual, meuId, onEscolher }: { atual: number | null; meuId?: number; onEscolher: (id: number) => void }) {
  const { dados: equipe } = useApi<{ id: number; nome: string; papel: string }[]>('/api/whatsapp/equipe')
  if (!equipe) return <div className="grid h-24 place-items-center text-tinta-3"><Loader2 className="size-5 animate-spin" /></div>
  return (
    <ul className="flex flex-col gap-1">
      {equipe.filter(m => m.id !== atual).map(m => (
        <li key={m.id}>
          <button onClick={() => onEscolher(m.id)} className="linha-hover flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left">
            <span className="grid size-8 place-items-center rounded-full bg-painel-alto text-[12px] font-semibold text-tinta-2">{m.nome.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{m.nome}{m.id === meuId && <span className="text-tinta-3"> (você)</span>}</span>
              <span className="text-[11px] text-tinta-3">{m.papel}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
