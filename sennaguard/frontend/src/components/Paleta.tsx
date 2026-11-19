import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { MagnifyingGlass } from '@phosphor-icons/react'

export type ItemComando = { id: string; rotulo: string; sub?: string; icone?: ReactNode; atalho?: string; acao: () => void }

/** Paleta de comandos (Ctrl/⌘+K): busca telas e ações, navega pelo teclado. */
export function Paleta({ aberto, onClose, itens }: { aberto: boolean; onClose: () => void; itens: ItemComando[] }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return itens
    return itens.filter(i => (i.rotulo + ' ' + (i.sub ?? '')).toLowerCase().includes(t))
  }, [q, itens])

  useEffect(() => { if (aberto) { setQ(''); setSel(0); setTimeout(() => entrada.current?.focus(), 20) } }, [aberto])
  useEffect(() => { setSel(0) }, [q])

  const escolher = (i?: ItemComando) => { if (!i) return; onClose(); i.acao() }

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtrados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(filtrados[sel]) }
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[aparece_150ms_ease-out]" />
        <Dialog.Content aria-label="Paleta de comandos" onKeyDown={teclas}
          className="fixed left-1/2 top-[18vh] z-[90] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-fio-forte bg-painel shadow-2xl outline-none data-[state=open]:animate-[surge-chat_200ms_cubic-bezier(0.23,1,0.32,1)]">
          <Dialog.Title className="sr-only">Buscar telas e ações</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-fio px-4">
            <MagnifyingGlass size={18} className="text-tinta-3" />
            <input ref={entrada} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar telas e ações…"
              className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-tinta placeholder:text-tinta-4 focus:outline-none focus-visible:outline-none" />
            <kbd className="hidden rounded border border-fio px-1.5 py-0.5 text-[10px] text-tinta-3 sm:block">esc</kbd>
          </div>
          <ul className="max-h-[320px] overflow-y-auto p-2">
            {filtrados.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-tinta-3">Nada encontrado.</li>}
            {filtrados.map((i, idx) => (
              <li key={i.id}>
                <button onMouseMove={() => setSel(idx)} onClick={() => escolher(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${idx === sel ? 'bg-realce text-tinta' : 'text-tinta-2'}`}>
                  {i.icone && <span className="grid size-5 shrink-0 place-items-center text-tinta-3 [&_svg]:size-[18px]">{i.icone}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.rotulo}</span>
                    {i.sub && <span className="block truncate text-[11px] text-tinta-3">{i.sub}</span>}
                  </span>
                  {i.atalho && <kbd className="shrink-0 rounded border border-fio px-1.5 py-0.5 text-[10px] text-tinta-3">{i.atalho}</kbd>}
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
