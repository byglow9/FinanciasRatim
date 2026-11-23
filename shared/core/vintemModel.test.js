import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32, BLINK } from './vintemSpring.js'
import { STATE_KEYS } from './vintemStates.js'
import { World, VintemModel, POSE_KEYS, ACCESSORY_KEYS, REACTION_KINDS } from './vintemModel.js'

const DT60 = 1 / 60

/** Cria mundo e modelo com acaso determinista. */
function make(seed = 1, opts = {}) {
  const world = new World()
  const model = new VintemModel({ state: 'neutro', rand: mulberry32(seed), world, ...opts })
  return { world, model }
}

/** Percorre a pose e falha se achar numero nao finito. */
function assertFinitePose(pose, where = '') {
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v), `${where} ${path}${k} nao finito: ${v}`)
      else if (Array.isArray(v)) v.forEach((it, i) => walk(it, `${path}${k}[${i}].`))
      else if (v && typeof v === 'object') walk(v, `${path}${k}.`)
    }
  }
  walk(pose, '')
}

/** Roda `seconds` de relogio simulado, chamando `each` a cada quadro. */
function run(world, seconds, dt = DT60, each = () => {}) {
  const n = Math.round(seconds / dt)
  for (let i = 0; i < n; i++) {
    world.step(dt)
    each(i)
  }
}

test('a pose tem todas as chaves do contrato e as 19 chaves de expressao', () => {
  const { model } = make()
  for (const k of POSE_KEYS) assert.ok(k in model.pose, `falta pose.${k}`)
  for (const k of STATE_KEYS) assert.ok(k in model.pose.e, `falta pose.e.${k}`)
  for (const k of ACCESSORY_KEYS) assert.ok(k in model.pose.acc, `falta pose.acc.${k}`)
  assert.equal(model.pose.coin.on, false)
  assert.deepEqual(model.pose.coins, [])
})

test('neutro respira 20 s com meia amplitude de sy entre 0,018 e 0,07 e volume preservado', () => {
  const { world, model } = make(3)
  let lo = Infinity
  let hi = -Infinity
  let worst = 0
  run(world, 20, DT60, () => {
    const p = model.pose
    assertFinitePose(p, 'repouso')
    lo = Math.min(lo, p.sy)
    hi = Math.max(hi, p.sy)
    worst = Math.max(worst, Math.abs(p.sx * p.sy - 1))
  })
  const half = (hi - lo) / 2
  assert.ok(half >= 0.018 && half <= 0.07, `meia amplitude ${half}`)
  assert.ok(worst < 0.08, `volume desviou ${worst}`)
})

test('setState triste assenta as molas de expressao em menos de 3 s', () => {
  const { world, model } = make(5)
  run(world, 1)
  model.setState('triste')
  assert.equal(model.state, 'triste')
  run(world, 3, DT60, () => assertFinitePose(model.pose, 'triste'))
  assert.equal(model.isSettled(), true)
  assert.ok(Math.abs(model.pose.e.ea - 70) < 1, `ea ${model.pose.e.ea}`)
  assert.ok(Math.abs(model.pose.e.sy - 0.93) < 0.01, `e.sy ${model.pose.e.sy}`)
})

test('estado desconhecido e ignorado e o construtor cai no neutro', () => {
  const { model } = make(7, { state: 'inexistente' })
  assert.equal(model.state, 'neutro')
  model.setState('nao-existe')
  assert.equal(model.state, 'neutro')
})

test('snapPose pula as molas para os alvos', () => {
  const { model } = make(9)
  model.setState('bravo')
  assert.equal(model.isSettled(), false)
  model.snapPose()
  assert.equal(model.isSettled(), true)
  assert.ok(Math.abs(model.pose.e.lt - 22) < 1e-9)
})

// ---------------------------------------------------------------------------
// Piscar, olhar, ponteiro, orelhas, sonolento e movimento reduzido
// ---------------------------------------------------------------------------

const DT120 = 1 / 120
const RECT = { left: 0, top: 0, width: 84, height: 70 }

/** Modelo com coletor de eventos; devolve tambem o vetor de eventos. */
function makeEv(seed, opts = {}) {
  const events = []
  const world = new World()
  const model = new VintemModel({
    state: 'neutro',
    rand: mulberry32(seed),
    world,
    onEvent: (kind, t, data) => events.push({ kind, t, ...data }),
    ...opts,
  })
  return { world, model, events }
}

const times = (events, kind) => events.filter((e) => e.kind === kind).map((e) => e.t)
const SEEDS = [1, 2, 3, 4, 5, 6]

