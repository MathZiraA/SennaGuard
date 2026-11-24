# SennaGuard — sistema de interface

## Direção

Sala de NOC à noite, sobre base **preta neutra**. A referência de estrutura é o painel Sentinel — fundo preto quase puro, cards escuros com borda sutil, cantos arredondados, sombra suave e um acento único e disciplinado, sem degradês decorativos. O tema **padrão é o Grafite**: monocromático (preto/branco/cinza), com o acento em **quase-branco**. A marca SennaGuard é o **roxo `#521B89`**, que fica disponível como um dos acentos escolhíveis (preset "Roxo"), não como padrão. Quem usa:
- o operador de plantão, olhando a TV ou o notebook;
- o cliente da Filial, abrindo um chamado.

A primeira leitura de qualquer tela responde a uma pergunta: **a Filial tem redundância agora?**

Princípio: gastar a ousadia em um lugar só. O estado normal é quase todo neutro; a cor só aparece onde há informação (enlace, severidade, status) — e no Grafite nem isso: a severidade é dada pelo **brilho** (mais claro = mais grave).

## Cor customizável

A cor é uma preferência de cada pessoa (em **Meu perfil › Aparência**, guardada na conta e sincronizada entre dispositivos; cai para o navegador se o servidor estiver fora):
- **Acento:** Grafite (padrão, quase-branco), Roxo, Azul, Verde, Âmbar, Rosa, ou **qualquer cor livre** (o tom de hover e a cor do texto sobre o acento são calculados para manter contraste).
- **Tema:** escuro (padrão) ou claro.
- **Densidade:** confortável (padrão) ou compacto (mais dados por tela, bom para TV).

No Grafite as severidades são tons de cinza; ao escolher um acento colorido, elas voltam a ter cor (vermelho→lilás).

## Marca

**LogoSG:** um "S" geométrico angular, traçado na cor do acento. A variante `tile` (fundo do acento, "S" em branco, raio 9 px) aparece no cabeçalho e no login; a variante simples, na barra lateral. Substitui qualquer "S" genérico.

## Assinatura: o trilho do caminho ativo

Matriz ⇄ Filial com dois trilhos. A fibra fica em cima, na cor do acento, e o rádio embaixo, em cinza frio (`radio`).

| Estado | Como aparece |
| --- | --- |
| Ativo | tracejado andando (`.trilho-ativo`) e halo de 6 px a 25% |
| Em espera | linha sólida a 45% |
| Fora | tracejado vermelho, cortado no meio |

O trilho aparece em:
- `Trilho` (topo de Equipamentos, que é a página de topologia; a Visão segue a grade da referência);
- `TrilhoMini` (28 px, nas listas de alertas e chamados, no enlace atingido; o assunto é o texto antes do ":");
- a faixa do topo do Login;
- a `Foto` do enlace no chamado SG.

**Regra:** todo elemento novo que fale de um enlace usa esse desenho, nunca um ícone genérico.

## Tokens (`frontend/src/index.css`, `@theme`)

Tema escuro Grafite (padrão). Os acentos coloridos ligam-se por `data-acento` no `<html>`; o tema claro inverte a hierarquia. O acento padrão no claro é quase-preto.

| Token | Valor (Grafite) | Uso |
| --- | --- | --- |
| `lateral` | #0a0a0c | barra lateral (preto neutro) |
| `rack` | #09090b | fundo da área de trabalho (preto quase puro) |
| `painel` | #111113 | cards |
| `painel-alto` | #1b1b1f | pílulas, chips, menus, diálogos |
| `fenda` | #0d0d10 | campos (afundados) |
| `tinta` / `-2` / `-3` / `-4` | #f3f3f5 / #b5b5bd / #85858e / #5a5a63 | texto: principal / apoio / meta / desligado |
| `fibra` | #ededf2 | enlace principal **e** acento/ação primária. Muda com o acento: Roxo #8b5cf6 · Azul #3b82f6 · Verde #10b981 · Âmbar #f59e0b · Rosa #ec4899 · ou cor livre |
| `sobre-fibra` | #121214 | texto sobre o acento (no Grafite o botão primário é claro com texto escuro) |
| `radio` | #8b8d98 | enlace de backup, sinal em dBm (cinza frio) |
| `led` | #b7b9c2 (Grafite) / #3ecf8e (acento) | link up, livro íntegro |
| `desastre` `alta` `media` `aviso` | #fafafa #cfcfd4 #9b9ba3 #74747e (Grafite, por brilho) | severidades. Com acento colorido: #e26a7d #e38b99 #c290dc #a597e2 |
| `limite` | #b0b0b8 | linha tracejada do limite crítico nos gráficos |
| `fio` / `fio-forte` | branco 7% / 13% | bordas e divisores |

