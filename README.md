# Painel – chapa estadual do PODE/SC (Eleições 2026)

Monteiro e Monteiro Advogados Associados · Núcleo de Direito Eleitoral · **Documento interno** · Data-base 24/11/2026

Painel interativo de avaliação da chapa de deputado estadual do PODE/SC (DRAP 0600497-79.2026.6.24.0000).
A triagem indica onde verificar e não conclui pela existência de fraude.

## Abrir

Baixe `Painel_Chapa_Estadual_PODE_SC_Novo_2026.html` e abra no Chrome. O arquivo é autocontido (fonte, logos, fotos de urna, dados e gráficos embutidos) e funciona sem internet.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `Painel_Chapa_Estadual_PODE_SC_Novo_2026.html` | Painel pronto |
| `dados/dados_manuais.js` | Fatos transcritos dos relatórios da pasta 07, com a fonte de cada bloco |
| `dados/dados_auto.js` | Dados gerados pelo script 02 (métricas de votação, votos por município e local, fotos, publicações, malha do IBGE) |
| `_scripts/02_painel_dados.pl` | Extração dos dados automáticos (aborta se os números divergirem das frentes) |
| `_scripts/03_painel_html.pl` | Montagem do HTML a partir do template, do CSS, do JS e dos dados |
| `_scripts/painel.template.html`, `painel.css`, `painel.js` | Interface |

## Regerar

A partir da pasta do painel no Drive (`07_LEVANTAMENTO_AIME_PARTIDO_NOVO/PAINEL - PODE SC`):

```
perl -CSD _scripts/02_painel_dados.pl
perl -CSD _scripts/03_painel_html.pl
```

O script 02 lê cópias de trabalho em `C:/relest/p07` (não incluídas neste repositório). Para só atualizar fatos, edite `dados/dados_manuais.js` e rode apenas o script 03.

A pasta do Drive é a versão de trabalho; este repositório é cópia.
