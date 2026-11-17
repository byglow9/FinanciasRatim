import { getAuth } from 'firebase-admin/auth'

// Lista de origens separadas por virgula (ALLOWED_ORIGINS): apara e descarta vazios.
export const parseOrigins = (csv) =>
  String(csv ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

// Middleware Express: se a requisicao traz Origin fora da lista fechada, recusa com 403.
// Sem Origin (curl, servidor) passa: o token do Firebase e o portao real; CORS so protege navegadores.
export const originGuard = (origins) => (req, res, next) => {
  const origin = req.get('origin')
  if (origin !== undefined && !origins.includes(origin)) {
    return res.status(403).json({ error: 'Origem nao autorizada' })
  }
  next()
}

// Middleware Express: aceita somente ID token do Firebase (Authorization: Bearer).
// O dono dos dados vem do claim "hid" do token verificado, nunca do corpo da requisicao.
// `verify` e injetado para teste; o padrao e o verificador real do Admin SDK.
export const requireOwner =
  (verify = (token) => getAuth().verifyIdToken(token)) =>
  async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')
    if (!match) return res.status(401).json({ error: 'Nao autorizado' })
    let decoded
    try {
      decoded = await verify(match[1])
    } catch {
      return res.status(401).json({ error: 'Nao autorizado' })
    }
    if (typeof decoded.hid !== 'string' || decoded.hid.length === 0) {
      return res.status(403).json({ error: 'Sem acesso' })
    }
    req.owner = { uid: decoded.uid, hid: decoded.hid, person: decoded.person }
    next()
  }
