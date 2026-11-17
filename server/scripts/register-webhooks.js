// Esqueleto do registro de webhooks da Pluggy (REV-06). Sem comportamento ainda.
export const WEBHOOK_EVENTS_TO_REGISTER = [
  'item/updated',
  'transactions/created',
  'transactions/updated',
  'transactions/deleted',
]

export async function registerWebhooks() {
  return { created: 0, updated: 0, reactivated: 0, disabledDuplicates: 0 }
}

export async function main() {
  return 1
}
