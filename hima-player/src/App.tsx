import { useEffect, useRef, useState } from 'react'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import { aiOrder } from './ai'
import { all, put, del } from './db'
import Icon from './Icon'
import { canScan, scan, keepAlive, nativeBright } from './scan'

type Track = { id: string; title: string; url: string; video: boolean; fav?: boolean; at: number; blob?: Blob; dur?: number; size?: number; h?: number; artist?: string; folder?: string }
type Tab = 'video' | 'music' | 'lists' | 'folders' | 'fav' | 'ai'
type Repeat = 'off' | 'all' | 'one'
const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
const SPEEDS = [1, 1.5, 2, 0.75]
const BANDS = [60, 230, 910, 3600, 14000]
const EQS = [{ n: 'عادي', g: [0, 0, 0, 0, 0] }, { n: 'باس', g: [7, 4, 0, 0, 0] }, { n: 'صوت', g: [-1, 0, 3, 4, 2] }, { n: 'روك', g: [5, 2, -1, 3, 5] }, { n: 'ناعم', g: [-2, 0, 2, 3, -1] }]
const ACCENTS = ['#8957FF', '#24D9C2', '#6D8DFF', '#C084FC', '#F4F6FC', '#64748B']
const SORTS = [['new', 'الأحدث'], ['name', 'الاسم'], ['dur', 'المدة'], ['size', 'الحجم']] as const
let A = ACCENTS[0]
const ls = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d } }
const lrcParse = (x: string) => x.split('\n').flatMap((l) => { const m = l.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/); return m ? [{ t: +m[1] * 60 + +m[2], x: m[3].trim() }] : [] })
const clean = (x: string) => x.replace(/[[(].*?[\])]/g, ' ').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
const srt2vtt = (x: string) => 'WEBVTT\n\n' + x.replace(/\r/g, '').replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2')
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
const art = (s: string) => ({ background: `linear-gradient(135deg,hsl(${hue(s)} 75% 58%),hsl(${hue(s) + 50} 70% 38%))` })

function VThumb({ src, dur: known }: { src: string; dur?: number }) {
  const [vis, setVis] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: '300px' })
    if (box.current) o.observe(box.current)
    return () => o.disconnect()
  }, [])
  return (
    <span ref={box} className="relative block aspect-video w-full overflow-hidden rounded-xl bg-white/10">
      {vis && <video src={src + '#t=1'} preload="metadata" muted playsInline className="size-full object-cover" />}
      <span className="absolute inset-0 grid place-items-center text-white/80"><Icon n="play" s={28} /></span>
    </span>
  )
}

