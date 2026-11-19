import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { corSev } from '../lib/fmt'

export function Card({ titulo, extra, acao, children, className = '' }: {
  titulo?: ReactNode; extra?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`sombra-card min-w-0 rounded-2xl border border-fio bg-painel px-5 py-5 ${className}`}>
      {titulo && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[15.5px] font-semibold tracking-[-0.01em]">{titulo}</h2>
            {extra}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

/** Botãozinho de cabeçalho de card ("Limites", "Baixar", "Detalhes"). */
export function Chip({ ativo = false, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { ativo?: boolean }) {
  return (
    <button {...p}
      className={`inline-flex h-[26px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] [&_svg]:size-3.5 ${ativo ? 'bg-fibra/15 text-tinta ring-1 ring-inset ring-fibra/35' : 'bg-painel-alto text-tinta-2 hover:bg-pilula-hover hover:text-tinta'} ${className}`} />
  )
}

type Variante = 'primario' | 'quieto' | 'perigo' | 'contorno'
const variantes: Record<Variante, string> = {
  primario: 'bg-fibra text-sobre-fibra hover:bg-fibra-hover',
  quieto: 'bg-quieto text-tinta hover:bg-quieto-hover',
  contorno: 'border border-contorno text-tinta hover:bg-realce',
  perigo: 'bg-desastre/12 text-desastre border border-desastre/25 hover:bg-desastre/20',
}

/** forwardRef: o Radix (menus com asChild) precisa medir o botão para posicionar o menu embaixo dele. */
export const Botao = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }>(function Botao({ variante = 'quieto', className = '', ...p }, ref) {
  return (
    <button
      ref={ref}
      {...p}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5 ${variantes[variante]} ${className}`}
    />
  )
})

/** Ponto de status no estilo do LED do equipamento. */
export function Led({ cor, pulsa = false }: { cor: string; pulsa?: boolean }) {
  return <span className={`inline-block size-1.5 shrink-0 rounded-full ${pulsa ? 'respira' : ''}`} style={{ background: cor, boxShadow: `0 0 0 3px color-mix(in srgb, ${cor} 18%, transparent)` }} />
}

// O livro de chamados do Analista IA grava a severidade em inglês (nome do Zabbix)
const SEV_PT: Record<string, string> = { Disaster: 'Desastre', High: 'Alta', Average: 'Média', Warning: 'Aviso', Information: 'Informação' }

export function Sev({ nome: original }: { nome: string }) {
  const nome = SEV_PT[original] ?? original
  const cor = corSev[nome] ?? 'var(--color-tinta-3)'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)` }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: cor }} />{nome}
    </span>
  )
}

/** Abas no modelo do "cartão de latência": trilho em cápsula e pílula que desliza até a aba escolhida.
 *  A 1ª posição é escrita sem transição (senão a pílula "voa" do canto); redimensionar também não anima. */
