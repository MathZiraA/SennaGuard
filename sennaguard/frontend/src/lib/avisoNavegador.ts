/** Avisos do navegador (Notification API, local — sem servidor de push): um alerta crítico aparece
 *  mesmo com a aba em segundo plano. A pessoa liga nas preferências; vale só neste navegador. */
const suporta = () => typeof window !== 'undefined' && 'Notification' in window

export function avisosLigados(): boolean {
  try { return suporta() && localStorage.getItem('sg:avisoNav') === '1' && Notification.permission === 'granted' } catch { return false }
}

/** Pede permissão e liga. Devolve se ficou ligado. */
export async function ligarAvisos(): Promise<boolean> {
  if (!suporta()) return false
  let p = Notification.permission
  if (p === 'default') { try { p = await Notification.requestPermission() } catch { return false } }
  const ok = p === 'granted'
  try { localStorage.setItem('sg:avisoNav', ok ? '1' : '0') } catch { /* sem storage */ }
  return ok
}

export function desligarAvisos() { try { localStorage.setItem('sg:avisoNav', '0') } catch { /* sem storage */ } }

export function notificar(titulo: string, corpo: string) {
  try { if (avisosLigados()) new Notification(titulo, { body: corpo, tag: 'noc-alerta' }) } catch { /* bloqueado */ }
}
