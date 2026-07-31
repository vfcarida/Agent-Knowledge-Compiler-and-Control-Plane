# AKCP — Análise Profunda (Rodada 2) e Roadmap Priorizado

> Data: 2026-07-31 · Base: commit `573c633` · Método: 3 auditorias paralelas
> (código, DX hands-on, pesquisa de ecossistema) + métricas medidas por execução
> real (cobertura v8 + mutation testing Stryker). Nada abaixo é estimativa.

---

## 1. Sumário executivo

O projeto tem uma **tese forte e diferenciada** (lineage compile-time→runtime:
"qual versão de documento autorizou esta ação?") sobre uma **execução com três
camadas de risco**:

1. **Risco existencial de posicionamento** — o Google Cloud lançou em jun/2026 o
   _Open Knowledge Format (OKF)_ — mesma ideia, mesmo nome, mesmo acrônimo do
   formato do AKCP. Continuar publicando um "OKF" próprio agora é briga perdida;
   tratá-lo como _input/output de primeira classe_ converte a colisão em
   distribuição.
2. **Risco de credibilidade no primeiro contato** — o quickstart falha 3 vezes
   nos primeiros 90 segundos (cache incremental commitado → compile no-op;
   artefatos escritos no cwd errado; `serve mcp` quebrado por dependência
   ausente). Um avaliador honesto fecha a aba antes de ver o valor.
3. **Risco de promessa > entrega** — plugins que não carregam, conectores
   externos que não existem, evals que se auto-validam com mock, 2.072 linhas de
   CLI refatorado morto. As docs prometem mais do que o código faz em ~6 áreas.

A boa notícia: a fundação real (compiler pipeline, policy engine, HITL store,
IR tipado) é sólida — 619/619 testes verdes, cobertura 73%/80%/84%, mutation
score 60% com o IR schema em 100%. O gap é de _fechamento_, não de fundação.

---

## 2. Métricas medidas (baseline para ratchet)

### Cobertura (v8, core + mcp-profile-server + mcp-automation-server)

| Métrica    | Valor      |
| ---------- | ---------- |
| Statements | **73,31%** |
| Branches   | **80,48%** |
| Functions  | **84,31%** |

Zonas críticas de cobertura baixa:

| Área                                       | Stmts | Observação                                |
| ------------------------------------------ | ----- | ----------------------------------------- |
| automation page-objects/strategies         | 3–8%  | Playwright real nunca exercitado em teste |
| observability/telemetry.ts (ambos servers) | 0%    |                                           |
| mcp-automation-server/server.ts            | 39%   | 1.000+ linhas, caminho crítico HITL       |
| mcp-profile-server/server.ts               | 41%   | dispatcher dinâmico de tools              |
| approval-store.ts (SQLite)                 | 45%   | par do redis-store (88%)                  |
| core/cli/{validate,migrate}-bundle.ts      | 0%    | entrypoints CLI sem teste                 |
| agents/sync.ts                             | 0%    |                                           |

### Mutation testing (Stryker, 1.419 mutantes: compiler/policies/privacy/ir)

| Área                                                 | Score                                 | Leitura                                 |
| ---------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| **Geral**                                            | **60,18%** (68,65% s/ código coberto) | baseline razoável, longe de forte       |
| ir/ (schema + build-ir)                              | **100%**                              | property tests (fast-check) pagaram     |
| privacy/regex-pii-detector                           | 94%                                   |                                         |
| privacy/pii-redactor                                 | 84%                                   |                                         |
| compiler/stages (média)                              | 69%                                   |                                         |
| policies/engine.ts                                   | **55%**                               | crítico: é o enforcement de produção    |
| policies/adapter.ts                                  | **52%**                               | tradução PolicyCard→rules pouco testada |
| privacy/waf.ts                                       | **37%**                               | os padrões regex quase não têm asserção |
| compiler/compile.ts                                  | **15%**                               | branches de erro nunca exercitados      |
| privacy/pii-report.ts, policies/internal-provider.ts | **0%**                                | sem teste direto                        |