test('piscar: esperas de 2 a 6 s e dupla em 5% a 25% das agendadas em 6 sementes', () => {
  for (const seed of SEEDS) {
    const { world, events } = makeEv(seed)
    run(world, 900, DT120)
    const sched = events.filter((e) => e.kind === 'blink-schedule')
    const normals = sched.filter((e) => e.mode === 'normal')
    const doubles = sched.filter((e) => e.mode === 'double')
    assert.ok(normals.length > 150, `seed ${seed}: so ${normals.length} agendadas`)
    for (const n of normals) assert.ok(n.wait >= 2 && n.wait <= 6, `espera ${n.wait}`)
    for (const d of doubles) assert.ok(d.wait >= 0.14 && d.wait <= 0.2, `intervalo da dupla ${d.wait}`)
    const frac = doubles.length / normals.length
    assert.ok(frac >= 0.05 && frac <= 0.25, `seed ${seed}: duplas ${frac}`)
    // a segunda piscada comeca 140 a 200 ms depois do fim da primeira
    const blinks = times(events, 'blink')
    let fits = 0
    for (const d of doubles) {
      const next = blinks.find((b) => b > d.t + 0.01)
      const gap = next - d.t - BLINK.total
      if (gap >= 0.14 - 0.012 && gap <= 0.2 + 0.012) fits++
    }
    assert.ok(fits >= doubles.length * 0.9, `seed ${seed}: ${fits}/${doubles.length} duplas no intervalo`)
  }
})

/** Roda ate nao haver piscada em curso nem recente (mais de 0,7 s desde a ultima). */
function quiet(world, model) {
  for (let i = 0; i < 600 && world.t - model._bStart <= 0.7; i++) world.step(DT120)
}

test('piscar extra ao trocar de estado, em sacada grande e ao despertar', () => {
  const count = (events) => times(events, 'blink').length
  // troca de estado
  {
    const { world, model, events } = makeEv(21)
    run(world, 1, DT120)
    quiet(world, model)
    const antes = count(events)
    model.setState('feliz')
    assert.equal(count(events), antes + 1)
    assert.ok(Math.abs(times(events, 'blink').at(-1) - world.t) < 1e-9)
  }
  // sacada grande
  {
    const { world, model, events } = makeEv(22)
    run(world, 1, DT120)
    quiet(world, model)
    const antes = count(events)
    model.gazeTo(0.9, 0)
    world.step(DT120)
    assert.equal(count(events), antes + 1, 'sacada grande deve piscar')
  }
  // sacada pequena nao pisca
  {
    const { world, model, events } = makeEv(23)
    run(world, 1, DT120)
    model.gazeTo(0.05, 0)
    run(world, 0.5, DT120)
    quiet(world, model)
    const antes = count(events)
    model.gazeTo(0.1, 0)
    run(world, 0.3, DT120)
    assert.equal(count(events), antes, 'sacada pequena nao pisca')
  }
  // menos de 0,6 s desde a ultima piscada: sacada grande nao inicia outra
  {
    const { world, model, events } = makeEv(24)
    run(world, 1, DT120)
    quiet(world, model)
    const antes = count(events)
    model.setState('feliz')
    run(world, 0.45, DT120)
    model.gazeTo(-0.9, 0)
    run(world, 0.05, DT120)
    assert.equal(count(events), antes + 1)
  }
  // despertar
  {
    const { world, model, events } = makeEv(25, { state: 'sonolento' })
    run(world, 1, DT120)
    quiet(world, model)
    const antes = count(events)
    model.react('wake')
    assert.equal(count(events), antes + 1)
  }
})

test('ao piscar so pose.blink muda: ew e eh do olho ficam parados', () => {
  const { world, model, events } = makeEv(31)
  const ew0 = model.pose.e.ew
  const eh0 = model.pose.e.eh
  let lo = 0
  let hi = 0
  run(world, 60, DT120, () => {
    const p = model.pose
    assert.equal(p.e.ew, ew0)
    assert.equal(p.e.eh, eh0)
    lo = Math.min(lo, p.blink)
    hi = Math.max(hi, p.blink)
  })
  assert.ok(times(events, 'blink').length >= 8)
  assert.equal(hi, 1)
  assert.ok(lo < -0.05 && lo >= -0.14 - 1e-9, `overshoot ${lo}`)
})

test('fase da respiracao independe do piscar: concentracao R menor que 0,3', () => {
  for (const seed of SEEDS) {
    const { world, events } = makeEv(seed + 40)
    run(world, 900, DT120)
    const ph = events.filter((e) => e.kind === 'blink').map((e) => e.phase)
    assert.ok(ph.length > 150)
    const c = ph.reduce((a, v) => a + Math.cos(v), 0) / ph.length
    const s = ph.reduce((a, v) => a + Math.sin(v), 0) / ph.length
    const r = Math.hypot(c, s)
    assert.ok(r < 0.3, `seed ${seed}: R ${r}`)
  }
})