export function Segmentado<T extends string>({ opcoes, valor, onChange, rotulo }: { opcoes: { v: T; rotulo: ReactNode }[]; valor: T; onChange: (v: T) => void; rotulo?: string }) {
  const trilho = useRef<HTMLDivElement>(null)
  const [pilula, setPilula] = useState<{ x: number; w: number; anima: boolean } | null>(null)
  const medir = (anima: boolean) => {
    const b = trilho.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (b) setPilula({ x: b.offsetLeft, w: b.offsetWidth, anima })
  }
  useLayoutEffect(() => { medir(pilula !== null) }, [valor]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    let primeira = true
    const ro = new ResizeObserver(() => { if (primeira) { primeira = false; return } medir(false) })
    if (trilho.current) ro.observe(trilho.current)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Setas do teclado trocam de aba, como num tablist
  const teclas = (e: React.KeyboardEvent) => {
    const i = opcoes.findIndex(o => o.v === valor)
    const prox = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
    if (prox == null || !opcoes[prox]) return
    e.preventDefault(); onChange(opcoes[prox].v)
    requestAnimationFrame(() => trilho.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
  }
  return (
    <div ref={trilho} role="tablist" aria-label={rotulo} onKeyDown={teclas} className="t-tabs">
      {pilula && <span aria-hidden className={`t-tabs-pill ${pilula.anima ? 'pilula-desliza' : ''}`} style={{ transform: `translateX(${pilula.x}px)`, width: pilula.w }} />}
      {opcoes.map(o => (
        <button key={o.v} type="button" role="tab" aria-selected={valor === o.v} tabIndex={valor === o.v ? 0 : -1}
          onClick={() => valor !== o.v && onChange(o.v)} className="t-tab inline-flex items-center gap-1.5 [&_svg]:size-3.5">
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

/** Rótulo de gatilho no modelo do "Workspace Switcher": ao escolher outra opção, o texto antigo sobe e
 *  desfoca (--text-swap-dur), e o novo entra de baixo. */
export function RotuloTroca({ texto, className = '' }: { texto: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [mostrado, setMostrado] = useState(texto)
  useEffect(() => {
    if (texto === mostrado) return
    ref.current?.classList.add('is-exit')
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-swap-dur')) || 150
    const t = setTimeout(() => setMostrado(texto), ms)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current
    if (!el?.classList.contains('is-exit')) return
    el.classList.remove('is-exit'); el.classList.add('is-enter-start')
    void el.offsetHeight // reflow: o próximo quadro parte de baixo e desfocado
    el.classList.remove('is-enter-start')
  }, [mostrado])
  return <span ref={ref} className={`t-text-swap ${className}`}>{mostrado}</span>
}

/** Valor no modelo do "cartão de latência": quando a `chave` muda (outra aba), o texto antigo e o novo se
 *  cruzam no mesmo lugar com desfoque e a largura acompanha; quando só o número muda (dado ao vivo), usa o
 *  NumeroVivo (dígitos que sobem ou descem). */
export function ValorTrocavel({ texto, valor, chave, className = '', style }: { texto: string; valor?: number | null; chave: string; className?: string; style?: CSSProperties }) {
  const [e, setE] = useState({ chave, texto, velho: null as string | null, n: 0 })
  if (chave !== e.chave) setE({ chave, texto, velho: e.texto, n: e.n + 1 })
  else if (texto !== e.texto) setE({ ...e, texto })
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!e.n || !el) return
    const novo = el.querySelector<HTMLElement>('.t-text-soft-new'), velho = el.querySelector<HTMLElement>('.t-text-soft-old')
    if (!novo || !velho) return
    el.style.width = `${velho.getBoundingClientRect().width}px`
    void el.offsetWidth
    el.classList.add('is-swapping')
    el.style.width = `${novo.getBoundingClientRect().width}px`
    const css = getComputedStyle(document.documentElement)
    const ms = Math.max(parseFloat(css.getPropertyValue('--text-soft-dur')) || 200, parseFloat(css.getPropertyValue('--text-soft-resize-dur')) || 240) + 40
    const t = setTimeout(() => setE(x => (x.n === e.n ? { ...x, velho: null } : x)), ms)
    return () => clearTimeout(t)
  }, [e.n]) // eslint-disable-line react-hooks/exhaustive-deps
  if (e.velho === null) return <NumeroVivo texto={texto} valor={valor} className={className} style={style} />
  return (
    <span ref={ref} key={e.n} aria-label={texto} className={`t-text-soft num ${className}`} style={style}>
      <span className="t-text-soft-old" aria-hidden>{e.velho}</span>
      <span className="t-text-soft-new" aria-hidden>{texto}</span>
    </span>
  )
}

/** Número que muda ao vivo (latência, Mbps…): só os caracteres trocados cruzam, subindo se o valor subiu.
 *  `valor` dá a direção; `texto` é o que aparece já formatado. Leitores de tela leem só o texto final. */
export function NumeroVivo({ texto, valor, className = '', style }: { texto: string; valor?: number | null; className?: string; style?: CSSProperties }) {
  // Estado derivado (padrão do React para "valor anterior"): seguro também no modo estrito
  const [e, setE] = useState({ texto, valor, velho: texto, dir: 1, troca: 0 })
  if (texto !== e.texto) {
    const dir = valor != null && e.valor != null && valor < e.valor ? -1 : 1
    setE({ texto, valor, velho: e.texto, dir, troca: e.troca + 1 })
  }
  const { velho, dir, troca } = e
  const mesmo = velho.length === texto.length
  return (
    <span key={troca} aria-label={texto} className={`num-vivo ${troca ? 'anima' : ''} ${className}`} style={{ ...style, '--dir': dir } as CSSProperties}>
      {[...texto].map((c, i) => (troca === 0 || (mesmo && velho[i] === c))
        ? <span key={i} aria-hidden>{c}</span>
        : <span key={i} aria-hidden className="slot">{mesmo && <span className="velho">{velho[i]}</span>}<span className="novo">{c}</span></span>)}
    </span>
  )
}

export function Rotulo({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium text-tinta-3">{children}</div>
}

export function Vazio({ children, icone, acao }: { children: ReactNode; icone?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-fio-forte px-4 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-painel-alto text-tinta-3 [&_svg]:size-6" aria-hidden>
        {icone ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 13h4l1.5 3h7L17 13h4" /><path d="M4.5 13 6 5.5A2 2 0 0 1 8 4h8a2 2 0 0 1 2 1.5L19.5 13V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-5Z" />
          </svg>
        )}
      </span>
      <div className="max-w-sm text-[13px] text-tinta-3">{children}</div>
      {acao}
    </div>
  )
}

/** Esqueleto enquanto os dados chegam. Com `erro`, vira o aviso de falha e oferece tentar de novo
 *  (antes uma API fora deixava a tela piscando para sempre). */
export function Carregando({ erro, onTentar, altura = 'h-40' }: { erro?: string | null; onTentar?: () => void; altura?: string }) {
  if (erro) return <Falha erro={erro} onTentar={onTentar} />
  return <div role="status" aria-label="Carregando" className={`esqueleto rounded-xl border border-fio ${altura}`} />
}

/** Esqueleto no formato de um gráfico: shimmer de fundo + um traço ondulado fantasma, enquanto a série chega. */
export function EsqueletoGrafico({ altura = 250 }: { altura?: number }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height: altura }} role="status" aria-label="Carregando gráfico">
      <div className="esqueleto absolute inset-0 opacity-50" />
      <svg className="absolute inset-0 h-full w-full text-fio-forte" preserveAspectRatio="none" viewBox="0 0 100 40" aria-hidden>
        <path d="M0 30 C 10 26 14 18 22 20 S 34 32 42 28 56 12 66 16 82 30 100 22" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </svg>
    </div>
  )
}

export function Falha({ erro, onTentar }: { erro: string; onTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-desastre/25 bg-desastre/[0.06] px-5 py-4">
      <div className="min-w-0">
        <div className="font-medium text-tinta">Não foi possível carregar estes dados.</div>
        <div className="mt-0.5 text-[12px] text-tinta-3">{erro}. Confira a conexão com o servidor do NOC.</div>
      </div>
      {onTentar && <Botao variante="contorno" onClick={onTentar}>Tentar de novo</Botao>}
    </div>
  )
}

/** Interruptor liga/desliga com rótulo à esquerda; `dica` aparece em cinza embaixo do rótulo. */
export function Chave({ rotulo, ligado, onChange, dica, desligado = false }: { rotulo: ReactNode; ligado: boolean; onChange: (v: boolean) => void; dica?: string; desligado?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-4 text-tinta-2 ${desligado ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}>
      <span className="min-w-0">{rotulo}{dica && <span className="mt-0.5 block text-[11px] leading-snug text-tinta-3">{dica}</span>}</span>
      <span className="relative shrink-0">
        <input type="checkbox" role="switch" checked={ligado} disabled={desligado} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-5 w-9 rounded-full bg-painel-alto ring-1 ring-fio-forte transition-colors duration-200 peer-checked:bg-fibra peer-checked:ring-fibra peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fibra" />
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-[250ms] ease-[cubic-bezier(0.34,1.36,0.64,1)] peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