**Recomendação de ratchet:** gate informativo hoje; após os itens da §6, subir
`thresholds.break` do Stryker para 55 e a cobertura de statements para 75, e só
aumentar (nunca reduzir) — o mesmo padrão já usado no vitest raiz.

### Correções feitas nesta rodada (necessárias para medir)

- `frontmatter-parser.ts`: normalização de separadores Windows **antes** do
  `path.relative` (bug real; o teste estava certo).
- `golden.test.ts` + snapshots: scrub de valores dependentes de máquina (paths
  absolutos, sizeBytes, config-hash). Antes, os snapshots continham paths
  `C:\Users\...` do autor e falhavam em qualquer outra máquina — incluindo CI.
- `stryker.conf.json`: `plugins` explícito (requisito do pnpm) + `inPlace`
  (fixtures fora do pacote). Suíte agora **619/619 verde**.

---

## 3. Estratégia e posicionamento

### 3.1 A colisão de nomes é existencial, não cosmética

- **Google Cloud OKF** (jun/2026, Apache-2.0): markdown + frontmatter por
  conceito, links como grafo, `index.md`/`log.md` — é o formato do AKCP, com o
  mesmo nome, publicado por um hyperscaler com catálogo de ingestão.
- **Open Knowledge Foundation** detém "OKF" culturalmente desde 2004.
- **akcp.com** é um vendor de sensores de datacenter desde 1981.

**Movimento recomendado (transforma ameaça em alavanca):**

1. Renomear o formato interno (ex.: _AK-Bundle_) e **declarar o OKF do Google
   como conector de entrada e target de saída de primeira classe**.
2. Reposicionar o pitch: _"o compilador e control plane para bundles OKF"_ —
   o Google lançou formato e catálogo, mas **não** lançou compilador, IR tipado,
   scorecard, policy layer nem HITL. Esse é exatamente o produto daqui.
3. Avaliar renome do produto (AKCP → outro nome) antes do primeiro publish npm,
   quando o custo de mudar ainda é zero.

### 3.2 Onde competir e onde integrar

| Categoria                     | Situação 2026                                                                           | Decisão recomendada                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empacotamento de conhecimento | AGENTS.md (Linux Foundation, 60k+ repos) e SKILL.md/Agent Skills (~90k skills) venceram | **Compilar PARA esses formatos** (target agents-md já existe; adicionar target SKILL.md). Não competir com formato próprio                                |
| MCP gateways                  | 13+ players enterprise (ContextForge/IBM, Lunar, Kong, Docker, Lasso)                   | **Não competir como gateway.** Ser o plugin de policy semântica/HITL deles — Policy Cards são payload-aware e risk-tiered; os gateways são network-shaped |
| HITL                          | LangChain `HumanInTheLoopMiddleware` é o comparável mais próximo                        | Diferencial: aprovação amarrada a artefato compilado hash-pinned (lineage), não só interrupt de tool                                                      |
| Compliance                    | EU AI Act Art. 12 (record-keeping) em vigor desde 2026-08-02                            | Fazer do audit log um **export Art. 12** — ninguém no OSS oferece isso                                                                                    |

### 3.3 Whitespace defensável: Constraint Pinning

Pesquisa recente ("Governance Decay", arXiv 2606.22528) mostra que compaction de
contexto descarta constraints de segurança silenciosamente (violações 0%→30-59%)
e há um ataque prático (Compaction-Eviction). Mitigação proposta: _constraint
pinning_. O AKCP está a uma feature de distância de ser a primeira implementação
citável: **emitir Policy Cards como bloco de contexto não-compactável e
hash-verificado, com check de presença no gateway antes de qualquer
side-effect**. É demo-ável, publicável e nenhum gateway/vendor faz.

### 3.4 Mecânica de crescimento (single-maintainer, 2026)

O padrão dos projetos que cresceram (Browser Use, uv, skills.sh): **um comando
que resolve algo real em 60 segundos**, não uma plataforma. Concretamente:

1. Publicar no npm com **Trusted Publishing + provenance** (não publicado em
   v0.1.0 com 11 níveis de maturidade documentados lê-se como pré-alpha).
2. Reduzir superfície: congelar VSCode ext e dashboard como "community";
   remover binários legacy (`ocf`, `agent-ready`).
