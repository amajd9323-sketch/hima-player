import { useEffect, useMemo, useState } from 'react'

type Lang = 'ar' | 'en' | 'pl'

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked or full */ }
}

const DAILY_AR = [
  'صباح الخير يا يارا، يومك أحلى لأنك فيه.',
  'مهما بعدت المسافة، أغنية واحدة تكفي أكون جنبك.',
  'ضحكتك أحلى لحن سمعته في حياتي.',
  'غزة ومصر قريبين قد ما القلب بيقرّب.',
  'لو الأغاني بتتكلم، كانت قالت إني بفكر فيكي.',
  'اسمعي الأغنية دي وافتكريني.',
  'إنتي الحاجة الحلوة في كل يوم عندي.',
  'خدي نفس عميق وابتسمي، أنا فخور بيكي.',
  'أي قائمة تشغيل ناقصة من غيرك.',
  'وحشتيني، والتطبيق ده شاهد.',
  'اليوم ده ليكي، ولو كان صعب فأنا معاكي.',
  'نفسي أسمع معاكي الأغنية دي وإحنا جنب بعض.',
  'إنتي أجمل خبر في يومي.',
  'تصبحي على خير يا أغلى يارا، وأحلام سعيدة.',
]
const DAILY_EN = [
  'Good morning, Yara. My day is better because you are in it.',
  'However far we are, one song is enough to feel close.',
  'Your laugh is the best melody I know.',
  'Gaza and Egypt are as close as the heart wants them to be.',
  'If songs could talk, they would say I am thinking of you.',
  'Listen to this one and remember me.',
  'You are the sweetest part of every day.',
  'Take a deep breath and smile. I am proud of you.',
  'Every playlist is missing something without you.',
  'I miss you, and this app is my witness.',
  'Today is yours, and if it gets hard, I am with you.',
  'I wish we could hear this song side by side.',
  'You are the best news of my day.',
  'Good night, my dearest Yara. Sweet dreams.',
]

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayOfYear = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000)
const dailyLine = (lang: Lang) => {
  const list = lang === 'ar' ? DAILY_AR : DAILY_EN
  return list[dayOfYear() % list.length]
}
const daysBetween = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today - start) / 86400000)
}

const T = {
  ar: {
    morning: 'صباح الخير', day: 'نهارك سعيد', evening: 'مساء الخير', name: 'يا يارا',
    enter: 'ادخلي ♡', from: 'من إبراهيم · غزة ♡ مصر',
    todayTitle: 'رسالة اليوم', since: 'معًا منذ', sinceLabel: 'تاريخ بدايتنا',
    daysTogether: 'يوم معًا', daysLeft: 'يوم ونكون معًا', setDate: 'اختاري تاريخ بدايتنا لنحسب الأيام.',
    clocksTitle: 'الوقت عندنا', gaza: 'غزة', cairo: 'القاهرة', meetTitle: 'العدّ التنازلي للقاء', meetLabel: 'تاريخ لقائنا', meetLeft: 'يوم ونلتقي', meetToday: 'اليوم نلتقي ♡', meetSet: 'اختاري تاريخ اللقاء لنعدّ الأيام.',
    notesTitle: 'ملاحظاتنا', notesHint: 'اكتبي كلمة حلوة، تُحفظ على هذا الهاتف فقط.',
    notePlaceholder: 'اكتبي ملاحظة…', add: 'إضافة', remove: 'حذف الملاحظة', empty: 'لا توجد ملاحظات بعد.',
  },
  en: {
    morning: 'Good morning', day: 'Good day', evening: 'Good evening', name: 'Yara',
    enter: 'Come in ♡', from: 'From Ibrahim · Gaza ♡ Egypt',
    todayTitle: "Today's note", since: 'Together since', sinceLabel: 'Our start date',
    daysTogether: 'days together', daysLeft: 'days until we are together', setDate: 'Pick our start date to count the days.',
    clocksTitle: 'Time on our side', gaza: 'Gaza', cairo: 'Cairo', meetTitle: 'Countdown to meeting', meetLabel: 'Our meeting date', meetLeft: 'days until we meet', meetToday: 'We meet today ♡', meetSet: 'Pick the meeting date to count the days.',
    notesTitle: 'Our notes', notesHint: 'Write something sweet. Saved on this phone only.',
    notePlaceholder: 'Write a note…', add: 'Add', remove: 'Delete note', empty: 'No notes yet.',
  },
} as const

const copyFor = (lang: Lang) => (lang === 'ar' ? T.ar : T.en)