test('sacadas: 200 a 600 ms na deriva, 120 a 300 ms seguindo o mouse', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { world, events } = makeEv(seed)
    run(world, 120, DT120)
    const ts = times(events, 'saccade')
    assert.ok(ts.length > 200)
    for (let i = 1; i < ts.length; i++) {
      const gap = ts[i] - ts[i - 1]
      assert.ok(gap >= 0.2 - 0.016 && gap <= 0.6 + 0.016, `deriva: intervalo ${gap}`)
    }
  }
  for (const seed of [1, 2, 3]) {
    const { world, events } = makeEv(seed, {
      getPointer: () => ({ x: 400, y: 35, kind: 'mouse', ageSec: 0 }),
      hostRect: () => RECT,
    })
    run(world, 60, DT120)
    const ts = times(events, 'saccade')
    assert.ok(ts.length > 200)
    for (let i = 1; i < ts.length; i++) {
      const gap = ts[i] - ts[i - 1]
      assert.ok(gap >= 0.12 - 0.016 && gap <= 0.3 + 0.016, `seguindo: intervalo ${gap}`)
    }
  }
})

test('sacada leva 45 a 85 ms para chegar a 90% sem overshoot', () => {
  let medidas = 0
  for (const seed of [1, 2, 3]) {
    const { world, model, events } = makeEv(seed)
    const trace = []
    let prev = { x: 0, y: 0 }
    run(world, 60, DT120, () => {
      trace.push({ t: world.t, x: model.pose.look.x, y: model.pose.look.y })
    })
    const sac = events.filter((e) => e.kind === 'saccade')
    for (const ev of sac) {
      const i0 = trace.findIndex((r) => r.t >= ev.t - 1e-9)
      if (i0 < 1) continue
      prev = trace[i0 - 1]
      const x0 = prev.x
      const y0 = prev.y
      if (Math.hypot(x0, y0) > 0.95 || Math.hypot(ev.x, ev.y) > 0.95) continue
      const dx = ev.x - x0
      if (Math.abs(dx) < 0.2) continue
      // desde o quadro anterior ao evento (a mola ja andou um passo no quadro do evento)
      const tStart = ev.t - DT120
      let t90 = null
      let over = 0
      for (let i = i0; i < trace.length && trace[i].t < ev.t + 0.15; i++) {
        const frac = (trace[i].x - x0) / dx
        if (t90 === null && frac >= 0.9) t90 = trace[i].t - tStart
        over = Math.max(over, frac - 1)
      }
      assert.ok(t90 !== null, 'nao chegou a 90%')
      assert.ok(t90 >= 0.045 && t90 <= 0.085, `t90 ${t90}`)
      assert.ok(over < 0.002, `overshoot ${over}`)
      medidas++
    }
  }
  assert.ok(medidas > 30, `medidas ${medidas}`)
})

test('pupila presa dentro do olho: norma eliptica menor ou igual a 1 em 60 s de deriva e seguindo', () => {
  for (const follow of [false, true]) {
    const { world, model } = makeEv(
      7,
      follow ? { getPointer: () => ({ x: 300, y: 300, kind: 'mouse', ageSec: 0 }), hostRect: () => RECT } : {},
    )
    let worst = 0
    run(world, 60, DT120, () => {
      worst = Math.max(worst, Math.hypot(model.pose.look.x, model.pose.look.y))
    })
    assert.ok(worst <= 1 + 1e-9, `norma ${worst} (follow ${follow})`)
  }
})

test('ponteiro de mouse: o olhar vai para o lado dele e fica; cabeca segue com atraso', () => {
  const { world, model } = makeEv(8, {
    getPointer: () => ({ x: 400, y: 35, kind: 'mouse', ageSec: 99 }),
    hostRect: () => RECT,
  })
  run(world, 0.05, DT120)
  const alvo = model.pose.gaze.x
  assert.ok(alvo > 0.95)
  assert.ok(model.pose.rot < 0.2 * alvo * 3.2, `cabeca ainda atrasada: ${model.pose.rot}`)
  let min = 1
  let sum = 0
  let n = 0
  run(world, 5, DT120, (i) => {
    if (i > 120) {
      min = Math.min(min, model.pose.look.x)
      sum += model.pose.look.x
      n++
    }
  })
  assert.ok(min > 0.85 && sum / n > 0.95, `olhar nao ficou: min ${min}`)
  assert.ok(Math.abs(model.pose.rot - alvo * 3.2) < 0.1, `rot ${model.pose.rot}`)
  assert.ok(Math.abs(model.pose.px - alvo * 3) < 0.1, `px ${model.pose.px}`)
})

test('ponteiro de toque expira em 1,2 s e o olhar volta a deriva', () => {
  const t0 = 0
  const holder = { world: null }
  const { world, model, events } = makeEv(9, {
    getPointer: () => ({ x: 400, y: 35, kind: 'touch', ageSec: holder.world ? holder.world.t - t0 : 0 }),
    hostRect: () => RECT,
  })
  holder.world = world
  let sum = 0
  let n = 0
  run(world, 1.1, DT120, (i) => {
    if (i > 40) {
      sum += model.pose.look.x
      n++
    }
  })
  assert.ok(sum / n > 0.9, `seguindo o toque: ${sum / n}`)
  run(world, 12, DT120)
  const depois = events.filter((e) => e.kind === 'saccade' && e.t > 1.2 + 0.35)
  assert.ok(depois.length > 20)
  for (const e of depois) assert.equal(e.follow, false)
  for (let i = 1; i < depois.length; i++) assert.ok(depois[i].t - depois[i - 1].t >= 0.2 - 0.016)
})

