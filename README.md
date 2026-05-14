# Gestão de Tesouraria — Frontend

Interface web para o sistema de tesouraria, construída com **React + TypeScript + Tailwind CSS** (via Vite), com integração direta ao back-end Spring Boot.

---

## Pré-requisitos

- **Node.js** v18 ou superior
- **npm** v9 ou superior
- Back-end Spring Boot rodando em `http://localhost:8080`

---

## Instalação e Execução

```bash
# 1. Clone ou extraia o projeto
cd tesouraria-web

# 2. Instale as dependências
npm install

# 3. Rode em modo desenvolvimento
npm run dev
```

O Vite iniciará em **http://localhost:5173** com Hot Module Replacement (HMR) ativo.

```bash
# Para gerar o build de produção
npm run build

# Para visualizar o build localmente
npm run preview
```

---

## Arquitetura de Pastas

```
tesouraria-web/
├── index.html                  # Template HTML do Vite
├── vite.config.ts              # Configuração do Vite + plugin React
├── tailwind.config.js          # Tema customizado (cores militares)
├── tsconfig.json               # Configuração TypeScript principal
├── tsconfig.node.json          # Configuração TS para o Vite config
├── postcss.config.js           # PostCSS (necessário para Tailwind)
├── AGENTS.md                   # Convenções e padrões para agentes IA
└── src/
    ├── main.tsx                # Entrypoint — monta o React no DOM
    ├── App.tsx                 # Componente raiz (rotas/navegação)
    ├── index.css               # Diretivas Tailwind + .glass-panel + scrollbar
    │
    ├── types/
    │   └── index.ts            # Interfaces DTO (contrato com o back-end)
    │
    ├── lib/
    │   └── utils.ts            # Formatadores: moeda, CNPJ, data, input-date
    │
    ├── services/
    │   └── api.ts              # Instância Axios + todas as funções HTTP
    │
    ├── hooks/
    │   └── useEntitySearch.ts  # Hook genérico para estado de busca/edição
    │
    ├── components/
    │   ├── Alert.tsx           # Feedback de sucesso/erro
    │   ├── Button.tsx          # Botão reutilizável (variants + loading)
    │   ├── EditIconButton.tsx  # Ícone de edição na tabela
    │   ├── Input.tsx           # Input reutilizável com label
    │   ├── PageShell.tsx       # Layout principal (header + nav + brasão)
    │   ├── SearchResultTable.tsx # Tabela de resultados genérica
    │   ├── Select.tsx          # Select reutilizável com label
    │   └── Tabs.tsx            # Navegação por abas
    │
    └── pages/
        ├── Busca.tsx           # Página principal de busca (abas)
        ├── BuscaTabs/
        │   ├── BuscaEmpresa.tsx            # Busca por CNPJ
        │   ├── BuscaEmpenho.tsx            # Busca por número + ano
        │   ├── BuscaFinancialPlanning.tsx # Busca por ID
        │   ├── BuscaPaymentNote.tsx        # Busca por NP + ano
        │   └── Shared.tsx                  # SectionTitle, ReadField, applyCnpjMask, TableContainer
        ├── Cadastro.tsx        # Cadastro de PaymentEmpenho
        └── Dashboard.tsx       # Dashboard com métricas
```

---

## Custom Hook — `useEntitySearch<T>`

Todas as 4 telas de busca (`BuscaEmpresa`, `BuscaEmpenho`, `BuscaFinancialPlanning`, `BuscaPaymentNote`) utilizam o hook genérico `useEntitySearch<T>` (`src/hooks/useEntitySearch.ts`), que encapsula:

- Estados de **busca**: `loading`, `error`
- Estados de **listagem**: `allResults`, `showAll`
- Estados de **edição**: `found`, `editing`
- Estados de **salvamento**: `saving`, `saveError`, `success`
- Handlers de **requisição**: `handleSearchRequest`, `handleGetAllRequest`, `handleSaveRequest`

```typescript
const {
  loading, error, setError,
  allResults, showAll,
  found, setFound, editing, setEditing,
  saving, saveError, success,
  handleSearchRequest,    // (requestFn, onSuccess?) => void
  handleGetAllRequest,    // (requestFn) => void
  handleSaveRequest,     // (requestFn, msg, onSuccessCallback?) => void
} = useEntitySearch<EmpresaDto>();
```

Componentes de formulário (campos locais como `nome`, `cnpj`, etc.) são mantidos com `useState` avulso, isolados da lógica de busca/salvamento.

---

## Componentes Principais

### `PageShell` (`src/components/PageShell.tsx`)
Layout principal com header fixo, navegação e brasão de fundo. Define o tema "Dark Militar" globalmente (`#0e1410`).

