/** Canvas renderer adapted from the supplied Comet Orbit Atom effect. */
interface Stage {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  dpr: number
  pointer: { x: number; y: number; over: number; down: boolean }
}

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d
}

type RGBA = [number, number, number, number]

const COLOR_CACHE = new Map<string, RGBA | null>()

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
  if (typeof input !== 'string') return fallback
  let hit = COLOR_CACHE.get(input)
  if (hit === undefined) {
    hit = parseColorRaw(input)
    COLOR_CACHE.set(input, hit)
  }
  return hit ?? fallback
}

function parseColorRaw(raw: string): RGBA | null {
  let s = raw.trim()
  const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
  if (v) s = v[1]!.trim()
  if (s[0] === '#') {
    const h = s.slice(1)
    const x = (a: string) => parseInt(a, 16)
    let r: number,
      g: number,
      b: number,
      a = 255
    if (h.length === 3 || h.length === 4) {
      r = x(h[0]! + h[0]!)
      g = x(h[1]! + h[1]!)
      b = x(h[2]! + h[2]!)
      if (h.length === 4) a = x(h[3]! + h[3]!)
    } else if (h.length === 6 || h.length === 8) {
      r = x(h.slice(0, 2))
      g = x(h.slice(2, 4))
      b = x(h.slice(4, 6))
      if (h.length === 8) a = x(h.slice(6, 8))
    } else return null
    const out: RGBA = [r / 255, g / 255, b / 255, a / 255]
    return out.every(Number.isFinite) ? out : null
  }
  const m = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s)
  if (!m) return null
  const parts = m[2]!.split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const num = (p: string, scale: number) =>
    p.endsWith('%') ? (parseFloat(p) / 100) * scale : parseFloat(p)
  const alpha = parts.length > 3 ? num(parts[3]!, 1) : 1
  let rgb: [number, number, number]
  if (m[1]!.toLowerCase().startsWith('rgb')) {
    rgb = [num(parts[0]!, 255) / 255, num(parts[1]!, 255) / 255, num(parts[2]!, 255) / 255]
  } else {
    const hh = (((parseFloat(parts[0]!) % 360) + 360) % 360) / 360
    const ss = num(parts[1]!, 1),
      ll = num(parts[2]!, 1)
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
    const p = 2 * ll - q
    const f = (t: number) => {
      t = (t + 1) % 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    rgb = [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)]
  }
  const out: RGBA = [rgb[0], rgb[1], rgb[2], alpha]
  return out.every(Number.isFinite) ? (out.map((c) => Math.min(1, Math.max(0, c))) as RGBA) : null
}

