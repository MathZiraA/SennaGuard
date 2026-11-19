/** Acento do site, escolhido nas preferências e guardado no navegador de cada pessoa.
 *  Só muda a cor primária (botões, item ativo, foco, links e a série principal dos gráficos);
 *  o resto da paleta (preto neutro, cards, texto) é fixo, no estilo do painel.
 *  Além dos presets, a pessoa pode escolher QUALQUER cor ('custom'): o tom de hover e a cor do
 *  texto sobre o acento são calculados para manter o contraste. */
export type Acento = 'grafite' | 'roxo' | 'azul' | 'verde' | 'ambar' | 'rosa' | 'custom'

export const ACENTOS: { v: Acento; rotulo: string; amostra: string }[] = [
  { v: 'grafite', rotulo: 'Grafite', amostra: '#ededf2' }, // padrão (igual ao print)
  { v: 'roxo', rotulo: 'Roxo', amostra: '#8b5cf6' },
  { v: 'azul', rotulo: 'Azul', amostra: '#3b82f6' },
  { v: 'verde', rotulo: 'Verde', amostra: '#10b981' },
  { v: 'ambar', rotulo: 'Âmbar', amostra: '#f59e0b' },
  { v: 'rosa', rotulo: 'Rosa', amostra: '#ec4899' },
]

const HEX_PADRAO = '#6366f1' // índigo: sugestão inicial do seletor de cor livre

export function acentoAtual(): Acento {
  try {
    const v = localStorage.getItem('sg:acento') as Acento | null
    return v && (v === 'custom' || ACENTOS.some(a => a.v === v)) ? v : 'grafite'
  } catch { return 'grafite' }
}

export function acentoHex(): string {
  try { return localStorage.getItem('sg:acentoHex') || HEX_PADRAO } catch { return HEX_PADRAO }
}

// --- utilidades de cor ---------------------------------------------------
function hexRgb(h: string): [number, number, number] {
  let s = h.replace('#', '')
  if (s.length === 3) s = s.split('').map(c => c + c).join('')
  const n = parseInt(s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}
function luminancia([r, g, b]: number[]): number {
  const f = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function clarear(rgb: number[], t: number): number[] { return rgb.map(c => c + (255 - c) * t) }

/** Aplica os tokens da cor livre direto no <html> (inline). */
function aplicarCustom(hex: string) {
  const rgb = hexRgb(hex)
  const r = document.documentElement
  r.style.setProperty('--color-fibra', hex)
  r.style.setProperty('--color-fibra-hover', rgbHex(clarear(rgb, 0.16)))
  r.style.setProperty('--color-sobre-fibra', luminancia(rgb) > 0.6 ? '#15151a' : '#ffffff')
}
function limparCustom() {
  const r = document.documentElement
  r.style.removeProperty('--color-fibra')
  r.style.removeProperty('--color-fibra-hover')
  r.style.removeProperty('--color-sobre-fibra')
}

export function aplicarAcento(a: Acento = acentoAtual()) {
  if (a === 'grafite') { delete document.documentElement.dataset.acento; limparCustom(); return }
  if (a === 'custom') { document.documentElement.dataset.acento = 'custom'; aplicarCustom(acentoHex()); return }
  // preset colorido: liga o bloco data-acento do CSS e tira qualquer cor livre antiga
  limparCustom()
  document.documentElement.dataset.acento = a
}

export function definirAcento(a: Acento) {
  try { localStorage.setItem('sg:acento', a) } catch { /* sem storage: vale só nesta aba */ }
  aplicarAcento(a)
}

/** Escolhe uma cor livre: guarda o hex, marca o acento como 'custom' e aplica. */
export function definirHex(hex: string) {
  try { localStorage.setItem('sg:acentoHex', hex); localStorage.setItem('sg:acento', 'custom') } catch { /* sem storage */ }
  document.documentElement.dataset.acento = 'custom'
  aplicarCustom(hex)
}