export function YaraWelcome({ language }: { language: Lang }) {
  const t = copyFor(language)
  const [open, setOpen] = useState<boolean>(() => read<string>('hema_yara_welcome_day', '') !== dayKey())
  const hearts = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 0.7) % 8, size: 14 + ((i * 5) % 16) })), [])
  if (!open) return null
  const hour = new Date().getHours()
  const hello = hour < 12 ? t.morning : hour < 18 ? t.day : t.evening
  const close = () => { write('hema_yara_welcome_day', dayKey()); setOpen(false) }
  return (
    <div className="yara-welcome" role="dialog" aria-modal="true" aria-label={`${hello} ${t.name}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {hearts.map((h, i) => <span key={i} aria-hidden="true" className="yara-heart" style={{ left: `${h.left}%`, animationDelay: `${h.delay}s`, fontSize: h.size }}>♡</span>)}
      <div className="yara-welcome-card">
        <p className="yara-welcome-from">{t.from}</p>
        <h1 className="yara-welcome-title">{hello}<br /><span>{t.name}</span></h1>
        <p className="yara-welcome-line">{dailyLine(language)}</p>
        <button type="button" autoFocus onClick={close} className="yara-welcome-btn">{t.enter}</button>
      </div>
    </div>
  )
}

const clockText = (zone: string, lang: Lang) => {
  try { return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(new Date()) } catch { return '--:--' }
}

type Note = { id: string; text: string; at: number }

export function YaraExtras({ language, notify }: { language: Lang; notify: (text: string) => void }) {
  const t = copyFor(language)
  const [since, setSince] = useState<string>(() => read<string>('hema_yara_since', ''))
  const [notes, setNotes] = useState<Note[]>(() => read<Note[]>('hema_yara_notes', []))
  const [draft, setDraft] = useState('')
  const [meet, setMeet] = useState<string>(() => read<string>('hema_yara_meet', ''))
  const [, setTick] = useState(0)
  useEffect(() => { write('hema_yara_meet', meet) }, [meet])
  useEffect(() => { const id = window.setInterval(() => setTick((n) => n + 1), 30000); return () => window.clearInterval(id) }, [])
  const meetLeft = meet ? daysBetween(meet) : null
  useEffect(() => { write('hema_yara_since', since) }, [since])
  useEffect(() => { write('hema_yara_notes', notes) }, [notes])
  const diff = since ? daysBetween(since) : null

  const addNote = () => {
    const text = draft.trim().slice(0, 240)
    if (!text) return
    if (notes.length >= 60) { notify(language === 'ar' ? 'وصلتِ للحد الأقصى: 60 ملاحظة.' : 'Limit reached: 60 notes.'); return }
    setNotes((old) => [{ id: `${Date.now()}-${old.length}`, text, at: Date.now() }, ...old])
    setDraft('')
  }

  return (
    <>
      <section className="yara-card yara-daily" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <p className="yara-eyebrow">{t.todayTitle}</p>
        <p className="yara-daily-text">{dailyLine(language)}</p>
        <div className="yara-since">
          {diff !== null ? (
            <div className="yara-since-count"><strong>{Math.abs(diff)}</strong><span>{diff >= 0 ? t.daysTogether : t.daysLeft}</span></div>
          ) : <p className="yara-muted">{t.setDate}</p>}
          <label className="yara-since-field"><span>{t.sinceLabel}</span>
            <input type="date" value={since} max="2100-12-31" onChange={(e) => setSince(e.target.value)} />
          </label>
        </div>
      </section>
      <section className="yara-card" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <p className="yara-eyebrow">{t.clocksTitle}</p>
        <div className="yara-clocks">
          <div><span>🇵🇸 {t.gaza}</span><strong>{clockText('Asia/Gaza', language)}</strong></div>
          <div><span>🇪🇬 {t.cairo}</span><strong>{clockText('Africa/Cairo', language)}</strong></div>
        </div>
      </section>
      <section className="yara-card" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <p className="yara-eyebrow">{t.meetTitle}</p>
        <div className="yara-since">
          {meetLeft !== null ? (
            meetLeft === 0 ? <div className="yara-since-count"><strong>♡</strong><span>{t.meetToday}</span></div>
              : meetLeft < 0 ? <div className="yara-since-count"><strong>{Math.abs(meetLeft)}</strong><span>{t.meetLeft}</span></div>
                : <p className="yara-muted">{meet}</p>
          ) : <p className="yara-muted">{t.meetSet}</p>}
          <label className="yara-since-field"><span>{t.meetLabel}</span>
            <input type="date" value={meet} max="2100-12-31" onChange={(e) => setMeet(e.target.value)} />
          </label>
        </div>
      </section>
      <section className="yara-card" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <p className="yara-eyebrow">{t.notesTitle}</p>
        <p className="yara-muted">{t.notesHint}</p>
        <div className="yara-note-form">
          <input value={draft} maxLength={240} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote() }} placeholder={t.notePlaceholder} />
          <button type="button" onClick={addNote}>{t.add}</button>
        </div>
        {notes.length === 0 ? <p className="yara-muted">{t.empty}</p> : (
          <ul className="yara-notes">
            {notes.slice(0, 30).map((n) => (
              <li key={n.id}>
                <span>{n.text}</span>
                <button type="button" aria-label={t.remove} title={t.remove} onClick={() => setNotes((old) => old.filter((x) => x.id !== n.id))}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
