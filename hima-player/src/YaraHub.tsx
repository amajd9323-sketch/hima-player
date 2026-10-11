import { useEffect, useRef, useState } from 'react'
import { YaraExtras } from './YaraExtras'
import { allBlobs, delBlob, getBlob, putBlob, shareOrSave, shrinkImage, type YaraBlob } from './yaraStore'

type Lang = 'ar' | 'en' | 'pl'
type TrackLite = { id: string; title: string; artist?: string; video: boolean }
type Props = { language: Lang; notify: (text: string) => void; tracks: TrackLite[] }

const S = {
  ar: {
    tabs: { home: 'الرئيسية', voice: 'صوتياتنا', memories: 'ذكرياتنا', locked: 'رسائل مقفلة', gift: 'هدية أغنية', look: 'مظهري' },
    storeFail: 'تعذر الحفظ على هذا الهاتف.',
    voiceTitle: 'رسائل صوتية', voiceHint: 'سجّلي صوتك (حتى دقيقتين)، واسمعيه هنا أو شاركيه عبر واتساب أو أي تطبيق.',
    rec: '● تسجيل', stop: '■ إيقاف', share: 'مشاركة', del: 'حذف', noMic: 'الميكروفون غير متاح على هذا الجهاز.', micDenied: 'لم يُسمح بالميكروفون. فعّليه من إعدادات التطبيق.',
    voiceEmpty: 'لا توجد رسائل صوتية بعد.', voiceShare: 'رسالة صوتية من HEMA YARA PLAYER',
    memTitle: 'خط ذكرياتنا', memHint: 'لحظة + تاريخ + صورة + أغنية. تُحفظ على هذا الهاتف فقط.', memDate: 'التاريخ', memName: 'عنوان الذكرى', memText: 'اكتبي التفاصيل…', memSong: 'أغنية الذكرى (اختياري)', memNoSong: 'بدون أغنية', memPhoto: 'إضافة صورة', memAdd: 'حفظ الذكرى', memEmpty: 'لا توجد ذكريات بعد.', memNeed: 'اكتبي عنوانًا للذكرى.',
    lockTitle: 'رسائل مقفلة', lockHint: 'اكتبي رسالة وحدّدي يوم فتحها. هذا قفل شكلي بالتاريخ وليس تشفيرًا.', lockText: 'اكتبي الرسالة…', lockDate: 'تُفتح في', lockAdd: 'قفل الرسالة', lockLeft: 'تُفتح بعد', lockDays: 'يوم', lockOpen: 'مفتوحة', lockEmpty: 'لا توجد رسائل مقفلة.', lockNeed: 'اكتبي رسالة واختاري تاريخًا قادمًا.',
    giftTitle: 'هدية أغنية', giftHint: 'اختاري أغنية وكلمة، وسأصنع بطاقة جميلة تشاركينها.', giftSong: 'الأغنية', giftNote: 'كلمتك…', giftFrom: 'من', giftTo: 'إلى', giftMake: 'اصنعي البطاقة', giftShare: 'مشاركة البطاقة', giftNone: 'أضيفي أغاني إلى المكتبة أولًا.', giftTagline: 'أغنية لكِ ♡',
    lookTitle: 'مظهري', lookHint: 'ضعي صورة خلفية للتطبيق. تُحفظ على هذا الهاتف فقط.', lookPick: 'اختيار صورة', lookRemove: 'إزالة الخلفية', lookNone: 'لا توجد خلفية.',
  },
  en: {
    tabs: { home: 'Home', voice: 'Voice', memories: 'Memories', locked: 'Locked', gift: 'Song gift', look: 'Look' },
    storeFail: 'Could not save on this phone.',
    voiceTitle: 'Voice messages', voiceHint: 'Record your voice (up to 2 minutes), play it here, or share it through WhatsApp or any app.',
    rec: '● Record', stop: '■ Stop', share: 'Share', del: 'Delete', noMic: 'Microphone is not available on this device.', micDenied: 'Microphone was not allowed. Enable it in the app settings.',
    voiceEmpty: 'No voice messages yet.', voiceShare: 'Voice message from HEMA YARA PLAYER',
    memTitle: 'Our memories', memHint: 'A moment + a date + a photo + a song. Saved on this phone only.', memDate: 'Date', memName: 'Memory title', memText: 'Write the details…', memSong: 'Memory song (optional)', memNoSong: 'No song', memPhoto: 'Add photo', memAdd: 'Save memory', memEmpty: 'No memories yet.', memNeed: 'Write a title for the memory.',
    lockTitle: 'Locked messages', lockHint: 'Write a message and choose when it opens. This is a date lock, not encryption.', lockText: 'Write the message…', lockDate: 'Opens on', lockAdd: 'Lock message', lockLeft: 'Opens in', lockDays: 'days', lockOpen: 'Open', lockEmpty: 'No locked messages.', lockNeed: 'Write a message and pick a future date.',
    giftTitle: 'Song gift', giftHint: 'Pick a song and a note, and I will make a pretty card to share.', giftSong: 'Song', giftNote: 'Your note…', giftFrom: 'From', giftTo: 'To', giftMake: 'Make the card', giftShare: 'Share card', giftNone: 'Add songs to the library first.', giftTagline: 'A song for you ♡',
    lookTitle: 'Look', lookHint: 'Set a photo as the app background. Saved on this phone only.', lookPick: 'Choose photo', lookRemove: 'Remove background', lookNone: 'No background set.',
  },
} as const