function cssRgba(c: RGBA): string {
  return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${c[3]})`
}

const ADVANCED_DEFAULTS = {
  lapMs: 3710,
  perOrbit: 3,
  orbitRadius: 39,
  cageAspect: 88,
  orbitTwist: 31,
  shellSpin: 10,
  shellGlow: 35,
  orbitLines: 14,
  density: 1140,
  headSpread: 6,
  tailSpread: 35,
  strayPct: 29,
  particleSize: 78,
  particleAlpha: 85,
  twinkle: 65,
  washColor: '#4C4C4C',
  washAlpha: 30,
  washWidth: 35,
  headGlow: 75,
  headCore: 9,
  depthDim: 40,
  globeSize: 52,
  globeColor: '#161616',
  globeFill: 92,
  gridLat: 7,
  gridLon: 12,
  gridOpacity: 45,
  globeSpin: 14,
  globeTilt: 18,
  drag: 60,
  inertia: 75,
  tapBurst: 70,
  hazeColor: '#333333',
  hazeAlpha: 0,
  hazeRadius: 150,
  grain: 22,
  vignette: 0,
  hover: 50,
}

interface EffectProps {
  comets?: number
  trail?: number
  spread?: number
  advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

export interface CometRenderProps extends EffectProps {
  color?: string
  accent?: string
}

type Props = CometRenderProps

interface Effect {
  t: number
  noise: CanvasPattern | null
  /** View rotation (rad) from dragging, and its fling velocity (rad/s). */
  yaw: number
  pitch: number
  vYaw: number
  vPitch: number
  /** Eased hover lean, -1..1 each way. */
  hx: number
  hy: number
  /** Drag bookkeeping: last pointer, press start (s), distance moved. */
  lx: number
  ly: number
  wasDown: boolean
  downAt: number
  moved: number
  /** Tap shockwave, 1 at the tap → 0. */
  pulse: number
  /** Wall clock (s) of the last frame, so drag and tap still work at Speed 0. */
  last: number
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

function hash32(x: number): number {
  let h = (x | 0) ^ 0x2c1b3c6d
  h = Math.imul(h ^ (h >>> 16), 0x297a2d39)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  return (h ^ (h >>> 16)) >>> 0
}

function rnd(base: number, k: number): number {
  return hash32(base + k * 0x9e3779b9) / 4294967296
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function createCometEffect(): Effect {
  return {
    t: 0,
    noise: null,
    yaw: 0,
    pitch: 0,
    vYaw: 0,
    vPitch: 0,
    hx: 0,
    hy: 0,
    lx: 0,
    ly: 0,
    wasDown: false,
    downAt: 0,
    moved: 0,
    pulse: 0,
    last: -1,
  }
}

function drawEffect(
  stage: Stage,
  fx: Effect,
  p: Props,
  cx: number,
  cy: number,
  size: number,
  clock: number,
  progress: number | null,
  dt: number,
): void {
  const { ctx, W, H } = stage
  const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
  // `size` is the cage's height; F is the reference's square frame at that scale.
  const F = size / 0.8

  // Pointer response. Hover: the globe leans toward the pointer, comets speed up,
  // dust near it is pushed aside and nearby heads brighten. Drag: turns the whole
  // system in 3D and flings it on release. Tap: a shockwave, comets surge, the dust flares out.
  const hov = Math.max(0, num(adv.hover, 50)) / 50
  const over = clampN(stage.pointer.over, 0, 1) * hov
  const mx = stage.pointer.x
  const my = stage.pointer.y
  const pressed = stage.pointer.down

  const now =
    typeof performance !== 'undefined' ? performance.now() / 1000 : Math.max(0, fx.last) + dt
  const rdt = fx.last < 0 ? 0 : clampN(now - fx.last, 0, 0.05)
  fx.last = now
  const dragK = clampN(num(adv.drag, 60), 0, 100) / 100
  const inertia = clampN(num(adv.inertia, 75), 0, 100) / 100
  const tapK = clampN(num(adv.tapBurst, 70), 0, 100) / 100
  const radPerPx = (2.4 / F) * dragK
  if (pressed) {
    if (!fx.wasDown) {
      fx.lx = mx
      fx.ly = my
      fx.downAt = now
      fx.moved = 0
      fx.vYaw = 0
      fx.vPitch = 0
    }
    const dx = mx - fx.lx
    const dy = my - fx.ly
    fx.moved += Math.abs(dx) + Math.abs(dy)
    if (radPerPx > 0) {
      fx.yaw += dx * radPerPx
      fx.pitch = clampN(fx.pitch + dy * radPerPx, -1.3, 1.3)
      if (rdt > 0) {
        const k = 1 - Math.exp(-rdt * 20)
        fx.vYaw += ((dx * radPerPx) / rdt - fx.vYaw) * k
        fx.vPitch += ((dy * radPerPx) / rdt - fx.vPitch) * k
      }
    }
    fx.lx = mx
    fx.ly = my
  } else {
    if (fx.wasDown && now - fx.downAt < 0.35 && fx.moved < 8) {
      // a tap, not a drag: shockwave and a little spin
      if (tapK > 0) fx.pulse = 1
      fx.vYaw = 1.6 * tapK
      fx.vPitch = 0
    }
    fx.yaw += fx.vYaw * rdt
    fx.pitch = clampN(fx.pitch + fx.vPitch * rdt, -1.3, 1.3)
    const friction = Math.exp(-rdt * (0.6 + 10 * (1 - inertia)))
    fx.vYaw *= friction
    fx.vPitch *= friction
    // the tilt settles back to level once the fling dies down
    fx.pitch -= fx.pitch * (1 - Math.exp(-rdt * 0.7))
  }
  fx.wasDown = pressed
  fx.pulse = Math.max(0, fx.pulse - rdt / 1.4)
  const pulse = fx.pulse * tapK
  const bump = 4 * fx.pulse * (1 - fx.pulse) * tapK

  const lean = 1 - Math.exp(-rdt * 4)
  fx.hx += (over * clampN((mx - cx) / (F * 0.6), -1, 1) - fx.hx) * lean
  fx.hy += (over * clampN((my - cy) / (F * 0.6), -1, 1) - fx.hy) * lean
  // the whole comet shell turns slowly about the vertical axis, so it reads as a ball
  const vYaw = fx.yaw + fx.hx * 0.45 + (clock * num(adv.shellSpin, 10) * Math.PI) / 180
  const vPitch = fx.pitch + fx.hy * 0.3

  fx.t += dt * (1 + 0.5 * over + 2.5 * pulse * fx.pulse)
  const t = fx.t

  const pc = parseColor(p.color, [0.886, 0.886, 0.886, 1])
  const ac = parseColor(p.accent, [1, 1, 1, 1])
  const rgba = (c: RGBA, a: number) => cssRgba([c[0], c[1], c[2], clampN(a, 0, 1)])

  const comets = Math.round(clampN(num(p.comets, 36), 1, 60))
  const per = Math.round(clampN(num(adv.perOrbit, 2), 1, 6))
  const planes = Math.ceil(comets / per)
  const lap = Math.max(0.2, num(adv.lapMs, 3140) / 1000)
  const omega = (Math.PI * 2) / lap
  const trail = clampN(num(p.trail, 60), 10, 100)
  let life = 0.3 + (1.9 * (trail - 10)) / 90
  if (progress !== null) life *= 0.12 + 0.88 * progress
  const R = (F * clampN(num(adv.orbitRadius, 37), 5, 60)) / 100
  const xs = clampN(num(adv.cageAspect, 88), 30, 200) / 100
  const twist = (num(adv.orbitTwist, 20) * Math.PI) / 180
  const spreadMul = clampN(num(p.spread, 50), 0, 100) / 50
  const hs = (F * Math.max(0, num(adv.headSpread, 6))) / 1000
  const ts = (F * Math.max(0, num(adv.tailSpread, 35))) / 1000
  const stray = clampN(num(adv.strayPct, 12), 0, 100) / 100
  const psize = (F / 500) * Math.max(0.1, num(adv.particleSize, 100) / 100)
  const pAlpha = clampN(num(adv.particleAlpha, 85), 0, 100) / 100
  const twk = clampN(num(adv.twinkle, 45), 0, 100) / 100
  const dd = clampN(num(adv.depthDim, 40), 0, 100) / 100
  // Past 20 comets each tail thins a little, so the dust drawn per frame stays affordable.
  const rate = clampN(num(adv.density, 750), 50, 3000) * Math.min(1, 20 / comets)

  const pr = F * 0.25
  const push = F * 0.04 * over * (pressed ? 2 : 1)

  // Model space (y down, z toward the viewer) → view rotation → perspective onto the screen.
  const persp = F * 2.2
  const cyw = Math.cos(vYaw),
    syw = Math.sin(vYaw),
    cpt = Math.cos(vPitch),
    spt = Math.sin(vPitch)
  let ox = 0,
    oy = 0,
    oz = 0,
    os = 1
  const proj = (x: number, y: number, z: number) => {
    const x1 = x * cyw + z * syw
    const z1 = -x * syw + z * cyw
    const y1 = y * cpt + z1 * spt
    const z2 = -y * spt + z1 * cpt
    const s = persp / Math.max(1, persp - z2)
    ox = cx + x1 * s
    oy = cy + y1 * s
    oz = z2
    os = s
  }
  const Rg = (R * clampN(num(adv.globeSize, 52), 0, 100)) / 100
  /** Behind the globe and inside its disc: the globe hides it. */
  const hidden = (x: number, y: number, z: number) =>
    z < 0 && Rg > 1 && (x - cx) * (x - cx) + (y - cy) * (y - cy) < Rg * Rg

  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  // ── haze behind the system ──
  const hz = parseColor(adv.hazeColor, [0.2, 0.2, 0.2, 1])
  const hazeR = Math.max(1, (F * clampN(num(adv.hazeRadius, 42), 1, 150)) / 100)
  const hazeA = clampN(num(adv.hazeAlpha, 40), 0, 100) / 100
  const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, hazeR)
  hg.addColorStop(0, rgba(hz, hazeA))
  hg.addColorStop(0.35, rgba(hz, hazeA * 0.85))
  hg.addColorStop(1, rgba(hz, 0))
  ctx.fillStyle = hg
  ctx.fillRect(cx - hazeR, cy - hazeR, hazeR * 2, hazeR * 2)

  // ── the globe: shaded body, then latitude and longitude lines, back faint, front bright ──
  if (Rg > 1) {
    const gc = parseColor(adv.globeColor, [0.086, 0.086, 0.086, 1])
    const fill = clampN(num(adv.globeFill, 92), 0, 100) / 100
    const gridA = (clampN(num(adv.gridOpacity, 45), 0, 100) / 100) * (1 + 0.8 * pulse)
    const lift = (c: RGBA, k: number): RGBA => [
      c[0] + (1 - c[0]) * k,
      c[1] + (1 - c[1]) * k,
      c[2] + (1 - c[2]) * k,
      c[3],
    ]
    const body = ctx.createRadialGradient(cx - Rg * 0.35, cy - Rg * 0.4, Rg * 0.05, cx, cy, Rg)
    body.addColorStop(0, rgba(lift(gc, 0.18), fill))
    body.addColorStop(0.55, rgba(gc, fill))
    body.addColorStop(1, rgba([gc[0] * 0.35, gc[1] * 0.35, gc[2] * 0.35, 1], fill))
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(cx, cy, Rg, 0, Math.PI * 2)
    ctx.fill()

    const lat = Math.round(clampN(num(adv.gridLat, 7), 0, 24))
    const lon = Math.round(clampN(num(adv.gridLon, 12), 0, 48))
    const spin = (clock * num(adv.globeSpin, 14) * Math.PI) / 180
    const axis = (num(adv.globeTilt, 18) * Math.PI) / 180
    const ca = Math.cos(axis),
      sa = Math.sin(axis)
    const back = new Path2D(),
      mid = new Path2D(),
      front = new Path2D()
    let px0 = 0,
      py0 = 0,
      pz0 = 0
    const line = (n: number, on: (u: number) => [number, number, number]) => {
      for (let k = 0; k <= n; k++) {
        const [x, y, z] = on(k / n)
        proj(x * ca - y * sa, x * sa + y * ca, z)
        if (k > 0) {
          const zm = (pz0 + oz) / 2
          const path = zm < 0 ? back : zm < Rg * 0.5 ? mid : front
          path.moveTo(px0, py0)
          path.lineTo(ox, oy)
        }
        px0 = ox
        py0 = oy
        pz0 = oz
      }
    }
    for (let i = 1; i <= lat; i++) {
      const ph = -Math.PI / 2 + (i * Math.PI) / (lat + 1)
      const r = Math.cos(ph) * Rg
      const y = Math.sin(ph) * Rg
      line(64, (u) => [
        Math.cos(u * Math.PI * 2 + spin) * r,
        y,
        Math.sin(u * Math.PI * 2 + spin) * r,
      ])
    }
    for (let i = 0; i < lon; i++) {
      const lam = (i * Math.PI * 2) / lon + spin
      line(32, (u) => {
        const ph = -Math.PI / 2 + u * Math.PI
        const c = Math.cos(ph) * Rg
        return [c * Math.cos(lam), Math.sin(ph) * Rg, c * Math.sin(lam)]
      })
    }
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.6, F / 650)
    ctx.strokeStyle = rgba(pc, gridA * 0.16)
    ctx.stroke(back)
    ctx.strokeStyle = rgba(pc, gridA * 0.6)
    ctx.stroke(mid)
    ctx.strokeStyle = rgba(pc, gridA)
    ctx.stroke(front)

    // thin atmosphere and a rim light
    const atm = ctx.createRadialGradient(cx, cy, Rg * 0.92, cx, cy, Rg * 1.22)
    atm.addColorStop(0, rgba(pc, 0))
    atm.addColorStop(0.3, rgba(pc, 0.14 + 0.2 * pulse))
    atm.addColorStop(1, rgba(pc, 0))
    ctx.fillStyle = atm
    ctx.fillRect(cx - Rg * 1.22, cy - Rg * 1.22, Rg * 2.44, Rg * 2.44)
    ctx.strokeStyle = rgba(ac, 0.22)
    ctx.lineWidth = Math.max(0.6, F / 900)
    ctx.beginPath()
    ctx.arc(cx, cy, Rg, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.globalCompositeOperation = 'lighter'

  // ── limb glow: a soft lit edge where the comet shell's silhouette is, so the
  // eye reads the swarm as the surface of one ball ──
  const shellA = clampN(num(adv.shellGlow, 20), 0, 100) / 100
  if (shellA > 0) {
    const limb = (R * persp) / Math.sqrt(Math.max(1, persp * persp - R * R))
    const lg = ctx.createRadialGradient(cx, cy, limb * 0.82, cx, cy, limb * 1.14)
    lg.addColorStop(0, rgba(pc, 0))
    lg.addColorStop(0.55, rgba(pc, 0.22 * shellA * (1 + pulse)))
    lg.addColorStop(1, rgba(pc, 0))
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.arc(cx, cy, limb * 1.14, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── orbit planes: great circles of one sphere. Their normals are laid on a
  // Fibonacci spiral over a hemisphere for however many planes there are, so any
  // comet count covers the sphere evenly and every added comet fills a gap. ──
  const geo: {
    ax: number
    ay: number
    bx: number
    by: number
    bz: number
    nx: number
    ny: number
    nz: number
    ph: number
  }[] = []
  for (let i = 0; i < planes; i++) {
    const nz = 1 - (i + 0.5) / planes
    const rn = Math.sqrt(Math.max(0, 1 - nz * nz))
    const az = i * GOLDEN + twist
    const nx = rn * Math.cos(az)
    const ny = rn * Math.sin(az)
    // a lies in the circle and in the screen plane (n × z); b = n × a completes it
    let ax = 1,
      ay = 0
    if (rn > 1e-3) {
      ax = ny / rn
      ay = -nx / rn
    }
    geo.push({
      ax,
      ay,
      bx: -nz * ay,
      by: nz * ax,
      bz: nx * ay - ny * ax,
      nx,
      ny,
      nz,
      // heads start spread round their circles too, not lined up
      ph: i * GOLDEN * 2,
    })
  }

  // ── orbit guides: every comet's whole circle drawn faintly, so the shell's outline
  // is the true sphere at every moment, not only where the comets happen to be ──
  const guideA = clampN(num(adv.orbitLines, 14), 0, 100) / 100
  if (guideA > 0) {
    const gBack = new Path2D(),
      gFront = new Path2D()
    for (const g of geo) {
      let px0 = 0,
        py0 = 0,
        pz0 = 0,
        h0 = false
      for (let k = 0; k <= 72; k++) {
        const phi = (k / 72) * Math.PI * 2
        const co = Math.cos(phi)
        const si = Math.sin(phi)
        proj((co * g.ax + si * g.bx) * R * xs, (co * g.ay + si * g.by) * R, si * g.bz * R)
        const h1 = hidden(ox, oy, oz)
        if (k > 0 && !(h0 && h1)) {
          const path = pz0 + oz < 0 ? gBack : gFront
          path.moveTo(px0, py0)
          path.lineTo(ox, oy)
        }
        px0 = ox
        py0 = oy
        pz0 = oz
        h0 = h1
      }
    }
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.5, F / 900)
    ctx.strokeStyle = rgba(pc, guideA * 0.4 * (1 - dd * 0.5))
    ctx.stroke(gBack)
    ctx.strokeStyle = rgba(pc, guideA * (1 + pulse))
    ctx.stroke(gFront)
  }

  const heads: { x: number; y: number; d: number; s: number; vis: number }[] = []
  const washC = parseColor(adv.washColor, [0.3, 0.3, 0.3, 1])
  const washA = clampN(num(adv.washAlpha, 30), 0, 100) / 100
  const washW = Math.max(0.5, (F * Math.max(0, num(adv.washWidth, 35))) / 1000)

  for (let c = 0; c < comets; c++) {
    const g = geo[Math.floor(c / per)]!
    const k = c % per
    const phase = g.ph + (k * Math.PI * 2) / per
    const at = (phi: number) => {
      const co = Math.cos(phi)
      const si = Math.sin(phi)
      proj((co * g.ax + si * g.bx) * R * xs, (co * g.ay + si * g.by) * R, si * g.bz * R)
      return { x: ox, y: oy, z: clampN(oz / R, -1, 1), hid: hidden(ox, oy, oz) }
    }

    // faint grey wash under the dense part of the tail
    if (washA > 0) {
      ctx.lineCap = 'round'
      ctx.lineWidth = washW * spreadMul + 0.5
      const segs = 12
      const phH = phase + omega * t
      for (let s = 0; s < segs; s++) {
        const a0 = phH - (omega * life * s) / segs
        const a1 = phH - (omega * life * (s + 1)) / segs
        const pA = at(a0)
        const pM = at((a0 + a1) / 2)
        const pB = at(a1)
        const dpt = 1 - dd * (1 - (0.5 + 0.5 * pM.z))
        ctx.strokeStyle = rgba(
          washC,
          washA * Math.pow(1 - s / segs, 1.5) * dpt * (pM.hid ? 0.1 : 1),
        )
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.quadraticCurveTo(pM.x * 2 - (pA.x + pB.x) / 2, pM.y * 2 - (pA.y + pB.y) / 2, pB.x, pB.y)
        ctx.stroke()
      }
    }

    // dust: one particle per emission slot, stateless and persistent
    ctx.fillStyle = rgba(pc, 1)
    const nHead = Math.floor(t * rate)
    const nTail = Math.ceil((t - life) * rate)
    for (let n = nHead; n >= nTail; n--) {
      const te = n / rate
      const age = t - te
      if (age < 0) continue
      const u = age / Math.max(1e-3, life)
      if (u >= 1) continue
      const base = hash32(n * 17 + c * 7919)
      const r1 = rnd(base, 1),
        r2 = rnd(base, 2),
        r3 = rnd(base, 3),
        r4 = rnd(base, 4)
      const r5 = rnd(base, 5),
        r6 = rnd(base, 6),
        r7 = rnd(base, 7),
        r8 = rnd(base, 8),
        r9 = rnd(base, 9)
      const phi = phase + omega * te
      const co = Math.cos(phi)
      const si = Math.sin(phi)
      // radial and tangent directions in the orbit plane, plus its normal: the tail is a 3D tube
      const rx = co * g.ax + si * g.bx,
        ry = co * g.ay + si * g.by,
        rz = si * g.bz
      const tx = -si * g.ax + co * g.bx,
        ty = -si * g.ay + co * g.by,
        tz = co * g.bz
      const sigma = (hs + (ts - hs) * Math.pow(u, 0.8)) * spreadMul * (1 + 2.5 * bump)
      const isStray = r4 < stray
      let gauss = (r1 + r2 + r3 - 1.5) * 2
      if (isStray) gauss *= 2.6
      const ang = r9 * Math.PI * 2
      const rr = R + gauss * sigma * Math.cos(ang) + R * 0.3 * bump * (0.3 + r6)
      const oN = gauss * sigma * Math.sin(ang) * 0.7
      const along = (r5 - 0.5) * sigma
      proj(
        (rx * rr + g.nx * oN + tx * along) * xs,
        ry * rr + g.ny * oN + ty * along,
        rz * rr + g.nz * oN + tz * along,
      )
      const z = clampN(oz / R, -1, 1)
      const occl = hidden(ox, oy, oz) ? 0.08 : 1
      const ps = os
      let x = ox
      let y = oy
      if (push > 0.01) {
        const dx = x - mx,
          dy = y - my
        const d2 = dx * dx + dy * dy
        if (d2 < pr * pr) {
          const d = Math.max(1e-3, Math.sqrt(d2))
          const f = Math.pow(1 - d / pr, 2) * push
          x += (dx / d) * f
          y += (dy / d) * f
        }
      }
      const depth = 0.5 + 0.5 * z
      const dim = 1 - dd * (1 - depth)
      const tw = 1 - twk + twk * (0.5 + 0.5 * Math.sin(t * (5 + 9 * r6) + 6.283 * r7))
      const a = pAlpha * Math.pow(1 - u, 1.5) * tw * dim * (isStray ? 0.55 : 1) * occl
      if (a < 0.01) continue
      const s = (1 + r8) * psize * ps
      ctx.globalAlpha = Math.min(1, a)
      ctx.fillRect(x - s / 2, y - s / 2, s, s)
    }
    ctx.globalAlpha = 1

    const hp = at(phase + omega * t)
    heads.push({ x: hp.x, y: hp.y, d: 0.5 + 0.5 * hp.z, s: os, vis: hp.hid ? 0.1 : 1 })
  }

  // ── tap shockwave ──
  if (pulse > 0.01) {
    const base = Rg > 1 ? Rg : R * 0.3
    const ring = base * (1.05 + 1.6 * (1 - fx.pulse))
    ctx.strokeStyle = rgba(ac, 0.6 * Math.pow(fx.pulse, 1.5) * tapK)
    ctx.lineWidth = Math.max(0.6, (F / 250) * fx.pulse)
    ctx.beginPath()
    ctx.arc(cx, cy, ring, 0, Math.PI * 2)
    ctx.stroke()
  }

  // ── comet heads, on top ──
  const glowBase = (F * Math.max(1, num(adv.headGlow, 36))) / 1000
  const coreBase = (F * Math.max(0, num(adv.headCore, 7))) / 1000
  for (const hd of heads) {
    const dist = Math.hypot(hd.x - mx, hd.y - my)
    const near = over * Math.max(0, 1 - dist / pr)
    const dim = Math.min(1, (1 - dd * (1 - hd.d)) * (1 + 0.6 * near)) * hd.vis
    const gr = Math.max(1, glowBase * (0.45 + 0.55 * hd.d) * (1 + 0.3 * near) * hd.s)
    const g = ctx.createRadialGradient(hd.x, hd.y, 0, hd.x, hd.y, gr)
    g.addColorStop(0, rgba(ac, dim))
    g.addColorStop(0.2, rgba(pc, 0.75 * dim))
    g.addColorStop(0.5, `rgba(157, 157, 157, ${0.25 * dim})`)
    g.addColorStop(1, 'rgba(157, 157, 157, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(hd.x, hd.y, gr, 0, Math.PI * 2)
    ctx.fill()
    if (coreBase > 0) {
      ctx.fillStyle = rgba(ac, dim)
      ctx.beginPath()
      ctx.arc(hd.x, hd.y, Math.max(0.6, coreBase * (0.7 + 0.3 * hd.d)), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── overlays ──
  ctx.globalCompositeOperation = 'source-over'
  const vig = clampN(num(adv.vignette, 0), 0, 100) / 100
  if (vig > 0) {
    const vr = Math.hypot(W, H) / 2
    const vg = ctx.createRadialGradient(W / 2, H / 2, vr * 0.35, W / 2, H / 2, vr)
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vg.addColorStop(1, `rgba(0, 0, 0, ${vig})`)
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, W, H)
  }
  const grain = clampN(num(adv.grain, 0), 0, 100) / 100
  if (grain > 0 && fx.noise) {
    const fr = Math.floor(t * 24)
    const ox = rnd(fr, 1) * 128
    const oy = rnd(fr, 2) * 128
    ctx.globalAlpha = grain * 0.25
    ctx.translate(ox, oy)
    ctx.fillStyle = fx.noise
    ctx.fillRect(-ox, -oy, W, H)
  }
  ctx.restore()
}

export function drawCometFrame(
  stage: Stage,
  effect: Effect,
  props: CometRenderProps,
  clock: number,
  dt: number,
): void {
  const { ctx, W, H, dpr } = stage
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  const size = Math.min(W, H) * 0.78
  drawEffect(stage, effect, props, W / 2, H / 2, size, clock, null, dt)
}
