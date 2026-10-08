import { useEffect, useRef, useState } from 'react'
import { aiOrder } from './ai'

type Track = { id: string; title: string; url: string; video: boolean }
type Repeat = 'off' | 'all' | 'one'
const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

export default function App() {
  const [q, setQ] = useState<Track[]>([])
  const [i, setI] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [ask, setAsk] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const m = useRef<HTMLVideoElement>(null)
  const cur = q[i]

  const add = (files: FileList | null) => {
    if (!files) return
    const n = [...files].map((f) => ({ id: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), video: f.type.startsWith('video') }))
    setQ((p) => [...p, ...n]); if (i < 0) setI(0)
  }
  const go = (k: number) => { if (q.length) setI((k + q.length) % q.length) }
  const next = () => (shuffle ? go(Math.floor(Math.random() * q.length)) : go(i + 1))
  const toggle = () => { if (m.current) { if (m.current.paused) void m.current.play(); else m.current.pause() } }

  useEffect(() => { if (cur && m.current) { m.current.src = cur.url; m.current.play().catch(() => {}) } }, [cur?.id])
  useEffect(() => {
    if (!cur || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: cur.title, artist: 'Hima Player' })
    navigator.mediaSession.setActionHandler('play', toggle)
    navigator.mediaSession.setActionHandler('pause', toggle)
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', () => go(i - 1))
  })

  const ended = () => {
    if (repeat === 'one') void m.current?.play()
    else if (repeat === 'off' && i === q.length - 1 && !shuffle) setPlaying(false)
    else next()
  }

  const smart = async () => {
    if (!ask.trim() || !q.length) return
    setBusy(true); setMsg('')
    try {
      const order = await aiOrder(ask, q.map((x) => x.title))
      const picked = order.filter((n) => q[n]).map((n) => q[n])
      if (!picked.length) { setMsg('لا نتيجة. جرب وصف ثاني.'); return }
      setQ([...picked, ...q.filter((x) => !picked.includes(x))]); setI(0); setMsg(`رتبت ${picked.length} مقطع`)
    } catch (e) {
      setMsg((e as Error).message === 'AI_URL_MISSING' ? 'AI غير مفعّل: اضبط VITE_AI_URL' : 'فشل AI. جرب لاحقا.')
    } finally { setBusy(false) }
  }

  const btn = 'glass grid size-12 place-items-center rounded-full text-xl active:scale-95 transition'
  return (
    <main className="mx-auto flex h-full max-w-xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">مشغل هيما</h1>
        <label className="glass cursor-pointer rounded-full px-4 py-2 text-sm">
          إضافة ملفات
          <input type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => add(e.target.files)} />
        </label>
      </header>

      <section className="glass overflow-hidden rounded-3xl">
        <video ref={m} playsInline className={cur?.video ? 'aspect-video w-full bg-black' : 'hidden'}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setD(e.currentTarget.duration)} onEnded={ended} />
        {!cur?.video && (
          <div className="grid aspect-video place-items-center bg-gradient-to-br from-[#8b7cff]/40 to-[#ffb38a]/30">
            <div className={`size-24 rounded-full border-4 border-white/30 ${playing ? 'animate-spin [animation-duration:6s]' : ''}`} style={{ background: 'conic-gradient(#8b7cff,#ffb38a,#8b7cff)' }} />
          </div>
        )}
        <div className="space-y-3 p-4">
          <p className="truncate text-lg font-semibold">{cur?.title ?? 'أضف ملفاتك للبدء'}</p>
          <div dir="ltr" className="space-y-1">
            <input type="range" min={0} max={d || 0} step={0.1} value={t} aria-label="التقدم" onChange={(e) => { if (m.current) m.current.currentTime = +e.target.value }} />
            <div className="flex justify-between text-xs opacity-70"><span>{fmt(t)}</span><span>{fmt(d)}</span></div>
          </div>
          <div dir="ltr" className="flex items-center justify-between">
            <button className={btn} aria-label="عشوائي" style={{ opacity: shuffle ? 1 : .5 }} onClick={() => setShuffle(!shuffle)}>⤮</button>
            <button className={btn} aria-label="السابق" onClick={() => go(i - 1)}>⏮</button>
            <button className={btn + ' !size-16 !bg-[#ffb38a] !text-[#0c1224]'} aria-label={playing ? 'إيقاف' : 'تشغيل'} onClick={toggle}>{playing ? '❚❚' : '▶'}</button>
            <button className={btn} aria-label="التالي" onClick={next}>⏭</button>
            <button className={btn} aria-label="تكرار" style={{ opacity: repeat === 'off' ? .5 : 1 }} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}>{repeat === 'one' ? '↻1' : '↻'}</button>
          </div>
        </div>
      </section>

      <section className="glass flex gap-2 rounded-2xl p-2">
        <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && smart()}
          placeholder="صف المزاج: هادي للدراسة، حماسي للرياضة…" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:opacity-50" />
        <button onClick={smart} disabled={busy} className="rounded-xl bg-[#8b7cff] px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? '…' : 'رتّب بالذكاء'}</button>
      </section>
      {msg && <p className="text-sm opacity-80" role="status">{msg}</p>}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {q.length === 0 && <li className="glass rounded-2xl p-6 text-center opacity-70">القائمة فارغة. اضغط «إضافة ملفات».</li>}
        {q.map((x, k) => (
          <li key={x.id}>
            <button onClick={() => setI(k)} className={`glass flex w-full items-center gap-3 rounded-2xl p-3 text-start ${k === i ? 'ring-2 ring-[#ffb38a]' : ''}`}>
              <span aria-hidden>{x.video ? '🎬' : '🎵'}</span><span className="truncate">{x.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