test('deriva: vies de +0,15 em x no neutro e amplitude de 40% no sonolento', () => {
  const mean = (state) => {
    const { world, events } = makeEv(11, { state })
    run(world, 1500, DT120)
    const xs = events.filter((e) => e.kind === 'gaze-center').map((e) => e.x)
    assert.ok(xs.length > 400)
    for (const x of xs) assert.ok(x <= 0.75 + 1e-9 && x >= -0.75 - 1e-9)
    return xs.reduce((a, v) => a + v, 0) / xs.length
  }
  const neutro = mean('neutro')
  assert.ok(neutro > 0.08 && neutro < 0.22, `vies neutro ${neutro}`)
  const feliz = mean('feliz')
  assert.ok(Math.abs(feliz) < 0.07, `feliz ${feliz}`)

  const peak = (state) => {
    const { world, model } = makeEv(12, { state })
    let m = 0
    run(world, 120, DT120, () => {
      m = Math.max(m, Math.abs(model.pose.look.x))
    })
    return m
  }
  assert.ok(peak('sonolento') <= 0.4 + 1e-9)
  assert.ok(peak('neutro') > 0.6)
})

test('orelha da tique a cada 2,5 a 6,5 s, uma por vez', () => {
  const { world, model, events } = makeEv(13)
  let moved = 0
  run(world, 400, DT120, () => {
    moved = Math.max(moved, Math.abs(model.pose.earL), Math.abs(model.pose.earR))
  })
  const tics = events.filter((e) => e.kind === 'ear-tic')
  assert.ok(tics.length > 60)
  for (let i = 1; i < tics.length; i++) {
    const gap = tics[i].t - tics[i - 1].t
    assert.ok(gap >= 2.5 - 0.02 && gap <= 6.5 + 0.02, `tique ${gap}`)
  }
  assert.ok(tics.some((e) => e.side === 'L') && tics.some((e) => e.side === 'R'))
  assert.ok(moved > 5, `a orelha quase nao mexeu: ${moved}`)
})

test('sonolento: cabeca cai em 3 etapas a cada 2,4 s e da tranco de despertar aos 9,4 s', () => {
  const { world, model, events } = makeEv(14)
  run(world, 0.5, DT120)
  model.setState('sonolento')
  const t0 = world.t
  const head = {}
  run(world, 20, DT120, () => {
    head[Math.round((world.t - t0) * 10) / 10] = model.pose.head
  })
  const rel = (kind) => times(events, kind).filter((t) => t > t0).map((t) => t - t0)
  const droop = rel('droop')
  for (const [i, want] of [2.4, 4.8, 7.2].entries()) assert.ok(Math.abs(droop[i] - want) < 0.02, `etapa ${i}: ${droop[i]}`)
  const jolt = rel('jolt')
  assert.ok(Math.abs(jolt[0] - 9.4) < 0.02, `tranco ${jolt[0]}`)
  assert.ok(Math.abs(jolt[1] - 18.8) < 0.04, `segundo tranco ${jolt[1]}`)
  assert.ok(head[2.0] < 1)
  assert.ok(head[4.0] > 2 && head[4.0] < 4.5)
  assert.ok(head[8.0] > 8)
  assert.ok(head[11.0] < 1, `depois do tranco ${head[11.0]}`)
})

test('touch devolve true e acorda o sonolento; senao so pisca e devolve false', () => {
  const a = makeEv(15, { state: 'sonolento' })
  run(a.world, 6, DT120)
  assert.ok(a.model.pose.head > 3)
  assert.equal(a.model.touch(), true)
  assert.equal(a.model.pose.head > 3, true)
  run(a.world, 1, DT120)
  assert.ok(a.model.pose.head < 1)
  const b = makeEv(16)
  run(b.world, 1, DT120)
  assert.equal(b.model.touch(), false)
  assert.equal(times(b.events, 'blink').length, 1)
})

test('movimento reduzido: 30 s sem respiracao, piscar, deriva, seguir, tique, rabo nem queda', () => {
  const { world, model, events } = makeEv(17, {
    state: 'sonolento',
    reduced: () => true,
    getPointer: () => ({ x: 400, y: 35, kind: 'mouse', ageSec: 0 }),
    hostRect: () => RECT,
  })
  const sy0 = model.pose.sy
  run(world, 30, DT60, () => {
    const p = model.pose
    assertFinitePose(p, 'reduzido')
    assert.equal(p.sy, sy0)
    assert.equal(p.blink, 0)
    assert.equal(p.look.x, 0)
    assert.equal(p.look.y, 0)
    assert.equal(p.rot, 0)
    assert.equal(p.px, 0)
    assert.equal(p.tail, 0)
    assert.equal(p.earL, 0)
    assert.equal(p.earR, 0)
    assert.equal(p.head, 0)
    assert.equal(p.accPhase, 0.3)
  })
  assert.deepEqual(
    events.filter((e) => ['blink', 'saccade', 'ear-tic', 'droop', 'jolt', 'gaze-center'].includes(e.kind)),
    [],
  )
})

