/** Sincroniza a aparência (tema, acento e densidade) com a conta no servidor.
 *  No login, o que está na conta vale (e atualiza o localStorage); ao mudar, salvamos na conta.
 *  Se o servidor estiver fora, tudo continua funcionando só pelo navegador. */
import { definirAcento, definirHex, type Acento } from './cores'
import { definirTema, type Tema } from './tema'
import { definirDensidade, type Densidade } from './densidade'
import { api, type Aparencia } from './api'

export function aplicarServidor(ap: Aparencia | null) {
  if (!ap) return
  if (ap.tema === 'escuro' || ap.tema === 'claro') definirTema(ap.tema as Tema)
  if (ap.densidade === 'confortavel' || ap.densidade === 'compacto') definirDensidade(ap.densidade as Densidade)
  if (ap.acento === 'custom' && ap.acentoHex) definirHex(ap.acentoHex)
  else if (ap.acento) definirAcento(ap.acento as Acento)
}

export function salvar(ap: Aparencia) {
  api('/api/eu/aparencia', { method: 'PUT', body: JSON.stringify(ap) }).catch(() => { /* offline: vale só no navegador */ })
}
