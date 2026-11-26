import { Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Carregando } from './ui'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import * as Menu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import { Bell, BookOpenText, ClockCounterClockwise, Compass, DotsThreeOutline, Flask, Wrench, CaretDoubleLeft, CaretDoubleRight, ChartLineUp, DotsThree, Lifebuoy, HardDrives, Keyboard, MagnifyingGlass, Moon, SignOut, Siren, Sun, TelegramLogo, Ticket, UserCircle, UsersThree, WhatsappLogo } from '@phosphor-icons/react'
import { iniciarTempoReal, pararTempoReal, useApi, type Alerta, type ListaChamados, type WaConversa } from '../lib/api'
import { alternarTema, temaAtual } from '../lib/tema'
import { situacao, type Manutencao } from '../pages/Manutencao'
import { ConectarTelegram } from '../pages/Perfil'
import { dataHora } from '../lib/fmt'
import { useSessao } from '../lib/sessao'
import Avatar from './Avatar'
import Modal from './Modal'
import Chat from './Chat'
import Tour from './Tour'
import { Paleta, type ItemComando } from './Paleta'
import { Toaster } from '../lib/toast'
import { notificar } from '../lib/avisoNavegador'

const NAV = [
  { para: '/', rotulo: 'Visão do enlace', curto: 'Visão', icone: ChartLineUp, permissao: 'visao' },
  { para: '/alertas', rotulo: 'Alertas e incidentes', curto: 'Alertas', icone: Siren, permissao: 'alertas' },
  { para: '/chamados', rotulo: 'Chamados', curto: 'Chamados', icone: Ticket, permissao: 'chamados' },
  { para: '/whatsapp', rotulo: 'WhatsApp', curto: 'WhatsApp', icone: WhatsappLogo, permissao: 'whatsapp' },
  { para: '/equipamentos', rotulo: 'Equipamentos', curto: 'Equip.', icone: HardDrives, permissao: 'equipamentos' },
  { para: '/manutencao', rotulo: 'Manutenção', curto: 'Manutenção', icone: Wrench, permissao: 'equipamentos' },
  { para: '/testes', rotulo: 'Testes de failover', curto: 'Testes', icone: Flask, permissao: 'testes' },
  { para: '/backups', rotulo: 'Backups', curto: 'Backups', icone: ClockCounterClockwise, permissao: 'backups' },
  { para: '/conhecimento', rotulo: 'Base de conhecimento', curto: 'Ajuda', icone: BookOpenText, permissao: 'conhecimento' },
  { para: '/usuarios', rotulo: 'Usuários', curto: 'Usuários', icone: UsersThree, permissao: 'usuarios' },
]
// Barra inferior do celular: 4 atalhos + "Mais" (o resto do menu fica na folha que sobe)
const ATALHOS_EQUIPE = ['/', '/alertas', '/chamados', '/equipamentos']
const ATALHOS_CLIENTE = ['/', '/chamados', '/conhecimento']
// O noc-senai-tcc é privado (o link dava 404 para o cliente); o README do SennaGuard é público
const AJUDA = 'https://github.com/MathZiraA/sennaguard#readme'
const item = 'flex h-8 cursor-default items-center gap-2 rounded-md px-2.5 text-tinta-2 outline-none data-[highlighted]:bg-realce data-[highlighted]:text-tinta'