As cores de severidade só aparecem onde há problema. No Grafite a tela normal é toda cinza-neutra; com um acento, o acento pontua ação e caminho ativo.

## Profundidade e forma

- **Profundidade:** cards têm borda (`border-fio`) **e** sombra suave (`.sombra-card`: fio interno + sombra difusa) que abre no hover, com um leve *hover-lift* (sobe 3 px). `shadow-2xl` fica para menus e diálogos flutuantes.
- **Raio:** `rounded-md` 6 px (chips), `rounded-lg` 8 px (botões, campos, itens de menu), 10 px (barra de contexto), `rounded-2xl` 16 px (cards), `rounded-full` (pílulas de alerta e segmentados).
- **Brilho:** o `Led` (ponto de 6 px com `box-shadow` da própria cor) é o único brilho da interface. Ele pulsa (`.respira`) só quando o estado exige atenção.
- **Scrollbar:** fina (5 px), trilho transparente.

## Tipografia

- **Fontes:** Bricolage Grotesque (títulos e display), Hanken Grotesk (interface e corpo) e JetBrains Mono (IPs, portas, `NOC-xxx`/`SG-xxx`, hashes). Empacotadas via @fontsource, porque a Filial pode estar sem internet.
- **Escala:** base de 13.5 px. Meta 10.5–11 · corpo 13.5 · navegação 13.5 · título de card ~15.5/600 (Bricolage) com o valor ao lado na cor do acento 17/600 e "há X" 10.5 · título de página 22 em Bricolage, formato migalha (`Enlaces › Matriz ⇄ Filial`).
- **Hierarquia:** feita por peso e tinta, não só por tamanho. Valor 600/`tinta`, rótulo 500/`tinta-2`, meta 400/`tinta-3`.
- **Números:** todo número dinâmico usa `.num` (tabular-nums); os de resumo contam até o valor na entrada (`CountUp`) e dão um realce curto quando o dado muda ao vivo.

## Espaçamento (base 4 px)

| Elemento | Medidas |
| --- | --- |
| Card | `px-5 py-5`; card de gráfico `px-9 pt-7 pb-5`. Densidade compacta reduz os cards |
| Gap entre blocos | `gap-3` (12 px) |
| Barra de contexto | `min-h-[52px] px-7`, itens separados por divisor vertical de 20 px |
| Linhas de lista | `px-3 py-2` (compactas) ou `px-5 py-3.5` (tabelas); cada linha reage sozinha no hover (fundo + barra de acento à esquerda) |
| Barra lateral | 240 px (recolhida 76 px); logo + "SennaGuard" no topo; itens `h-10`, ícones Phosphor 19 px; **indicador do item ativo desliza** entre as abas (`#19191d` + barra de acento); no rodapé, um card de status ("Tudo operacional" / "N alertas ativos") preenche o espaço, acima da ajuda e do perfil |
| Cabeçalho | `h-[72px]`, sem linha; organização à esquerda (tile do acento com "S" + SENAI + NOC Matriz · Filial); busca (⌘K) à direita |
| Conteúdo | `max-w-[1400px] px-10`, entra com transição suave a cada troca de tela |
| Grade da Visão | `[1fr_300px]`: Latência | Alertas / Tráfego | Caminho ativo |