3. Um flagship só (IT-Ops) executável de ponta a ponta, verbatim, em CI.
4. PRs de integração: ContextForge (policy plugin), exemplo LangChain
   middleware, showcase agentskills.

---

## 4. Correções P0 (quebram o primeiro contato — ordem de ataque)

| #   | Problema                                                   | Evidência                                                                                                                                          | Correção                                                                                         |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `akcp serve mcp` 100% quebrado                             | `Cannot find module '@akcp/mcp-profile-server'` — dep ausente do package.json do CLI                                                               | Adicionar dep + smoke test que sobe o server de verdade                                          |
| 2   | Compile escreve artefatos no **cwd**, não no bundle        | rodar `compile --config <path>` de fora deixa `dist/` do bundle vazio                                                                              | Resolver todos os outputs contra `dirname(akcp.yaml)`                                            |
| 3   | Cache incremental **commitado** → primeiro compile é no-op | `build-state.json` versionado + shipped nos templates; sem `--force`                                                                               | `.gitignore` nos caches, removê-los dos templates, flag `--force`                                |
| 4   | Compile **exit 0 descartando conhecimento**                | frontmatter malformado → doc some do IR com `[OK]`; policy corrompida idem                                                                         | `--strict` por default: doc/policy inválido = exit≠0 com file:line                               |
| 5   | `akcp inspect` imprime `undefined` em tudo                 | lê `version/timestamp/output/size`; manifest tem `schemaVersion/createdAt/outputs/sizeBytes`                                                       | corrigir field mapping (e deduplicar — existe em 2 lugares)                                      |
| 6   | `akcp verify` crasha `EISDIR` no output default            | target `openwiki` é diretório                                                                                                                      | tratar diretório no verify                                                                       |
| 7   | Template flagship reprova nos próprios gates               | conformance NONE (AGENTS.md sem frontmatter que o próprio init cria); scorecard 60/100 recomendando o que o template já tem (lê chaves diferentes) | alinhar scorecard/conformance com as chaves reais dos templates; frontmatter no AGENTS.md gerado |
| 8   | Nenhum pacote embarca LICENSE                              | `files` lista LICENSE, arquivo só existe na raiz                                                                                                   | copiar LICENSE por pacote no prepack                                                             |

## 5. Qualidade de código / arquitetura

1. **Deletar ou adotar `cli/src/commands/`** (2.072 linhas, 31 arquivos):
   `registerAllCommands` nunca é chamado; o binário usa o monólito de 1.597
   linhas e cada stub existe em dobro. Recomendado: **adotar** o modular
   (migrar o monólito para ele) — resolve também a inconsistência de flags
   (`-b/--bundle` vs `-c/--config` vs `-f/--file` vs `--artifact`).
2. **Plugin system: entregar ou rebaixar.** `PluginLoader` não tem nenhum caller
   de produção; `IngestStage` é um switch hardcoded; a checagem de permissões
   não constrange nada em runtime; sem checksum/assinatura. Ou wirar o loader no
   IngestStage + verificação de integridade do manifest, ou marcar
   `docs/reference/plugins.md` como "Planned".
3. **Um conector externo real** (Confluence é o candidato: as env vars já estão
   no `.env.example` como config morta). Hoje zero conectores leem sistema
   externo — `docs/reference/source-connectors.md` promete o contrário (e está
   em português enquanto o resto é inglês).
4. **Cedar provider inventa um protocolo** (`/v1/is_authorized` não existe —
   Cedar é lib Rust/WASM; AVP tem outra API). Trocar por
   `@cedar-policy/cedar-wasm` in-process ou API real do Verified Permissions.
   OPA provider está correto; ambos precisam de `explain()` real (hoje `null`).
5. **Curadoria da API pública**: 100 exports em `core/index.ts`, ~50 `export *`,
   zero `@public/@internal`. Cada repositório/factory/adapter interno exposto é
   superfície de semver. Introduzir tags + entrypoint público mínimo antes do
   primeiro publish (depois vira breaking change).
