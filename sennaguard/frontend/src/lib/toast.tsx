/** Avisos rápidos (toasts) num canto, para confirmar ações sem poluir a tela.
 *  Uso: `toast('Foto trocada')`, `toast('Falhou', 'erro')`. O <Toaster/> fica montado uma vez na Shell. */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Info, WarningCircle, X } from '@phosphor-icons/react'

type Tipo = 'ok' | 'erro' | 'info'
type Toast = { id: number; tipo: Tipo; texto: string }

let seq = 0
let lista: Toast[] = []
const ouvintes = new Set<(t: Toast[]) => void>()
const emitir = () => ouvintes.forEach(f => f(lista))

function dispensar(id: number) { lista = lista.filter(t => t.id !== id); emitir() }

export function toast(texto: string, tipo: Tipo = 'ok') {
  const id = ++seq
  lista = [...lista, { id, tipo, texto }]
  emitir()
  setTimeout(() => dispensar(id), 4200)
}

const ICONE = { ok: Check, erro: WarningCircle, info: Info }

function Item({ t }: { t: Toast }) {
  const Icone = ICONE[t.tipo]
  const cor = t.tipo === 'erro' ? 'text-desastre' : t.tipo === 'info' ? 'text-tinta-2' : 'text-led'
  return (
    <div role="status" className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-fio-forte bg-painel-alto px-3.5 py-2.5 text-[13px] text-tinta shadow-2xl data-[v=1]:animate-none"
      style={{ animation: 'surge-chat 220ms cubic-bezier(0.23,1,0.32,1)' }}>
      <Icone size={17} weight="fill" className={`shrink-0 ${cor}`} />
      <span className="min-w-0">{t.texto}</span>
      <button onClick={() => dispensar(t.id)} aria-label="Fechar" className="ml-1 grid size-5 place-items-center rounded text-tinta-3 hover:text-tinta"><X size={13} /></button>
    </div>
  )
}

export function Toaster() {
  const [ts, setTs] = useState<Toast[]>(lista)
  useEffect(() => { ouvintes.add(setTs); return () => { ouvintes.delete(setTs) } }, [])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {ts.map(t => <Item key={t.id} t={t} />)}
    </div>, document.body)
}
