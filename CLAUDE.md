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

- **Services** (`src/services/`): Firebase Firestore operations with a mock localStorage fallback when `VITE_USE_EMULATOR=true`
- **Mock Storage** (`src/lib/mockStorage.ts`): localStorage-based data persistence for development without Firebase
- **Hooks** (`src/hooks/`): Data fetching hooks (useTransactions, useFixedExpenses, useSavings, useGoals) that wrap services with loading/error states

### State Management

- **AuthContext**: Simple username/password auth stored in localStorage (credentials from env vars `VITE_APP_USERNAME`/`VITE_APP_PASSWORD`)
- **AreaContext**: Tracks current area selection (ele/ela/porquinho) and user settings

### Key Concepts

- **PersonType**: `'ele' | 'ela'` - the two individual finance areas
- **AreaType**: `PersonType | 'porquinho'` - includes the shared savings
- **Transactions**: Income (`entrada`) and expenses (`saida`) with categories
- **Fixed Expenses**: Recurring monthly bills with due dates and payment tracking
- **Savings (Porquinho)**: Shared piggy bank with deposits/withdrawals

### UI Components

- Custom UI components in `src/components/ui/` following shadcn/ui patterns with Tailwind CSS
- Uses `@` path alias for imports (configured in vite.config.ts)
- Charts via Recharts, icons via Lucide React

## Environment Variables

Copy `.env.local.example` to `.env.local`. Key variables:
- `VITE_USE_EMULATOR=true` - Use localStorage mock instead of Firebase
- `VITE_APP_USERNAME` / `VITE_APP_PASSWORD` - Auth credentials
- Firebase config vars for production
