# Source Connectors

O **Agent Knowledge Compiler and Control Plane (akcp)** suporta a ingestão de dados de diferentes formatos usando **Source Connectors**.

Esta arquitetura plugin-based permite que agentes tenham acesso a conhecimento espalhado em OpenWiki, repositórios Markdown simples e, experimentalmente, definições OpenAPI, sem que esses arquivos precisem estar estritamente envelopados no formato OKF.

## Configuração de Ingestão (`akcp.yaml`)

No arquivo de configuração `akcp.yaml`, você pode listar múltiplas fontes e usar a propriedade `type` para invocar diferentes connectors.

```yaml
compile:
  sources:
    - type: okf-directory
      path: ./sample-data/.okf
    - type: markdown-directory
      path: ./docs/product
    - type: openwiki
      path: ./openwiki-export
    - type: openapi
      path: ./api-spec.json
  target:
    out: ./dist/agent-knowledge-ir.json
```

## Como funciona a Ingestão

1. **Ingest**: Cada connector é responsável por escanear o diretório ou arquivo fonte (`path`) e extrair `RawKnowledgeItem`s. Ele calcula hashes (provenance) e carrega metadados brutos (paths, etc).
2. **Normalize**: Um estágio central (`packages/core/src/normalizers/normalize.ts`) intercepta todos os `RawKnowledgeItem`s independentemente da sua origem, extraindo `conceptId`, validando formatos OKF e transformando-os em `IRConcept`s consolidados que os agentes entendem de forma unificada.

## Criando novos Connectors

Se você precisar extrair conhecimento de um sistema proprietário (ex: Jira, Confluence, etc.), poderá criar um novo connector seguindo a interface `KnowledgeSourceConnector`:

```typescript
export interface KnowledgeSourceConnector {
  connectorType: string;
  ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]>;
}
```

### Regras para novos Connectors

- **Connectors são plugins de build-time**, não de runtime.
- **Evite adicionar dependências pesadas**. O connector OpenAPI, por exemplo, usa regex/JSON em vez de parsers swagger complexos para evitar sobrecarregar o compilador.
- **Nenhum segredo deve ser inserido**. Cuidado ao importar arquivos raw que contenham senhas hardcoded. No futuro, Redaction Connectors agirão em conjunto para remover PII/Secrets.