### `TableContainer` (`src/pages/BuscaTabs/Shared.tsx`)
Wrapper reutilizável para tabelas de resultados — aplica `.glass-panel` + `overflow-hidden` + `animate-fadeIn`.

```tsx
<TableContainer title="Resultados" count={allResults.length}>
  <table>...</table>
</TableContainer>
```

### `SectionTitle` (`src/pages/BuscaTabs/Shared.tsx`)
Título de seção com prefixo `▶` em `amber-500`, utilizado em todos os formulários.

### `ReadField` (`src/pages/BuscaTabs/Shared.tsx`)
Campo somente-leitura com estilo visual de destaque (borda `white/10`, texto `amber-300`).

### `SearchResultTable` (`src/components/SearchResultTable.tsx`)
Tabela genérica para resultados, renderizando automaticamente colunas e valores com base no tipo do DTO.

---

## Endpoints da API

Todas as chamadas via `src/services/api.ts` → `http://localhost:8080/api`.

| Função no Front-end | Método | Endpoint Spring Boot | Descrição |
|---|---|---|---|
| `getAllEmpresa()` | `GET` | `/api/Empresa` | Lista todas as empresas |
| `findEmpresaByCnpj(cnpj)` | `GET` | `/api/Empresa?cnpj=` | Busca empresa pelo CNPJ |
| `updateEmpresa(dto)` | `PUT` | `/api/Empresa` | Atualiza empresa |
| `getAllEmpenho()` | `GET` | `/api/Empenho` | Lista todos os empenhos |
| `findEmpenhoByNumeroEAno(num, ano)` | `GET` | `/api/Empenho?numero=&ano=` | Busca empenho |
| `updateEmpenho(dto)` | `PUT` | `/api/Empenho` | Atualiza empenho |
| `getAllFinancialPlanning()` | `GET` | `/api/FinancialPlanning` | Lista todos os planejamentos |
| `findFinancialPlanningByNumber(id)` | `GET` | `/api/FinancialPlanning?numberId=` | Busca FP por ID |
| `updateFinancialPlanning(dto)` | `PUT` | `/api/FinancialPlanning` | Atualiza planejamento |
| `getAllNp()` | `GET` | `/api/Np` | Lista todas as notas de pagamento |
| `findNpByNumeroEAno(num, ano)` | `GET` | `/api/Np?numeroNp=&ano=` | Busca NP por número e ano |
| `updatePaymentNote(dto)` | `PUT` | `/api/Np` | Atualiza nota de pagamento |
| `getAllPaymentEmpenhos()` | `GET` | `/api/PaymentEmpenho` | Lista vínculos NP-Empenho |
| `savePaymentEmpenho(dto)` | `POST` | `/api/PaymentEmpenho` | Cria vínculo NP-Empenho |
| `updatePaymentEmpenho(dto)` | `PUT` | `/api/PaymentEmpenho` | Atualiza vínculo NP-Empenho |

---

## Tema Visual — "Dark Militar"

| Elemento | Estilo |
|----------|--------|
| Fundo geral | `#0e1410` |
| Cards / wrappers | `.glass-panel` → `bg-black/60 backdrop-blur-md border-white/10 rounded-xl` |
| Brasão background | `fixed bg-cover bg-fixed bg-center` com `opacity: 0.25` |
| Overlay | `bg-black/50` sobre o brasão |
| Header | `bg-black/60 backdrop-blur-md border-b border-white/10` |
| Destaques (valores, IDs) | `amber-400` / `amber-500` |
| Texto secundário | `stale-500` |
| Texto base | `gray-200` / `gray-300` |
| Status PAGA | Verde esmeralda |
| Status CANCELADA | Vermelho |
| Status A_PAGAR | Âmbar |

---

## Convenções de Código

- **Imports**: primeiro bibliotecas externas, depois relativas (`../../`, `../`)
- **Estilos**: Tailwind via `className` — **nenhum** CSS inline, **nenhum** `style={{}}`
- **Componentes de página**: um arquivo por tela/page
- **Hooks**: todos em `src/hooks/`
- **TypeScript estrito**: erros de tipo falham o build (`tsc --noEmit`)

---

## Observações Técnicas

- **Sem gerenciador de estado externo** — apenas `useState` e `useEffect` nativos do React.
- **Nenhuma interface contém `id`** — o front-end trabalha apenas com dados de negócio.
- **Validação via API** — o front-end busca e valida dados no back-end antes de POST/PUT.
- **Refresh automático** — após salvar, o callback `handleGetAll` atualiza a listagem quando `showAll` está ativo.
