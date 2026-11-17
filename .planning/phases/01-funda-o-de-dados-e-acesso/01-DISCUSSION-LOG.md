# Phase 1: Fundação de dados e acesso - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-17
**Phase:** 1-Fundação de dados e acesso
**Areas discussed:** Dono dos dados e login, IDs estáveis de categoria, Núcleo compartilhado e testes, Corte das regras e rollback

---

## Dono dos dados e login

| Option | Description | Selected |
|--------|-------------|----------|
| 1 conta compartilhada | Uma conta Firebase para o casal; ownerId = uid | |
| 1 conta por pessoa | Cada um com login, ligados por família (hid) | ✓ |
| Você decide | | |

**User's choice:** Login individual, sistema sabe que formam um casal (free-text).
**Notes:** Motivo: não precisar escolher a aba de quem você é ao entrar.

| Option | Description | Selected |
|--------|-------------|----------|
| Claim de custom no token | hid e person nos claims | ✓ |
| Documento households/{hid} | Regras consultam documento | |

**User's choice:** Claim de custom no token (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Script do dono + sem signUp | Script cria contas/claims; remove cadastro e login ratimbum | ✓ |
| Console do Firebase à mão | | |

**User's choice:** Script do dono + sem signUp (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Abre na sua aba, vê tudo | Todos continuam vendo/lançando em todas as abas | ✓ |
| Abre na sua aba, aba do outro só leitura | | |

**User's choice:** Abre na sua aba, vê tudo (Recomendado)

---

## IDs estáveis de categoria

| Option | Description | Selected |
|--------|-------------|----------|
| ID + backfill junto do ownerId | categoryId em tudo, category texto mantido | ✓ |
| ID só nas novas | Histórico por nome | |

**User's choice:** ID + backfill junto do ownerId (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Arquivar, nunca apagar | archived=true; servidor mapeia para categoryId | ✓ |
| Exigir reatribuir | | |

**User's choice:** Arquivar, nunca apagar (Recomendado)

---

## Núcleo compartilhado e testes

| Option | Description | Selected |
|--------|-------------|----------|
| Raiz no repo + import direto | Zero cópia; Railway com raiz no repo | ✓ |
| Script de cópia + teste de divergência | | |

**User's choice:** Raiz no repo + import direto (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| node --test + só o que existe | Sem dependência nova | ✓ |
| Vitest + migrar tudo | | |

**User's choice:** node --test + só o que existe (Recomendado)

---

## Corte das regras e rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Emulador + cópia exportada | Ensaio local, dry-run e backup em produção | ✓ |
| Direto em produção com dry-run | | |

**User's choice:** Emulador + cópia exportada (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Checklist com verificação manual | Mantém firestore.rules.legacy | ✓ |
| Janela com teste automático de fumaça | | |

**User's choice:** Checklist com verificação manual (Recomendado)

---

## Claude's Discretion

Formato do slug de categoria e nomes de campos; estrutura do script de admin e do backfill; pastas/alias do `shared/core`.

## Deferred Ideas

- Privacidade ou somente-leitura entre abas do casal (Fase 8)
- Convite pela interface (Fase 8)
- Teste de fumaça automático pós-deploy
