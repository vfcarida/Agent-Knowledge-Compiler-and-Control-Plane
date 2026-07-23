# Compile Targets

O **Agent Knowledge Compiler and Control Plane (akcp)** transforma conhecimento cru e esparso em múltiplos artefatos governados (targets), desenhados para consumo de agentes e sistemas adjacentes.

## Configuração

No arquivo `akcp.yaml`, configure o array `targets` dentro de `compile`:

```yaml
compile:
  sources:
    - type: okf-directory
      path: ./sample-data/.okf
  targets:
    - type: ir-json
      out: dist/agent-knowledge-ir.json
    - type: openwiki-docs
      out: dist/openwiki
    - type: agents-md
      out: dist/agents-snippet.md
    - type: eval-dataset
      out: dist/eval.jsonl
```

## Targets Disponíveis

### `ir-json`

O artefato central do AKCP. Representa toda a ontologia extraída (IRConcepts e IRLinks) em um formato estruturado, incluindo metadados de budget de contexto.
**Consumidor**: MCP Profile Server, Dashboard, CI.

### `okf-bundle`

Transforma a IR de volta em um repositório rígido de `.md` com YAML Frontmatter validado. Útil para consolidar fontes mistas (como Markdown, OpenAPI e OpenWiki) em um único bundle unificado `v0.1.0`.

### `openwiki-docs`

Gera uma estrutura hierárquica de documentação em Markdown tradicional, criando arquivos de índice. Ideal para publicar documentação limpa em portais focados em desenvolvedores (ex: GitHub Pages) ou ingestão ingênua por agentes sem MCP.

### `agents-md`

Gera um snippet Markdown otimizado para ser embutido em `AGENTS.md` (ou `CLAUDE.md`). Contém a assinatura e o inventário do pacote de contexto.

### `mcp-resources-manifest`

Produz um manifesto JSON declarando os `resources` que um servidor MCP deve expor com base no conhecimento extraído.

### `policy-bundle`

Despeja apenas os controles de governança extraídos da IR para uso em motores de autorização isolados.

### `eval-dataset`

Gera conjuntos de QA (pares Pergunta/Documento) no formato JSONL, prontos para uso em frameworks de LLM evaluation (evidência de compliance NIST AI RMF).

### `graph-json`

Fornece uma extração simplificada (nodes e edges) para ferramentas de visualização (ex: D3.js) ou inicialização de graph databases.

## Manifest de Compilação

Sempre que a compilação de targets for executada, um arquivo central chamado `akcp-manifest.json` é gerado. Ele contém a identidade do build e os hashes criptográficos de cada target emitido. Você pode inspecionar esse arquivo usando:

```bash
npx akcp inspect-artifact dist/akcp-manifest.json
```
