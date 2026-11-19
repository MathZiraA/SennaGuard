import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { corSev } from '../lib/fmt'

export function Card({ titulo, extra, acao, children, className = '' }: {
  titulo?: ReactNode; extra?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`sombra-clara min-w-0 rounded-xl border border-fio bg-painel px-5 py-5 ${className}`}>
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

export function Segmentado<T extends string>({ opcoes, valor, onChange }: { opcoes: { v: T; rotulo: ReactNode }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-fio bg-fenda p-0.5">
      {opcoes.map(o => (
        <button key={o.v} aria-pressed={valor === o.v} onClick={() => onChange(o.v)}
          className={`h-7 rounded-md px-2.5 text-[12px] font-medium transition-[background-color,color] duration-150 ${valor === o.v ? 'bg-painel-alto text-tinta shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-tinta-3 hover:text-tinta-2'}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Rotulo({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium text-tinta-3">{children}</div>
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-fio-forte px-4 py-10 text-center text-tinta-3">{children}</div>
}

/** Esqueleto enquanto os dados chegam. Com `erro`, vira o aviso de falha e oferece tentar de novo
 *  (antes uma API fora deixava a tela piscando para sempre). */
export function Carregando({ erro, onTentar, altura = 'h-40' }: { erro?: string | null; onTentar?: () => void; altura?: string }) {
  if (erro) return <Falha erro={erro} onTentar={onTentar} />
  return <div role="status" aria-label="Carregando" className={`esqueleto rounded-xl border border-fio ${altura}`} />
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