export default function Shell() {
  const { eu, pode, sair } = useSessao()
  const [recolhida, setRecolhida] = useState(() => { try { return localStorage.getItem('sg:lateral') === '1' } catch { return false } })
  const { dados: alertas } = useApi<Alerta[]>(pode('alertas') ? '/api/alertas' : '', 10000, ['alertas'])
  // Para a equipe: chamados abertos pela Filial que ninguém assumiu ainda
  const { dados: ch } = useApi<ListaChamados>(pode('atender_chamado') ? '/api/chamados' : '', 60000, ['chamados'])
  const semDono = ch?.manuais.filter(c => c.status === 'aberto').length ?? 0
  const { dados: waConversas } = useApi<WaConversa[]>(pode('whatsapp') ? '/api/whatsapp/conversas' : '', 30000, ['whatsapp'])
  const naFila = waConversas?.filter(c => c.estado === 'fila').length ?? 0
  const ativos = alertas?.filter(a => a.ativo && !a.reconhecido).length ?? 0
  // Faixa de manutenção: em andamento, ou começando nas próximas 24 h (aparece também para o cliente)
  const { dados: janelas } = useApi<Manutencao[]>('/api/manutencoes', 60000, ['manutencao'])
  const agora = Date.now() / 1000
  const janela = janelas?.find(m => !m.cancelada_em && m.inicio <= agora && agora < m.fim)
    ?? janelas?.find(m => !m.cancelada_em && m.inicio > agora && m.inicio - agora < 86400)
  const ponto: Record<string, string | null> = {
    '/alertas': ativos ? 'var(--color-desastre)' : null,
    '/chamados': semDono ? 'var(--color-media)' : null,
    '/whatsapp': naFila ? 'var(--color-media)' : null,
  }
  const alternar = () => { const r = !recolhida; setRecolhida(r); try { localStorage.setItem('sg:lateral', r ? '1' : '0') } catch { /* sem storage */ } }
  const [mais, setMais] = useState(false)
  const [ligandoTelegram, setLigandoTelegram] = useState(false)
  const [tour, setTour] = useState(false)
  const [tema, setTema] = useState(temaAtual)
  const [cmdK, setCmdK] = useState(false)
  const [ajuda, setAjuda] = useState(false)
  const local = useLocation()
  const ir = useNavigate()
  useEffect(() => { iniciarTempoReal(); return pararTempoReal }, [])
  // Aviso do navegador quando surge um alerta crítico novo (mesmo com a aba em segundo plano).
  const vistosRef = useRef<Set<string>>(new Set())
  const primeiraRef = useRef(true)
  useEffect(() => {
    if (!alertas) return
    const criticos = alertas.filter(a => a.ativo && (a.severidade === 'Desastre' || a.severidade === 'Alta'))
    if (primeiraRef.current) { criticos.forEach(a => vistosRef.current.add(a.id)); primeiraRef.current = false; return }
    criticos.forEach(a => {
      if (!vistosRef.current.has(a.id)) {
        vistosRef.current.add(a.id)
        if (document.hidden) notificar('Alerta no NOC SENAI', `${a.severidade}: ${a.nome}`)
      }
    })
  }, [alertas])
  useEffect(() => { setMais(false) }, [local.pathname])
  useEffect(() => { if (eu && !eu.tour_visto) setTour(true) }, [eu?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const permitidos = NAV.filter(n => pode(n.permissao))
  const atalhos = (eu?.papel === 'Cliente' ? ATALHOS_CLIENTE : ATALHOS_EQUIPE).map(p => permitidos.find(n => n.para === p)).filter(n => !!n)
  const resto = permitidos.filter(n => !atalhos.includes(n))

  // Paleta de comandos (⌘/Ctrl+K): telas permitidas + ações rápidas
  const ATALHO_NAV: Record<string, string> = { '/': 'G V', '/alertas': 'G A', '/chamados': 'G C', '/equipamentos': 'G E' }
  const itensComando: ItemComando[] = [
    ...permitidos.map(n => { const Ic = n.icone; return { id: n.para, rotulo: n.rotulo, sub: 'Ir para a tela', icone: <Ic weight="fill" />, atalho: ATALHO_NAV[n.para], acao: () => ir(n.para) } }),
    { id: 'perfil', rotulo: 'Meu perfil', sub: 'Conta, aparência e avisos', icone: <UserCircle weight="fill" />, acao: () => ir('/perfil') },
    ...(pode('abrir_chamado') ? [{ id: 'novo', rotulo: 'Abrir chamado', icone: <Ticket weight="fill" />, acao: () => ir('/chamados?sg=novo') }] : []),
    { id: 'tema', rotulo: tema === 'claro' ? 'Mudar para tema escuro' : 'Mudar para tema claro', icone: tema === 'claro' ? <Moon /> : <Sun />, acao: () => setTema(alternarTema()) },
    { id: 'tour', rotulo: 'Fazer o tour', icone: <Compass weight="fill" />, acao: () => setTour(true) },
    { id: 'atalhos', rotulo: 'Ver atalhos de teclado', icone: <Keyboard weight="fill" />, atalho: '?', acao: () => setAjuda(true) },
  ]
  // Atalhos globais: ⌘/Ctrl+K abre a paleta, "?" a ajuda, "g" + letra pula de tela
  useEffect(() => {
    let g = 0
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      const digitando = !!alvo && (/^(input|textarea|select)$/i.test(alvo.tagName) || alvo.isContentEditable)
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmdK(o => !o); return }
      if (digitando) return
      if (e.key === '?') { e.preventDefault(); setAjuda(true); return }
      if (e.key === 'g' || e.key === 'G') { g = Date.now(); return }
      if (g && Date.now() - g < 900) {
        const rota: Record<string, string> = { v: '/', a: '/alertas', c: '/chamados', e: '/equipamentos', m: '/manutencao', b: '/backups', u: '/usuarios', k: '/conhecimento' }
        const r = rota[e.key.toLowerCase()]
        g = 0
        if (r && permitidos.some(n => n.para === r)) { e.preventDefault(); ir(r) }
      } else g = 0
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [permitidos, ir])

  const mola = { type: 'spring' as const, stiffness: 420, damping: 36 }
  const navegacao = (compacta: boolean) => (
    <nav className="flex flex-col gap-1" data-tour="nav">
      {permitidos.map(({ para, rotulo, icone: Icone }) => (
        <NavLink key={para} to={para} end title={compacta ? rotulo : undefined}
          className={({ isActive }) => `relative flex h-10 items-center gap-3 rounded-lg text-[13.5px] transition-[color,transform] duration-150 focus-visible:outline-offset-0 ${compacta ? 'justify-center' : 'px-3.5'} ${isActive ? 'font-medium text-tinta [&_svg]:text-fibra' : 'text-tinta-2 hover:translate-x-[2px] hover:bg-realce hover:text-tinta'}`}>
          {({ isActive }) => <>
            {/* Indicador que DESLIZA entre as abas (mesmo layoutId = animação compartilhada) */}
            {isActive && <motion.span layoutId="nav-ativo" transition={mola} className="absolute inset-0 -z-10 rounded-lg bg-ativo motion-reduce:transition-none" />}
            {isActive && !compacta && <motion.span layoutId="nav-barra" transition={mola} className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-fibra motion-reduce:transition-none" />}
            <span className="relative">
              <Icone size={19} weight="fill" className={`icone-nav ${isActive ? 'icone-nav-ativo' : ''}`} />
              {compacta && ponto[para] && <span className="ponto-pop absolute -right-1 -top-0.5 size-1.5 rounded-full" style={{ background: ponto[para]! }} />}
            </span>
            {!compacta && <>{rotulo}{ponto[para] && <span className="ponto-pop size-1.5 rounded-full" style={{ background: ponto[para]! }} />}</>}
          </>}
        </NavLink>
      ))}
    </nav>
  )
  const estado = ativos > 0
    ? { cor: 'var(--color-desastre)', texto: `${ativos} alerta${ativos > 1 ? 's' : ''} ativo${ativos > 1 ? 's' : ''}`, sub: 'requer atenção', pulsa: true }
    : janela
      ? { cor: 'var(--color-media)', texto: 'Manutenção', sub: 'janela programada', pulsa: false }
      : { cor: 'var(--color-led)', texto: 'Tudo operacional', sub: 'enlaces no ar', pulsa: false }

  return (
    <div className="flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-lateral px-3.5 pb-5 pt-7 transition-[width] duration-200 md:flex ${recolhida ? 'w-[76px]' : 'w-[240px]'}`}>
        <div className={`mb-12 flex items-center ${recolhida ? 'justify-center' : 'justify-between pl-1.5'}`}>
          {!recolhida && (
            <span className="flex items-center gap-2.5">
              <LogoSG size={22} />
              <span className="text-[15.5px] font-semibold tracking-[-0.015em] text-tinta">SennaGuard</span>
            </span>
          )}
          <button onClick={alternar} aria-label={recolhida ? 'Abrir menu' : 'Recolher menu'}
            className="grid size-7 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-realce hover:text-tinta">
            {recolhida ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
          </button>
        </div>

        {navegacao(recolhida)}

        <div className="mt-auto flex flex-col gap-3">
          {/* Status do NOC: preenche a barra e mostra a saúde geral (estilo "all systems secure"). */}
          <div className={`flex items-center gap-2.5 rounded-xl border border-fio bg-painel/60 ${recolhida ? 'justify-center p-2.5' : 'px-3 py-2.5'}`} title={`${estado.texto} · ${estado.sub}`}>
            <span className="relative grid place-items-center">
              <span className="size-2 rounded-full" style={{ background: estado.cor, boxShadow: `0 0 0 3px color-mix(in srgb, ${estado.cor} 20%, transparent)` }} />
              {estado.pulsa && <span className="respira absolute size-2 rounded-full" style={{ background: estado.cor }} />}
            </span>
            {!recolhida && <div className="min-w-0 leading-tight">
              <div className="truncate text-[12px] font-medium text-tinta">{estado.texto}</div>
              <div className="truncate text-[10.5px] text-tinta-3">{estado.sub}</div>
            </div>}
          </div>
          <a href={AJUDA} target="_blank" rel="noreferrer" title="Central de ajuda"
            className={`flex h-10 items-center gap-3 rounded-lg text-[13.5px] text-tinta-2 transition-colors hover:bg-realce hover:text-tinta ${recolhida ? 'justify-center' : 'px-3.5'}`}>
            <Lifebuoy size={19} weight="fill" />{!recolhida && 'Central de ajuda'}
          </a>
          <div className="mx-1 h-px bg-fio-forte" />
          <Menu.Root>
            <Menu.Trigger data-tour="perfil" className={`flex items-center gap-2.5 rounded-lg py-1.5 text-left transition-colors hover:bg-realce data-[state=open]:bg-realce ${recolhida ? 'justify-center' : 'px-2'}`}>
              {eu && <Avatar id={eu.id} nome={eu.nome} foto={eu.foto} />}
              {!recolhida && <>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[12.5px] font-semibold">{eu?.nome}</div>
                  <div className="mt-0.5 text-[11px] text-tinta-3">{eu?.papel}</div>
                </div>
                <DotsThree size={20} weight="bold" className="text-tinta-2" />
              </>}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content side="top" align="start" sideOffset={6} className="z-50 w-[208px] rounded-lg border border-fio-forte bg-painel-alto p-1 text-[12.5px] shadow-2xl">
                <div className="truncate px-2.5 py-2 text-[11px] text-tinta-3">{eu?.email}</div>
                <Menu.Item onSelect={() => ir('/perfil')} className={item}><UserCircle size={14} weight="fill" />Meu perfil</Menu.Item>
                <Menu.Item onSelect={() => setLigandoTelegram(true)} className={item}>
                  <TelegramLogo size={14} weight="fill" />{eu?.telegram ? 'Telegram conectado' : 'Conectar Telegram'}
                  {eu?.telegram && <span className="ml-auto size-1.5 rounded-full bg-led" />}
                </Menu.Item>
                <Menu.Item onSelect={() => setTema(alternarTema())} className={item}>
                  {tema === 'claro' ? <><Moon size={14} />Tema escuro</> : <><Sun size={14} />Tema claro</>}
                </Menu.Item>
                <Menu.Item onSelect={() => setTour(true)} className={item}><Compass size={14} weight="fill" />Fazer o tour</Menu.Item>
                <Menu.Item onSelect={sair} className={`${item} data-[highlighted]:bg-desastre/10 data-[highlighted]:text-desastre`}><SignOut size={14} />Sair</Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[64px] items-center gap-3 px-4 md:h-[72px] md:px-10">
          {/* Bloco da organização */}
          <div className="flex items-center gap-3">
            <LogoSG size={18} tile />
            <div className="leading-tight">
              <div className="text-[12.5px] font-semibold text-tinta">SENAI</div>
              <div className="text-[12px] text-tinta-2">NOC Matriz · Filial</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setCmdK(true)} title="Buscar · Ctrl/⌘ K"
              className="mr-1 hidden h-9 items-center gap-2 rounded-lg border border-fio pl-2.5 pr-2 text-[12px] text-tinta-3 transition-colors hover:border-fio-forte hover:text-tinta md:flex">
              <MagnifyingGlass size={15} /><span>Buscar</span><kbd className="num rounded border border-fio px-1 py-0.5 text-[10px] leading-none">Ctrl K</kbd>
            </button>
            {pode('alertas') && <NavLink to="/alertas" aria-label={`${ativos} alertas ativos`} data-tour="sino"
              className="relative grid size-9 place-items-center rounded-lg text-tinta transition-colors hover:bg-realce">
              <Bell size={20} weight="fill" />
              {ativos > 0 && <span className="ponto-pop absolute right-2 top-1.5 size-2 rounded-full border-2 border-rack bg-desastre" />}
            </NavLink>}
            <NavLink to="/chamados" aria-label="Chamados" className="relative grid size-9 place-items-center rounded-lg text-tinta transition-colors hover:bg-realce">
              <Ticket size={20} weight="fill" />
              {semDono > 0 && <span className="ponto-pop absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-rack bg-media" />}
            </NavLink>
            {eu && <NavLink to="/perfil" aria-label="Meu perfil" className="ml-1 md:hidden"><Avatar id={eu.id} nome={eu.nome} foto={eu.foto} tamanho={30} /></NavLink>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-2 md:px-10 md:pb-8">
          {janela && (
            <div role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-media/30 bg-media/[0.08] px-5 py-3 text-[13px]">
              <Wrench size={17} weight="fill" className="text-media" />
              <b className="font-semibold">{situacao(janela).texto === 'Em andamento' ? 'Manutenção em andamento' : 'Manutenção programada'}:</b>
              <span>{janela.titulo}</span>
              <span className="num text-tinta-2">· {dataHora(janela.inicio)} até {dataHora(janela.fim)}</span>
              {janela.descricao && <span className="w-full text-[12px] text-tinta-2">{janela.descricao}</span>}
            </div>
          )}
          {/* As telas chegam sob demanda: enquanto o pedaço da página baixa, um esqueleto ocupa o lugar */}
          <Suspense fallback={<Carregando altura="h-[60vh]" />}>
            <div key={local.pathname} className="troca-tela"><Outlet /></div>
          </Suspense>
        </main>
      </div>

      {/* Celular: barra inferior fixa com os atalhos do papel + "Mais" */}
      <nav data-tour="nav" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-fio bg-lateral/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {atalhos.map(({ para, curto, icone: Icone }) => (
          <NavLink key={para} to={para} end
            className={({ isActive }) => `relative flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium ${isActive ? 'text-fibra' : 'text-tinta-3'}`}>
            <span className="relative">
              <Icone size={22} weight="fill" />
              {ponto[para] && <span className="ponto-pop absolute -right-1 -top-0.5 size-2 rounded-full border-2 border-lateral" style={{ background: ponto[para]! }} />}
            </span>
            {curto}
          </NavLink>
        ))}
        <button onClick={() => setMais(true)} data-tour="perfil" className="flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-tinta-3">
          <DotsThreeOutline size={22} weight="fill" />Mais
        </button>
      </nav>
      <Dialog.Root open={mais} onOpenChange={setMais}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] md:hidden" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-fio-forte bg-painel px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 data-[state=open]:animate-[surge-chat_220ms_cubic-bezier(0.23,1,0.32,1)] md:hidden">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-fio-forte" />
            <Dialog.Title className="sr-only">Mais opções</Dialog.Title>
            {eu && (
              <NavLink to="/perfil" className="mb-3 flex items-center gap-3 rounded-xl bg-painel-alto px-4 py-3">
                <Avatar id={eu.id} nome={eu.nome} foto={eu.foto} tamanho={40} />
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{eu.nome}</div><div className="text-[12px] text-tinta-3">{eu.papel} · Meu perfil</div></div>
              </NavLink>
            )}
            <div className="grid grid-cols-3 gap-2">
              {resto.map(({ para, curto, icone: Icone }) => (
                <NavLink key={para} to={para} className={({ isActive }) => `flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl text-[11.5px] font-medium ${isActive ? 'bg-ativo text-tinta' : 'bg-painel-alto text-tinta-2'}`}>
                  <Icone size={22} weight="fill" />{curto}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 flex flex-col">
              {[
                { rotulo: eu?.telegram ? 'Telegram conectado' : 'Conectar Telegram', icone: TelegramLogo, acao: () => { setMais(false); setLigandoTelegram(true) } },
                { rotulo: tema === 'claro' ? 'Tema escuro' : 'Tema claro', icone: tema === 'claro' ? Moon : Sun, acao: () => setTema(alternarTema()) },
                { rotulo: 'Fazer o tour', icone: Compass, acao: () => { setMais(false); setTour(true) } },
                { rotulo: 'Central de ajuda', icone: Lifebuoy, acao: () => window.open(AJUDA, '_blank', 'noreferrer') },
              ].map(({ rotulo, icone: Icone, acao }) => (
                <button key={rotulo} onClick={acao} className="flex h-12 items-center gap-3 border-b border-fio px-1 text-left text-tinta-2"><Icone size={19} weight="fill" />{rotulo}</button>
              ))}
              <button onClick={sair} className="flex h-12 items-center gap-3 px-1 text-left text-desastre"><SignOut size={19} />Sair</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {pode('chat') && <Chat />}
      <Tour aberto={tour} onFim={() => setTour(false)} />
      <Modal aberto={ligandoTelegram} onClose={() => setLigandoTelegram(false)} titulo="Avisos no Telegram"
        descricao="Chamados novos, respostas e alertas chegam direto no seu Telegram. Escolha quais em Meu perfil.">
        <ConectarTelegram conectado={!!eu?.telegram} disponivel={!!eu?.telegram_disponivel} />
      </Modal>

      <Paleta aberto={cmdK} onClose={() => setCmdK(false)} itens={itensComando} />
      <Modal aberto={ajuda} onClose={() => setAjuda(false)} titulo="Atalhos de teclado" descricao="Para navegar o SennaGuard sem o mouse.">
        <ul className="flex flex-col gap-2 text-[13px]">
          {([
            ['Ctrl / ⌘ + K', 'Abrir a busca de telas e ações'],
            ['G  depois  V', 'Ir para a Visão do enlace'],
            ['G  depois  A', 'Ir para Alertas'],
            ['G  depois  C', 'Ir para Chamados'],
            ['G  depois  E', 'Ir para Equipamentos'],
            ['?', 'Abrir esta lista de atalhos'],
          ] as const).map(([k, d]) => (
            <li key={k} className="flex items-center justify-between gap-4 border-b border-fio pb-2 last:border-0">
              <span className="text-tinta-2">{d}</span>
              <kbd className="num shrink-0 rounded-md border border-fio-forte bg-painel-alto px-2 py-1 text-[11px] text-tinta">{k}</kbd>
            </li>
          ))}
        </ul>
      </Modal>
      <Toaster />
    </div>
  )
}

/** Marca SennaGuard: "S" angular geométrico. `tile` usa o roxo da marca de fundo com o "S" em branco. */
export function LogoSG({ size = 28, tile = false }: { size?: number; tile?: boolean }) {
  const s = (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden>
      <path d="M23 8H11v7h10v9H9" stroke="currentColor" strokeWidth="4.3" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
  if (!tile) return <span className="text-fibra">{s}</span>
  return (
    <span className="grid shrink-0 place-items-center rounded-[9px] bg-fibra text-white" style={{ width: size + 12, height: size + 12 }}>{s}</span>
  )
}

/** Dois trilhos (fibra e rádio) ligando dois nós: o mesmo desenho do enlace, em miniatura. */
export function Marca() {
  return (
    <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
      <rect width="28" height="28" rx="8" fill="var(--color-fibra)" fillOpacity=".14" />
      <path d="M7 11 H21" stroke="var(--color-fibra)" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 17 H21" stroke="var(--color-radio)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
      <circle cx="7" cy="14" r="2.6" fill="var(--color-tinta)" />
      <circle cx="21" cy="14" r="2.6" fill="var(--color-tinta)" />
    </svg>
  )
}