const read = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : (JSON.parse(raw) as T) } catch { return fallback }
}
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* blocked or full */ } }
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const daysFromToday = (iso: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return 0
  const now = new Date()
  return Math.round((Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const useBlobUrl = (blob?: Blob | null) => {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!blob) { setUrl(''); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

type Texts = (typeof S)['ar'] | (typeof S)['en']
type PanelProps = { language: Lang; t: Texts; notify: (text: string) => void }

/* ------------------------------- Voice ------------------------------- */
function VoiceItem({ item, t, onShare, onDelete }: { item: YaraBlob; t: Texts; onShare: () => void; onDelete: () => void }) {
  const url = useBlobUrl(item.blob)
  return (
    <li className="yara-voice-item">
      <audio controls preload="none" src={url} />
      <div className="yara-row">
        <span className="yara-muted">{new Date(item.at).toLocaleString()}{item.dur ? ` · ${mmss(item.dur)}` : ''}</span>
        <button type="button" onClick={onShare}>{t.share}</button>
        <button type="button" onClick={onDelete} aria-label={t.del}>{t.del}</button>
      </div>
    </li>
  )
}

function VoicePanel({ t, notify }: PanelProps) {
  const [items, setItems] = useState<YaraBlob[]>([])
  const [rec, setRec] = useState(false)
  const [secs, setSecs] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const secsRef = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const refresh = async () => { try { setItems((await allBlobs('voice')).sort((a, b) => b.at - a.at)) } catch { notify(t.storeFail) } }
  useEffect(() => {
    void refresh()
    return () => { window.clearInterval(timer.current); if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop() }
  }, [])
  const stop = () => {
    window.clearInterval(timer.current)
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
    setRec(false)
  }
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { notify(t.noMic); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((x) => MediaRecorder.isTypeSupported(x))
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      r.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
        if (blob.size > 0) {
          try { await putBlob({ id: `voice-${Date.now()}`, kind: 'voice', at: Date.now(), blob, dur: secsRef.current }); await refresh() } catch { notify(t.storeFail) }
        }
      }
      r.start()
      recorder.current = r
      secsRef.current = 0; setSecs(0); setRec(true)
      timer.current = window.setInterval(() => {
        secsRef.current += 1; setSecs(secsRef.current)
        if (secsRef.current >= 120) stop()
      }, 1000)
    } catch { notify(t.micDenied) }
  }
  return (
    <section className="yara-card">
      <p className="yara-eyebrow">{t.voiceTitle}</p>
      <p className="yara-muted">{t.voiceHint}</p>
      <button type="button" className={'yara-rec' + (rec ? ' is-on' : '')} onClick={() => { if (rec) stop(); else void start() }}>
        {rec ? `${t.stop} · ${mmss(secs)}` : t.rec}
      </button>
      {items.length === 0 ? <p className="yara-muted">{t.voiceEmpty}</p> : (
        <ul className="yara-list">
          {items.map((it) => (
            <VoiceItem key={it.id} item={it} t={t}
              onShare={() => { void shareOrSave(it.blob, `yara-voice.${it.blob.type.includes('mp4') ? 'm4a' : 'webm'}`, t.voiceShare) }}
              onDelete={() => { void delBlob(it.id).then(refresh).catch(() => notify(t.storeFail)) }} />
          ))}
        </ul>
      )}
    </section>
  )
}

/* ----------------------------- Memories ----------------------------- */
type Memory = { id: string; date: string; title: string; text: string; trackId?: string; photoId?: string }

function MemoryPhoto({ id }: { id: string }) {
  const [blob, setBlob] = useState<Blob | null>(null)
  useEffect(() => { let on = true; void getBlob(id).then((r) => { if (on) setBlob(r?.blob ?? null) }).catch(() => {}); return () => { on = false } }, [id])
  const url = useBlobUrl(blob)
  return url ? <img className="yara-photo" src={url} alt="" loading="lazy" /> : null
}

function MemoriesPanel({ t, notify, tracks }: PanelProps & { tracks: TrackLite[] }) {
  const [items, setItems] = useState<Memory[]>(() => read<Memory[]>('hema_yara_memories', []))
  const [date, setDate] = useState(todayIso())
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [trackId, setTrackId] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  useEffect(() => { write('hema_yara_memories', items) }, [items])
  const audio = tracks.filter((x) => !x.video).slice(0, 300)
  const add = async () => {
    const name = title.trim().slice(0, 80)
    if (!name) { notify(t.memNeed); return }
    let photoId: string | undefined
    if (photo) {
      try { photoId = `photo-${Date.now()}`; await putBlob({ id: photoId, kind: 'photo', at: Date.now(), blob: await shrinkImage(photo) }) } catch { photoId = undefined; notify(t.storeFail) }
    }
    setItems((old) => [{ id: `${Date.now()}-${old.length}`, date, title: name, text: text.trim().slice(0, 600), trackId: trackId || undefined, photoId }, ...old].slice(0, 200))
    setTitle(''); setText(''); setTrackId(''); setPhoto(null)
  }
  const remove = (m: Memory) => { if (m.photoId) void delBlob(m.photoId).catch(() => {}); setItems((old) => old.filter((x) => x.id !== m.id)) }
  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1))
  return (
    <section className="yara-card">
      <p className="yara-eyebrow">{t.memTitle}</p>
      <p className="yara-muted">{t.memHint}</p>
      <div className="yara-form">
        <input type="date" value={date} aria-label={t.memDate} onChange={(e) => setDate(e.target.value)} />
        <input value={title} maxLength={80} placeholder={t.memName} onChange={(e) => setTitle(e.target.value)} />
        <textarea value={text} maxLength={600} rows={3} placeholder={t.memText} onChange={(e) => setText(e.target.value)} />
        <select value={trackId} aria-label={t.memSong} onChange={(e) => setTrackId(e.target.value)}>
          <option value="">{t.memNoSong}</option>
          {audio.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select>
        <label className="yara-file">{photo ? photo.name : t.memPhoto}<input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
        <button type="button" className="yara-primary" onClick={() => { void add() }}>{t.memAdd}</button>
      </div>
      {sorted.length === 0 ? <p className="yara-muted">{t.memEmpty}</p> : (
        <ul className="yara-timeline">
          {sorted.map((m) => {
            const song = m.trackId ? tracks.find((x) => x.id === m.trackId) : undefined
            return (
              <li key={m.id}>
                <time>{m.date}</time>
                <strong>{m.title}</strong>
                {m.photoId && <MemoryPhoto id={m.photoId} />}
                {m.text && <p>{m.text}</p>}
                {song && <span className="yara-chip">♫ {song.title}</span>}
                <button type="button" aria-label={t.del} title={t.del} onClick={() => remove(m)}>✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------ Locked ------------------------------ */
type Locked = { id: string; text: string; unlock: string }

function LockedPanel({ t, notify }: PanelProps) {
  const [items, setItems] = useState<Locked[]>(() => read<Locked[]>('hema_yara_locked', []))
  const [text, setText] = useState('')
  const [unlock, setUnlock] = useState('')
  useEffect(() => { write('hema_yara_locked', items) }, [items])
  const add = () => {
    const body = text.trim().slice(0, 800)
    if (!body || !unlock || daysFromToday(unlock) < 1) { notify(t.lockNeed); return }
    setItems((old) => [{ id: `${Date.now()}-${old.length}`, text: body, unlock }, ...old].slice(0, 80))
    setText(''); setUnlock('')
  }
  const sorted = [...items].sort((a, b) => (a.unlock < b.unlock ? -1 : 1))
  return (
    <section className="yara-card">
      <p className="yara-eyebrow">{t.lockTitle}</p>
      <p className="yara-muted">{t.lockHint}</p>
      <div className="yara-form">
        <textarea value={text} maxLength={800} rows={3} placeholder={t.lockText} onChange={(e) => setText(e.target.value)} />
        <label className="yara-inline"><span>{t.lockDate}</span><input type="date" value={unlock} min={todayIso()} onChange={(e) => setUnlock(e.target.value)} /></label>
        <button type="button" className="yara-primary" onClick={add}>{t.lockAdd}</button>
      </div>
      {sorted.length === 0 ? <p className="yara-muted">{t.lockEmpty}</p> : (
        <ul className="yara-list">
          {sorted.map((m) => {
            const left = daysFromToday(m.unlock)
            return (
              <li key={m.id} className={'yara-lock' + (left > 0 ? ' is-locked' : '')}>
                {left > 0
                  ? <p><span aria-hidden="true">🔒</span> {t.lockLeft} {left} {t.lockDays} · {m.unlock}</p>
                  : <><p className="yara-muted"><span aria-hidden="true">💌</span> {t.lockOpen} · {m.unlock}</p><p className="yara-lock-text">{m.text}</p></>}
                <button type="button" aria-label={t.del} title={t.del} onClick={() => setItems((old) => old.filter((x) => x.id !== m.id))}>✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------- Gift ------------------------------- */
const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) => {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w } else cur = test
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, '')}…` }
  return lines
}

const renderCard = async (o: { title: string; artist: string; note: string; from: string; to: string; tagline: string; rtl: boolean }): Promise<Blob | null> => {
  try { await document.fonts?.load('700 40px "Readex Pro"') } catch { /* font optional */ }
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2a1220'); g.addColorStop(1, '#050406')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.8, 120, 20, W * 0.8, 120, 700); glow.addColorStop(0, 'rgba(255,92,141,.45)'); glow.addColorStop(1, 'rgba(255,92,141,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'; ctx.direction = o.rtl ? 'rtl' : 'ltr'
  ctx.fillStyle = 'rgba(255,92,141,.18)'
  for (let i = 0; i < 16; i++) { ctx.font = `${40 + (i * 13) % 50}px sans-serif`; ctx.fillText('♡', (i * 173) % W, (i * 331) % H) }
  ctx.strokeStyle = 'rgba(242,194,107,.55)'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.roundRect(40, 40, W - 80, H - 80, 56); ctx.stroke()
  const font = (px: number, w = 600) => `${w} ${px}px "Readex Pro", system-ui, sans-serif`
  ctx.fillStyle = '#f2c26b'; ctx.font = font(46, 700)
  ctx.fillText(`${o.from}  ♡  ${o.to}`, W / 2, 190)
  ctx.fillStyle = '#ff5c8d'; ctx.font = font(170, 700); ctx.fillText('♫', W / 2, 420)
  ctx.fillStyle = '#fff5f1'; ctx.font = font(76, 700)
  let y = 560
  for (const line of wrapLines(ctx, o.title, W - 220, 3)) { ctx.fillText(line, W / 2, y); y += 100 }
  if (o.artist) { ctx.fillStyle = '#bba9b2'; ctx.font = font(44, 500); ctx.fillText(o.artist.slice(0, 50), W / 2, y + 10); y += 80 }
  if (o.note) {
    ctx.fillStyle = '#fff5f1'; ctx.font = font(52, 500); y += 50
    for (const line of wrapLines(ctx, o.note, W - 240, 5)) { ctx.fillText(line, W / 2, y); y += 78 }
  }
  ctx.fillStyle = '#f2c26b'; ctx.font = font(34, 600); ctx.fillText(o.tagline, W / 2, H - 150)
  ctx.fillStyle = 'rgba(255,245,241,.6)'; ctx.font = font(30, 500); ctx.fillText('HEMA YARA PLAYER', W / 2, H - 95)
  return new Promise((res) => c.toBlob(res, 'image/png'))
}

function GiftPanel({ language, t, notify, tracks }: PanelProps & { tracks: TrackLite[] }) {
  const audio = tracks.filter((x) => !x.video).slice(0, 300)
  const [songId, setSongId] = useState('')
  const [note, setNote] = useState('')
  const [from, setFrom] = useState<string>(() => read('hema_yara_from', language === 'ar' ? 'إبراهيم' : 'Ibrahim'))
  const [to, setTo] = useState<string>(() => read('hema_yara_to', language === 'ar' ? 'يارا' : 'Yara'))
  const [card, setCard] = useState<Blob | null>(null)
  const url = useBlobUrl(card)
  useEffect(() => { write('hema_yara_from', from); write('hema_yara_to', to) }, [from, to])
  const song = audio.find((x) => x.id === songId) ?? audio[0]
  const make = async () => {
    if (!song) { notify(t.giftNone); return }
    const blob = await renderCard({ title: song.title, artist: song.artist ?? '', note: note.trim().slice(0, 160), from: from.trim().slice(0, 24), to: to.trim().slice(0, 24), tagline: t.giftTagline, rtl: language === 'ar' })
    if (blob) setCard(blob); else notify(t.storeFail)
  }
  return (
    <section className="yara-card">
      <p className="yara-eyebrow">{t.giftTitle}</p>
      <p className="yara-muted">{t.giftHint}</p>
      {audio.length === 0 ? <p className="yara-muted">{t.giftNone}</p> : (
        <div className="yara-form">
          <select value={song?.id ?? ''} aria-label={t.giftSong} onChange={(e) => { setSongId(e.target.value); setCard(null) }}>
            {audio.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
          <textarea value={note} maxLength={160} rows={2} placeholder={t.giftNote} onChange={(e) => { setNote(e.target.value); setCard(null) }} />
          <div className="yara-row">
            <input value={from} maxLength={24} aria-label={t.giftFrom} onChange={(e) => { setFrom(e.target.value); setCard(null) }} />
            <span aria-hidden="true">♡</span>
            <input value={to} maxLength={24} aria-label={t.giftTo} onChange={(e) => { setTo(e.target.value); setCard(null) }} />
          </div>
          <button type="button" className="yara-primary" onClick={() => { void make() }}>{t.giftMake}</button>
        </div>
      )}
      {url && (
        <>
          <img className="yara-card-preview" src={url} alt={song?.title ?? ''} />
          <button type="button" className="yara-primary" onClick={() => { if (card) void shareOrSave(card, 'yara-song-gift.png', `${song?.title ?? ''} ♡`) }}>{t.giftShare}</button>
        </>
      )}
    </section>
  )
}

/* ------------------------------- Look ------------------------------- */
function LookPanel({ t, notify }: PanelProps) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const url = useBlobUrl(blob)
  useEffect(() => { let on = true; void getBlob('bg-main').then((r) => { if (on) setBlob(r?.blob ?? null) }).catch(() => {}); return () => { on = false } }, [])
  const pick = async (file?: File) => {
    if (!file) return
    try {
      const small = await shrinkImage(file, 1600)
      await putBlob({ id: 'bg-main', kind: 'bg', at: Date.now(), blob: small })
      setBlob(small); window.dispatchEvent(new Event('yara-bg-changed'))
    } catch { notify(t.storeFail) }
  }
  const clear = async () => { try { await delBlob('bg-main'); setBlob(null); window.dispatchEvent(new Event('yara-bg-changed')) } catch { notify(t.storeFail) } }
  return (
    <section className="yara-card">
      <p className="yara-eyebrow">{t.lookTitle}</p>
      <p className="yara-muted">{t.lookHint}</p>
      {url ? <img className="yara-card-preview" src={url} alt="" /> : <p className="yara-muted">{t.lookNone}</p>}
      <div className="yara-row">
        <label className="yara-file">{t.lookPick}<input type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.currentTarget.value = '' }} /></label>
        {blob && <button type="button" onClick={() => { void clear() }}>{t.lookRemove}</button>}
      </div>
    </section>
  )
}

/* ------------------------------- Hub ------------------------------- */
type TabKey = keyof (typeof S)['ar']['tabs']
const TAB_KEYS: TabKey[] = ['home', 'voice', 'memories', 'locked', 'gift', 'look']

export function YaraHub({ language, notify, tracks }: Props) {
  const t: Texts = language === 'ar' ? S.ar : S.en
  const [tab, setTab] = useState<TabKey>('home')
  const dir = language === 'ar' ? 'rtl' : 'ltr'
  return (
    <div className="yara-hub" dir={dir}>
      <div className="yara-tabs" role="tablist">
        {TAB_KEYS.map((k) => <button key={k} type="button" role="tab" className="yara-tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t.tabs[k]}</button>)}
      </div>
      {tab === 'home' && <YaraExtras language={language} notify={notify} />}
      {tab === 'voice' && <VoicePanel language={language} t={t} notify={notify} />}
      {tab === 'memories' && <MemoriesPanel language={language} t={t} notify={notify} tracks={tracks} />}
      {tab === 'locked' && <LockedPanel language={language} t={t} notify={notify} />}
      {tab === 'gift' && <GiftPanel language={language} t={t} notify={notify} tracks={tracks} />}
      {tab === 'look' && <LookPanel language={language} t={t} notify={notify} />}
    </div>
  )
}

/** Applies the saved photo background; mounted once at the app root. */
export function YaraBackground() {
  useEffect(() => {
    let url = ''
    const apply = async () => {
      try {
        const rec = await getBlob('bg-main')
        if (url) { URL.revokeObjectURL(url); url = '' }
        if (rec) {
          url = URL.createObjectURL(rec.blob)
          document.body.style.setProperty('--yara-bg', `url("${url}")`)
          document.body.classList.add('yara-has-bg')
        } else {
          document.body.style.removeProperty('--yara-bg')
          document.body.classList.remove('yara-has-bg')
        }
      } catch { /* storage blocked */ }
    }
    void apply()
    window.addEventListener('yara-bg-changed', apply)
    return () => { window.removeEventListener('yara-bg-changed', apply); if (url) URL.revokeObjectURL(url) }
  }, [])
  return null
}