test('movimento reduzido: as expressoes ainda mudam e as molas chegam sem overshoot', () => {
  const { world, model } = makeEv(18, { reduced: () => true })
  const order = ['feliz', 'triste', 'bravo', 'sonolento', 'surpreso', 'atento', 'neutro']
  for (const st of order) {
    const start = { ...model.pose.e }
    model.setState(st)
    const over = {}
    for (const k of STATE_KEYS) over[k] = 0
    run(world, 3, DT60, () => {
      assertFinitePose(model.pose, 'reduzido')
      for (const k of STATE_KEYS) {
        // sy e py das chaves de expressao tambem entram; cv tem a queda de cabeca e e ignorada
        if (k === 'cvL' || k === 'cvR') continue
        const goal = model._p[k].t
        const dir = Math.sign(goal - start[k])
        if (dir !== 0) over[k] = Math.max(over[k], dir * (model.pose.e[k] - goal))
      }
    })
    assert.equal(model.isSettled(), true, `${st} nao assentou`)
    for (const k of STATE_KEYS) assert.ok(over[k] < 0.01, `${st}.${k} overshoot ${over[k]}`)
    for (const k of STATE_KEYS) {
      if (k === 'cvL' || k === 'cvR') continue
      assert.ok(Math.abs(model.pose.e[k] - model._p[k].t) < 0.01, `${st}.${k} nao chegou`)
    }
  }
})

// ---------------------------------------------------------------------------
// Reacoes, giro de lado, acessorios, moedas e ciclo de vida
// ---------------------------------------------------------------------------

const DURATION = { spend: 1.4, susto: 1.3, bronca: 1.7, festa: 2.3, wake: 0.65 }
const FORCED = { susto: 'surpreso', bronca: 'bravo', festa: 'feliz', wake: 'surpreso' }

/** Modelo parado no estado de fundo, pronto para reagir. */
function ready(seed, state = 'neutro', opts = {}) {
  const r = makeEv(seed, { state, ...opts })
  run(r.world, 2, DT120)
  return r
}

/** Roda a reacao e devolve o traco quadro a quadro. */
function trace(kind, { seed = 50, state = 'neutro', extra = 2, dt = DT120 } = {}) {
  const r = ready(seed, state)
  const t0 = r.world.t
  r.model.react(kind)
  const rows = []
  run(r.world, DURATION[kind] + extra, dt, () => {
    assertFinitePose(r.model.pose, kind)
    rows.push({
      t: r.world.t - t0,
      py: r.model.pose.py,
      px: r.model.pose.px,
      sy: r.model.pose.sy,
      sx: r.model.pose.sx,
      rot: r.model.pose.rot,
      coin: r.model.pose.coin.on,
      coins: r.model.pose.coins.length,
      eff: r.model.effState(),
      ov: { ...r.model.ov },
    })
  })
  return { ...r, rows }
}

test('REACTION_KINDS lista as cinco reacoes', () => {
  assert.deepEqual([...REACTION_KINDS], ['spend', 'susto', 'bronca', 'festa', 'wake'])
})

test('spend: agacha, salta, a moeda aparece em 300 ms e some na fenda, e tudo acaba em 1,4 s', () => {
  const { rows } = trace('spend')
  const at = (t) => rows.find((r) => r.t >= t)
  assert.equal(at(0.05).ov.sy, 0.82)
  assert.equal(at(0.05).ov.py, 5)
  assert.equal(at(0.2).ov.sy, 1.15)
  assert.equal(at(0.2).ov.py, -32)
  assert.equal(at(0.55).ov.sy, 0.88)
  assert.equal(at(0.75).ov.sy, 0.94)
  assert.ok(Math.min(...rows.map((r) => r.py)) < -20, 'salto')
  assert.ok(Math.min(...rows.map((r) => r.sy)) < 0.9, 'agachou')
  const on = rows.filter((r) => r.coin)
  assert.ok(on.length > 0)
  assert.ok(on[0].t >= 0.29 && on[0].t <= 0.32, `moeda aparece em ${on[0].t}`)
  assert.ok(on.at(-1).t < 1.0, `moeda sumiu em ${on.at(-1).t}`)
  assert.equal(rows.filter((r) => r.t > 1.0 && r.coin).length, 0)
  assert.deepEqual(at(1.405).ov, {})
  assert.ok(rows.every((r) => r.coins === 0))
})

