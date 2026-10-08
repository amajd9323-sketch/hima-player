import { useEffect, useRef, useState } from 'react'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { aiOrder } from './ai'
import { all, put, del } from './db'
import Icon from './Icon'

type Track = { id: string; title: string; url: string; video: boolean; fav?: boolean; at: number; blob: Blob }
type Tab = 'music' | 'video' | 'ai'
type Repeat = 'off' | 'all' | 'one'
const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
const SPEEDS = [1, 1.5, 2, 0.75]
const BANDS = [60, 230, 910, 3600, 14000]
const EQS = [{ n: 'عادي', g: [0, 0, 0, 0, 0] }, { n: 'باس', g: [7, 4, 0, 0, 0] }, { n: 'صوت', g: [-1, 0, 3, 4, 2] }, { n: 'روك', g: [5, 2, -1, 3, 5] }, { n: 'ناعم', g: [-2, 0, 2, 3, -1] }]
const A = '#ff4d6d'
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
const art = (s: string) => ({ background: `linear-gradient(135deg,hsl(${hue(s)} 75% 58%),hsl(${hue(s) + 50} 70% 38%))` })

export default function App() {
  const [q, setQ] = useState<Track[]>([])
  const [i, setI] = useState(-1)
  const [tab, setTab] = useState<Tab>('music')
  const [favOnly, setFavOnly] = useState(false)
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
  const m = useRef<HTMLVideoElement>(null)
  const hide = useRef<number>()
  const ac = useRef<AudioContext>()
  const bands = useRef<BiquadFilterNode[]>([])
  const drag = useRef({ y: 0, v: 1 })
  const cur = q[i]
  const match = (x: Track) => (!find || x.title.toLowerCase().includes(find.toLowerCase())) && (!favOnly || x.fav)
  const musics = q.map((x, k) => ({ x, k })).filter((o) => !o.x.video && match(o.x))
  const videos = q.map((x, k) => ({ x, k })).filter((o) => o.x.video && match(o.x))

  useEffect(() => { all().then((r) => setQ(r.sort((a, b) => a.at - b.at).map((x) => ({ ...x, url: URL.createObjectURL(x.blob) })))).catch(() => {}) }, [])

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
  const lock = async (on: boolean) => { try { if (on) await ScreenOrientation.lock({ orientation: 'landscape' }); else await ScreenOrientation.unlock() } catch { /* web */ } }
  const openVideo = (k: number) => { setI(k); setFs(true); setUi(true); void lock(true) }
  const closeVideo = () => { setFs(false); void lock(false) }
  const poke = () => { setUi(true); window.clearTimeout(hide.current); hide.current = window.setTimeout(() => setUi(false), 3500) }
  const cycleSpeed = () => { const n = (speed + 1) % SPEEDS.length; setSpeed(n); if (m.current) m.current.playbackRate = SPEEDS[n] }
  const applyEq = (k: number) => { setEq(k); bands.current.forEach((b, j) => (b.gain.value = EQS[k].g[j])) }
  const initAudio = () => {
    if (ac.current) return void ac.current.resume()
    if (!m.current) return
    const c = new AudioContext(); const src = c.createMediaElementSource(m.current)
    bands.current = BANDS.map((f) => { const b = c.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1; b.gain.value = EQS[eq].g[BANDS.indexOf(f)]; return b })
    ;[src, ...bands.current, c.destination].reduce((a, b) => (a.connect(b), b))
    ac.current = c
  }
  const fav = (x: Track) => { const f = !x.fav; setQ((p) => p.map((y) => (y.id === x.id ? { ...y, fav: f } : y))); put({ id: x.id, title: x.title, video: x.video, at: x.at, blob: x.blob, fav: f }).catch(() => {}) }
  const remove = (x: Track) => { del(x.id).catch(() => {}); const k = q.indexOf(x); setQ((p) => p.filter((y) => y !== x)); if (k === i) { m.current?.pause(); setI(-1); setSheet(false) } else if (k < i) setI(i - 1) }

  useEffect(() => { if (cur && m.current) { m.current.src = cur.url; m.current.playbackRate = SPEEDS[speed]; m.current.play().catch(() => {}) } }, [cur?.id])
  useEffect(() => { if (!sleep) return; const h = window.setTimeout(() => { m.current?.pause(); setSleep(0) }, sleep * 60000); return () => window.clearTimeout(h) }, [sleep])
  useEffect(() => {
    if (!cur || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: cur.title, artist: 'Hema' })
    navigator.mediaSession.setActionHandler('play', toggle)
    navigator.mediaSession.setActionHandler('pause', toggle)
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1))
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1))
  })
  const ended = () => { if (repeat === 'one') void m.current?.play(); else if (repeat === 'off' && !shuffle && cur && q.filter((x) => x.video === cur.video).pop() === cur) setPlaying(false); else step(1) }

  const smart = async () => {
    const list = q.filter((x) => !x.video)
    if (!ask.trim() || !list.length) return
    setBusy(true); setMsg('')
    try {
      const order = await aiOrder(ask, list.map((x) => x.title))
      const picked = order.filter((n) => list[n]).map((n) => list[n])
      if (!picked.length) { setMsg('لا نتيجة. جرب وصف ثاني.'); return }
      setQ([...picked, ...q.filter((x) => !picked.includes(x))]); setI(0); setTab('music'); setSheet(true)
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
    <li className="flex items-center gap-1 rounded-xl active:bg-white/5">
      <button onClick={() => { setI(k); setSheet(!x.video); if (x.video) openVideo(k) }} className="flex min-w-0 flex-1 items-center gap-3 p-2 text-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg font-semibold text-white" style={art(x.title)}>{k === i && playing ? <Icon n="eq" s={20} /> : [...x.title][0]}</span>
        <span className="truncate" style={k === i ? { color: A } : undefined}>{x.title}</span>
      </button>
      <button aria-label="مفضلة" onClick={() => fav(x)} className="p-2" style={{ color: x.fav ? A : '#fff5' }}><Icon n="heart" s={22} /></button>
      <button aria-label="حذف" onClick={() => remove(x)} className="p-2 opacity-40"><Icon n="trash" s={20} /></button>
    </li>
  )
  const empty = <p className="py-20 text-center opacity-60">فارغ. اضغط + لإضافة ملفات.</p>
  const Opt = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="rounded-full px-4 py-2 text-sm" style={{ background: on ? A : '#ffffff1a' }}>{children}</button>
  )

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <video ref={m} playsInline onClick={poke}
        className={fs ? `fixed inset-0 z-40 size-full bg-black ${cover ? 'object-cover' : 'object-contain'}` : 'hidden'}
        onPlay={() => { setPlaying(true); initAudio(); poke() }} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setD(e.currentTarget.duration)} onEnded={ended} />

      <header className="flex items-center gap-2 px-4 py-3">
        {find === null ? <h1 className="flex-1 text-2xl font-bold" style={{ color: A }}>Hema</h1>
          : <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="بحث" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 outline-none" />}
        <button aria-label="بحث" onClick={() => setFind(find === null ? '' : null)} className="p-2"><Icon n={find === null ? 'search' : 'close'} /></button>
        <label className="grid size-10 cursor-pointer place-items-center rounded-full text-white" style={{ background: A }} aria-label="إضافة ملفات"><Icon n="plus" />
          <input type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => add(e.target.files)} />
        </label>
      </header>

      {tab !== 'ai' && (
        <div className="flex gap-2 px-4 pb-2">
          <Opt on={!favOnly} onClick={() => setFavOnly(false)}>الكل</Opt><Opt on={favOnly} onClick={() => setFavOnly(true)}>المفضلة</Opt>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {tab === 'music' && (musics.length ? <ul>{musics.map(({ x, k }) => <Row key={x.id} x={x} k={k} />)}</ul> : empty)}
        {tab === 'video' && (videos.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {videos.map(({ x, k }) => (
              <li key={x.id}>
                <button onClick={() => openVideo(k)} className="relative block w-full text-start">
                  <video src={x.url + '#t=1'} preload="metadata" muted playsInline className="aspect-video w-full rounded-xl bg-white/10 object-cover" />
                  <span className="absolute inset-0 grid place-items-center text-white/90"><Icon n="play" s={34} /></span>
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
            <button onClick={smart} disabled={busy} className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50" style={{ background: A }}>{busy ? '…' : 'رتّب بالذكاء'}</button>
            {msg && <p role="status" className="text-sm opacity-80">{msg}</p>}
          </div>
        )}
      </main>

      {cur && !cur.video && !sheet && (
        <div className="relative mx-2 mb-2 overflow-hidden rounded-2xl bg-white/10">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10"><div className="h-full" style={{ width: `${d ? (t / d) * 100 : 0}%`, background: A }} /></div>
          <div className="flex items-center gap-3 p-2">
            <button onClick={() => setSheet(true)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg font-semibold text-white" style={art(cur.title)}>{[...cur.title][0]}</span>
              <span className="truncate">{cur.title}</span>
            </button>
            <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="p-1"><Icon n={playing ? 'pause' : 'play'} s={30} /></button>
            <button aria-label="التالي" onClick={() => step(1)} className="p-1"><Icon n="next" s={30} /></button>
          </div>
        </div>
      )}

      <nav className="flex border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        {([['music', 'music', 'الموسيقى'], ['video', 'video', 'الفيديو'], ['ai', 'spark', 'ذكاء']] as const).map(([k, g, l]) => (
          <button key={k} onClick={() => setTab(k)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs" style={{ color: tab === k ? A : '#fff9' }}><Icon n={g} />{l}</button>
        ))}
      </nav>

      {sheet && cur && !cur.video && (
        <div className="fixed inset-0 z-30 flex flex-col gap-5 p-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)', background: `linear-gradient(180deg,hsl(${hue(cur.title)} 45% 22%),#0d0f14 70%)` }}>
          <button onClick={() => { setSheet(false); setPanel(null) }} aria-label="إغلاق" className="self-start"><Icon n="down" s={32} /></button>
          <div className="grid flex-1 place-items-center">
            <div className="grid aspect-square w-4/5 place-items-center rounded-full shadow-2xl" style={{ ...art(cur.title), animation: 'spin 14s linear infinite', animationPlayState: playing ? 'running' : 'paused' }}>
              <div className="grid size-1/4 place-items-center rounded-full bg-[#0d0f14] text-2xl font-bold">{[...cur.title][0]}</div>
            </div>
          </div>
          <p className="truncate text-center text-xl font-semibold">{cur.title}</p>
          <Bar big /><Ctl />
          <div dir="ltr" className="flex justify-around pb-2 opacity-90">
            <button aria-label="مفضلة" onClick={() => fav(cur)} style={{ color: cur.fav ? A : undefined }}><Icon n="heart" /></button>
            <button aria-label="منبه نوم" onClick={() => setPanel(panel === 'sleep' ? null : 'sleep')} style={{ color: sleep ? A : undefined }}><Icon n="timer" /></button>
            <button aria-label="موازن صوت" onClick={() => setPanel(panel === 'eq' ? null : 'eq')} style={{ color: eq ? A : undefined }}><Icon n="eq" /></button>
            <button aria-label="السرعة" onClick={cycleSpeed} className="text-sm font-semibold">{SPEEDS[speed]}x</button>
          </div>
          {panel && (
            <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 rounded-t-3xl bg-[#1a1d26] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <h2 className="font-semibold">{panel === 'eq' ? 'موازن الصوت' : 'إيقاف تلقائي'}</h2>
              <div className="flex flex-wrap gap-2">
                {panel === 'eq' ? EQS.map((e, k) => <Opt key={e.n} on={eq === k} onClick={() => applyEq(k)}>{e.n}</Opt>)
                  : [0, 15, 30, 60].map((n) => <Opt key={n} on={sleep === n} onClick={() => { setSleep(n); setPanel(null) }}>{n ? `${n} د` : 'إيقاف'}</Opt>)}
              </div>
              <button onClick={() => setPanel(null)} className="w-full py-2 opacity-70">تم</button>
            </div>
          )}
        </div>
      )}

      {fs && cur?.video && (
        <div className="fixed inset-0 z-50 select-none" onClick={poke}
          onTouchStart={(e) => { drag.current = { y: e.touches[0].clientY, v: m.current?.volume ?? 1 } }}
          onTouchMove={(e) => { if (m.current) { const v = Math.max(0, Math.min(1, drag.current.v + (drag.current.y - e.touches[0].clientY) / 250)); m.current.volume = v; setVol(v) } }}
          onTouchEnd={() => window.setTimeout(() => setVol(null), 600)}>
          <div className="absolute inset-y-0 start-0 w-1/3" onDoubleClick={() => seek(t - 10)} />
          <div className="absolute inset-y-0 end-0 w-1/3" onDoubleClick={() => seek(t + 10)} />
          {vol !== null && <div className="absolute start-1/2 top-1/3 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2">{Math.round(vol * 100)}%</div>}
          {ui && (
            <>
              <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-3">
                <button aria-label="رجوع" onClick={(e) => { e.stopPropagation(); closeVideo() }} className="p-1"><Icon n="back" /></button>
                <span className="min-w-0 flex-1 truncate">{cur.title}</span>
                <button onClick={(e) => { e.stopPropagation(); cycleSpeed() }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">{SPEEDS[speed]}x</button>
                <button onClick={(e) => { e.stopPropagation(); setCover(!cover) }} className="rounded-lg bg-white/15 px-3 py-1 text-sm">{cover ? 'ملء' : 'احتواء'}</button>
              </div>
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-12" onClick={(e) => e.stopPropagation()}>
                <button aria-label="رجوع 10 ثواني" onClick={() => { seek(t - 10); poke() }}><Icon n="rew" s={40} /></button>
                <button aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle} className="grid size-20 place-items-center rounded-full bg-black/50"><Icon n={playing ? 'pause' : 'play'} s={44} /></button>
                <button aria-label="تقديم 10 ثواني" onClick={() => { seek(t + 10); poke() }}><Icon n="fwd" s={40} /></button>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8" onClick={(e) => e.stopPropagation()}>
                <Bar />
                <div dir="ltr" className="flex justify-center gap-10 pt-1"><button aria-label="السابق" onClick={() => step(-1)}><Icon n="prev" s={30} /></button><button aria-label="التالي" onClick={() => step(1)}><Icon n="next" s={30} /></button></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
