import { pathToFileURL } from 'node:url'
import { initAdmin } from './lib/admin.js'

const PEOPLE = ['ele', 'ela']
const HID_RE = /^[A-Za-z0-9_-]{8,64}$/

// Cria (ou atualiza claims de) as contas do casal. D-04: contas criadas por script do dono,
// sem convite pela interface. Nunca devolve nem registra senha.
// people: [{ person: 'ele'|'ela', email, password? }]
export async function createUsers({ auth, hid, people, apply = false, log = () => {} }) {
  if (typeof hid !== 'string' || !HID_RE.test(hid)) {
    throw new Error('hid invalido: use letras, numeros, hifen ou sublinhado, de 8 a 64 caracteres')
  }
  if (!Array.isArray(people) || people.length === 0) throw new Error('Informe ao menos uma pessoa')
  const seen = new Set()
  for (const p of people) {
    if (!PEOPLE.includes(p?.person)) throw new Error('person invalida: use ele ou ela')
    if (seen.has(p.person)) throw new Error(`person repetida: ${p.person}`)
    seen.add(p.person)
    if (typeof p.email !== 'string' || !p.email.includes('@')) throw new Error('E-mail invalido')
  }

  // Passo 1: inspecionar tudo antes de escrever qualquer coisa.
  const plan = []
  for (const p of people) {
    const email = p.email.trim().toLowerCase()
    let user = null
    try {
      user = await auth.getUserByEmail(email)
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err
    }
    if (user) {
      const claims = user.customClaims ?? {}
      if (claims.hid && claims.hid !== hid) throw new Error('Usuario ja pertence a outro casal')
      const same = claims.hid === hid && claims.person === p.person
      plan.push({ person: p.person, email, user, claims, action: same ? 'noop' : 'update-claims' })
    } else {
      if (typeof p.password !== 'string' || p.password.length < 6) {
        throw new Error(`Senha de pelo menos 6 caracteres obrigatoria para criar ${p.person}`)
      }
      plan.push({ person: p.person, email, user: null, password: p.password, claims: {}, action: 'create' })
    }
  }

  // Passo 2: aplicar (so com apply).
  const results = []
  for (const item of plan) {
    let uid = item.user?.uid ?? null
    if (apply && item.action !== 'noop') {
      if (item.action === 'create') {
        const created = await auth.createUser({ email: item.email, password: item.password, emailVerified: true })
        uid = created.uid
      }
      // setCustomUserClaims substitui tudo: mesclar com os claims existentes (Pitfall 4)
      await auth.setCustomUserClaims(uid, { ...item.claims, hid, person: item.person })
    }
    log(`${apply ? '' : '[dry-run] '}${item.person} ${item.email} uid=${uid ?? '-'} acao=${item.action}`)
    results.push({ person: item.person, email: item.email, uid, action: item.action })
  }
  return { dryRun: !apply, results }
}

// Lista usuarios com hid e person. Nunca inclui senha ou hash.
export async function listUsers({ auth }) {
  const out = []
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const u of page.users) {
      out.push({
        uid: u.uid,
        email: u.email ?? null,
        hid: u.customClaims?.hid ?? null,
        person: u.customClaims?.person ?? null,
        createdAt: u.metadata?.creationTime ?? null,
      })
    }
    pageToken = page.pageToken
  } while (pageToken)
  return out
}

function parseArgs(argv) {
  const args = { apply: false, list: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--list') args.list = true
    else if (a === '--hid') args.hid = argv[++i]
    else if (a === '--ele-email') args.eleEmail = argv[++i]
    else if (a === '--ela-email') args.elaEmail = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { auth } = initAdmin()
  if (args.list) {
    for (const u of await listUsers({ auth })) {
      console.log(`${u.email ?? '-'} person=${u.person ?? '-'} hid=${u.hid ?? '-'} uid=${u.uid}`)
    }
    return
  }
  const people = []
  if (args.eleEmail) people.push({ person: 'ele', email: args.eleEmail, password: process.env.ELE_PASSWORD })
  if (args.elaEmail) people.push({ person: 'ela', email: args.elaEmail, password: process.env.ELA_PASSWORD })
  if (!args.hid || people.length === 0) {
    console.error('Uso: node server/scripts/create-users.js --hid <id-do-casal> --ele-email <e-mail> --ela-email <e-mail> [--apply] | --list')
    console.error('Senhas: variaveis de ambiente ELE_PASSWORD e ELA_PASSWORD (so necessarias para contas novas).')
    process.exit(1)
  }
  const { dryRun } = await createUsers({ auth, hid: args.hid, people, apply: args.apply, log: console.log })
  if (dryRun) console.log('Simulacao: nada foi escrito. Use --apply para criar.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