test('susto, bronca, festa e wake seguem o roteiro e o estado a forca', () => {
  // susto
  {
    const { rows } = trace('susto')
    const at = (t) => rows.find((r) => r.t >= t)
    assert.equal(at(0.05).ov.sy, 1.2)
    assert.equal(at(0.05).ov.py, -22)
    assert.equal(at(0.05).eff, 'surpreso')
    assert.deepEqual(at(0.05).ov.acc, { sweat: 1 })
    assert.deepEqual([0.14, 0.21, 0.28, 0.35].map((t) => at(t).ov.px), [-5, 5, -4, 3])
    assert.equal(at(1.25).eff, 'surpreso')
    assert.equal(at(1.35).eff, 'neutro')
    assert.deepEqual(at(1.35).ov, {})
  }
  // bronca
  {
    const { rows } = trace('bronca')
    const pxs = []
    for (const r of rows) {
      if (r.ov.px !== undefined && r.ov.px !== pxs.at(-1) && r.t < 0.75) pxs.push(r.ov.px)
    }
    assert.equal(pxs.length, 9, `tremidas ${pxs}`)
    assert.ok(Math.abs(Math.abs(pxs[0]) - 8) < 1e-9 && Math.abs(Math.abs(pxs[8]) - 2.6) < 1e-9, `${pxs}`)
    assert.ok(pxs.every((v) => Math.abs(v) <= 8))
    assert.ok(rows.every((r) => Math.abs(r.ov.rot || 0) <= 2.5))
    assert.ok(Math.max(...rows.map((r) => Math.abs(r.px))) <= 9, 'a tremida nao passa de 8 mais o overshoot da mola')
    assert.equal(rows.find((r) => r.t >= 1.65).eff, 'bravo')
    assert.equal(rows.find((r) => r.t >= 1.75).eff, 'neutro')
  }
  // festa
  {
    const { rows } = trace('festa')
    const jumps = rows.filter((r, i) => r.ov.py === -44 && (i === 0 || rows[i - 1].ov.py !== -44))
    assert.equal(jumps.length, 3)
    assert.ok(Math.abs(jumps[1].t - jumps[0].t - 0.62) < 0.02)
    assert.ok(Math.max(...rows.map((r) => r.coins)) <= 8)
    assert.ok(Math.max(...rows.map((r) => r.coins)) >= 2)
    assert.equal(rows.find((r) => r.t >= 2.25).eff, 'feliz')
    assert.equal(rows.find((r) => r.t >= 2.35).eff, 'neutro')
    assert.ok(rows.every((r) => !r.coin), 'festa solta so moedinhas')
  }
  // wake
  {
    const { rows } = trace('wake', { state: 'sonolento' })
    const at = (t) => rows.find((r) => r.t >= t)
    assert.equal(at(0.05).ov.sy, 1.14)
    assert.equal(at(0.05).ov.py, -16)
    assert.equal(at(0.05).eff, 'surpreso')
    assert.equal(at(0.6).eff, 'surpreso')
    assert.equal(at(0.7).eff, 'sonolento')
    assert.deepEqual(at(0.7).ov, {})
  }
})

test('depois de cada reacao: |py| < 2, overrides vazios, molas assentadas e estado de fundo de volta', () => {
  for (const state of ['neutro', 'feliz', 'atento']) {
    for (const kind of REACTION_KINDS) {
      const r = ready(60, state)
      r.model.react(kind)
      run(r.world, DURATION[kind] + 0.02, DT120)
      const p = r.model.pose
      assert.deepEqual(r.model.ov, {}, `${kind}/${state}: overrides`)
      assert.equal(p.coin.on, false)
      assert.equal(p.coins.length, 0)
      assert.equal(r.model.effState(), state)
      assert.ok(Math.abs(p.py) < 2, `${kind}/${state}: py ${p.py}`)
      run(r.world, 2, DT120)
      assert.equal(r.model.isSettled(), true, `${kind}/${state}: molas`)
      assert.ok(Math.abs(r.model.pose.py) < 0.5)
    }
  }
})

test('reacao nova cancela a anterior por token e a moeda so aparece em spend e festa', () => {
  // spend cancelado por susto antes da moeda
  {
    const r = ready(70)
    r.model.react('spend')
    run(r.world, 0.25, DT120)
    r.model.react('susto')
    let coin = false
    run(r.world, 1.6, DT120, () => {
      coin = coin || r.model.pose.coin.on
      if (r.world.t - 2.25 < 1.3) assert.equal(r.model.ov.ly === undefined || r.model.ov.ly === 0, true, 'resto do spend vazou')
    })
    assert.equal(coin, false, 'moeda do spend cancelado apareceu')
    assert.deepEqual(r.model.ov, {})
  }
  // festa cancelada por bronca: nada de moedinha depois
  {
    const r = ready(71)
    r.model.react('festa')
    run(r.world, 0.2, DT120)
    r.model.react('bronca')
    let coins = 0
    run(r.world, 2.5, DT120, () => {
      coins = Math.max(coins, r.model.pose.coins.length)
    })
    assert.equal(coins, 0, 'moedinhas da festa cancelada sobraram')
  }
  // so spend (moeda) e festa (moedinhas) soltam moeda
  for (const kind of ['susto', 'bronca', 'wake']) {
    const { rows } = trace(kind)
    assert.ok(rows.every((r) => !r.coin && r.coins === 0), `${kind} nao solta moeda`)
  }
  // nunca em repouso
  const r = makeEv(72)
  run(r.world, 60, DT60, () => {
    assert.equal(r.model.pose.coin.on, false)
    assert.equal(r.model.pose.coins.length, 0)
  })
})

