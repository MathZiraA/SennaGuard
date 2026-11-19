/** Toque (modelo dos componentes do transitions.dev): num toque o navegador solta o :active rápido demais
 *  para o "pressionar" aparecer. Aqui, um toque segura .is-pressed por pelo menos --press-dur. Mouse não passa por aqui. */
const ALVOS = 'button,[role="button"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="switch"],summary,.t-pressable'

export function ativarToque() {
  const minimo = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--press-dur')) || 150
  const timers = new WeakMap<Element, number>()
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return
    const el = (e.target as Element | null)?.closest?.(ALVOS) as HTMLElement | null
    if (!el || (el as HTMLButtonElement).disabled) return
    const t0 = performance.now()
    clearTimeout(timers.get(el))
    el.classList.add('is-pressed')
    const soltar = () => {
      document.removeEventListener('pointerup', soltar, true)
      document.removeEventListener('pointercancel', soltar, true)
      timers.set(el, window.setTimeout(() => el.classList.remove('is-pressed'), Math.max(0, minimo - (performance.now() - t0))))
    }
    document.addEventListener('pointerup', soltar, true)
    document.addEventListener('pointercancel', soltar, true)
  }, { passive: true })
}
