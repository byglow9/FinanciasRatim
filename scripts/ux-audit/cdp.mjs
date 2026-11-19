// Cliente minimo do protocolo do Chrome (CDP) sobre o WebSocket global do Node 22.
// Sem dependencias: usa o Chrome ja instalado. Tudo escuta so em 127.0.0.1.
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Porta livre em 127.0.0.1 (o SO escolhe). */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

async function fetchJson(url, init, timeoutMs = 2000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
  return res.json()
}

/**
 * Inicia o Chrome sem janela com perfil temporario novo.
 * Devolve { port, wsUrl, close }. `close` encerra o processo e apaga o perfil.
 */
export async function launchChrome({ timeoutMs = 20000 } = {}) {
  const bin = process.env.CHROME_BIN || '/usr/bin/google-chrome'
  const userDataDir = await mkdtemp(join(tmpdir(), 'ux-audit-chrome-'))
  const port = await freePort()

  const child = spawn(
    bin,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--remote-debugging-address=127.0.0.1',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  )
  child.unref()

  let exited = false
  child.on('exit', () => {
    exited = true
  })

  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    if (!exited) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        /* ja encerrado */
      }
      for (let i = 0; i < 20 && !exited; i++) await sleep(100)
      if (!exited) {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch {
          /* ja encerrado */
        }
        for (let i = 0; i < 20 && !exited; i++) await sleep(100)
      }
    }
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }

  try {
    const deadline = Date.now() + timeoutMs
    let version = null
    while (Date.now() < deadline) {
      if (exited) throw new Error('o Chrome encerrou antes de abrir a porta de depuracao')
      try {
        version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
        break
      } catch {
        await sleep(150)
      }
    }
    if (!version) throw new Error('prazo estourado esperando o Chrome')

    // Chrome recente exige PUT em /json/new.
    const target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    return { port, wsUrl: target.webSocketDebuggerUrl, close }
  } catch (err) {
    await close()
    throw err
  }
}

/** Abre o WebSocket do alvo e devolve { send, evaluate, on, waitFor, close }. */
export async function connect(wsUrl, { timeoutMs = 10000 } = {}) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('prazo estourado abrindo o WebSocket')), timeoutMs)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    })
    ws.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('falha ao abrir o WebSocket do Chrome'))
    })
  })

  let nextId = 0
  const pending = new Map()
  const listeners = new Map()

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data))
    if (msg.id !== undefined) {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`))
      else p.resolve(msg.result)
      return
    }
    for (const handler of listeners.get(msg.method) ?? []) handler(msg.params ?? {})
  })

  ws.addEventListener('close', () => {
    for (const p of pending.values()) p.reject(new Error('conexao com o Chrome fechada'))
    pending.clear()
  })

  function send(method, params = {}, callTimeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = ++nextId
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`${method}: prazo estourado`))
      }, callTimeoutMs)
      pending.set(id, {
        method,
        resolve: (v) => {
          clearTimeout(timer)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  function on(method, handler) {
    const list = listeners.get(method) ?? []
    list.push(handler)
    listeners.set(method, list)
    return () => {
      listeners.set(
        method,
        (listeners.get(method) ?? []).filter((h) => h !== handler),
      )
    }
  }

  /** Espera um evento uma unica vez (com prazo). */
  function waitFor(method, waitTimeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off()
        reject(new Error(`prazo estourado esperando ${method}`))
      }, waitTimeoutMs)
      const off = on(method, (params) => {
        clearTimeout(timer)
        off()
        resolve(params)
      })
    })
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res.exceptionDetails) {
      throw new Error(`evaluate: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`)
    }
    return res.result.value
  }

  return {
    send,
    evaluate,
    on,
    waitFor,
    close: () => {
      try {
        ws.close()
      } catch {
        /* ja fechado */
      }
    },
  }
}