test('movimento reduzido: cada reacao vira pose estatica de 1,3 s sem salto, tremida nem moeda', () => {
  const alvo = { spend: 'feliz', susto: 'surpreso', bronca: 'bravo', festa: 'feliz', wake: 'surpreso' }
  for (const kind of REACTION_KINDS) {
    const r = makeEv(80, { state: kind === 'wake' ? 'sonolento' : 'neutro', reduced: () => true })
    run(r.world, 1, DT60)
    const t0 = r.world.t
    r.model.react(kind)
    const goal = alvo[kind]
    assert.equal(r.model.effState(), goal)
    let last = r.model.pose.py
    run(r.world, 1.7, DT60, () => {
      const p = r.model.pose
      const dt = r.world.t - t0
      assertFinitePose(p, kind)
      assert.equal(p.px, 0, `${kind}: tremida em px`)
      assert.equal(p.rot, 0)
      assert.equal(p.coin.on, false)
      assert.equal(p.coins.length, 0)
      assert.deepEqual(r.model.ov, {})
      assert.equal(p.accPhase, 0.3)
      // sem salto: o corpo nao sai do lugar, so a expressao troca
      assert.equal(p.py, 0, `${kind}: py ${p.py}`)
      if (dt <= 1.29) assert.equal(r.model.effState(), goal)
      last = p.py
    })
    void last
    assert.equal(r.model.effState(), kind === 'wake' ? 'sonolento' : 'neutro')
  }
})

test('giro de lado: turn chega a 1 em cerca de 0,7 s sem passar de 1,05 e volta a 0', () => {
  const { world, model } = makeEv(90)
  run(world, 1, DT120)
  model.setTurn(true)
  let max = 0
  let t90 = null
  const t0 = world.t
  run(world, 2.5, DT120, () => {
    const T = model.pose.turn
    max = Math.max(max, T)
    if (t90 === null && T >= 0.9) t90 = world.t - t0
  })
  assert.ok(max <= 1.05, `turn passou de 1,05: ${max}`)
  assert.ok(t90 >= 0.2 && t90 <= 0.9, `t90 ${t90}`)
  assert.ok(Math.abs(model.pose.turn - 1) < 0.01)
  model.setTurn(false)
  let min = 1
  run(world, 2.5, DT120, () => {
    min = Math.min(min, model.pose.turn)
  })
  assert.ok(min >= -0.05, `turn abaixo de 0: ${min}`)
  assert.ok(Math.abs(model.pose.turn) < 0.01)
  // reduzido: troca instantanea
  const r = makeEv(91, { reduced: () => true })
  r.model.setTurn(true)
  r.world.step(DT60)
  assert.equal(r.model.pose.turn, 1)
  r.model.setTurn(false)
  r.world.step(DT60)
  assert.equal(r.model.pose.turn, 0)
})

test('acessorios: um por estado, entram com pop elastico e saem sem excesso', () => {
  const porEstado = { neutro: null, feliz: 'spark', triste: 'tear', bravo: 'anger', sonolento: 'z', surpreso: 'excl', atento: 'sweat' }
  for (const [state, key] of Object.entries(porEstado)) {
    const { world, model } = makeEv(95, { state })
    run(world, 3, DT120)
    for (const k of ACCESSORY_KEYS) {
      const want = k === key ? 1 : 0
      assert.ok(Math.abs(model.pose.acc[k] - want) < 0.01, `${state}.${k} = ${model.pose.acc[k]}`)
    }
  }
  const { world, model } = makeEv(96)
  run(world, 1, DT120)
  model.setState('surpreso')
  let max = 0
  run(world, 2, DT120, () => {
    max = Math.max(max, model.pose.acc.excl)
  })
  assert.ok(max > 1.05 && max < 1.4, `pop de entrada ${max}`)
  model.setState('neutro')
  let min = 1
  let prev = model.pose.acc.excl
  let mono = true
  run(world, 2, DT120, () => {
    const v = model.pose.acc.excl
    min = Math.min(min, v)
    if (v > prev + 1e-9) mono = false
    prev = v
  })
  assert.ok(min >= -0.001, `saida passou de zero: ${min}`)
  assert.ok(mono, 'saida nao e monotonica')
  // fase dos acessorios: anda em movimento normal, fixa em 0,3 com reduzido
  const a = makeEv(97, { state: 'sonolento' })
  const fases = new Set()
  run(a.world, 3, DT60, () => fases.add(a.model.pose.accPhase))
  assert.ok(fases.size > 50)
  for (const f of fases) assert.ok(f >= 0 && f < 1)
})