export default function App() {
  const [q, setQ] = useState<Track[]>([])
  const [i, setI] = useState(-1)
  const [tab, setTab] = useState<Tab>('video')
  const [scanMsg, setScanMsg] = useState('')
  const [find, setFind] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [panel, setPanel] = useState<'eq' | 'sleep' | null>(null)
  const [fs, setFs] = useState(false)
  const [ui, setUi] = useState(true)
  const [cover, setCover] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [speed, setSpeed] = useState(0)
  const [eq, setEq] = useState(0)
  const [sleep, setSleep] = useState(0)
  const [vol, setVol] = useState<number | null>(null)
  const [ask, setAsk] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [acc, setAcc] = useState(() => ls('hema_acc', 0))
  const [sort, setSort] = useState<string>(() => ls('hema_sort', 'new'))
  const [lists, setLists] = useState<Record<string, string[]>>(() => ls('hema_lists', {}))
  const [openFolder, setOpenFolder] = useState<string | null>(null)
  const [openList, setOpenList] = useState<string | null>(null)
  const [newList, setNewList] = useState('')
  const [settings, setSettings] = useState(false)
  const [plSheet, setPlSheet] = useState<Track | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [hud, setHud] = useState<{ k: string; v: number } | null>(null)
  const [bright, setBr] = useState(0.5)
  const g = useRef({ x: 0, y: 0, ax: '', v: 1, b: 0.5, t: 0, w: 1, left: false, nt: -1 })
  const lastSave = useRef(0)
  const [boost, setBoost] = useState(() => ls('hema_boost', 100))
  const [shake, setShake] = useState(() => ls('hema_shake', false))
  const [adhan, setAdhan] = useState(() => ls('hema_adhan', false))
  const [quran, setQuran] = useState(() => ls('hema_quran', false))
  const [city, setCity] = useState(() => ls('hema_city', { c: '', k: '' }))
  const [lyr, setLyr] = useState<{ t: number; x: string }[]>([])
  const [wrap, setWrap] = useState<string | null>(null)
  const [car, setCar] = useState(false)
  const gainN = useRef<GainNode>()
  const anN = useRef<AnalyserNode>()
  const cv = useRef<HTMLCanvasElement>(null)
  const lastCt = useRef(0)
  const accT = useRef(0)
  const counted = useRef('')
  useEffect(() => { for (const [k, v] of Object.entries({ boost, shake, adhan, quran, city })) localStorage.setItem('hema_' + k, JSON.stringify(v)); if (gainN.current) gainN.current.gain.value = boost / 100 }, [boost, shake, adhan, quran, city])
  A = ACCENTS[acc] ?? ACCENTS[0]
  useEffect(() => { localStorage.setItem('hema_acc', String(acc)); localStorage.setItem('hema_sort', JSON.stringify(sort)) }, [acc, sort])
  useEffect(() => { localStorage.setItem('hema_lists', JSON.stringify(lists)) }, [lists])
  const m = useRef<HTMLVideoElement>(null)
  const hide = useRef<number>()
  const ac = useRef<AudioContext>()
  const bands = useRef<BiquadFilterNode[]>([])
  const drag = useRef({ y: 0, v: 1 })
  const cur = q[i]
  const li = lyr.reduce((a, l, k) => (l.t <= t + 0.3 ? k : a), -1)
  const match = (x: Track) => (!find || x.title.toLowerCase().includes(find.toLowerCase())) && (tab !== 'fav' || x.fav) && (tab !== 'folders' || x.folder === openFolder) && (tab !== 'lists' || (lists[openList ?? ''] ?? []).includes(x.id))
  const srt = (a: { x: Track }, b: { x: Track }) => (sort === 'name' ? a.x.title.localeCompare(b.x.title) : sort === 'dur' ? (b.x.dur ?? 0) - (a.x.dur ?? 0) : sort === 'size' ? (b.x.size ?? 0) - (a.x.size ?? 0) : 0)
  const musics = q.map((x, k) => ({ x, k })).filter((o) => !o.x.video && match(o.x)).sort(srt)
  const videos = q.map((x, k) => ({ x, k })).filter((o) => o.x.video && match(o.x)).sort(srt)
  const open = (tab === 'folders' && openFolder !== null) || (tab === 'lists' && openList !== null)
  const showM = tab === 'music' || tab === 'fav' || open
  const showV = tab === 'video' || tab === 'fav' || open
  const folderMap = q.reduce((mm, x) => (x.folder ? mm.set(x.folder, (mm.get(x.folder) ?? 0) + 1) : mm), new Map<string, number>())

  const favSet = () => new Set<string>(JSON.parse(localStorage.getItem('hema_favs') || '[]'))
  const load = async () => {
    setScanMsg('')
    const keep = cur?.id
    let lib: Track[] = []
    if (canScan()) {
      try {
        const fv = favSet()
        lib = (await scan()).map((x) => { const id = 'n' + x.id + (x.video ? 'v' : 'a'); return { id, title: x.title, url: x.url, video: x.video, at: 0, dur: x.duration / 1000, size: x.size, h: x.height, artist: x.artist, folder: x.folder, fav: fv.has(id) } })
      } catch { setScanMsg('اسمح بالوصول للملفات من إعدادات التطبيق، ثم اضغط تحديث') }
    }
    let imp: Track[] = []
    try { imp = (await all()).sort((a, b) => a.at - b.at).map((x) => ({ ...x, url: URL.createObjectURL(x.blob) })) } catch { /* ignore */ }
    const list = [...lib, ...imp]
    setQ(list); setI(keep ? list.findIndex((x) => x.id === keep) : -1)
  }
  useEffect(() => { void load() }, [])

  // Keyboard shortcuts for desktop keyboards; ignore typing fields and dialogs.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      else if (e.code === 'ArrowRight') { e.preventDefault(); seek((m.current?.currentTime ?? t) + (e.shiftKey ? 30 : 5)) }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); seek((m.current?.currentTime ?? t) - (e.shiftKey ? 30 : 5)) }
      else if (e.code === 'ArrowUp') { e.preventDefault(); step(-1) }
      else if (e.code === 'ArrowDown') { e.preventDefault(); step(1) }
      else if (e.key.toLowerCase() === 'm' && m.current) m.current.muted = !m.current.muted
      else if (e.key.toLowerCase() === 'f' && cur?.video) setCover((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cur?.id, t, i, shuffle, repeat, q])

  const add = (files: FileList | null) => {
    if (!files) return
    const n = [...files].map((f, k) => ({ id: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), video: f.type.startsWith('video'), at: Date.now() + k, blob: f as Blob }))
    n.forEach((x) => put({ id: x.id, title: x.title, video: x.video, at: x.at, blob: x.blob }).catch(() => {}))
    if (i < 0) setI(q.length)
    setQ((p) => [...p, ...n])
  }
  const step = (dir: 1 | -1) => {
    const pool = q.map((x, k) => ({ x, k })).filter((o) => o.x.video === cur?.video)
    if (!pool.length) return
    if (shuffle && dir === 1) return setI(pool[Math.floor(Math.random() * pool.length)].k)
    const p = pool.findIndex((o) => o.k === i)
    setI(pool[(p + dir + pool.length) % pool.length].k)
  }
  const toggle = () => { const e = m.current; if (e) { if (e.paused) void e.play(); else e.pause() } }
  const seek = (v: number) => { if (m.current) m.current.currentTime = Math.max(0, Math.min(d, v)) }
  const lock = async (on: boolean) => { try { if (on) await StatusBar.hide(); else await StatusBar.show() } catch { /* web */ } try { if (on) await ScreenOrientation.lock({ orientation: 'landscape' }); else await ScreenOrientation.unlock() } catch { /* web */ } }
  const bars = async (on: boolean) => { try { if (on) await StatusBar.hide(); else await StatusBar.show() } catch { /* web */ } }
  const openVideo = (k: number) => { setI(k); setFs(true); setUi(true); void bars(true) }
  const closeVideo = () => { setFs(false); void bars(false); void lock(false) }
  const poke = () => { setUi(true); window.clearTimeout(hide.current); hide.current = window.setTimeout(() => setUi(false), 3500) }
  const cycleSpeed = () => { const n = (speed + 1) % SPEEDS.length; setSpeed(n); if (m.current) m.current.playbackRate = SPEEDS[n] }
  const applyEq = (k: number) => { setEq(k); bands.current.forEach((b, j) => (b.gain.value = EQS[k].g[j])) }
  const initAudio = () => {
    if (ac.current) return void ac.current.resume()
    if (!m.current) return
    const c = new AudioContext(); const src = c.createMediaElementSource(m.current)
    bands.current = BANDS.map((f) => { const b = c.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1; b.gain.value = EQS[eq].g[BANDS.indexOf(f)]; return b })
    const gn = c.createGain(); gn.gain.value = boost / 100
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.15
    const an = c.createAnalyser(); an.fftSize = 64
    gainN.current = gn; anN.current = an
    ;[src, ...bands.current, gn, lim, an, c.destination].reduce((a, b) => (a.connect(b), b))
    ac.current = c
  }
  const fav = (x: Track) => {
    const f = !x.fav
    setQ((p) => p.map((y) => (y.id === x.id ? { ...y, fav: f } : y)))
    if (x.blob) put({ id: x.id, title: x.title, video: x.video, at: x.at, blob: x.blob, fav: f }).catch(() => {})
    else { const st = favSet(); if (f) st.add(x.id); else st.delete(x.id); localStorage.setItem('hema_favs', JSON.stringify([...st])) }
  }
  const remove = (x: Track) => { del(x.id).catch(() => {}); const k = q.indexOf(x); setQ((p) => p.filter((y) => y !== x)); if (k === i) { m.current?.pause(); setI(-1); setSheet(false) } else if (k < i) setI(i - 1) }

  useEffect(() => { if (cur && m.current) { setSub(null); counted.current = ''; lastCt.current = 0; m.current.src = cur.url; m.current.playbackRate = SPEEDS[speed]; m.current.play().catch(() => {}) } }, [cur?.id])
  useEffect(() => {
    if (sleep <= 0) return
    const a = window.setTimeout(() => { const c = ac.current, gn = gainN.current; if (c && gn) { gn.gain.setValueAtTime(gn.gain.value, c.currentTime); gn.gain.linearRampToValueAtTime(0.0001, c.currentTime + 8) } }, Math.max(0, sleep * 60000 - 8000))
    const b = window.setTimeout(() => { m.current?.pause(); setSleep(0); if (gainN.current) gainN.current.gain.value = boost / 100 }, sleep * 60000)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [sleep])
  useEffect(() => {
    if (!cur || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: cur.title, artist: 'Hema' })
    // Media controls must be idempotent: play always plays, pause always pauses.
    try {
      navigator.mediaSession.setActionHandler('play', () => { if (m.current?.paused) void m.current.play() })
      navigator.mediaSession.setActionHandler('pause', () => { if (m.current && !m.current.paused) m.current.pause() })
      navigator.mediaSession.setActionHandler('nexttrack', () => stepRef.current(1))
      navigator.mediaSession.setActionHandler('previoustrack', () => stepRef.current(-1))
      navigator.mediaSession.setActionHandler('seekbackward', (details) => seek((m.current?.currentTime ?? 0) - (details.seekOffset ?? 10)))
      navigator.mediaSession.setActionHandler('seekforward', (details) => seek((m.current?.currentTime ?? 0) + (details.seekOffset ?? 10)))
    } catch { /* browser may not support every Media Session action */ }
  })
  const stepRef = useRef(step)
  stepRef.current = step
  const tick = (ct: number) => {
    const dt = ct - lastCt.current; lastCt.current = ct
    if (!cur || dt <= 0 || dt > 1.5) return
    accT.current += dt
    const first = ct > 30 && counted.current !== cur.id
    if (first || accT.current > 15) {
      const st = ls<{ p: Record<string, { n: number; t: string }>; s: number }>('hema_stats', { p: {}, s: 0 })
      if (first) { counted.current = cur.id; st.p[cur.id] = { n: (st.p[cur.id]?.n ?? 0) + 1, t: cur.title } }
      st.s += accT.current; accT.current = 0
      localStorage.setItem('hema_stats', JSON.stringify(st))
    }
  }
  const makeWrapped = () => {
    const st = ls<{ p: Record<string, { n: number; t: string }>; s: number }>('hema_stats', { p: {}, s: 0 })
    const top = Object.values(st.p).sort((a, b) => b.n - a.n).slice(0, 5)
    const c = document.createElement('canvas'); c.width = 720; c.height = 1280
    const x = c.getContext('2d')!
    const gr = x.createLinearGradient(0, 0, 720, 1280); gr.addColorStop(0, A); gr.addColorStop(1, '#1a1030')
    x.fillStyle = gr; x.fillRect(0, 0, 720, 1280)
    x.fillStyle = '#fff'; x.textAlign = 'center'
    x.font = '700 72px Readex Pro, sans-serif'; x.fillText('Hema Wrapped', 360, 170)
    x.font = '400 42px Readex Pro, sans-serif'; x.fillText(`${Math.round((st.s / 3600) * 10) / 10} ساعة استماع`, 360, 270)
    top.forEach((o, k) => { x.font = '600 38px Readex Pro, sans-serif'; x.fillText(`${k + 1}. ${o.t.slice(0, 24)} · ${o.n}`, 360, 440 + k * 120) })
    if (!top.length) { x.font = '400 40px Readex Pro, sans-serif'; x.fillText('اسمع شوي وارجع', 360, 500) }
    setWrap(c.toDataURL('image/png'))
  }
  useEffect(() => {
    if (!shake) return
    let last = 0
    const f = (e: DeviceMotionEvent) => { const a = e.accelerationIncludingGravity; if (!a) return; if (Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) > 28 && Date.now() - last > 1500) { last = Date.now(); stepRef.current(1) } }
    window.addEventListener('devicemotion', f)
    return () => window.removeEventListener('devicemotion', f)
  }, [shake])
  useEffect(() => {
    if (!sheet || !playing) return
    let raf = 0; const buf = new Uint8Array(32)
    const draw = () => { const c = cv.current, a = anN.current; if (c && a) { a.getByteFrequencyData(buf); const x = c.getContext('2d')!; x.clearRect(0, 0, c.width, c.height); x.fillStyle = A; buf.forEach((v, k) => { const h = Math.max(2, (v / 255) * c.height); x.fillRect(k * 9 + 2, c.height - h, 6, h) }) } raf = requestAnimationFrame(draw) }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [sheet, playing])
  useEffect(() => {
    setLyr([])
    if (!cur || cur.video) return
    const key = 'lyr_' + cur.id; const cached = localStorage.getItem(key)
    if (cached) { setLyr(lrcParse(cached)); return }
    const ctl = new AbortController()
    const who = cur.artist && !cur.artist.includes('unknown') ? cur.artist + ' ' : ''
    fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(clean(who + cur.title)), { signal: ctl.signal })
      .then((r) => r.json()).then((a: { syncedLyrics?: string }[]) => { const l = a.find((y) => y.syncedLyrics)?.syncedLyrics; if (l) { localStorage.setItem(key, l); setLyr(lrcParse(l)) } }).catch(() => {})
    return () => ctl.abort()
  }, [cur?.id])
  useEffect(() => {
    if (!adhan || !city.c) return
    const hs: number[] = []
    fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city.c)}&country=${encodeURIComponent(city.k)}`).then((r) => r.json()).then((j) => {
      const T = j.data.timings as Record<string, string>
      ;['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((n) => { const [h, mi] = T[n].split(':').map(Number); const at = new Date(); at.setHours(h, mi, 0, 0); const ms = at.getTime() - Date.now(); if (ms > 0) hs.push(window.setTimeout(() => m.current?.pause(), ms)) })
    }).catch(() => {})
    return () => hs.forEach((h) => window.clearTimeout(h))
  }, [adhan, city.c, city.k, new Date().toDateString()])
  const addTo = (n: string, id: string) => setLists((p) => ({ ...p, [n]: [...new Set([...(p[n] ?? []), id])] }))
  const setBright = (b: number) => { setBr(b); void nativeBright(b) }
  const resume = (e: HTMLVideoElement) => { const sp = ls<Record<string, number>>('hema_pos', {})[cur?.id ?? '']; if (sp && (cur?.video || e.duration > 600 || quran) && sp < e.duration - 5) e.currentTime = sp }
  const savePos = (ct: number) => { if (!cur || (!cur.video && d < 600 && !quran) || Math.abs(ct - lastSave.current) < 5) return; lastSave.current = ct; const p = ls<Record<string, number>>('hema_pos', {}); p[cur.id] = ct; localStorage.setItem('hema_pos', JSON.stringify(p)) }
  const rotate = async () => { try { const o = await ScreenOrientation.orientation(); await ScreenOrientation.lock({ orientation: o.type.startsWith('landscape') ? 'portrait' : 'landscape' }) } catch { /* web */ } }
  useEffect(() => { const tr = m.current?.textTracks[0]; if (tr) tr.mode = 'showing' }, [sub])
  const ended = () => { if (sleep === -1) { setSleep(0); return } if (repeat === 'one') void m.current?.play(); else if (repeat === 'off' && !shuffle && cur && q.filter((x) => x.video === cur.video).pop() === cur) setPlaying(false); else step(1) }

  const smart = async () => {
    const list = q.filter((x) => !x.video)
    if (!ask.trim() || !list.length) return
    setBusy(true); setMsg('')
    try {
      const order = await aiOrder(ask, list.map((x) => x.title))
      const picked = order.filter((n) => list[n]).map((n) => list[n])
      if (!picked.length) { setMsg('لا نتيجة. جرب وصف ثاني.'); return }
      setLists((p) => ({ ...p, ['AI · ' + ask.slice(0, 24)]: picked.map((x) => x.id) })); setQ([...picked, ...q.filter((x) => !picked.includes(x))]); setI(0); setSheet(true); setMsg('انحفظت قائمة في «القوائم»')
    } catch (e) { setMsg((e as Error).message === 'AI_URL_MISSING' ? 'AI غير مفعّل: اضبط VITE_AI_URL' : 'فشل AI. جرب لاحقا.') } finally { setBusy(false) }
  }

  const Bar = ({ big }: { big?: boolean }) => (
    <div dir="ltr">
      <input type="range" min={0} max={d || 0} step={0.1} value={t} aria-label="التقدم" onChange={(e) => seek(+e.target.value)} style={{ accentColor: A, width: '100%' }} />
      <div className={`flex justify-between opacity-70 ${big ? 'text-sm' : 'text-xs'}`}><span>{fmt(t)}</span><span>{fmt(d)}</span></div>
    </div>
  )
  const Ctl = () => (
    <div dir="ltr" className="flex items-center justify-between">
      <button aria-label="عشوائي" onClick={() => setShuffle(!shuffle)} style={{ color: shuffle ? A : '#fff8' }}><Icon n="shuffle" s={26} /></button>
      <button aria-label="السابق" onClick={() => step(-1)}><Icon n="prev" s={36} /></button>
      <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="grid size-18 place-items-center rounded-full text-white" style={{ background: A, width: 72, height: 72 }}><Icon n={playing ? 'pause' : 'play'} s={38} /></button>
      <button aria-label="التالي" onClick={() => step(1)}><Icon n="next" s={36} /></button>
      <button aria-label="تكرار" onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} className="relative" style={{ color: repeat === 'off' ? '#fff8' : A }}><Icon n="repeat" s={26} />{repeat === 'one' && <b className="absolute inset-0 grid place-items-center text-[10px]">1</b>}</button>
    </div>
  )
  const Row = ({ x, k }: { x: Track; k: number }) => (
    <li key={x.id} className="flex items-center gap-1 rounded-xl active:bg-white/5">
      <button onClick={() => { setI(k); setSheet(!x.video); if (x.video) openVideo(k) }} className="flex min-w-0 flex-1 items-center gap-3 p-2 text-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg font-semibold text-white" style={art(x.title)}>{k === i && playing ? <Icon n="eq" s={20} /> : [...x.title][0]}</span>
        <span className="min-w-0"><span className="block truncate" style={k === i ? { color: A } : undefined}>{x.title}</span><span className="block truncate text-xs opacity-50">{[x.artist && x.artist !== '<unknown>' ? x.artist : '', x.dur ? fmt(x.dur) : ''].filter(Boolean).join(' · ')}</span></span>
      </button>
      <button aria-label="مفضلة" onClick={() => fav(x)} className="p-2" style={{ color: x.fav ? A : '#fff5' }}><Icon n="heart" s={22} /></button>
      <button aria-label="قائمة" onClick={() => setPlSheet(x)} className="p-2 opacity-60"><Icon n="list" s={20} /></button>
      {x.blob && <button aria-label="حذف" onClick={() => remove(x)} className="p-2 opacity-40"><Icon n="trash" s={20} /></button>}
    </li>
  )
  const VRow = ({ x, k }: { x: Track; k: number }) => (
    <li key={x.id} className="relative">
      <button onClick={() => openVideo(k)} className="block w-full text-start">
        <VThumb src={x.url} dur={x.dur} />
        <p className="mt-1 truncate px-1 text-sm" style={k === i ? { color: A } : undefined}>{x.title}</p>
        <p className="px-1 text-xs opacity-50">{[x.h ? `${x.h}P` : '', x.dur ? fmt(x.dur) : ''].filter(Boolean).join(' | ')}</p>
      </button>
      <button aria-label="مفضلة" onClick={() => fav(x)} className="absolute end-1 top-1 rounded-full bg-black/40 p-1.5" style={{ color: x.fav ? A : '#fffc' }}><Icon n="heart" s={18} /></button>
      <button aria-label="قائمة" onClick={() => setPlSheet(x)} className="absolute start-1 top-1 rounded-full bg-black/40 p-1.5 text-white/80"><Icon n="list" s={18} /></button>
    </li>
  )
  const empty = <p className="py-20 text-center opacity-60">{scanMsg || 'فارغ. اضغط + لإضافة ملفات.'}</p>
  const Opt = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="rounded-full px-4 py-2 text-sm" style={{ background: on ? A : '#ffffff1a' }}>{children}</button>
  )

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <video ref={m} playsInline onClick={poke}
        className={fs ? `fixed inset-0 z-40 size-full bg-black ${cover ? 'object-cover' : 'object-contain'}` : 'hidden'}
        onPlay={() => { setPlaying(true); initAudio(); poke(); void keepAlive(true, cur?.title) }} onPause={() => { setPlaying(false); void keepAlive(false) }}
        onTimeUpdate={(e) => { setT(e.currentTarget.currentTime); savePos(e.currentTarget.currentTime); tick(e.currentTarget.currentTime) }} onLoadedMetadata={(e) => { setD(e.currentTarget.duration); resume(e.currentTarget); if (fs && e.currentTarget.videoWidth > e.currentTarget.videoHeight) void lock(true) }} onEnded={ended}>{sub && <track default kind="subtitles" src={sub} />}</video>

      <header className="flex items-center gap-2 px-4 py-3">
        {find === null ? <h1 className="flex-1 text-2xl font-bold" style={{ color: A }}>Hema</h1>
          : <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="بحث" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 outline-none" />}
        <button aria-label="إعدادات" onClick={() => setSettings(true)} className="p-2"><Icon n="gear" /></button>
        <button aria-label="بحث" onClick={() => setFind(find === null ? '' : null)} className="p-2"><Icon n={find === null ? 'search' : 'close'} /></button>
        <label className="grid size-10 cursor-pointer place-items-center rounded-full text-white" style={{ background: A }} aria-label="إضافة ملفات"><Icon n="plus" />
          <input type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => add(e.target.files)} />
        </label>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {([['video', 'الفيديوهات'], ['music', 'الأغاني'], ['lists', 'القوائم'], ['folders', 'المجلدات'], ['fav', 'المفضلة'], ['ai', 'ذكاء']] as const).map(([k, l]) => <Opt key={k} on={tab === k} onClick={() => { setTab(k); setOpenFolder(null); setOpenList(null) }}>{l}</Opt>)}
      </div>
      {tab !== 'ai' && (
        <div className="flex items-center justify-between px-5 pb-2 text-sm opacity-60">
          <span>{tab === 'video' ? `${videos.length} فيديو` : tab === 'music' ? `${musics.length} أغنية` : `${videos.length + musics.length} عنصر`}</span>
          <button aria-label="تحديث" onClick={() => void load()}><Icon n="refresh" s={20} /></button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {open && <button onClick={() => { setOpenFolder(null); setOpenList(null) }} className="mb-2 flex items-center gap-2 px-2 py-1 text-sm opacity-70"><Icon n="back" s={18} />{tab === 'folders' ? openFolder : openList}</button>}
        {tab === 'folders' && openFolder === null && <ul>{[...folderMap].map(([n, c]) => <li key={n}><button onClick={() => setOpenFolder(n)} className="flex w-full items-center gap-3 rounded-xl p-3 text-start active:bg-white/5"><span className="grid size-12 place-items-center rounded-lg bg-white/10" style={{ color: A }}><Icon n="folder" /></span><span className="min-w-0 flex-1 truncate">{n}</span><span className="text-sm opacity-50">{c}</span></button></li>)}</ul>}
        {tab === 'lists' && openList === null && (
          <div className="space-y-2">
            <div className="flex gap-2"><input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="قائمة جديدة" className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-2 outline-none" /><button onClick={() => { if (newList.trim()) { setLists((p) => ({ ...p, [newList.trim()]: [] })); setNewList('') } }} className="rounded-xl px-4 text-white" style={{ background: A }}>إنشاء</button></div>
            {Object.entries(lists).map(([n, ids]) => <div key={n} className="flex items-center rounded-xl bg-white/5"><button onClick={() => setOpenList(n)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-start"><span style={{ color: A }}><Icon n="list" /></span><span className="min-w-0 flex-1 truncate">{n}</span><span className="text-sm opacity-50">{ids.length}</span></button><button aria-label="حذف" onClick={() => setLists((p) => { const c = { ...p }; delete c[n]; return c })} className="p-3 opacity-40"><Icon n="trash" s={20} /></button></div>)}
          </div>
        )}
        {showM && musics.length > 0 && <ul>{musics.map(({ x, k }) => Row({ x, k }))}</ul>}
        {showV && videos.length > 0 && <ul className="grid grid-cols-2 gap-3 pb-3">{videos.map(({ x, k }) => VRow({ x, k }))}</ul>}
        {(tab === 'video' ? !videos.length : tab === 'music' ? !musics.length : (tab === 'fav' || open) && !videos.length && !musics.length) && empty}
        {tab === 'ai' && (
          <div className="space-y-3 p-1">
            <p className="opacity-70">صف المزاج، يرتب موسيقاك.</p>
            <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && smart()} placeholder="هادي للدراسة، حماسي للرياضة…" className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none" />
            <button onClick={smart} disabled={busy} className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50" style={{ background: A }}>{busy ? '…' : 'رتّب بالذكاء'}</button>
            {msg && <p role="status" className="text-sm opacity-80">{msg}</p>}
          </div>
        )}
      </main>

      {cur && !sheet && !fs && (
        <div className="relative mx-2 mb-2 overflow-hidden rounded-2xl bg-white/10">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10"><div className="h-full" style={{ width: `${d ? (t / d) * 100 : 0}%`, background: A }} /></div>
          <div className="flex items-center gap-3 p-2">
            <button onClick={() => (cur.video ? openVideo(i) : setSheet(true))} className="flex min-w-0 flex-1 items-center gap-3 text-start">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg font-semibold text-white" style={art(cur.title)}>{[...cur.title][0]}</span>
              <span className="truncate">{cur.title}</span>
            </button>
            <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="p-1"><Icon n={playing ? 'pause' : 'play'} s={30} /></button>
            <button aria-label="التالي" onClick={() => step(1)} className="p-1"><Icon n="next" s={30} /></button>
          </div>
        </div>
      )}

      {sheet && cur && !cur.video && (
        <div className="fixed inset-0 z-30 flex flex-col gap-5 p-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)', background: `linear-gradient(180deg,hsl(${hue(cur.title)} 45% 22%),#0d0f14 70%)` }}>
          <button onClick={() => { setSheet(false); setPanel(null) }} aria-label="إغلاق" className="self-start"><Icon n="down" s={32} /></button>
          <div className="grid flex-1 place-items-center">
            <div className="grid aspect-square w-4/5 place-items-center rounded-full shadow-2xl" style={{ ...art(cur.title), animation: 'spin 14s linear infinite', animationPlayState: playing ? 'running' : 'paused' }}>
              <div className="grid size-1/4 place-items-center rounded-full bg-[#0d0f14] text-2xl font-bold">{[...cur.title][0]}</div>
            </div>
          </div>
          <canvas ref={cv} width={288} height={48} className="mx-auto" />
          <p className="truncate text-center text-xl font-semibold">{cur.title}</p>
          {lyr.length > 0 && <div className="space-y-1 text-center"><p className="truncate text-sm opacity-50">{lyr[li - 1]?.x}</p><p className="truncate text-lg font-semibold" style={{ color: A }}>{lyr[li]?.x}</p><p className="truncate text-sm opacity-50">{lyr[li + 1]?.x}</p></div>}
          {Bar({ big: true })}{Ctl()}
          <div dir="ltr" className="flex justify-around pb-2 opacity-90">
            <button aria-label="مفضلة" onClick={() => fav(cur)} style={{ color: cur.fav ? A : undefined }}><Icon n="heart" /></button>
            <button aria-label="منبه نوم" onClick={() => setPanel(panel === 'sleep' ? null : 'sleep')} style={{ color: sleep ? A : undefined }}><Icon n="timer" /></button>
            <button aria-label="موازن صوت" onClick={() => setPanel(panel === 'eq' ? null : 'eq')} style={{ color: eq ? A : undefined }}><Icon n="eq" /></button>
            <button aria-label="السرعة" onClick={cycleSpeed} className="text-sm font-semibold">{SPEEDS[speed]}x</button>
            <button onClick={() => setCar(true)} className="text-sm font-semibold">قيادة</button>
          </div>
          {panel && (
            <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 rounded-t-3xl bg-[#1a1d26] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <h2 className="font-semibold">{panel === 'eq' ? 'موازن الصوت' : 'إيقاف تلقائي'}</h2>
              <div className="flex flex-wrap gap-2">
                {panel === 'eq' ? EQS.map((e, k) => <Opt key={e.n} on={eq === k} onClick={() => applyEq(k)}>{e.n}</Opt>)
                  : [0, 15, 30, 60, -1].map((n) => <Opt key={n} on={sleep === n} onClick={() => { setSleep(n); setPanel(null) }}>{n === -1 ? 'نهاية المقطع' : n ? `${n} د` : 'إيقاف'}</Opt>)}
              </div>
              {panel === 'eq' && <div dir="ltr"><input type="range" min={100} max={300} step={10} value={boost} onChange={(e) => setBoost(+e.target.value)} style={{ accentColor: A, width: '100%' }} /><p className="text-center text-sm opacity-60">رفع الصوت {boost}%</p></div>}
              <button onClick={() => setPanel(null)} className="w-full py-2 opacity-70">تم</button>
            </div>
          )}
        </div>
      )}

      {wrap && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/90 p-4" onClick={() => setWrap(null)}>
          <img src={wrap} alt="Hema Wrapped" className="max-h-[75%] rounded-2xl" />
          <button onClick={async (e) => { e.stopPropagation(); try { const b = await (await fetch(wrap)).blob(); await navigator.share({ files: [new File([b], 'hema.png', { type: 'image/png' })] }) } catch { /* ignore */ } }} className="rounded-full px-8 py-3 text-white" style={{ background: A }}>مشاركة</button>
        </div>
      )}

      {car && cur && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-10 bg-black p-6">
          <p className="line-clamp-2 text-center text-3xl font-bold">{cur.title}</p>
          <div dir="ltr" className="flex w-full items-center justify-around">
            <button aria-label="السابق" onClick={() => step(-1)} className="p-4"><Icon n="prev" s={90} /></button>
            <button aria-label="تشغيل" onClick={toggle} className="grid size-36 place-items-center rounded-full text-white" style={{ background: A }}><Icon n={playing ? 'pause' : 'play'} s={80} /></button>
            <button aria-label="التالي" onClick={() => step(1)} className="p-4"><Icon n="next" s={90} /></button>
          </div>
          <button onClick={() => setCar(false)} className="rounded-full bg-white/10 px-8 py-3 text-xl">خروج</button>
        </div>
      )}

      {settings && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setSettings(false)}>
          <div className="max-h-[85%] w-full space-y-4 overflow-y-auto rounded-t-3xl bg-[#1a1d26] p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">الإعدادات</h2>
            <p className="text-sm opacity-60">اللون</p>
            <div className="flex gap-3">{ACCENTS.map((c, k) => <button key={c} aria-label={c} onClick={() => setAcc(k)} className="size-9 rounded-full" style={{ background: c, outline: acc === k ? '3px solid #fff' : 'none' }} />)}</div>
            <p className="text-sm opacity-60">الترتيب</p>
            <div className="flex flex-wrap gap-2">{SORTS.map(([k, l]) => <Opt key={k} on={sort === k} onClick={() => setSort(k)}>{l}</Opt>)}</div>
            <Opt on={false} onClick={() => { setSettings(false); void load() }}>إعادة مسح الملفات</Opt>
            <p className="text-sm opacity-60">الصوت والتحكم</p>
            <div dir="ltr"><input type="range" min={100} max={300} step={10} value={boost} onChange={(e) => setBoost(+e.target.value)} style={{ accentColor: A, width: '100%' }} /><p className="text-center text-sm opacity-60">رفع الصوت {boost}%</p></div>
            <div className="flex flex-wrap gap-2">
              <Opt on={shake} onClick={() => setShake(!shake)}>هز = التالي</Opt>
              <Opt on={quran} onClick={() => setQuran(!quran)}>وضع القرآن (يكمل كل مقطع)</Opt>
              <Opt on={adhan} onClick={() => setAdhan(!adhan)}>إيقاف وقت الأذان</Opt>
            </div>
            {adhan && <div className="flex gap-2"><input value={city.c} onChange={(e) => setCity({ ...city, c: e.target.value })} placeholder="City (English)" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none" /><input value={city.k} onChange={(e) => setCity({ ...city, k: e.target.value })} placeholder="Country (English)" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none" /></div>}
            <Opt on={false} onClick={() => { setSettings(false); makeWrapped() }}>ملخصي Hema Wrapped</Opt>
            <p className="text-xs opacity-50">لا إعلانات. ملفاتك ما تغادر جوالك. الإنترنت فقط للكلمات والذكاء والأذان.</p>
          </div>
        </div>
      )}

      {plSheet && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setPlSheet(null)}>
          <div className="max-h-[70%] w-full space-y-3 overflow-y-auto rounded-t-3xl bg-[#1a1d26] p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">أضف إلى قائمة</h2>
            {Object.keys(lists).map((n) => <button key={n} className="block w-full rounded-xl bg-white/10 p-3 text-start" onClick={() => { addTo(n, plSheet.id); setPlSheet(null) }}>{n}</button>)}
            <div className="flex gap-2"><input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="قائمة جديدة" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none" /><button onClick={() => { if (newList.trim()) { addTo(newList.trim(), plSheet.id); setNewList(''); setPlSheet(null) } }} className="rounded-xl px-4 text-white" style={{ background: A }}>+</button></div>
          </div>
        </div>
      )}

      {fs && cur?.video && (
        <div className="fixed inset-0 z-50 select-none" onClick={poke}
          onTouchStart={(e) => { const p = e.touches[0]; g.current = { x: p.clientX, y: p.clientY, ax: '', v: m.current?.volume ?? 1, b: bright, t, w: window.innerWidth, left: p.clientX < window.innerWidth / 2, nt: -1 } }}
          onTouchMove={(e) => {
            const p = e.touches[0]; const G = g.current; const dx = p.clientX - G.x; const dy = G.y - p.clientY
            if (!G.ax && (Math.abs(dx) > 14 || Math.abs(dy) > 14)) G.ax = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
            if (G.ax === 'y') {
              if (G.left) { const b = Math.max(0.05, Math.min(1, G.b + dy / 250)); setBright(b); setHud({ k: 'br', v: b }) }
              else { const v = Math.max(0, Math.min(1, G.v + dy / 250)); if (m.current) m.current.volume = v; setHud({ k: 'vol', v }) }
            } else if (G.ax === 'x') { G.nt = Math.max(0, Math.min(d, G.t + (dx / G.w) * 120)); setHud({ k: 'seek', v: G.nt }) }
          }}
          onTouchEnd={() => { const G = g.current; if (G.ax === 'x' && G.nt >= 0) seek(G.nt); window.setTimeout(() => setHud(null), 600) }}>
          <div className="absolute inset-y-0 start-0 w-1/3" onDoubleClick={() => seek(t - 10)} />
          <div className="absolute inset-y-0 end-0 w-1/3" onDoubleClick={() => seek(t + 10)} />
          {hud && <div className="absolute start-1/2 top-1/3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2">{hud.k === 'br' && <Icon n="sun" s={20} />}{hud.k === 'seek' ? `${fmt(hud.v)} / ${fmt(d)}` : `${Math.round(hud.v * 100)}%`}</div>}
          {ui && (
            <>
              <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent p-3 pt-8">
                <button aria-label="رجوع" onClick={(e) => { e.stopPropagation(); closeVideo() }} className="p-1"><Icon n="back" /></button>
                <span className="min-w-0 flex-1 truncate">{cur.title}</span>
                <label onClick={(e) => e.stopPropagation()} className="rounded-lg bg-white/15 px-3 py-1 text-sm">CC
                  <input type="file" accept=".srt,.vtt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const tx = await f.text(); setSub(URL.createObjectURL(new Blob([f.name.endsWith('.vtt') ? tx : srt2vtt(tx)], { type: 'text/vtt' }))) } }} />
                </label>
                <button aria-label="تدوير" onClick={(e) => { e.stopPropagation(); void rotate() }} className="p-1"><Icon n="rotate" s={22} /></button>
                <button onClick={(e) => { e.stopPropagation(); cycleSpeed() }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">{SPEEDS[speed]}x</button>
                <button onClick={(e) => { e.stopPropagation(); setCover(!cover) }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">{cover ? 'ملء' : 'احتواء'}</button>
              </div>
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-12" dir="ltr" onClick={(e) => e.stopPropagation()}>
                <button aria-label="رجوع 10 ثواني" onClick={() => { seek(t - 10); poke() }}><Icon n="rew" s={40} /></button>
                <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="grid size-20 place-items-center rounded-full bg-black/50"><Icon n={playing ? 'pause' : 'play'} s={44} /></button>
                <button aria-label="تقديم 10 ثواني" onClick={() => { seek(t + 10); poke() }}><Icon n="fwd" s={40} /></button>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8" onClick={(e) => e.stopPropagation()}>
                {Bar({})}
                <div dir="ltr" className="flex justify-center gap-10 pt-1"><button aria-label="السابق" onClick={() => step(-1)}><Icon n="prev" s={30} /></button><button aria-label="التالي" onClick={() => step(1)}><Icon n="next" s={30} /></button></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
