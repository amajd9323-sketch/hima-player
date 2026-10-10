import { useEffect, useRef, useState } from 'react'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import { aiOrder } from './ai'
import { all, put, del } from './db'
import Icon from './Icon'
import { canScan, scan, keepAlive, nativeBright, requestPip, updateWidget, consumeWidgetCommand } from './scan'
import { deleteVaultFile, listVaultFiles, restoreVaultFile, saveVaultFile, unlockVault, vaultExists, type VaultItem } from './vault'
import { allTrackMeta, deleteTrackMeta, saveTrackMeta } from './meta'

type Track = { id: string; title: string; url: string; video: boolean; fav?: boolean; at: number; blob?: Blob; dur?: number; size?: number; h?: number; artist?: string; folder?: string; fingerprint?: string; cover?: string; sourceTitle?: string; sourceArtist?: string }
type Tab = 'video' | 'music' | 'queue' | 'top' | 'lists' | 'folders' | 'fav' | 'recent' | 'ai'
type Repeat = 'off' | 'all' | 'one'
const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
const SPEEDS = [1, 1.25, 1.5, 2, 3, 4, 0.75, 0.5, 0.25]
const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const EQS = [{ n: 'عادي', g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { n: 'باس', g: [8, 7, 6, 4, 2, 0, 0, 0, 0, 0] }, { n: 'صوت', g: [-3, -2, 0, 3, 5, 5, 4, 2, 0, -1] }, { n: 'روك', g: [5, 4, 2, -1, -1, 1, 3, 5, 6, 5] }, { n: 'ناعم', g: [-2, 0, 2, 3, 2, 0, -1, -2, -3, -4] }, { n: 'مخصص', g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]
const ACCENTS = ['#8957FF', '#24D9C2', '#6D8DFF', '#C084FC', '#F4F6FC', '#64748B', '#FF6B6B', '#FFB84D', '#F472B6']
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
  const qRef = useRef<Track[]>([]); qRef.current = q
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
  const [customEq, setCustomEq] = useState<number[]>(() => { const v = ls<number[]>('hema_custom_eq', Array(10).fill(0)); if (Array.isArray(v) && v.length === 10) return v.map((n) => Math.max(-12, Math.min(12, Number(n) || 0))); if (Array.isArray(v) && v.length === 5) { const n = Array(10).fill(0) as number[]; [1, 3, 5, 7, 9].forEach((j, k) => { n[j] = Math.max(-12, Math.min(12, Number(v[k]) || 0)) }); return n } return Array(10).fill(0) })
  const [sleep, setSleep] = useState(0)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)
  const [vol, setVol] = useState<number | null>(null)
  const [ask, setAsk] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [acc, setAcc] = useState(() => ls('hema_acc', 0))
  const [sort, setSort] = useState<string>(() => ls('hema_sort', 'new'))
  const [lists, setLists] = useState<Record<string, string[]>>(() => ls('hema_lists', {}))
  const [queueIds, setQueueIds] = useState<string[]>(() => ls('hema_queue', []))
  const [crossfade, setCrossfade] = useState<number>(() => ls('hema_crossfade', 3))
  const [autoVolume, setAutoVolume] = useState<boolean>(() => ls('hema_auto_volume', false))
  const [editingMeta, setEditingMeta] = useState<Track | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editCover, setEditCover] = useState<File | null>(null)
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null)
  const [metaMsg, setMetaMsg] = useState('')
  const [party, setParty] = useState(false)
  const [cueSize, setCueSize] = useState<number>(() => ls('hema_cue_size', 120))
  const [cueColor, setCueColor] = useState<string>(() => ls('hema_cue_color', '#ffffff'))
  const [vaultOpen, setVaultOpen] = useState(false)
  const [vaultKnown, setVaultKnown] = useState(false)
  const [vaultPinInput, setVaultPinInput] = useState('')
  const [vaultPin, setVaultPin] = useState('')
  const [vaultUnlocked, setVaultUnlocked] = useState(false)
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([])
  const [vaultMsg, setVaultMsg] = useState('')
  const [vaultBusy, setVaultBusy] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => ls('hema_recent', []))
  const [backupMsg, setBackupMsg] = useState('')
  const [duplicates, setDuplicates] = useState<Track[][] | null>(null)
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
  const [lyrOffset, setLyrOffset] = useState(() => ls('hema_lyr_offset', 0))
  const [bassBoost, setBassBoost] = useState(() => ls('hema_bass_boost', false))
  const [spatial, setSpatial] = useState(() => ls('hema_spatial', false))
  const [bookMode, setBookMode] = useState(() => ls('hema_book_mode', false))
  const [lockedScreen, setLockedScreen] = useState(false)
  const [wrap, setWrap] = useState<string | null>(null)
  const [car, setCar] = useState(false)
  const partyCanvas = useRef<HTMLCanvasElement>(null)
  const nextMedia = useRef<HTMLAudioElement>(null)
  const fadeMain = useRef<GainNode>()
  const fadeNext = useRef<GainNode>()
  const crossfadeTimer = useRef<number | undefined>(undefined)
  const nextStartedFor = useRef<string | null>(null)
  const handoff = useRef<{ id: string; pos: number } | null>(null)
  const gainN = useRef<GainNode>()
  const normN = useRef<GainNode>()
  const normMeter = useRef<AnalyserNode>()
  const lastNormAt = useRef(0)
  const wetN = useRef<GainNode>()
  const anN = useRef<AnalyserNode>()
  const cv = useRef<HTMLCanvasElement>(null)
  const lastCt = useRef(0)
  const accT = useRef(0)
  const counted = useRef('')
  useEffect(() => { for (const [k, v] of Object.entries({ boost, shake, adhan, quran, city })) localStorage.setItem('hema_' + k, JSON.stringify(v)); if (gainN.current) gainN.current.gain.value = boost / 100 }, [boost, shake, adhan, quran, city])
  A = ACCENTS[acc] ?? ACCENTS[0]
  useEffect(() => { localStorage.setItem('hema_acc', String(acc)); localStorage.setItem('hema_sort', JSON.stringify(sort)) }, [acc, sort])
  useEffect(() => { localStorage.setItem('hema_lists', JSON.stringify(lists)) }, [lists])
  useEffect(() => { localStorage.setItem('hema_queue', JSON.stringify(queueIds)) }, [queueIds])
  useEffect(() => { localStorage.setItem('hema_crossfade', JSON.stringify(crossfade)) }, [crossfade])
  useEffect(() => { localStorage.setItem('hema_auto_volume', JSON.stringify(autoVolume)); if (normN.current && ac.current && !autoVolume) normN.current.gain.setTargetAtTime(1, ac.current.currentTime, 0.4) }, [autoVolume])
  useEffect(() => { localStorage.setItem('hema_cue_size', JSON.stringify(cueSize)); document.documentElement.style.setProperty('--hema-cue-size', cueSize + '%'); localStorage.setItem('hema_cue_color', cueColor); document.documentElement.style.setProperty('--hema-cue-color', cueColor) }, [cueSize, cueColor])
  useEffect(() => { localStorage.setItem('hema_custom_eq', JSON.stringify(customEq)) }, [customEq])
  useEffect(() => { localStorage.setItem('hema_lyr_offset', JSON.stringify(lyrOffset)); localStorage.setItem('hema_bass_boost', JSON.stringify(bassBoost)); localStorage.setItem('hema_spatial', JSON.stringify(spatial)); localStorage.setItem('hema_book_mode', JSON.stringify(bookMode)); if (wetN.current && ac.current) wetN.current.gain.setTargetAtTime(spatial ? 0.22 : 0, ac.current.currentTime, 0.04) }, [lyrOffset, bassBoost, spatial, bookMode])
  useEffect(() => { bands.current.forEach((b, j) => { b.gain.value = (eq === EQS.length - 1 ? customEq : EQS[eq].g)[j] + (bassBoost && j < 3 ? 5 : 0) }) }, [eq, customEq, bassBoost])
  useEffect(() => { localStorage.setItem('hema_recent', JSON.stringify(recent.slice(0, 100))) }, [recent])
  useEffect(() => { const id = q[i]?.id; if (!id) return; localStorage.setItem('hema_last_track', id); setRecent((p) => [id, ...p.filter((item) => item !== id)].slice(0, 100)) }, [q[i]?.id])
  const m = useRef<HTMLVideoElement>(null)
  const hide = useRef<number>()
  const ac = useRef<AudioContext>()
  const bands = useRef<BiquadFilterNode[]>([])
  const drag = useRef({ y: 0, v: 1 })
  const cur = q[i]
  const li = lyr.reduce((a, l, k) => (l.t <= t + 0.3 + lyrOffset ? k : a), -1)
  const topIds = new Set(Object.entries(ls<{ p: Record<string, { n: number; t: string }> }>('hema_stats', { p: {} }).p ?? {}).sort((a, b) => b[1].n - a[1].n).slice(0, 50).map(([id]) => id))
  const match = (x: Track) => (!find || x.title.toLowerCase().includes(find.toLowerCase())) && (tab !== 'fav' || x.fav) && (tab !== 'recent' || recent.includes(x.id)) && (tab !== 'folders' || x.folder === openFolder) && (tab !== 'lists' || (lists[openList ?? ''] ?? []).includes(x.id)) && (tab !== 'queue' || queueIds.includes(x.id)) && (tab !== 'top' || topIds.has(x.id))
  const srt = (a: { x: Track }, b: { x: Track }) => tab === 'queue' ? queueIds.indexOf(a.x.id) - queueIds.indexOf(b.x.id) : (sort === 'name' ? a.x.title.localeCompare(b.x.title) : sort === 'dur' ? (b.x.dur ?? 0) - (a.x.dur ?? 0) : sort === 'size' ? (b.x.size ?? 0) - (a.x.size ?? 0) : 0)
  const musics = q.map((x, k) => ({ x, k })).filter((o) => !o.x.video && match(o.x)).sort(srt)
  const videos = q.map((x, k) => ({ x, k })).filter((o) => o.x.video && match(o.x)).sort(srt)
  const open = (tab === 'folders' && openFolder !== null) || (tab === 'lists' && openList !== null)
  const showM = tab === 'music' || tab === 'fav' || tab === 'recent' || tab === 'queue' || tab === 'top' || open
  const showV = tab === 'video' || tab === 'fav' || tab === 'recent' || tab === 'queue' || tab === 'top' || open
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
    const rawList = [...lib, ...imp].map((x) => ({ ...x, sourceTitle: x.sourceTitle ?? x.title, sourceArtist: x.sourceArtist ?? x.artist }))
    let list = rawList
    try {
      const overrides = await allTrackMeta(); const byId = new Map(overrides.map((x) => [x.id, x]))
      list = rawList.map((x) => { const v = byId.get(x.id); return v ? { ...x, title: v.title?.trim() || x.title, artist: v.artist !== undefined ? v.artist : x.artist, cover: v.cover ? URL.createObjectURL(v.cover) : undefined } : x })
    } catch { /* metadata database is optional; media library must still load */ }
    setQ(list); setQueueIds((p) => p.filter((id) => list.some((x) => x.id === id)))
    setI(keep ? list.findIndex((x) => x.id === keep) : -1)
  }
  useEffect(() => { void load() }, [])

  // Keyboard shortcuts for desktop keyboards; ignore typing fields and dialogs.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (lockedScreen || e.altKey || e.ctrlKey || e.metaKey) return
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
  }, [cur?.id, t, i, shuffle, repeat, q, lockedScreen])

  const add = (files: FileList | null) => {
    if (!files) return
    const n = [...files].map((f, k) => ({ id: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), video: f.type.startsWith('video'), at: Date.now() + k, blob: f as Blob }))
    n.forEach((x) => put({ id: x.id, title: x.title, video: x.video, at: x.at, blob: x.blob }).catch(() => {}))
    if (i < 0) setI(q.length)
    setQ((p) => [...p, ...n])
  }
  const cancelCrossfade = () => {
    if (crossfadeTimer.current) window.clearTimeout(crossfadeTimer.current)
    crossfadeTimer.current = undefined; nextStartedFor.current = null; handoff.current = null
    if (nextMedia.current) { nextMedia.current.pause(); nextMedia.current.removeAttribute('src'); nextMedia.current.load() }
    if (ac.current) { const now = ac.current.currentTime; fadeMain.current?.gain.setValueAtTime(1, now); fadeNext.current?.gain.setValueAtTime(0, now) }
  }
  const enqueue = (x: Track, next = true) => setQueueIds((p) => { const rest = p.filter((id) => id !== x.id); return next ? [x.id, ...rest] : [...rest, x.id] })
  const dequeue = (id: string) => setQueueIds((p) => p.filter((x) => x !== id))
  const moveQueue = (id: string, delta: -1 | 1) => setQueueIds((p) => { const n = [...p]; const from = n.indexOf(id); const to = from + delta; if (from < 0 || to < 0 || to >= n.length) return p; [n[from], n[to]] = [n[to], n[from]]; return n })
  const nextItem = () => {
    const queuedId = queueIds.find((id) => { const item = q.find((x) => x.id === id); return item && item.video === cur?.video && item.id !== cur?.id })
    if (queuedId) return { item: q.find((x) => x.id === queuedId)!, queuedId }
    const pool = q.map((x, k) => ({ x, k })).filter((o) => o.x.video === cur?.video)
    if (!pool.length) return null
    if (shuffle) { const options = pool.filter((o) => o.k !== i); const pick = options[Math.floor(Math.random() * options.length)]; return pick ? { item: pick.x, queuedId: '' } : null }
    const p = pool.findIndex((o) => o.k === i)
    if (p < 0 || (p === pool.length - 1 && repeat === 'off')) return null
    return { item: pool[(p + 1) % pool.length].x, queuedId: '' }
  }
  const step = (dir: 1 | -1) => {
    cancelCrossfade()
    const pool = q.map((x, k) => ({ x, k })).filter((o) => o.x.video === cur?.video)
    if (!pool.length) return
    if (dir === 1) {
      const queueAt = queueIds.findIndex((id) => { const item = q.find((x) => x.id === id); return item && item.video === cur?.video && item.id !== cur?.id })
      if (queueAt >= 0) { const index = q.findIndex((x) => x.id === queueIds[queueAt]); const id = queueIds[queueAt]; setQueueIds((p) => p.filter((x) => x !== id)); if (index >= 0) { setI(index); return } }
    }
    if (shuffle && dir === 1) { const picks = pool.filter((o) => o.k !== i); if (picks.length) setI(picks[Math.floor(Math.random() * picks.length)].k); return }
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
  const applyEq = (k: number) => { setEq(k); bands.current.forEach((b, j) => (b.gain.value = (k === EQS.length - 1 ? customEq : EQS[k].g)[j])) }
  const changeEqBand = (j: number, value: number) => { const next = [...customEq]; next[j] = value; setCustomEq(next); setEq(EQS.length - 1); if (bands.current[j]) bands.current[j].gain.value = value }
  const initAudio = () => {
    if (ac.current) { void ac.current.resume(); return }
    if (!m.current || !nextMedia.current) return
    try {
      const c = new AudioContext(); const src = c.createMediaElementSource(m.current); const nextSrc = c.createMediaElementSource(nextMedia.current)
      const mainFade = c.createGain(); mainFade.gain.value = 1
      const nextFade = c.createGain(); nextFade.gain.value = 0
      fadeMain.current = mainFade; fadeNext.current = nextFade
      bands.current = BANDS.map((f, j) => { const b = c.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1; b.gain.value = (eq === EQS.length - 1 ? customEq : EQS[eq].g)[j] + (bassBoost && j < 3 ? 5 : 0); return b })
      const gn = c.createGain(); gn.gain.value = boost / 100
      const meter = c.createAnalyser(); meter.fftSize = 256; normMeter.current = meter
      const normalizer = c.createGain(); normalizer.gain.value = 1; normN.current = normalizer
      const lim = c.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.15
      const an = c.createAnalyser(); an.fftSize = 64
      const length = Math.floor(c.sampleRate * 1.4); const impulse = c.createBuffer(2, length, c.sampleRate)
      for (let ch = 0; ch < 2; ch++) { const data = impulse.getChannelData(ch); for (let j = 0; j < length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2.6) }
      const convolver = c.createConvolver(); convolver.buffer = impulse
      const wet = c.createGain(); wet.gain.value = spatial ? 0.22 : 0
      gainN.current = gn; anN.current = an; wetN.current = wet
      src.connect(mainFade); nextSrc.connect(nextFade); mainFade.connect(bands.current[0]); nextFade.connect(bands.current[0])
      bands.current.reduce((a, b) => (a.connect(b), b)); const lastBand = bands.current[bands.current.length - 1]; lastBand.connect(gn); gn.connect(meter); meter.connect(normalizer); normalizer.connect(lim)
      lim.connect(an); an.connect(c.destination); lim.connect(convolver); convolver.connect(wet); wet.connect(c.destination)
      ac.current = c
    } catch { setMsg('تعذر تفعيل مؤثرات الصوت على هذا الملف أو الجهاز.') }
  }
  const maybeCrossfade = async (ct: number) => {
    if (crossfade <= 0 || !cur || cur.video || !d || d < crossfade + 2 || !m.current || !nextMedia.current || !fadeMain.current || !fadeNext.current || nextStartedFor.current === cur.id || ct < d - crossfade) return
    const next = nextItem()
    if (!next || next.item.video || next.item.id === cur.id) return
    const secondary = nextMedia.current
    nextStartedFor.current = cur.id
    secondary.src = next.item.url; secondary.playbackRate = SPEEDS[speed]; secondary.currentTime = 0
    const context = ac.current
    if (!context) { nextStartedFor.current = null; return }
    const now = context.currentTime; fadeMain.current.gain.cancelScheduledValues(now); fadeNext.current.gain.cancelScheduledValues(now)
    fadeMain.current.gain.setValueAtTime(1, now); fadeNext.current.gain.setValueAtTime(0, now)
    try { await secondary.play() } catch { nextStartedFor.current = null; fadeMain.current.gain.setValueAtTime(1, context.currentTime); return }
    const start = context.currentTime
    fadeMain.current.gain.linearRampToValueAtTime(0.0001, start + crossfade); fadeNext.current.gain.linearRampToValueAtTime(1, start + crossfade)
    crossfadeTimer.current = window.setTimeout(() => {
      const position = secondary.currentTime
      handoff.current = { id: next.item.id, pos: position }
      m.current?.pause()
      if (next.queuedId) setQueueIds((p) => p.filter((x) => x !== next.queuedId))
      const nextIndex = q.findIndex((x) => x.id === next.item.id)
      if (nextIndex >= 0) setI(nextIndex)
    }, Math.max(250, crossfade * 1000))
  }
  const fav = (x: Track) => {
    const f = !x.fav
    setQ((p) => p.map((y) => (y.id === x.id ? { ...y, fav: f } : y)))
    if (x.blob) put({ id: x.id, title: x.title, video: x.video, at: x.at, blob: x.blob, fav: f }).catch(() => {})
    else { const st = favSet(); if (f) st.add(x.id); else st.delete(x.id); localStorage.setItem('hema_favs', JSON.stringify([...st])) }
  }
  const remove = (x: Track) => { del(x.id).catch(() => {}); const k = q.indexOf(x); setQ((p) => p.filter((y) => y !== x)); if (k === i) { m.current?.pause(); setI(-1); setSheet(false) } else if (k < i) setI(i - 1) }

  useEffect(() => {
    if (!cur || !m.current) return
    setSub(null); setLoopA(null); setLoopB(null); counted.current = ''; lastCt.current = 0
    const pending = handoff.current
    if (pending?.id !== cur.id) {
      cancelCrossfade()
      if (ac.current) { const now = ac.current.currentTime; fadeMain.current?.gain.setValueAtTime(1, now); fadeNext.current?.gain.setValueAtTime(0, now) }
    }
    m.current.src = cur.url; m.current.playbackRate = SPEEDS[speed]; m.current.play().catch(() => {})
  }, [cur?.id])
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
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle
  useEffect(() => {
    if (!canScan()) return
    void updateWidget(cur?.title ?? 'HEMA ROKSI PLAYER', cur?.artist ?? (cur?.video ? 'Video' : 'مكتبة Hema'), playing)
    let polling = false
    const timer = window.setInterval(async () => {
      if (polling || !qRef.current.length) return
      polling = true
      try {
        const command = await consumeWidgetCommand()
        if (command === 'toggle') {
          if (cur) toggleRef.current()
          else { const last = ls<string>('hema_last_track', ''); const remembered = qRef.current.findIndex((x) => x.id === last); const firstAudio = qRef.current.findIndex((x) => !x.video); const target = remembered >= 0 ? remembered : firstAudio >= 0 ? firstAudio : 0; if (qRef.current[target]) setI(target) }
        } else if (command === 'next') { if (cur) stepRef.current(1); else { const first = qRef.current.findIndex((x) => !x.video); if (first >= 0) setI(first) } }
        else if (command === 'prev') { if (cur) stepRef.current(-1); else { const last = ls<string>('hema_last_track', ''); const target = qRef.current.findIndex((x) => x.id === last); if (target >= 0) setI(target) } }
      }
      finally { polling = false }
    }, 750)
    return () => window.clearInterval(timer)
  }, [cur?.id, cur?.artist, cur?.video, playing, q.length])
  const tick = (ct: number) => {
    const dt = ct - lastCt.current; lastCt.current = ct
    if (autoVolume && normMeter.current && normN.current && ac.current && Date.now() - lastNormAt.current > 350) {
      lastNormAt.current = Date.now()
      const samples = new Uint8Array(normMeter.current.fftSize); normMeter.current.getByteTimeDomainData(samples)
      let sum = 0; for (const value of samples) { const n = (value - 128) / 128; sum += n * n }
      const rms = Math.sqrt(sum / samples.length)
      if (rms > 0.004) normN.current.gain.setTargetAtTime(Math.max(0.65, Math.min(1.8, 0.12 / rms)), ac.current.currentTime, 0.65)
    } else if (!autoVolume && normN.current && ac.current && normN.current.gain.value !== 1) normN.current.gain.setTargetAtTime(1, ac.current.currentTime, 0.4)
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
    if (!party) return
    let frame = 0
    const canvas = partyCanvas.current
    const ctx = canvas?.getContext('2d')
    const values = new Uint8Array(64)
    const draw = () => {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect(); const ratio = Math.max(1, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.floor(rect.width)); const h = Math.max(1, Math.floor(rect.height))
      if (canvas.width !== w * ratio || canvas.height !== h * ratio) { canvas.width = w * ratio; canvas.height = h * ratio }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = 'rgba(4,6,12,.24)'; ctx.fillRect(0, 0, w, h)
      const analyser = anN.current; if (analyser) analyser.getByteFrequencyData(values); else values.fill(18)
      ctx.save(); ctx.translate(w / 2, h / 2)
      const radius = Math.min(w, h) * 0.16
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.strokeStyle = A; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1
      for (let n = 0; n < values.length; n++) {
        const angle = n / values.length * Math.PI * 2
        const level = values[n] / 255 * Math.min(w, h) * 0.3 + 3
        const x1 = Math.cos(angle) * (radius + 8); const y1 = Math.sin(angle) * (radius + 8)
        const x2 = Math.cos(angle) * (radius + level + 8); const y2 = Math.sin(angle) * (radius + level + 8)
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = n % 3 === 0 ? A : n % 3 === 1 ? '#24D9C2' : '#C084FC'; ctx.lineWidth = Math.max(1.5, Math.min(5, w / 100)); ctx.lineCap = 'round'; ctx.stroke()
      }
      ctx.restore(); frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [party, playing])
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
  const exportBackup = () => {
    const payload = { app: 'HEMA ROKSI PLAYER', schemaVersion: 2, exportedAt: new Date().toISOString(), lists, queueIds, recent, favorites: [...favSet()], positions: ls<Record<string, number>>('hema_pos', {}), stats: ls('hema_stats', { p: {}, s: 0 }), accent: acc, sort, boost, shake, adhan, quran, city, customEq, bassBoost, spatial, bookMode, lyrOffset, crossfade, cueSize, cueColor, autoVolume }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'hema-player-backup.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    setBackupMsg('تم تصدير النسخة الاحتياطية')
  }
  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>
      if (data.app !== 'HEMA ROKSI PLAYER' || (data.schemaVersion !== 1 && data.schemaVersion !== 2)) throw new Error('BACKUP_VERSION')
      if (data.lists && typeof data.lists === 'object' && !Array.isArray(data.lists)) { const safeLists = Object.entries(data.lists as Record<string, unknown>).filter(([name, value]) => !!name.trim() && Array.isArray(value)).map(([name, value]) => [name.trim(), [...new Set((value as unknown[]).filter((id): id is string => typeof id === 'string'))]]); setLists(Object.fromEntries(safeLists) as Record<string, string[]>) }
      if (Array.isArray(data.recent)) setRecent(data.recent.filter((x): x is string => typeof x === 'string').slice(0, 100))
      if (Array.isArray(data.queueIds)) setQueueIds([...new Set(data.queueIds.filter((x): x is string => typeof x === 'string'))].slice(0, 500))
      if (Array.isArray(data.favorites)) localStorage.setItem('hema_favs', JSON.stringify(data.favorites.filter((x): x is string => typeof x === 'string')))
      if (data.positions && typeof data.positions === 'object') localStorage.setItem('hema_pos', JSON.stringify(data.positions))
      if (data.stats && typeof data.stats === 'object') localStorage.setItem('hema_stats', JSON.stringify(data.stats))
      if (typeof data.accent === 'number' && data.accent >= 0 && data.accent < ACCENTS.length) setAcc(data.accent)
      if (typeof data.sort === 'string' && SORTS.some(([k]) => k === data.sort)) setSort(data.sort)
      if (typeof data.boost === 'number') setBoost(Math.max(100, Math.min(300, data.boost)))
      if (Array.isArray(data.customEq) && (data.customEq.length === 5 || data.customEq.length === 10) && data.customEq.every((x) => typeof x === 'number' && x >= -12 && x <= 12)) { if (data.customEq.length === 10) setCustomEq(data.customEq as number[]); else { const n = Array(10).fill(0) as number[]; [1, 3, 5, 7, 9].forEach((j, k) => { n[j] = (data.customEq as number[])[k] }); setCustomEq(n) } }
      if (typeof data.bassBoost === 'boolean') setBassBoost(data.bassBoost)
      if (typeof data.spatial === 'boolean') setSpatial(data.spatial)
      if (typeof data.bookMode === 'boolean') setBookMode(data.bookMode)
      if (typeof data.lyrOffset === 'number' && data.lyrOffset >= -10 && data.lyrOffset <= 10) setLyrOffset(data.lyrOffset)
      if (typeof data.crossfade === 'number' && [0, 2, 3, 5, 8].includes(data.crossfade)) setCrossfade(data.crossfade)
      if (typeof data.autoVolume === 'boolean') setAutoVolume(data.autoVolume)
      if (typeof data.cueSize === 'number' && data.cueSize >= 80 && data.cueSize <= 200) setCueSize(data.cueSize)
      if (typeof data.cueColor === 'string' && ['#ffffff', '#ffe082', '#80deea', '#f48fb1'].includes(data.cueColor)) setCueColor(data.cueColor)
      if (typeof data.shake === 'boolean') setShake(data.shake)
      if (typeof data.adhan === 'boolean') setAdhan(data.adhan)
      if (typeof data.quran === 'boolean') setQuran(data.quran)
      if (data.city && typeof data.city === 'object' && typeof (data.city as { c?: unknown }).c === 'string' && typeof (data.city as { k?: unknown }).k === 'string') setCity(data.city as { c: string; k: string })
      setQ((p) => p.map((x) => ({ ...x, fav: favSet().has(x.id) })))
      setBackupMsg('تم استيراد الإعدادات والقوائم. أعد فحص الملفات لتحديث المفضلة.')
    } catch { setBackupMsg('ملف النسخة الاحتياطية غير صالح أو من إصدار غير مدعوم.') }
  }
  const pip = async () => { await requestPip() }
  const setBright = (b: number) => { setBr(b); void nativeBright(b) }
  const resume = (e: HTMLVideoElement) => { const sp = ls<Record<string, number>>('hema_pos', {})[cur?.id ?? '']; if (sp && (cur?.video || e.duration > 600 || quran || bookMode) && sp < e.duration - 5) e.currentTime = sp }
  const savePos = (ct: number) => { if (!cur || (!cur.video && d < 600 && !quran && !bookMode) || Math.abs(ct - lastSave.current) < 5) return; lastSave.current = ct; const p = ls<Record<string, number>>('hema_pos', {}); p[cur.id] = ct; localStorage.setItem('hema_pos', JSON.stringify(p)) }
  const rotate = async () => { try { const o = await ScreenOrientation.orientation(); await ScreenOrientation.lock({ orientation: o.type.startsWith('landscape') ? 'portrait' : 'landscape' }) } catch { /* web */ } }
  useEffect(() => { const tr = m.current?.textTracks[0]; if (tr) tr.mode = 'showing' }, [sub])
  const ended = () => { if (nextStartedFor.current && nextStartedFor.current === cur?.id) return; if (sleep === -1) { setSleep(0); return } if (repeat === 'one') void m.current?.play(); else if (repeat === 'off' && !shuffle && cur && !queueIds.some((id) => { const x = q.find((y) => y.id === id); return x?.video === cur.video }) && q.filter((x) => x.video === cur.video).pop() === cur) setPlaying(false); else step(1) }

  const findDuplicates = async () => {
    setBackupMsg('جارٍ فحص التكرار بالبصمة الرقمية...')
    const groups = new Map<string, Track[]>()
    const hashes = new Map<string, string>()
    for (const x of q) {
      let key = ''
      if (x.blob && crypto.subtle) {
        try { const bytes = await x.blob.arrayBuffer(); const digest = await crypto.subtle.digest('SHA-256', bytes); const hash = [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, '0')).join(''); hashes.set(x.id, hash); key = (x.video ? 'v:sha:' : 'a:sha:') + hash } catch { /* metadata fallback */ }
      }
      if (!key) {
        const title = clean(x.title).toLocaleLowerCase(); if (!title) continue
        key = [x.video ? 'v:meta' : 'a:meta', title, (x.artist ?? '').toLocaleLowerCase().trim(), x.size ?? x.blob?.size ?? 0, Math.round(x.dur ?? 0)].join('|')
      }
      const group = groups.get(key) ?? []; group.push(x); groups.set(key, group)
    }
    setQ((p) => p.map((x) => hashes.has(x.id) ? { ...x, fingerprint: hashes.get(x.id) } : x))
    setDuplicates([...groups.values()].filter((g) => g.length > 1))
    setBackupMsg('انتهى الفحص: SHA-256 للملفات المستوردة، وبيانات الاسم/الحجم/المدة لملفات الجهاز.')
  }

  const editTrack = (x: Track) => { setEditingMeta(x); setEditTitle(x.title); setEditArtist(x.artist ?? ''); setEditCover(null); setEditCoverUrl(x.cover ?? null); setMetaMsg('') }
  const saveEditedTrackMeta = async () => {
    if (!editingMeta || !editTitle.trim()) { setMetaMsg('اكتب اسمًا صالحًا للمقطع.'); return }
    try {
      const all = await allTrackMeta(); const old = all.find((v) => v.id === editingMeta.id)
      const record = { id: editingMeta.id, title: editTitle.trim(), artist: editArtist.trim(), cover: editCover ?? old?.cover, updatedAt: Date.now() }
      await saveTrackMeta(record)
      const coverUrl = record.cover ? URL.createObjectURL(record.cover) : undefined
      setQ((p) => p.map((x) => x.id === editingMeta.id ? { ...x, title: record.title, artist: record.artist, cover: coverUrl } : x))
      setEditingMeta(null); setEditCover(null); setEditCoverUrl(null); setMetaMsg('')
    } catch { setMetaMsg('تعذر حفظ البيانات. تحقق من مساحة التطبيق.') }
  }
  const resetEditedTrackMeta = async () => {
    if (!editingMeta) return
    try {
      await deleteTrackMeta(editingMeta.id)
      setQ((p) => p.map((x) => x.id === editingMeta.id ? { ...x, title: x.sourceTitle ?? x.title, artist: x.sourceArtist, cover: undefined } : x))
      setEditingMeta(null); setEditCover(null); setEditCoverUrl(null); setMetaMsg('')
    } catch { setMetaMsg('تعذر حذف التعديل المحلي.') }
  }
  const exportPlaylist = (name: string) => {
    const ids = lists[name] ?? []
    const payload = { app: 'HEMA ROKSI PLAYER', type: 'playlist', schemaVersion: 1, name, exportedAt: new Date().toISOString(), tracks: ids.map((id) => q.find((x) => x.id === id)).filter((x): x is Track => !!x).map((x) => ({ id: x.id, title: x.title, artist: x.artist ?? '', video: x.video })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name.replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.hema-playlist.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1800); setBackupMsg('تم تصدير القائمة؛ ملفّات الوسائط نفسها لا تُنسخ ضمن القائمة.')
  }
  const importPlaylist = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as { app?: unknown; type?: unknown; schemaVersion?: unknown; name?: unknown; tracks?: unknown }
      if (data.app !== 'HEMA ROKSI PLAYER' || data.type !== 'playlist' || data.schemaVersion !== 1 || typeof data.name !== 'string' || !Array.isArray(data.tracks)) throw new Error('PLAYLIST_INVALID')
      const matched: string[] = []
      for (const raw of data.tracks) {
        if (!raw || typeof raw !== 'object') continue
        const row = raw as { id?: unknown; title?: unknown; artist?: unknown; video?: unknown }
        const exact = typeof row.id === 'string' ? q.find((x) => x.id === row.id) : undefined
        const fallback = !exact && typeof row.title === 'string' ? q.find((x) => x.video === (row.video === true) && x.title.trim().toLocaleLowerCase() === row.title.trim().toLocaleLowerCase() && (x.artist ?? '').trim().toLocaleLowerCase() === (typeof row.artist === 'string' ? row.artist.trim().toLocaleLowerCase() : '')) : undefined
        const found = exact ?? fallback
        if (found && !matched.includes(found.id)) matched.push(found.id)
      }
      const name = data.name.trim().slice(0, 80) || 'قائمة مستوردة'
      setLists((p) => ({ ...p, [name]: matched })); setBackupMsg(`استيراد القائمة: ${matched.length} مقطع مطابق لمكتبتك. الملفات الصوتية نفسها لا تُنقل.`)
    } catch { setBackupMsg('ملف القائمة غير صالح.') }
  }

  const unlockVaultUi = async () => {
    setVaultBusy(true); setVaultMsg('')
    try { const pin = vaultPinInput.trim(); await unlockVault(pin); setVaultPin(pin); setVaultUnlocked(true); setVaultKnown(true); const items = await listVaultFiles(pin); setVaultItems(items); setVaultMsg('الخزنة مفتوحة. الملفات مشفّرة محليًا.') }
    catch (e) { const code = (e as Error).message; setVaultMsg(code === 'VAULT_WRONG_PIN' ? 'رمز خاطئ أو سجل خزنة غير صالح.' : code === 'VAULT_PIN_TOO_SHORT' ? 'استخدم رمزًا أو عبارة من 6 أحرف/أرقام على الأقل.' : code === 'VAULT_CRYPTO_UNAVAILABLE' ? 'التشفير غير مدعوم في بيئة التشغيل.' : 'تعذر فتح الخزنة.') }
    finally { setVaultBusy(false) }
  }
  const vaultAdd = async (files?: FileList | null) => {
    if (!files || !vaultPin) return
    setVaultBusy(true); setVaultMsg('')
    try { for (const file of Array.from(files)) await saveVaultFile(file, vaultPin); setVaultItems(await listVaultFiles(vaultPin)); setVaultMsg('تم تشفير الملفات وحفظها داخل خزنة التطبيق.') }
    catch (e) { const code = (e as Error).message; setVaultMsg(code === 'VAULT_FILE_TOO_LARGE' ? 'الحد الحالي للملف الواحد 120 MB.' : 'فشل التشفير أو الحفظ؛ تحقق من مساحة التخزين.') }
    finally { setVaultBusy(false) }
  }
  const vaultRestore = async (item: VaultItem) => {
    try { const file = await restoreVaultFile(item.id, vaultPin); const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 2500); setVaultMsg('تم فك التشفير وتصدير نسخة من الملف.') }
    catch { setVaultMsg('تعذر فك تشفير هذا الملف.') }
  }
  const vaultRemove = async (item: VaultItem) => {
    if (!window.confirm('حذف الملف المشفّر من الخزنة نهائيًا؟')) return
    try { await deleteVaultFile(item.id); setVaultItems((p) => p.filter((x) => x.id !== item.id)); setVaultMsg('حُذف الملف المشفّر.') }
    catch { setVaultMsg('فشل حذف الملف.') }
  }
  const openVaultUi = async () => { setSettings(false); setVaultOpen(true); setVaultMsg(''); setVaultPinInput(''); setVaultPin(''); setVaultUnlocked(false); try { setVaultKnown(await vaultExists()) } catch { setVaultKnown(false) } }
  const smart = async () => {
    const list = q.filter((x) => !x.video)
    if (!ask.trim() || !list.length) return
    setBusy(true); setMsg('')
    try {
      let order: number[] = []; let local = false
      try { order = await aiOrder(ask, list.map((x) => x.title)) } catch {
        local = true
        const terms = clean(ask).toLocaleLowerCase().split(/\s+/).filter((x) => x.length > 1)
        order = list.map((x, n) => ({ n, score: terms.reduce((sum, word) => sum + (clean(x.title + ' ' + (x.artist ?? '')).toLocaleLowerCase().includes(word) ? 4 : 0), 0) + (x.fav ? 1 : 0) - (recent.includes(x.id) ? 3 : 0) })).sort((a, b) => b.score - a.score || a.n - b.n).map((x) => x.n)
      }
      const picked = order.filter((n) => list[n]).map((n) => list[n])
      if (!picked.length) { setMsg('لا نتيجة. جرب وصف ثاني.'); return }
      const listName = (local ? 'DJ محلي · ' : 'AI DJ · ') + ask.slice(0, 24)
      setLists((p) => ({ ...p, [listName]: picked.map((x) => x.id) })); setQ([...picked, ...q.filter((x) => !picked.includes(x))]); setI(0); setSheet(true); setMsg(local ? 'خدمة AI غير متاحة؛ أنشأت ترتيبًا محليًا حسب الأسماء وسجل الاستماع.' : 'انحفظت قائمة AI DJ في «القوائم».')
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
      <button onClick={() => { cancelCrossfade(); setI(k); setSheet(!x.video); if (x.video) openVideo(k) }} className="flex min-w-0 flex-1 items-center gap-3 p-2 text-start">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg font-semibold text-white" style={art(x.title)}>{x.cover ? <img src={x.cover} alt="" className="size-full object-cover" /> : k === i && playing ? <Icon n="eq" s={20} /> : [...x.title][0]}</span>
        <span className="min-w-0"><span className="block truncate" style={k === i ? { color: A } : undefined}>{x.title}</span><span className="block truncate text-xs opacity-50">{[x.artist && x.artist !== '<unknown>' ? x.artist : '', x.dur ? fmt(x.dur) : ''].filter(Boolean).join(' · ')}</span></span>
      </button>
      {tab !== 'queue' ? <button aria-label="تشغيل بعد الحالي" title="تشغيل بعد الحالي" onClick={() => enqueue(x, true)} className="p-2" style={{ color: queueIds.includes(x.id) ? A : '#fff8' }}><Icon n="plus" s={20} /></button> : <><div className="flex flex-col"><button aria-label="تحريك لأعلى" onClick={() => moveQueue(x.id, -1)} className="px-1 text-xs opacity-70">↑</button><button aria-label="تحريك لأسفل" onClick={() => moveQueue(x.id, 1)} className="px-1 text-xs opacity-70">↓</button></div><button aria-label="إزالة من الطابور" onClick={() => dequeue(x.id)} className="p-2 opacity-60"><Icon n="close" s={18} /></button></>}
      <button aria-label="مفضلة" onClick={() => fav(x)} className="p-2" style={{ color: x.fav ? A : '#fff5' }}><Icon n="heart" s={22} /></button>
      <button aria-label="تعديل بيانات العرض" title="تعديل الاسم والفنان والغلاف" onClick={() => editTrack(x)} className="p-2 opacity-60">✎</button>
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
      {tab === 'queue' ? <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-lg bg-black/65 px-2 py-1 text-white"><button aria-label="تحريك لأعلى" onClick={() => moveQueue(x.id, -1)}>↑</button><button aria-label="إزالة من الطابور" onClick={() => dequeue(x.id)}>إزالة</button><button aria-label="تحريك لأسفل" onClick={() => moveQueue(x.id, 1)}>↓</button></div> : <button aria-label="تشغيل بعد الحالي" title="تشغيل بعد الحالي" onClick={() => enqueue(x, true)} className="absolute end-1 bottom-1 rounded-full bg-black/55 p-1.5" style={{ color: queueIds.includes(x.id) ? A : '#fffc' }}><Icon n="plus" s={18} /></button>}
      <button aria-label="مفضلة" onClick={() => fav(x)} className="absolute end-1 top-1 rounded-full bg-black/40 p-1.5" style={{ color: x.fav ? A : '#fffc' }}><Icon n="heart" s={18} /></button>
      <button aria-label="قائمة" onClick={() => setPlSheet(x)} className="absolute start-1 top-1 rounded-full bg-black/40 p-1.5 text-white/80"><Icon n="list" s={18} /></button>
      <button aria-label="تعديل بيانات العرض" onClick={() => editTrack(x)} className="absolute start-1 bottom-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white">✎</button>
    </li>
  )
  const empty = <p className="py-20 text-center opacity-60">{scanMsg || 'فارغ. اضغط + لإضافة ملفات.'}</p>
  const Opt = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="rounded-full px-4 py-2 text-sm" style={{ background: on ? A : '#ffffff1a' }}>{children}</button>
  )

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <audio ref={nextMedia} preload="auto" className="hidden" aria-hidden="true" />
      <video ref={m} playsInline onClick={poke}
        className={fs ? `fixed inset-0 z-40 size-full bg-black ${cover ? 'object-cover' : 'object-contain'}` : 'hidden'}
        onPlay={() => { setPlaying(true); initAudio(); poke(); void keepAlive(true, cur?.title) }} onPause={() => { if (nextStartedFor.current && nextStartedFor.current === cur?.id) return; setPlaying(false); void keepAlive(false) }}
        onTimeUpdate={(e) => { const ct = e.currentTarget.currentTime; if (loopA !== null && loopB !== null && loopB > loopA && ct >= loopB) { e.currentTarget.currentTime = loopA; setT(loopA); return } setT(ct); savePos(ct); tick(ct); void maybeCrossfade(ct) }} onLoadedMetadata={(e) => { const el = e.currentTarget; setD(el.duration); const pending = handoff.current; if (pending && pending.id === cur?.id && !cur?.video) { const secondary = nextMedia.current; const pos = secondary?.currentTime ?? pending.pos; if (isFinite(el.duration) && el.duration > 0) el.currentTime = Math.max(0, Math.min(pos, el.duration - 0.1)); const context = ac.current; if (context && fadeMain.current && fadeNext.current) { const now = context.currentTime; fadeMain.current.gain.cancelScheduledValues(now); fadeNext.current.gain.cancelScheduledValues(now); fadeMain.current.gain.setValueAtTime(0.0001, now); fadeNext.current.gain.setValueAtTime(1, now); fadeMain.current.gain.linearRampToValueAtTime(1, now + 0.12); fadeNext.current.gain.linearRampToValueAtTime(0.0001, now + 0.12) } window.setTimeout(() => { if (secondary) { secondary.pause(); secondary.removeAttribute('src'); secondary.load() } }, 180); handoff.current = null; nextStartedFor.current = null } else resume(el); if (fs && el.videoWidth > el.videoHeight) void lock(true) }} onEnded={ended}>{sub && <track default kind="subtitles" src={sub} />}</video>

      <header className="flex items-center gap-2 px-4 py-3">
        {find === null ? <div className="min-w-0 flex-1"><h1 className="text-2xl font-bold tracking-[0.18em]" style={{ color: A }}>HEMA</h1><p className="text-[9px] font-semibold tracking-[0.28em] opacity-50">ROKSI PLAYER</p></div>
          : <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="بحث" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 outline-none" />}
        <button aria-label="إعدادات" onClick={() => setSettings(true)} className="p-2"><Icon n="gear" /></button>
        <button aria-label="بحث" onClick={() => setFind(find === null ? '' : null)} className="p-2"><Icon n={find === null ? 'search' : 'close'} /></button>
        <label className="grid size-10 cursor-pointer place-items-center rounded-full text-white" style={{ background: A }} aria-label="إضافة ملفات"><Icon n="plus" />
          <input type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => add(e.target.files)} />
        </label>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {([['video', 'الفيديوهات'], ['music', 'الأغاني'], ['queue', `الطابور · ${queueIds.length}`], ['top', 'الأكثر تشغيلًا'], ['lists', 'القوائم'], ['folders', 'المجلدات'], ['fav', 'المفضلة'], ['recent', 'الأخيرة'], ['ai', 'ذكاء']] as const).map(([k, l]) => <Opt key={k} on={tab === k} onClick={() => { setTab(k); setOpenFolder(null); setOpenList(null) }}>{l}</Opt>)}
      </div>
      {tab !== 'ai' && (
        <div className="flex items-center justify-between px-5 pb-2 text-sm opacity-60">
          <span>{tab === 'video' ? `${videos.length} فيديو` : tab === 'music' ? `${musics.length} أغنية` : tab === 'queue' ? `${queueIds.length} في الطابور` : tab === 'top' ? 'الأكثر استماعًا' : `${videos.length + musics.length} عنصر`}</span>
          <button aria-label="تحديث" onClick={() => void load()}><Icon n="refresh" s={20} /></button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {open && <button onClick={() => { setOpenFolder(null); setOpenList(null) }} className="mb-2 flex items-center gap-2 px-2 py-1 text-sm opacity-70"><Icon n="back" s={18} />{tab === 'folders' ? openFolder : openList}</button>}
        {tab === 'folders' && openFolder === null && <ul>{[...folderMap].map(([n, c]) => <li key={n}><button onClick={() => setOpenFolder(n)} className="flex w-full items-center gap-3 rounded-xl p-3 text-start active:bg-white/5"><span className="grid size-12 place-items-center rounded-lg bg-white/10" style={{ color: A }}><Icon n="folder" /></span><span className="min-w-0 flex-1 truncate">{n}</span><span className="text-sm opacity-50">{c}</span></button></li>)}</ul>}
        {tab === 'lists' && openList === null && (
          <div className="space-y-2">
            <div className="flex gap-2"><input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="قائمة جديدة" className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-2 outline-none" /><button onClick={() => { if (newList.trim()) { setLists((p) => ({ ...p, [newList.trim()]: [] })); setNewList('') } }} className="rounded-xl px-4 text-white" style={{ background: A }}>إنشاء</button></div>
            {Object.entries(lists).map(([n, ids]) => <div key={n} className="flex items-center rounded-xl bg-white/5"><button onClick={() => setOpenList(n)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-start"><span style={{ color: A }}><Icon n="list" /></span><span className="min-w-0 flex-1 truncate">{n}</span><span className="text-sm opacity-50">{ids.length}</span></button><button aria-label="تشغيل القائمة" title="تشغيل القائمة" onClick={() => { const valid = ids.filter((id) => q.some((x) => x.id === id)); if (valid.length) { setQueueIds(valid); setI(q.findIndex((x) => x.id === valid[0])); setTab('queue') } }} className="p-2 text-sm" style={{ color: A }}>▶</button><button aria-label="تصدير القائمة" title="تصدير القائمة" onClick={() => exportPlaylist(n)} className="p-2 text-sm opacity-70">JSON</button><button aria-label="حذف" onClick={() => setLists((p) => { const c = { ...p }; delete c[n]; return c })} className="p-2 opacity-40"><Icon n="trash" s={20} /></button></div>)}
          </div>
        )}
        {showM && musics.length > 0 && <ul>{musics.map(({ x, k }) => Row({ x, k }))}</ul>}
        {showV && videos.length > 0 && <ul className="grid grid-cols-2 gap-3 pb-3">{videos.map(({ x, k }) => VRow({ x, k }))}</ul>}
        {(tab === 'video' ? !videos.length : tab === 'music' ? !musics.length : tab === 'queue' ? !queueIds.some((id) => q.some((x) => x.id === id)) : tab === 'top' ? !topIds.size : (tab === 'fav' || tab === 'recent' || open) && !videos.length && !musics.length) && (tab === 'queue' ? <p className="py-16 text-center opacity-60">الطابور فارغ. أضف أغنية بزر + بجانب المقطع.</p> : empty)}
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
            <button aria-label="الطابور" title="الطابور" onClick={() => setTab('queue')} className="rounded-lg bg-white/10 px-2 py-1 text-xs">Q {queueIds.length}</button>
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
          <div className="flex flex-wrap items-center justify-center gap-2"><label className="cursor-pointer rounded-full bg-white/10 px-4 py-2 text-sm">تحميل كلمات LRC<input type="file" accept=".lrc,.txt,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f && cur) { const text = await f.text(); const parsed = lrcParse(text); if (parsed.length) { localStorage.setItem('lyr_' + cur.id, text); setLyr(parsed); setMsg('تم حفظ الكلمات محليًا') } else setMsg('ملف الكلمات غير صالح') } e.currentTarget.value = '' }} /></label><button aria-label="تأخير الكلمات نصف ثانية" onClick={() => setLyrOffset((v: number) => Math.max(-10, Math.round((v - 0.5) * 10) / 10))} className="rounded-full bg-white/10 px-3 py-2 text-xs">−0.5s</button><span className="text-xs opacity-60" dir="ltr">{lyrOffset > 0 ? '+' : ''}{lyrOffset.toFixed(1)}s</span><button aria-label="تقديم الكلمات نصف ثانية" onClick={() => setLyrOffset((v: number) => Math.min(10, Math.round((v + 0.5) * 10) / 10))} className="rounded-full bg-white/10 px-3 py-2 text-xs">+0.5s</button></div>
          {Bar({ big: true })}{Ctl()}
          <div className="flex items-center justify-center gap-2 text-xs"><button onClick={() => { setLoopA(t); setLoopB(null) }} className="rounded-lg bg-white/10 px-3 py-2" style={{ color: loopA !== null ? A : undefined }}>A {loopA === null ? '—' : fmt(loopA)}</button><button onClick={() => { if (loopA === null || t <= loopA) setMsg('حدد A أولًا، ثم B بعده.'); else setLoopB(t) }} className="rounded-lg bg-white/10 px-3 py-2" style={{ color: loopB !== null ? A : undefined }}>B {loopB === null ? '—' : fmt(loopB)}</button><button onClick={() => { setLoopA(null); setLoopB(null) }} className="rounded-lg bg-white/10 px-3 py-2">مسح التكرار</button></div>
          <div dir="ltr" className="flex justify-around pb-2 opacity-90">
            <button aria-label="مفضلة" onClick={() => fav(cur)} style={{ color: cur.fav ? A : undefined }}><Icon n="heart" /></button>
            <button aria-label="منبه نوم" onClick={() => setPanel(panel === 'sleep' ? null : 'sleep')} style={{ color: sleep ? A : undefined }}><Icon n="timer" /></button>
            <button aria-label="موازن صوت" onClick={() => setPanel(panel === 'eq' ? null : 'eq')} style={{ color: eq ? A : undefined }}><Icon n="eq" /></button>
            <button aria-label="السرعة" onClick={cycleSpeed} className="text-sm font-semibold">{SPEEDS[speed]}x</button>
            <button onClick={() => setCar(true)} className="text-sm font-semibold">قيادة</button>
            <button onClick={() => setParty(true)} className="text-sm font-semibold">Party</button>
          </div>
          {panel && (
            <div className="absolute inset-x-0 bottom-0 z-10 max-h-[78vh] space-y-3 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#151923]/95 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl backdrop-blur-xl">
              <h2 className="font-semibold">{panel === 'eq' ? 'HEMA Audio Lab · 10 نطاقات' : 'إيقاف تلقائي'}</h2>
              {panel === 'eq' && <div className="flex flex-wrap gap-2"><Opt on={bassBoost} onClick={() => setBassBoost(!bassBoost)}>تعزيز الجهير</Opt><Opt on={spatial} onClick={() => setSpatial(!spatial)}>صدى محيطي</Opt></div>}
              <div className="flex flex-wrap gap-2">
                {panel === 'eq' ? EQS.map((e, k) => <Opt key={e.n} on={eq === k} onClick={() => applyEq(k)}>{e.n}</Opt>)
                  : [0, 15, 30, 60, -1].map((n) => <Opt key={n} on={sleep === n} onClick={() => { setSleep(n); setPanel(null) }}>{n === -1 ? 'نهاية المقطع' : n ? `${n} د` : 'إيقاف'}</Opt>)}
              </div>
              {panel === 'eq' && <>
                {eq === EQS.length - 1 && <div className="space-y-3 rounded-xl bg-black/20 p-3">{BANDS.map((f, j) => <label key={f} className="grid grid-cols-[54px_1fr_42px] items-center gap-2 text-xs"><span dir="ltr">{f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`}</span><input aria-label={`EQ ${f} Hz`} type="range" min={-12} max={12} step={1} value={customEq[j]} onChange={(e) => changeEqBand(j, +e.target.value)} style={{ accentColor: A }} /><span className="text-end" dir="ltr">{customEq[j] > 0 ? '+' : ''}{customEq[j]} dB</span></label>)}</div>}
                <div dir="ltr"><input type="range" min={100} max={300} step={10} value={boost} onChange={(e) => setBoost(+e.target.value)} style={{ accentColor: A, width: '100%' }} /><p className="text-center text-sm opacity-60">رفع الصوت {boost}%</p></div>
              </>}
              <button onClick={() => setPanel(null)} className="w-full py-2 opacity-70">تم</button>
            </div>
          )}
        </div>
      )}

      {party && (
        <div className="fixed inset-0 z-[75] flex flex-col gap-4 bg-[#05070d] p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold tracking-[0.24em]" style={{ color: A }}>HEMA STUDIO</p><h2 className="text-xl font-bold">Party Visualizer</h2></div><button onClick={() => setParty(false)} className="rounded-full bg-white/10 px-4 py-2">خروج</button></div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/30"><canvas ref={partyCanvas} className="size-full" /><div className="pointer-events-none absolute inset-x-0 bottom-4 text-center"><p className="truncate px-5 text-lg font-semibold">{cur?.title ?? 'اختر أغنية'}</p><p className="text-xs opacity-55">تأثير بصري يتفاعل مع الصوت</p></div></div>
          <div dir="ltr" className="flex items-center justify-center gap-10"><button aria-label="السابق" onClick={() => step(-1)}><Icon n="prev" s={36} /></button><button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="grid size-16 place-items-center rounded-full text-white" style={{ background: A }}><Icon n={playing ? 'pause' : 'play'} s={34} /></button><button aria-label="التالي" onClick={() => step(1)}><Icon n="next" s={36} /></button></div>
        </div>
      )}

      {vaultOpen && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/75" onClick={() => { setVaultOpen(false); setVaultUnlocked(false); setVaultPin(''); setVaultItems([]) }}>
          <div className="max-h-[92%] w-full space-y-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111722] p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.22em]" style={{ color: A }}>HEMA SECURITY</p><h2 className="text-xl font-bold">الخزنة الخاصة المشفّرة</h2><p className="mt-1 text-xs opacity-55">AES-GCM 256-bit · PBKDF2-SHA-256 · PIN لا يُحفظ</p></div><button onClick={() => { setVaultOpen(false); setVaultUnlocked(false); setVaultPin(''); setVaultItems([]) }} className="rounded-full bg-white/10 px-3 py-2">إغلاق</button></div>
            {!vaultUnlocked ? <div className="space-y-3"><p className="text-sm opacity-70">{vaultKnown ? 'أدخل رمز الخزنة لفتح الملفات.' : 'أنشئ رمزًا لا يقل عن 6 أحرف/أرقام. نسيان الرمز يعني فقدان إمكانية فك الملفات.'}</p><input type="password" autoComplete="new-password" value={vaultPinInput} onChange={(e) => setVaultPinInput(e.target.value)} placeholder="PIN أو عبارة سرية (6+)" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" /><button disabled={vaultBusy} onClick={() => void unlockVaultUi()} className="w-full rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-50" style={{ background: A }}>{vaultBusy ? '…' : vaultKnown ? 'فتح الخزنة' : 'إنشاء خزنة مشفّرة'}</button></div> : <div className="space-y-3"><label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm">+ تشفير واستيراد ملفات<input type="file" accept="audio/*,video/*,image/*,application/pdf" multiple hidden onChange={(e) => { void vaultAdd(e.target.files); e.currentTarget.value = '' }} /></label><p className="text-xs opacity-55">يُنشأ ملف مشفّر منفصل داخل مساحة التطبيق؛ الأصل في مكتبة الهاتف لا يُحذف. حد الملف 120 MB.</p>
              {vaultItems.length === 0 ? <p className="py-5 text-center text-sm opacity-55">الخزنة فارغة.</p> : vaultItems.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ background: A + '30' }}><Icon n="folder" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs opacity-50">{(item.size / 1048576).toFixed(1)} MB · مشفّر</p></div><button aria-label="تصدير وفك تشفير" onClick={() => void vaultRestore(item)} className="rounded-lg bg-white/10 px-3 py-2 text-xs">استعادة</button><button aria-label="حذف من الخزنة" onClick={() => void vaultRemove(item)} className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">حذف</button></div>)}
              <button onClick={() => { setVaultUnlocked(false); setVaultPin(''); setVaultItems([]); setVaultPinInput(''); setVaultMsg('تم قفل الجلسة.')} } className="w-full rounded-xl bg-white/10 py-3 text-sm">قفل الخزنة</button></div>}
            {vaultMsg && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm opacity-80">{vaultMsg}</p>}
          </div>
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
            <p className="text-sm opacity-60">انتقال بين الأغاني</p>
            <div className="flex flex-wrap gap-2">{[0, 2, 3, 5, 8].map((n) => <Opt key={n} on={crossfade === n} onClick={() => setCrossfade(n)}>{n === 0 ? 'إيقاف' : `${n} ث`}</Opt>)}</div>
            <p className="text-xs opacity-50">Crossfade متداخل فعليًا للموسيقى؛ الفيديو لا يتأثر.</p>
            <p className="text-sm opacity-60">الترجمة</p><div className="flex flex-wrap items-center gap-2"><button onClick={() => setCueSize((v) => Math.max(80, v - 10))} className="rounded-full bg-white/10 px-3 py-2 text-sm">A−</button><span className="text-sm opacity-70">{cueSize}%</span><button onClick={() => setCueSize((v) => Math.min(200, v + 10))} className="rounded-full bg-white/10 px-3 py-2 text-sm">A+</button><button onClick={() => setCueColor((v) => v === '#ffffff' ? '#ffe082' : v === '#ffe082' ? '#80deea' : v === '#80deea' ? '#f48fb1' : '#ffffff')} className="rounded-full bg-white/10 px-3 py-2 text-sm" style={{ color: cueColor }}>لون الترجمة</button></div>
            <p className="text-sm opacity-60">الصوت والتحكم</p>
            <div dir="ltr"><input type="range" min={100} max={300} step={10} value={boost} onChange={(e) => setBoost(+e.target.value)} style={{ accentColor: A, width: '100%' }} /><p className="text-center text-sm opacity-60">رفع الصوت {boost}%</p></div>
            <div className="flex flex-wrap gap-2">
              <Opt on={shake} onClick={() => setShake(!shake)}>هز = التالي</Opt>
              <Opt on={quran} onClick={() => setQuran(!quran)}>وضع القرآن (يكمل كل مقطع)</Opt>
              <Opt on={bookMode} onClick={() => setBookMode(!bookMode)}>وضع الكتب الصوتية</Opt>
              <Opt on={bassBoost} onClick={() => setBassBoost(!bassBoost)}>تعزيز الجهير</Opt>
              <Opt on={spatial} onClick={() => setSpatial(!spatial)}>صدى محيطي</Opt>
              <Opt on={adhan} onClick={() => setAdhan(!adhan)}>إيقاف وقت الأذان</Opt>
            </div>
            {adhan && <div className="flex gap-2"><input value={city.c} onChange={(e) => setCity({ ...city, c: e.target.value })} placeholder="City (English)" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none" /><input value={city.k} onChange={(e) => setCity({ ...city, k: e.target.value })} placeholder="Country (English)" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none" /></div>}
            <Opt on={false} onClick={() => { setSettings(false); makeWrapped() }}>ملخصي Hema Wrapped</Opt>
            <p className="text-sm opacity-60">إدارة المكتبة</p>
            <Opt on={false} onClick={() => { setTab('queue'); setSettings(false) }}>إدارة طابور التشغيل ({queueIds.length})</Opt>
            <Opt on={false} onClick={openVaultUi}>خزنة خاصة مشفّرة</Opt>
            <Opt on={false} onClick={findDuplicates}>فحص الملفات المكررة SHA-256</Opt>
            {duplicates && <div className="space-y-2 rounded-xl bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-sm">مجموعات مكررة: {duplicates.length}</span><button onClick={() => setDuplicates(null)} className="text-sm opacity-60">إغلاق</button></div>
              {duplicates.length === 0 ? <p className="text-sm opacity-60">لم نعثر على تكرار حسب الاسم والفنان.</p> : duplicates.map((group) => <div key={group[0].id} className="rounded-lg bg-white/5 p-2">
                <p className="truncate text-sm font-semibold">{group[0].title}</p>
                <p className="text-xs opacity-60">{group.length} ملفات · {group[0].video ? "فيديو" : "صوت"}</p>
                {group.map((x) => <p key={x.id} className="truncate text-xs opacity-50">{x.folder || "ملف مستورد"}{x.size ? " · " + (x.size / 1048576).toFixed(1) + " MB" : ""}</p>)}
              </div>)}
              <p className="text-xs opacity-50">SHA-256 للملفات المستوردة؛ مقارنة الاسم والفنان والحجم والمدة لملفات الجهاز. لا حذف تلقائي.</p>
            </div>}
            <p className="text-sm opacity-60">إدارة القوائم</p>
            <label className="inline-flex cursor-pointer rounded-full bg-white/10 px-4 py-2 text-sm">استيراد قائمة HEMA<input type="file" accept="application/json,.json" hidden onChange={(e) => { void importPlaylist(e.target.files?.[0]); e.currentTarget.value = '' }} /></label>
            <Opt on={autoVolume} onClick={() => setAutoVolume(!autoVolume)}>توازن الصوت تلقائيًا</Opt>
            <p className="text-xs opacity-50">التوازن يقرأ مستوى الصوت أثناء التشغيل ويعدّل الكسب تدريجيًا؛ النتيجة تختلف حسب الملف والجهاز.</p>
            <p className="text-sm opacity-60">النسخ الاحتياطي</p>
            <div className="flex flex-wrap gap-2">
              <Opt on={false} onClick={exportBackup}>تصدير نسخة احتياطية</Opt>
              <label className="cursor-pointer rounded-full px-4 py-2 text-sm" style={{ background: '#ffffff1a' }}>استيراد نسخة احتياطية<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importBackup(e.target.files?.[0]); e.currentTarget.value = '' }} /></label>
            </div>
            {backupMsg && <p role="status" className="text-sm opacity-70">{backupMsg}</p>}
            <p className="text-xs opacity-50">لا إعلانات. الخزنة تستخدم AES-GCM ومفتاح PBKDF2 محليًا. ملفات الخزنة لا تدخل النسخة الاحتياطية العادية.</p>
          </div>
        </div>
      )}

      {editingMeta && (
        <div className="fixed inset-0 z-[85] flex items-end bg-black/75" onClick={() => { setEditingMeta(null); setEditCover(null); setEditCoverUrl(null) }}>
          <div className="max-h-[90%] w-full space-y-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111722] p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold tracking-[.2em]" style={{ color: A }}>LOCAL METADATA</p><h2 className="text-xl font-bold">تعديل بيانات العرض</h2></div><button onClick={() => setEditingMeta(null)} className="rounded-full bg-white/10 px-3 py-2">إغلاق</button></div>
            <p className="text-xs opacity-55">التغييرات داخل HEMA فقط؛ لا تعدّل Tags الأصلية للملف.</p>
            <label className="block space-y-1 text-sm"><span className="opacity-65">اسم المقطع</span><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={180} className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none" placeholder="اسم المقطع" /></label>
            <label className="block space-y-1 text-sm"><span className="opacity-65">الفنان / الوصف</span><input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} maxLength={120} className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none" placeholder="اسم الفنان" /></label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/5 p-3 text-sm"><span className="grid size-12 place-items-center overflow-hidden rounded-lg bg-white/10">{editCoverUrl ? <img src={editCoverUrl} alt="" className="size-full object-cover" /> : <Icon n="music" />}</span><span className="flex-1">اختيار غلاف من الصور<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size <= 8 * 1024 * 1024) { setEditCover(file); setEditCoverUrl(URL.createObjectURL(file)) } else if (file) setMetaMsg('حد الغلاف 8 MB.') ; e.currentTarget.value = '' }} /></span></label>
            {metaMsg && <p role="status" className="text-sm opacity-75">{metaMsg}</p>}
            <div className="grid grid-cols-2 gap-2"><button disabled={!editTitle.trim()} onClick={() => void saveEditedTrackMeta()} className="rounded-xl py-3 font-semibold text-white disabled:opacity-40" style={{ background: A }}>حفظ</button><button onClick={() => void resetEditedTrackMeta()} className="rounded-xl bg-white/10 py-3">إرجاع الأصل</button></div>
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
        <div className="fixed inset-0 z-50 select-none" onClick={() => { if (!lockedScreen) poke() }}
          onTouchStart={(e) => { if (lockedScreen) return; const p = e.touches[0]; g.current = { x: p.clientX, y: p.clientY, ax: '', v: m.current?.volume ?? 1, b: bright, t, w: window.innerWidth, left: p.clientX < window.innerWidth / 2, nt: -1 } }}
          onTouchMove={(e) => {
            if (lockedScreen) return; const p = e.touches[0]; const G = g.current; const dx = p.clientX - G.x; const dy = G.y - p.clientY
            if (!G.ax && (Math.abs(dx) > 14 || Math.abs(dy) > 14)) G.ax = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
            if (G.ax === 'y') {
              if (G.left) { const b = Math.max(0.05, Math.min(1, G.b + dy / 250)); setBright(b); setHud({ k: 'br', v: b }) }
              else { const v = Math.max(0, Math.min(1, G.v + dy / 250)); if (m.current) m.current.volume = v; setHud({ k: 'vol', v }) }
            } else if (G.ax === 'x') { G.nt = Math.max(0, Math.min(d, G.t + (dx / G.w) * 120)); setHud({ k: 'seek', v: G.nt }) }
          }}
          onTouchEnd={() => { if (lockedScreen) return; const G = g.current; if (G.ax === 'x' && G.nt >= 0) seek(G.nt); window.setTimeout(() => setHud(null), 600) }}>
          <div className="absolute inset-y-0 start-0 w-1/3" onDoubleClick={() => seek(t - 10)} />
          <div className="absolute inset-y-0 end-0 w-1/3" onDoubleClick={() => seek(t + 10)} />
          {hud && <div className="absolute start-1/2 top-1/3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2">{hud.k === 'br' && <Icon n="sun" s={20} />}{hud.k === 'seek' ? `${fmt(hud.v)} / ${fmt(d)}` : `${Math.round(hud.v * 100)}%`}</div>}
          {lockedScreen && <button onClick={(e) => { e.stopPropagation(); setLockedScreen(false); poke() }} className="absolute inset-x-0 bottom-10 z-[60] mx-auto w-fit rounded-full bg-black/75 px-5 py-3 text-sm text-white shadow-xl">اضغط لفتح اللمس</button>}
          {ui && !lockedScreen && (
            <>
              <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent p-3 pt-8">
                <button aria-label="رجوع" onClick={(e) => { e.stopPropagation(); closeVideo() }} className="p-1"><Icon n="back" /></button>
                <span className="min-w-0 flex-1 truncate">{cur.title}</span>
                <label onClick={(e) => e.stopPropagation()} className="rounded-lg bg-white/15 px-3 py-1 text-sm">CC
                  <input type="file" accept=".srt,.vtt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const tx = await f.text(); setSub(URL.createObjectURL(new Blob([f.name.endsWith('.vtt') ? tx : srt2vtt(tx)], { type: 'text/vtt' }))) } }} />
                </label>
                <button aria-label="تدوير" onClick={(e) => { e.stopPropagation(); void rotate() }} className="p-1"><Icon n="rotate" s={22} /></button>
                <button onClick={(e) => { e.stopPropagation(); cycleSpeed() }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">{SPEEDS[speed]}x</button>
                <button onClick={(e) => { e.stopPropagation(); setCueSize((v) => Math.min(200, v + 10)) }} className="rounded-lg bg-white/15 px-2 py-1 text-xs">CC A+</button>
                <button onClick={(e) => { e.stopPropagation(); setCueColor((v) => v === '#ffffff' ? '#ffe082' : v === '#ffe082' ? '#80deea' : v === '#80deea' ? '#f48fb1' : '#ffffff') }} className="rounded-lg bg-white/15 px-2 py-1 text-xs" style={{ color: cueColor }}>لون CC</button>
                <button onClick={(e) => { e.stopPropagation(); setCueSize((v) => Math.max(80, v - 10)) }} className="rounded-lg bg-white/15 px-2 py-1 text-xs">CC A−</button>
                <button onClick={(e) => { e.stopPropagation(); setLockedScreen(!lockedScreen) }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">{lockedScreen ? 'فتح اللمس' : 'قفل اللمس'}</button>
                <button onClick={(e) => { e.stopPropagation(); void pip().catch(() => setBackupMsg('PiP غير متاح على هذا الجهاز')) }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">PiP</button>
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