test('volume sx*sy desvia menos de 8% em spend, festa, susto, bronca e trocas de estado', () => {
  for (const dt of [DT60, DT120]) {
    const { world, model } = makeEv(100)
    let worst = 0
    const watch = () => {
      worst = Math.max(worst, Math.abs(model.pose.sx * model.pose.sy - 1))
    }
    run(world, 1, dt, watch)
    for (const kind of ['spend', 'festa', 'susto', 'bronca']) {
      model.react(kind)
      run(world, DURATION[kind] + 0.5, dt, watch)
    }
    for (const st of ['triste', 'bravo', 'surpreso', 'neutro', 'atento', 'feliz']) {
      model.setState(st)
      run(world, 1.5, dt, watch)
    }
    assert.ok(worst < 0.08, `volume desviou ${worst} (dt ${dt})`)
  }
})

test('World.step limita dt a 1/30 s e later respeita a ordem (empate pela insercao)', () => {
  const w = new World()
  w.step(5)
  assert.ok(Math.abs(w.t - 1 / 30) < 1e-12)
  w.step(-1)
  w.step(NaN)
  assert.ok(Math.abs(w.t - 1 / 30) < 1e-12)
  const w2 = new World()
  const out = []
  w2.later(100, () => out.push('a'))
  w2.later(50, () => out.push('b'))
  w2.later(100, () => out.push('c'))
  w2.later(100, () => out.push('d'))
  run(w2, 0.3, DT60)
  assert.deepEqual(out, ['b', 'a', 'c', 'd'])
  // dt gigante num modelo: continua finito
  const { world, model } = make(110)
  model.setState('triste')
  world.step(1000)
  assertFinitePose(model.pose, 'dt gigante')
  model.update(1e9)
  assertFinitePose(model.pose, 'update gigante')
})

test('modelo destruido ou removido nao avanca e as entradas pendentes viram nada', () => {
  for (const how of ['destroy', 'remove']) {
    const { world, model } = ready(120)
    model.react('spend')
    run(world, 0.1, DT120)
    const antes = JSON.stringify(model.pose)
    if (how === 'destroy') model.destroy()
    else world.remove(model)
    run(world, 2, DT120)
    assert.equal(JSON.stringify(model.pose), antes, `${how}: a pose andou`)
    assert.equal(world._q.length, 0, `${how}: fila nao esvaziou`)
    assert.equal(model.pose.coin.on, false)
  }
  const { world, model } = ready(121)
  model.destroy()
  model.react('festa')
  model.setState('triste')
  model.setTurn(true)
  assert.equal(model.touch(), false)
  assert.equal(model.state, 'neutro')
  run(world, 1, DT120)
  assert.equal(model.dead, true)
})

test('freezeAt congela a pose: o giro fica exatamente em T e nada muda em 5 s', () => {
  for (const turn of [0, 0.3, 0.5, 1]) {
    const { world, model } = make(31)
    model.setState('triste')
    model.freezeAt({ turn })
    assert.equal(model.pose.turn, turn, `turn ${turn}`)
    assert.equal(model.state, 'triste', 'mantem o estado')
    assert.equal(model.pose.blink, 0, 'sem piscar')
    assert.equal(model.pose.look.x, 0, 'sem deriva do olhar')
    assertFinitePose(model.pose, 'congelado')
    const antes = JSON.stringify(model.pose)
    model.setTurn(true)
    model.react('festa')
    run(world, 5, DT60)
    assert.equal(JSON.stringify(model.pose), antes, `a pose andou com turn ${turn}`)
    assert.equal(model.isSettled(), true, 'congelado assenta')
  }
})

test('freezeAt aceita variantes de teste (expr, look e acc) sem criar estado novo', () => {
  const { world, model } = make(32)
  model.freezeAt({ expr: { cvL: 0.18, cvR: 0.18, ba: 0 }, look: { x: 0.8, y: 0.3 }, acc: { tear: 1 }, turn: 2 })
  assert.equal(model.pose.e.cvL, 0.18)
  assert.equal(model.pose.e.cvR, 0.18)
  assert.equal(model.pose.e.ba, 0)
  assert.equal(model.pose.look.x, 0.8)
  assert.equal(model.pose.acc.tear, 1)
  assert.equal(model.pose.turn, 1, 'turn acima de 1 fica preso em 1')
  assert.equal(model.state, 'neutro')
  run(world, 2, DT60)
  assert.equal(model.pose.e.cvL, 0.18)
  const lixo = make(33).model
  lixo.freezeAt({ expr: { cvL: NaN, ba: Infinity }, look: { x: NaN, y: 0 } })
  assertFinitePose(lixo.pose, 'variante invalida')
})
