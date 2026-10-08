import { useEffect, useRef, useState } from 'react'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { aiOrder } from './ai'

type Track = { id: string; title: string; url: string; video: boolean; fav?: boolean }
type Tab = 'music' | 'video' | 'ai'
type Repeat = 'off' | 'all' | 'one'
const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
const SPEEDS = [1, 1.5, 2, 0.75]
const A = '#ff5a6e'

export default function App() {
  const [q, setQ] = useState<Track[]>([])
  const [i, setI] = useState(-1)
  const [tab, setTab] = useState<Tab>('music')
  const [sheet, setSheet] = useState(false)
  const [fs, setFs] = useState(false)
  const [ui, setUi] = useState(true)
  const [cover, setCover] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [speed, setSpeed] = useState(0)
  const [ask, setAsk] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const m = useRef<HTMLVideoElement>(null)
  const hide = useRef<number>()
  const cur = q[i]
  const musics = q.map((x, k) => ({ x, k })).filter((o) => !o.x.video)
  const videos = q.map((x, k) => ({ x, k })).filter((o) => o.x.video)

  const add = (files: FileList | null) => {
    if (!files) return
    const n = [...files].map((f) => ({ id: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), video: f.type.startsWith('video') }))
    setQ((p) => [...p, ...n]); if (i < 0) setI(q.length)
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
  const lock = async (on: boolean) => { try { if (on) await ScreenOrientation.lock({ orientation: 'landscape' }); else await ScreenOrientation.unlock() } catch { /* web */ } }
  const openVideo = (k: number) => { setI(k); setFs(true); setUi(true); void lock(true) }
  const closeVideo = () => { setFs(false); void lock(false) }
  const poke = () => { setUi(true); window.clearTimeout(hide.current); hide.current = window.setTimeout(() => setUi(false), 3500) }
  const cycleSpeed = () => { const n = (speed + 1) % SPEEDS.length; setSpeed(n); if (m.current) m.current.playbackRate = SPEEDS[n] }

  useEffect(() => { if (cur && m.current) { m.current.src = cur.url; m.current.playbackRate = SPEEDS[speed]; m.current.play().catch(() => {}) } }, [cur?.id])
  useEffect(() => {
    if (!cur || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: cur.title, artist: 'Hima Player' })
    navigator.mediaSession.setActionHandler('play', toggle)
    navigator.mediaSession.setActionHandler('pause', toggle)
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1))
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1))
  })
  const ended = () => {
    if (repeat === 'one') void m.current?.play()
    else step(1)
  }

  const smart = async () => {
    if (!ask.trim() || !musics.length) return
    setBusy(true); setMsg('')
    try {
      const list = musics.map((o) => o.x)
      const order = await aiOrder(ask, list.map((x) => x.title))
      const picked = order.filter((n) => list[n]).map((n) => list[n])
      if (!picked.length) { setMsg('لا نتيجة. جرب وصف ثاني.'); return }
      const rest = q.filter((x) => !picked.includes(x))
      setQ([...picked, ...rest]); setI(0); setTab('music'); setMsg(`رتبت ${picked.length} مقطع`)
    } catch (e) {
      setMsg((e as Error).message === 'AI_URL_MISSING' ? 'AI غير مفعّل: اضبط VITE_AI_URL' : 'فشل AI. جرب لاحقا.')
    } finally { setBusy(false) }
  }
  const fav = (id: string) => setQ((p) => p.map((x) => (x.id === id ? { ...x, fav: !x.fav } : x)))

  const Bar = ({ big }: { big?: boolean }) => (
    <div dir="ltr" className="space-y-1">
      <input type="range" min={0} max={d || 0} step={0.1} value={t} aria-label="التقدم" onChange={(e) => seek(+e.target.value)} />
      <div className={`flex justify-between ${big ? 'text-sm' : 'text-xs'} opacity-70`}><span>{fmt(t)}</span><span>{fmt(d)}</span></div>
    </div>
  )
  const Ctl = () => (
    <div dir="ltr" className="flex items-center justify-between text-2xl">
      <button aria-label="عشوائي" style={{ color: shuffle ? A : undefined, opacity: shuffle ? 1 : .6 }} onClick={() => setShuffle(!shuffle)}>⤮</button>
      <button aria-label="السابق" onClick={() => step(-1)}>⏮</button>
      <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="grid size-16 place-items-center rounded-full text-[#0d0f14]" style={{ background: A }}>{playing ? '❚❚' : '▶'}</button>
      <button aria-label="التالي" onClick={() => step(1)}>⏭</button>
      <button aria-label="تكرار" style={{ color: repeat !== 'off' ? A : undefined, opacity: repeat === 'off' ? .6 : 1 }} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}>{repeat === 'one' ? '↻1' : '↻'}</button>
    </div>
  )
  const Row = ({ x, k, onPick }: { x: Track; k: number; onPick: () => void }) => (
    <li className="flex items-center gap-3 rounded-xl p-2 active:bg-white/5">
      <button onClick={onPick} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/10 text-xl" style={k === i ? { background: A } : undefined}>{k === i && playing ? '♪' : '♫'}</span>
        <span className="truncate" style={k === i ? { color: A } : undefined}>{x.title}</span>
      </button>
      <button aria-label="مفضلة" onClick={() => fav(x.id)} style={{ color: x.fav ? A : '#fff6' }} className="p-2 text-xl">{x.fav ? '♥' : '♡'}</button>
    </li>
  )
  const empty = <p className="py-16 text-center opacity-60">لا ملفات. اضغط + لإضافة.</p>

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <video ref={m} playsInline onClick={poke}
        className={fs ? `fixed inset-0 z-40 size-full bg-black ${cover ? 'object-cover' : 'object-contain'}` : 'hidden'}
        onPlay={() => { setPlaying(true); poke() }} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setD(e.currentTarget.duration)} onEnded={ended} />

      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold">{tab === 'music' ? 'الموسيقى' : tab === 'video' ? 'الفيديو' : 'ذكاء Hima'}</h1>
        <label className="grid size-10 cursor-pointer place-items-center rounded-full text-2xl" style={{ background: A }} aria-label="إضافة ملفات">+
          <input type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => add(e.target.files)} />
        </label>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {tab === 'music' && (musics.length ? <ul>{musics.map(({ x, k }) => <Row key={x.id} x={x} k={k} onPick={() => { setI(k); setSheet(true) }} />)}</ul> : empty)}
        {tab === 'video' && (videos.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {videos.map(({ x, k }) => (
              <li key={x.id}>
                <button onClick={() => openVideo(k)} className="block w-full text-start">
                  <video src={x.url + '#t=1'} preload="metadata" muted playsInline className="aspect-video w-full rounded-xl bg-white/10 object-cover" />
                  <p className="mt-1 truncate text-sm">{x.title}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : empty)}
        {tab === 'ai' && (
          <div className="space-y-3 p-1">
            <p className="opacity-70">صف المزاج، يرتب موسيقاك.</p>
            <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && smart()} placeholder="هادي للدراسة، حماسي للرياضة…" className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none" />
            <button onClick={smart} disabled={busy} className="w-full rounded-xl py-3 font-semibold text-[#0d0f14] disabled:opacity-50" style={{ background: A }}>{busy ? '…' : 'رتّب بالذكاء'}</button>
            {msg && <p role="status" className="text-sm opacity-80">{msg}</p>}
            <h2 className="pt-4 font-semibold">المفضلة</h2>
            <ul>{q.map((x, k) => x.fav && <Row key={x.id} x={x} k={k} onPick={() => (x.video ? openVideo(k) : (setI(k), setSheet(true)))} />)}</ul>
          </div>
        )}
      </main>

      {cur && !cur.video && !sheet && (
        <button onClick={() => setSheet(true)} className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-white/10 p-2 text-start">
          <span className="grid size-10 place-items-center rounded-lg" style={{ background: A }}>♫</span>
          <span className="min-w-0 flex-1 truncate">{cur.title}</span>
          <span role="button" aria-label="تشغيل" onClick={(e) => { e.stopPropagation(); toggle() }} className="px-3 text-xl">{playing ? '❚❚' : '▶'}</span>
        </button>
      )}

      <nav className="flex border-t border-white/10 bg-[#0d0f14] pb-[env(safe-area-inset-bottom)]">
        {([['music', '♫', 'الموسيقى'], ['video', '▣', 'الفيديو'], ['ai', '✦', 'ذكاء']] as const).map(([k, g, l]) => (
          <button key={k} onClick={() => setTab(k)} className="flex flex-1 flex-col items-center py-2 text-xs" style={{ color: tab === k ? A : '#fff9' }}>
            <span className="text-xl">{g}</span>{l}
          </button>
        ))}
      </nav>

      {sheet && cur && !cur.video && (
        <div className="fixed inset-0 z-30 flex flex-col gap-6 bg-[#0d0f14] p-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}>
          <button onClick={() => setSheet(false)} aria-label="إغلاق" className="self-start text-2xl">⌄</button>
          <div className="grid flex-1 place-items-center">
            <div className={`grid aspect-square w-4/5 place-items-center rounded-3xl text-8xl ${playing ? 'scale-100' : 'scale-90'} transition`} style={{ background: `linear-gradient(135deg,${A},#7b5cff)` }}>♫</div>
          </div>
          <p className="truncate text-center text-xl font-semibold">{cur.title}</p>
          <Bar big /><Ctl />
        </div>
      )}

      {fs && cur?.video && (
        <div className="fixed inset-0 z-50 select-none" onClick={poke}>
          <div className="absolute inset-y-0 start-0 w-1/3" onDoubleClick={() => seek(t - 10)} />
          <div className="absolute inset-y-0 end-0 w-1/3" onDoubleClick={() => seek(t + 10)} />
          {ui && (
            <>
              <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-3 text-lg">
                <button aria-label="رجوع" onClick={(e) => { e.stopPropagation(); closeVideo() }} className="px-2 text-2xl">←</button>
                <span className="min-w-0 flex-1 truncate">{cur.title}</span>
                <button onClick={(e) => { e.stopPropagation(); cycleSpeed() }} className="rounded-lg bg-white/15 px-3 text-sm">{SPEEDS[speed]}x</button>
                <button onClick={(e) => { e.stopPropagation(); setCover(!cover) }} className="rounded-lg bg-white/15 px-3 text-sm">{cover ? 'ملء' : 'احتواء'}</button>
              </div>
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-10 text-4xl" onClick={(e) => e.stopPropagation()}>
                <button aria-label="رجوع 10 ثواني" onClick={() => { seek(t - 10); poke() }}>⟲</button>
                <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="grid size-20 place-items-center rounded-full bg-black/50">{playing ? '❚❚' : '▶'}</button>
                <button aria-label="تقديم 10 ثواني" onClick={() => { seek(t + 10); poke() }}>⟳</button>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8" onClick={(e) => e.stopPropagation()}><Bar /></div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