6. **Resíduo `any` (53 hits)**: prioridade em `provenance/hash.ts` (o caminho de
   hash/redação de segredos é 100% untyped) e `akcp-config-schema.ts`
   (`project/compiler/evals` são `z.any()` + catchall — typo de config passa
   silenciosamente).
7. **Higiene de publicação**: CLI embarca `FLAGSHIP_AUDIT.md`, fixtures de
   43,9kB, `build-state.json` stale nos templates; core embarca 1,1MB com
   sourcemaps e sem README; legacy bins mortos no tarball.

## 6. Testes, evals e métricas — plano de elevação

1. **Quickstart executável em CI, verbatim** — o `smoke:quickstart` atual só
   checa exit code (por isso P0-2/3 passaram). Asserir artefatos em disco.
2. **Matar os mutantes onde dói** (prioridade por risco × score):
   `policies/engine.ts` (55%) e `policies/adapter.ts` (52%) são o enforcement de
   produção; `waf.ts` (37%) é a defesa de injection; `compile.ts` (15%) é a API
   pública. Property tests direcionados (o padrão fast-check já existente levou
   o IR a 100%).
3. **Evals críveis**: hoje o eval de prompt-injection passa com 40% de detecção
   sobre 20 casos, contra o fallback regex; os demais cenários pattern-matcham a
   resposta do `MockLLMProvider` e `hallucinationRate` é uma constante. Baseline
   2026: rodar **AgentDojo** (629 casos de injection, Inspect AI/UK AISI) contra
   o gateway com-e-sem AKCP e publicar a tabela utility vs. attack-success.
   Subir o gate local para ≥80% de detecção com corpus ≥100 casos.
4. **Cobrir o caminho HITL de ponta a ponta**: `automation-server/server.ts`
   (39%) e `approval-store.ts` SQLite (45%) guardam o fluxo mais crítico do
   produto. Um teste de integração prepare→approve→confirm com SQLite real
   (temp dir) cobre os dois.
5. **Ratchet**: cobertura statements 65→75, mutation break null→55, e badge de
   ambos no README (dados reais > claims).

## 7. Evoluções e novas features (ordem de valor estratégico)

1. **Constraint Pinning** (§3.3) — bloco de policy não-compactável +
   verificação de presença pré-side-effect no gateway. Feature inédita,
   demo-ável, com paper citável.
2. **Target SKILL.md** — compilar bundles para Agent Skills (formato Anthropic,
   adotado por ~40 tools). Com assinatura de proveniência já existente
   (`provenance/sign.ts`), AKCP vira o único produtor de _skills assinadas_ —
   resposta direta ao problema de 90k skills sem verificação.
3. **Conector OKF-Google** (entrada) + target OKF (saída) — a jogada da §3.1.
4. **Export EU AI Act Art. 12** do audit log (`akcp audit export --format
eu-ai-act`) — em vigor desde ago/2026, zero concorrência OSS.
5. **Conformidade MCP 2026-07-28** (Tasks, CIMD auth) nos dois servers — a
   maioria dos gateways vai demorar; é manchete técnica barata.
6. **`akcp doctor --fix`** — dado o P0-3/7, um comando que detecta cache stale,
   artefatos no lugar errado e templates desalinhados paga o custo em suporte.

## 8. Roadmap sugerido

**Semanas 1–2 (parar de sangrar):** P0 #1–8 da §4 + quickstart em CI + LICENSE

- limpeza de tarball + `.gitignore` de caches. Publicar `0.1.1` no npm com
  Trusted Publishing.

**Semanas 3–6 (fechar promessas):** adotar CLI modular (deletar monólito);
plugin loader wirado ou docs rebaixadas; conector Confluence real; Cedar real ou
removido; curadoria da API pública; testes HITL e2e + mutantes de
engine/adapter/waf.

**Semanas 7–12 (diferenciar):** Constraint Pinning + demo; target SKILL.md
assinado; conector/target OKF-Google + reposicionamento de marca; AgentDojo
benchmark publicado; export EU AI Act.

---

_Gerado por análise automatizada (Claude) em 2026-07-31; métricas reproduzíveis
com `pnpm run coverage` e `pnpm --filter @akcp/core test:mutation`._
