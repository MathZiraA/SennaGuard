import { StrictMode, Suspense, lazy, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Shell, { LogoSG } from './components/Shell'
import { ProvedorSessao, useSessao } from './lib/sessao'
import Login from './pages/Login'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import { aplicarTema } from './lib/tema'

aplicarTema()

// Cada tela vira um pedaço separado do pacote: o login e a primeira tela abrem sem baixar o resto (gráficos, chat, etc.)
const Tv = lazy(() => import('./pages/Tv'))
const Visao = lazy(() => import('./pages/Visao'))
const Alertas = lazy(() => import('./pages/Alertas'))
const Chamados = lazy(() => import('./pages/Chamados'))
const Equipamentos = lazy(() => import('./pages/Equipamentos'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
import Manutencoes from './pages/Manutencao' // a Shell já usa este módulo (faixa de manutenção)
const Testes = lazy(() => import('./pages/Testes'))
const Backups = lazy(() => import('./pages/Backups'))
const Conhecimento = lazy(() => import('./pages/Conhecimento'))
import Perfil from './pages/Perfil' // a Shell já usa este módulo (Telegram)

/** Página só para quem tem a permissão; os outros voltam para a visão do enlace. */
function Exige({ permissao, children }: { permissao: string; children: ReactNode }) {
  return useSessao().pode(permissao) ? children : <Navigate to="/" replace />
}

/** Enquanto a sessão é conferida: a marca no centro, em vez de uma tela vazia. */
function Abertura() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Carregando o SennaGuard">
      <div className="respira"><LogoSG size={30} tile /></div>
    </div>
  )
}

function App() {
  const { eu, carregando } = useSessao()
  if (useLocation().pathname === '/tv') return <Suspense fallback={<Abertura />}><Tv /></Suspense>  // a TV entra pelo link fixo, sem login
  if (carregando) return <Abertura />
  if (!eu) return <Login />
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Visao />} />
        <Route path="alertas" element={<Exige permissao="alertas"><Alertas /></Exige>} />
        <Route path="chamados" element={<Exige permissao="chamados"><Chamados /></Exige>} />
        <Route path="equipamentos" element={<Exige permissao="equipamentos"><Equipamentos /></Exige>} />
        <Route path="usuarios" element={<Exige permissao="usuarios"><Usuarios /></Exige>} />
        <Route path="manutencao" element={<Exige permissao="equipamentos"><Manutencoes /></Exige>} />
        <Route path="testes" element={<Exige permissao="testes"><Testes /></Exige>} />
        <Route path="backups" element={<Exige permissao="backups"><Backups /></Exige>} />
        <Route path="conhecimento" element={<Exige permissao="conhecimento"><Conhecimento /></Exige>} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ProvedorSessao><App /></ProvedorSessao>
    </BrowserRouter>
  </StrictMode>,
)