## Componentes (`components/ui.tsx`, `Modal.tsx`, `Atendimento.tsx`, `Paleta.tsx`)

- **Botao:** `h-8`, `px-3.5`, `rounded-lg`, 12.5/500, `active:scale-[0.97]`. Variantes:
  - `primario`: fundo `fibra`, texto `sobre-fibra` (no Grafite, claro com texto escuro);
  - `quieto`: cinza cheio `#19191d` ("Exportar relatório");
  - `contorno`: borda `#2a2a31` ("Últimas 24 horas ▾");
  - `perigo`: vermelho a 12%.
- **Chip:** `h-[26px]`, `px-2.5`, `rounded-md`, 11.5/500, `bg-painel-alto` ("Limites", "Comparar", "Baixar"); ativo `bg-fibra/15`.
- **Gráfico** (`Grafico.tsx`): sem eixo Y e sem grade; eixo X só com horas cheias; área em gradiente (50% → 4%); acima do limite crítico, linha e área rosa; limites tracejados `6 5`; incidente = faixa rosa com balão "⚠ Fibra fora". *Tooltip* com valor **e** comparação com a média; opção **Comparar** sobrepõe o período anterior como linha fantasma; *sparkline* ao lado do número de resumo.
- **Pílula de alerta:** `h-[30px]`, `rounded-full`, `bg-painel-alto`: ponto + nome curto 600 + "às dd/mm hh:mm (duração)"; desliza um tico no hover. O alerta ativo mais grave ganha contorno. Rodapé "● Crítico n · ● Aviso n · Total n".
- **Campo:** `h-9` (login `h-10`), `bg-fenda`, `border-fio`, foco por borda `border-fibra/60` (sem anel grande).
- **Segmentado:** trilho em cápsula; a pílula ativa **desliza** até a opção escolhida.
- **Sev:** pílula com o texto na cor da severidade sobre a mesma cor a 12%.
- **StatusChamado:** Led + rótulo. Aberto = `media` (pulsa), em atendimento = `fibra`, resolvido = `led`.
- **Paleta de comandos** (`Paleta.tsx`): Ctrl/⌘+K busca telas e ações, com navegação por teclado; atalhos `g`+tecla e `?`.
- **Toast** (`lib/toast`): confirmações rápidas num canto (foto trocada, alerta reconhecido, painel salvo).
- **Modal:** Radix Dialog. `lado` = gaveta de 520 px (detalhe de alerta/chamado); centro = 460 px (formulário); easing `cubic-bezier(0.23,1,0.32,1)`.
- **Vazio:** estado vazio ilustrado (ícone num círculo + frase útil).
- **Histórico** (chamado SG): linha vertical `border-fio`, ponto na cor do acento para a equipe e âmbar para o cliente, hash em mono 10 px `tinta-4`.

## Padrões de tela

- **Título:** h1 22 (Bricolage) e uma frase de apoio em `tinta-3`. A ação primária fica à direita.
- **Lista principal:** um card `!p-0` sem *hover-lift* (quem reage é cada linha); clicar abre a gaveta, com o estado na URL (`?id=` ou `?sg=`). Alertas guardam os filtros na URL e marcam o que é "novo desde a última visita".
- **Integridade** (chamados): faixa com escudo. Íntegro = `led` a 6%, adulterado = `desastre` a 10%.
- **Perfil Cliente:** vê menos, nunca vê uma tela quebrada. Esconde a barra de contexto do host e troca Alertas por "Seus chamados".
- **Vazio:** ícone + frase útil ("Nenhum chamado. Tudo certo com a Filial.").

## Movimento

- Até 400 ms, só `transform`, `opacity`, `filter` e cor.
- Indicador da barra lateral e pílulas de segmentado deslizam (spring/`cubic-bezier(0.22,1,0.36,1)`); cartões entram escalonados; números contam e dão realce ao vivo; troca de tela sobe e surge.
- Pressionar: scale 0.97.
- Tudo é desligado com `prefers-reduced-motion` (fica só o estado final).
