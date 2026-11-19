/** Densidade da interface: 'confortavel' (padrão) ou 'compacto' (mais dados por tela, bom para TV/NOC).
 *  Guardada no navegador; aplica data-densidade no <html>, o CSS cuida do resto. */
export type Densidade = 'confortavel' | 'compacto'

export function densidadeAtual(): Densidade {
  try { return localStorage.getItem('sg:densidade') === 'compacto' ? 'compacto' : 'confortavel' } catch { return 'confortavel' }
}

export function aplicarDensidade(d: Densidade = densidadeAtual()) {
  if (d === 'compacto') document.documentElement.dataset.densidade = 'compacto'
  else delete document.documentElement.dataset.densidade
}

export function definirDensidade(d: Densidade) {
  try { localStorage.setItem('sg:densidade', d) } catch { /* sem storage: vale só nesta aba */ }
  aplicarDensidade(d)
}
