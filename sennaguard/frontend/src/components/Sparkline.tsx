/** Mini-tendência (sparkline) do período visível, ao lado do número grande — resumo em um relance. */
export default function Sparkline({ dados, cor = 'var(--color-fibra)', largura = 64, altura = 22 }: {
  dados: (number | null | undefined)[]; cor?: string; largura?: number; altura?: number
}) {
  const vals = dados.filter((v): v is number => v != null)
  if (vals.length < 2) return null
  const min = Math.min(...vals), max = Math.max(...vals)
  const faixa = max - min || 1
  const pad = 2
  const n = dados.length
  // Só os pontos com valor viram vértices; buracos (null) partem a linha
  const pts = dados.map((v, i) => v == null ? null
    : [pad + (i / (n - 1)) * (largura - 2 * pad), altura - pad - ((v - min) / faixa) * (altura - 2 * pad)] as [number, number])
  let d = ''
  let caneta = false // caneta no papel? (buraco = levanta)
  pts.forEach(p => {
    if (!p) { caneta = false; return }
    d += `${caneta ? ' L' : ' M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
    caneta = true
  })
  const ultimo = pts.filter(Boolean).at(-1) as [number, number] | undefined
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} className="overflow-visible" aria-hidden>
      <path d={d.trim()} fill="none" stroke={cor} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      {ultimo && <circle cx={ultimo[0]} cy={ultimo[1]} r={1.8} fill={cor} />}
    </svg>
  )
}
