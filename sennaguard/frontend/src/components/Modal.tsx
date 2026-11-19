import { useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

/** Diálogo do Radix: `lado` para detalhes (gaveta à direita), `centro` para formulários. */
export default function Modal(props: {
  aberto: boolean; onClose: () => void; titulo: ReactNode; descricao?: ReactNode; lado?: boolean; children: ReactNode
}) {
  // Durante a animação de saída quem chama já limpou o estado (?id= some): mostra o último conteúdo aberto
  const ultimo = useRef(props)
  if (props.aberto) ultimo.current = props
  const { titulo, descricao, lado = false, children } = props.aberto ? props : ultimo.current
  const { aberto, onClose } = props
  return (
    <Dialog.Root open={aberto} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-[aparece_250ms_ease-out] data-[state=closed]:animate-[some_150ms_ease-in]" />
        {/* Abre em 250 ms e fecha em 150 ms, sempre com a mesma curva suave */}
        <Dialog.Content
          className={`fixed z-50 flex flex-col border border-fio-forte bg-painel shadow-2xl outline-none ${lado
            ? 'inset-y-0 right-0 w-full max-w-[520px] data-[state=open]:animate-[gaveta_250ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[gaveta-sai_150ms_cubic-bezier(0.22,1,0.36,1)]'
            : 'left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=open]:animate-[surge_250ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[surge-sai_150ms_cubic-bezier(0.22,1,0.36,1)]'}`}>
          <header className="flex items-start justify-between gap-4 border-b border-fio px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold tracking-[-0.01em]">{titulo}</Dialog.Title>
              {descricao && <Dialog.Description className="mt-1 text-tinta-3">{descricao}</Dialog.Description>}
            </div>
            <Dialog.Close className="-mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-painel-alto hover:text-tinta" aria-label="Fechar">
              <X className="size-4" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
