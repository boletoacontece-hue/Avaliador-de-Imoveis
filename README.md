# Avaliador de Imóveis — Acontece

Sistema web para o corretor montar estudos de valor de mercado (venda ou aluguel) com amostras comparativas e enviar ao cliente um link curto com a apresentação completa.

Stack: Vite + React 18, Supabase (projeto **acontece-dashboard**, schema próprio `avaliador`), GitHub Pages via GitHub Actions. Mapa com Leaflet/OpenStreetMap, gráficos com Recharts, animações com Framer Motion.

## Estrutura

```
src/                         app React
  pages/                     Login, Dashboard, Editor, Perfil, Painel, Equipe
  components/editor/         abas Imóvel, Percepções, Comparativos, Valor
  public/                    página pública do cliente
  config/empresa.js          textos e números institucionais (edite aqui)
supabase/migrations/         0001 schema/RLS/link público · 0002 IA e base de mercado
supabase/functions/          gerar-estrategia (IA)
ferramentas/coletor-amostras robô local que busca anúncios no DFImóveis/Wimóveis
.github/workflows/deploy.yml build e publicação automáticos
```

## Implantação (uma vez)

### 1. Banco de dados

No Supabase, projeto **acontece-dashboard** → SQL Editor, rode **nesta ordem**:

1. `supabase/migrations/0001_avaliador_schema.sql`
2. `supabase/migrations/0002_ia_mercado.sql`

Depois: **Settings → API → Exposed schemas** → acrescente `avaliador` e salve.

Em **Authentication → URL Configuration**, inclua o endereço do site (ex.: `https://boletoacontece-hue.github.io/Avaliador-de-Imoveis/`) em *Site URL* ou *Redirect URLs*, para os e-mails de confirmação de conta funcionarem.

### 2. Repositório e deploy

1. Crie o repositório `Avaliador-de-Imoveis` na conta `boletoacontece-hue` e envie estes arquivos.
2. **Settings → Secrets and variables → Actions → Secrets:**
   - `VITE_SUPABASE_URL` — URL do projeto acontece-dashboard
   - `VITE_SUPABASE_ANON_KEY` — a *publishable key* (a mesma usada na Vistoria)
3. **Settings → Pages → Source: GitHub Actions.**
4. Cada push na `main` publica sozinho. O caminho base é o nome do repositório; com domínio próprio, crie a variável `VITE_BASE` = `/`.

### 3. Estratégia com IA (Edge Function)

Com a Supabase CLI:

```
supabase functions deploy gerar-estrategia --project-ref <ref-do-acontece-dashboard>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <ref>
```

Opcional: `ANTHROPIC_MODEL` (padrão `claude-sonnet-5`). A chave fica só no Supabase; o navegador nunca a vê.

### 4. Acessos

- **Gestores:** qualquer usuário ativo com papel `admin` em `public.profiles` já é gestor aqui (vê tudo, acessa Painel e Equipe).
- **Corretores:** criam a conta na tela de login; o gestor libera o e-mail na tela **Equipe**. Corretor liberado no Avaliador **não** ganha acesso às vistorias.
- Cada corretor preenche **Meu perfil** (foto, CRECI, CNAI, WhatsApp): esses dados aparecem na capa e no cartão final da apresentação.

## Como funciona

| Rota | Quem | O quê |
|---|---|---|
| `/` | todos | login / criar conta |
| `/dashboard` | corretor | minhas avaliações, estatísticas, nova avaliação |
| `/evaluation/:id` | dono ou gestor | editor em 4 abas, auto-save 5 s após a última alteração |
| `/profile` | corretor | cartão do corretor |
| `/painel` | gestor | totais, ranking, relatórios, transferência, ativar/desativar links |
| `/equipe` | gestor | liberar e bloquear acessos |
| `/abc234` e `/a/<uuid>` | público | apresentação para o cliente |

- **Link público:** código de 6 caracteres gerado no banco, sem letras ambíguas (0/o, 1/l/i). A página pública lê tudo por uma única função (`avaliacao_publica`); nenhuma tabela tem leitura anônima. Link inativo devolve só o cartão do corretor.
- **Visualizações:** cada abertura pelo cliente é contada (a prévia do corretor e de gestores não conta) e aparece no editor e no dashboard.
- **Concorrência:** se a avaliação for alterada em outro aparelho, o editor avisa e pergunta qual versão manter.
- **Fotos:** comprimidas no navegador (WebP, ~1600 px) antes de ir para o bucket `property-thumbnails`.

## Amostras dos portais — Coletor de Amostras

Veja `ferramentas/coletor-amostras/LEIA-ME.txt`. Resumo: o corretor cola no `config.json` os links de busca do DFImóveis/Wimóveis, dá dois cliques em `rodar.bat` e importa o `.json` gerado em **Comparativos → Importar JSON/CSV**. Roda no computador do corretor, com navegador visível; se o portal pedir verificação, o coletor pausa para a pessoa resolver.

A importação também aceita o CSV do robô `imoveis_scanner` original e qualquer JSON/CSV com as colunas: `address/endereco`, `price/preco/valor`, `area/area_m2`, `bedrooms/quartos`, `suites`, `parking/vagas`, `source_url/link`, `source_name/portal`, `thumbnail_url/foto`, `broker_observations/obs`, `latitude/lat`, `longitude/lng`, além de `anunciante`, `condominio` e `iptu` (que viram observações).

## Inteligência de mercado (próxima fase)

A seção só aparece com dados reais em `avaliador.mercado_referencia`, alimentada pelo ETL do `acontece_bi` com a **service_role**. Campos: `finalidade`, `tipo`, `bairro`, `area`, `valor`, `data_referencia`. Somente dados anonimizados — nunca endereço, proprietário, inquilino ou contrato. A página pública mostra apenas médias de bairros/tipos com 5 ou mais registros.

## Conteúdo a revisar antes de usar com clientes

- `src/config/empresa.js`: texto de apresentação e números de "Quem somos" (hoje: +3.000 imóveis administrados, 3 escritórios).
- Par de fotos amadora × profissional do mesmo imóvel (em `public/educacao/` e referenciado em `empresa.js`). Sem elas, o card mostra só o texto.
- Texto de metodologia (seção Valor sugerido, em `src/public/Secoes.jsx`): recomenda-se validação jurídica.

## Desenvolvimento local

```
cp .env.example .env    # preencha URL e publishable key
npm install
npm run dev
```
