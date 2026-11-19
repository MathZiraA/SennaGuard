import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useApi } from '../lib/api'
import { useSessao } from '../lib/sessao'
import { LogoSG } from '../components/Shell'

const campo = 'h-10 w-full rounded-lg border border-fio-forte bg-fenda px-3 text-[13.5px] text-tinta placeholder:text-tinta-4 transition-[border-color,box-shadow] duration-150 focus:border-fibra/70 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-fibra)_18%,transparent)] focus:outline-none'

export default function Login() {
  const { entrar } = useSessao()
  const { dados: pub } = useApi<{ simulacao: boolean; senha_demo: string | null }>('/api/publico')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(''); setEnviando(true)
    try { await entrar(email, senha) } catch (x) { setErro((x as Error).message) } finally { setEnviando(false) }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Lado da marca (só em telas largas): o trilho do enlace, a assinatura do SennaGuard */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-fio bg-lateral px-14 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <LogoSG size={26} tile />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">SennaGuard</span>
        </div>
        <div className="max-w-[460px]">
          <Enlace />
          <h2 className="mt-12 text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-titulo">A Filial tem redundância agora?</h2>
          <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-tinta-3">
            Fibra e rádio entre Matriz e Filial, alertas com a análise do Analista IA e chamados com histórico verificável.
          </p>
        </div>
        <p className="text-[12px] text-tinta-4">NOC SENAI · Matriz e Filial</p>
      </aside>

      <main className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoSG size={26} tile />
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-[-0.01em]">SennaGuard</div>
              <div className="text-[12px] text-tinta-3">NOC Matriz e Filial</div>
            </div>
          </div>

          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="mb-2">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Entrar no NOC</h1>
              <p className="mt-1 text-tinta-3">Use o e-mail cadastrado pela equipe do NOC.</p>
            </div>

            <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-tinta-2">
              E-mail
              <input type="email" required autoFocus autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                className={campo} placeholder="voce@empresa.com.br" />
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-tinta-2">
              Senha
              <span className="relative">
                <input type={ver ? 'text' : 'password'} required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)}
                  className={`${campo} pr-10`} />
                <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
                  className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-tinta-3 transition-colors hover:bg-realce hover:text-tinta">
                  {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {erro && <p role="alert" className="rounded-lg border border-desastre/25 bg-desastre/[0.08] px-3 py-2 text-[12.5px] text-desastre">{erro}</p>}

            <button disabled={enviando}
              className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fibra font-semibold text-sobre-fibra transition-[background-color,transform] duration-150 hover:bg-fibra-hover active:scale-[0.97] disabled:opacity-50">
              <LogIn className="size-4" />{enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          {pub?.simulacao && (
            <div className="mt-6 rounded-xl border border-dashed border-fio-forte px-4 py-3 text-[12px] leading-relaxed text-tinta-3">
              <b className="font-semibold text-tinta-2">Modo demonstração.</b> Senha <code className="font-mono text-tinta-2">{pub.senha_demo}</code> para
              {' '}<span className="font-mono text-tinta-2">matheus.ziravello@gmail.com</span> (administrador) ou
              {' '}<span className="font-mono text-tinta-2">cliente@filial.local</span> (cliente).
            </div>
          )}
          <p className="mt-8 text-center text-[12px] text-tinta-4">Esqueceu a senha? Peça ao administrador do NOC para redefinir.</p>
        </div>
      </main>
    </div>
  )
}

/** Matriz e Filial ligadas pelos dois trilhos: fibra levando o tráfego, rádio em espera. */
function Enlace() {
  const no = (rotulo: string, nome: string) => (
    <div className="w-[104px] shrink-0 rounded-xl border border-fio-forte bg-painel px-3 py-2.5">
      <div className="text-[11px] text-tinta-3">{rotulo}</div>
      <div className="font-mono text-[12px] font-medium">{nome}</div>
    </div>
  )
  return (
    <div className="flex items-center gap-3" aria-hidden>
      {no('Matriz', 'R-MATRIZ')}
      <svg className="h-10 min-w-0 flex-1 overflow-visible">
        <line x1="0" y1="12" x2="100%" y2="12" stroke="var(--color-fibra)" strokeOpacity=".22" strokeWidth="6" strokeLinecap="round" />
        <line x1="0" y1="12" x2="100%" y2="12" stroke="var(--color-fibra)" strokeWidth="2" strokeDasharray="8 4" className="trilho-ativo" />
        <line x1="0" y1="30" x2="100%" y2="30" stroke="var(--color-radio)" strokeOpacity=".45" strokeWidth="2" />
      </svg>
      {no('Filial', 'R-FILIAL')}
    </div>
  )
}
