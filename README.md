# Finanças Ratimbum

Aplicativo de controle financeiro pessoal, construído com React 19, TypeScript, Vite e Firebase/Firestore. Permite acompanhar finanças de duas pessoas ("ele"/"ela") mais uma conta poupança compartilhada ("porquinho").

## Funcionalidades

- **Transações**: registro de entradas e saídas por categoria
- **Despesas fixas**: contas recorrentes com vencimento e controle de pagamento
- **Poupança (porquinho)**: depósitos e saques compartilhados
- **Metas**: acompanhamento de objetivos financeiros com contribuições
- **Calendário e relatórios**: visualização de gastos e receitas ao longo do tempo

## Stack

- React 19 + TypeScript + Vite
- Firebase/Firestore (com fallback mock via `localStorage` para desenvolvimento)
- Tailwind CSS + componentes no padrão shadcn/ui
- React Hook Form + Zod para formulários e validação
- Recharts para gráficos, Lucide React para ícones
- React Router para navegação, TanStack Query para dados assíncronos

## Como rodar

Instale as dependências:

```bash
npm install
```

Copie o arquivo de variáveis de ambiente e preencha as chaves do Firebase:

```bash
cp .env.local.example .env.local
```

Além das variáveis do Firebase, defina manualmente:

- `VITE_USE_EMULATOR=true` — usa `localStorage` como mock em vez do Firebase
- `VITE_APP_USERNAME` / `VITE_APP_PASSWORD` — credenciais de login (padrão: `ratimbum`/`ratimbum123`)

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Existe também um modo alternativo de ambiente (`amigo`):

```bash
npm run dev:amigo
```

## Scripts disponíveis

```bash
npm run dev        # Servidor de desenvolvimento (Vite)
npm run dev:amigo  # Servidor de desenvolvimento no modo "amigo"
npm run build       # Type-check com tsc e build de produção
npm run build:amigo # Build de produção no modo "amigo"
npm run lint         # Executa o ESLint
npm run preview      # Preview do build de produção
```

## Estrutura do projeto

```
src/
├── components/   # Componentes organizados por feature (auth, calendar, dashboard, ...)
├── contexts/     # AuthContext e AreaContext
├── hooks/        # Hooks de acesso a dados (loading/error + CRUD)
├── lib/          # Utilitários, incluindo mockStorage (fallback localStorage)
├── pages/        # Páginas da aplicação
├── services/     # Operações com Firestore (com fallback mock)
└── types/        # Tipos compartilhados
```

Mais detalhes sobre a arquitetura estão em `CLAUDE.md`.
