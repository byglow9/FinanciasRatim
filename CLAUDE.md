# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # Type-check with tsc and build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

This is a personal finance management app (in Portuguese) built with React 19, TypeScript, Vite, and Firebase/Firestore. It tracks finances for two people ("ele"/"ela") plus a shared savings account ("porquinho").

### Data Layer

- **Services** (`src/services/`): Firebase Firestore operations with a mock localStorage fallback when `VITE_USE_EMULATOR=true` (development only). Each service (transactions, fixedExpenses, savings, goals, goalContributions, settings) follows the same pattern: checks `MOCK` flag and either uses localStorage helpers or Firestore.
- **Mock Storage** (`src/lib/mockStorage.ts`): localStorage-based data persistence for development without Firebase. Uses `db::` prefix for collections and `doc::` prefix for single documents.
- **Hooks** (`src/hooks/`): Data fetching hooks that wrap services with loading/error states and CRUD operations. Each hook returns `{ data, loading, error, add, update, remove, refetch }`.

### State Management

- **AuthContext**: Firebase Auth (e-mail e senha) e o unico caminho de login. O ID token traz os custom claims `hid` (id do casal) e `person` (`ele`/`ela`); conta sem claim e barrada com "Conta sem acesso". O escopo de dono (`ownerId`, `ownerScope`) vem so de `src/lib/scope.ts`. As contas sao criadas por `server/scripts/create-users.js`; nao existe cadastro pela interface.
- **AreaContext**: Tracks current area selection (ele/ela/porquinho) and user settings

### Key Concepts

- **PersonType**: `'ele' | 'ela'` - the two individual finance areas
- **AreaType**: `PersonType | 'porquinho'` - includes the shared savings
- **Transactions**: Income (`entrada`) and expenses (`saida`) with categories
- **Fixed Expenses**: Recurring monthly bills with due dates and payment tracking
- **Savings (Porquinho)**: Shared piggy bank with deposits/withdrawals

### UI Components

- Components organized by feature: `src/components/{auth,calendar,dashboard,fixed-expenses,goals,layout,reports,savings,transactions}/`
- Shared primitives in `src/components/ui/` following shadcn/ui patterns with Tailwind CSS
- Uses `@` path alias for imports (configured in vite.config.ts)
- Charts via Recharts, icons via Lucide React, forms via react-hook-form + zod

## Environment Variables

Copy `.env.local.example` to `.env.local` and add these variables:
- `VITE_USE_EMULATOR=true` - Use localStorage mock instead of Firebase (add manually, not in example). Only honored in development (`npm run dev`); a production build ignores it
- Firebase config vars (`VITE_FIREBASE_*`) - Required for production
