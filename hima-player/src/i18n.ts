export type Language = 'ar' | 'en' | 'pl'

type Pair = readonly [string, string]
const strings: Record<string, Pair> = {
  'الإعدادات': ['Settings','Ustawienia'],
  'اللون': ['Accent color','Kolor akcentu'],
  'الترتيب': ['Sort by','Sortuj według'],
  'الأحدث': ['Newest','Najnowsze'],
  'الاسم': ['Name','Nazwa'],
  'المدة': ['Duration','Czas trwania'],
  'الحجم': ['Size','Rozmiar'],
  'الفيديوهات': ['Videos','Wideo'],
  'الأغاني': ['Music','Muzyka'],
  'الطابور': ['Queue','Kolejka'],
  'الطابور · ': ['Queue · ','Kolejka · '],
  'الأكثر تشغيلًا': ['Most played','Najczęściej odtwarzane'],
  'القوائم': ['Playlists','Playlisty'],
  'المجلدات': ['Folders','Foldery'],
  'المفضلة': ['Favorites','Ulubione'],
  'الأخيرة': ['Recently played','Ostatnio odtwarzane'],
  'الأخيرة ': ['Recently played ','Ostatnio odtwarzane '],
  'ذكاء': ['AI DJ','DJ AI'],
  'يوتيوب / تيك توك': ['YouTube / TikTok','YouTube / TikTok'],
  'بحث': ['Search','Szukaj'],
  'إغلاق': ['Close','Zamknij'],
  'رجوع': ['Back','Wstecz'],
  'تحديث': ['Refresh','Odśwież'],
  'إضافة ملفات': ['Add media','Dodaj multimedia'],
  'فارغ. اضغط + لإضافة ملفات.': ['Library is empty. Tap + to add media.','Biblioteka jest pusta. Dotknij +, aby dodać pliki.'],
  'إعادة مسح الملفات': ['Rescan media','Przeskanuj multimedia ponownie'],
  'انتقال بين الأغاني': ['Track crossfade','Przenikanie utworów'],
  'إيقاف': ['Off','Wył.'],
  'الترجمة': ['Subtitles','Napisy'],
  'لون الترجمة': ['Subtitle color','Kolor napisów'],
  'الصوت والتحكم': ['Audio & controls','Dźwięk i sterowanie'],
  'رفع الصوت': ['Volume boost','Wzmocnienie głośności'],
  'هز = التالي': ['Shake to skip','Potrząśnij, aby pominąć'],
  'وضع القرآن (يكمل كل مقطع)': ['Quran mode (finish each track)','Tryb Koranu (dokończ każdy utwór)'],
  'وضع الكتب الصوتية': ['Audiobook mode','Tryb audiobooków'],
  'تعزيز الجهير': ['Bass boost','Wzmocnienie basów'],
  'صدى محيطي': ['Spatial sound','Dźwięk przestrzenny'],
  'إيقاف وقت الأذان': ['Pause for adhan','Wstrzymaj na czas adhan'],
  'ملخصي Hema Wrapped': ['My HEMA Wrapped','Moje HEMA Wrapped'],
  'إدارة المكتبة': ['Library management','Zarządzanie biblioteką'],
  'إدارة طابور التشغيل': ['Manage playback queue','Zarządzaj kolejką odtwarzania'],
  'خزنة خاصة مشفّرة': ['Encrypted private vault','Szyfrowany sejf prywatny'],
  'فحص الملفات المكررة SHA-256': ['Find duplicate files (SHA-256)','Znajdź duplikaty (SHA-256)'],
  'مجموعات مكررة:': ['Duplicate groups:','Grupy duplikatów:'],
  'لم نعثر على تكرار حسب الاسم والفنان.': ['No duplicates found by title and artist.','Nie znaleziono duplikatów według tytułu i wykonawcy.'],
  'فيديو': ['Video','Wideo'],
  'صوت': ['Audio','Audio'],
  'استيراد قائمة HEMA': ['Import HEMA playlist','Importuj playlistę HEMA'],
  'توازن الصوت تلقائيًا': ['Automatic volume leveling','Automatyczne wyrównywanie głośności'],
  'تصدير نسخة احتياطية': ['Export backup','Eksportuj kopię zapasową'],
  'استيراد نسخة احتياطية': ['Import backup','Importuj kopię zapasową'],
  'حفظ': ['Save','Zapisz'],
  'رجوع 10 ثواني': ['Back 10 seconds','Cofnij o 10 sekund'],
  'تقديم 10 ثواني': ['Forward 10 seconds','Przewiń o 10 sekund'],
  'السابق': ['Previous','Poprzedni'],
  'التالي': ['Next','Następny'],
  'تشغيل': ['Play','Odtwórz'],
  'إيقاف مؤقت': ['Pause','Wstrzymaj'],
  'عشوائي': ['Shuffle','Losowo'],
  'تكرار': ['Repeat','Powtarzaj'],
  'مفضلة': ['Favorite','Ulubione'],
  'قائمة': ['Playlist','Playlista'],
  'تشغيل بعد الحالي': ['Play next','Odtwórz jako następny'],
  'إضافة إلى قائمة': ['Add to playlist','Dodaj do playlisty'],
  'قائمة جديدة': ['New playlist','Nowa playlista'],
  'أضف إلى قائمة': ['Add to playlist','Dodaj do playlisty'],
  'تحميل كلمات LRC': ['Load LRC lyrics','Wczytaj tekst LRC'],
  'منبه نوم': ['Sleep timer','Wyłącznik czasowy'],
  'موازن صوت': ['Equalizer','Korektor dźwięku'],
  'قيادة': ['Car mode','Tryb samochodowy'],
  'خروج': ['Exit','Wyjdź'],
  'تم': ['Done','Gotowe'],
  'عادي': ['Normal','Normalny'],
  'باس': ['Bass','Bas'],
  'روك': ['Rock','Rock'],
  'ناعم': ['Soft','Łagodny'],
  'مخصص': ['Custom','Własny'],
  'فيديوهات': ['Videos','Wideo'],
  'اغاني': ['Songs','Utwory'],
  'اسم المقطع': ['Track title','Tytuł utworu'],
  'اسم الفنان': ['Artist name','Nazwa wykonawcy'],
  'اسم الفنان / الوصف': ['Artist / description','Wykonawca / opis'],
  'تعديل بيانات العرض': ['Edit display metadata','Edytuj metadane'],
  'اختيار غلاف من الصور': ['Choose cover image','Wybierz okładkę'],
  'إرجاع الأصل': ['Restore original','Przywróć oryginał'],
  'الفنان / الوصف': ['Artist / description','Wykonawca / opis'],
  'تحميل ملف وسائط مباشر': ['Download direct media file','Pobierz bezpośredni plik multimedialny'],
  'تنزيل ملف وسائط مباشر': ['Download direct media file','Pobierz bezpośredni plik multimedialny'],
  'تنزيل إلى الهاتف': ['Download to phone','Pobierz na telefon'],
  'أدخل رابط HTTPS مباشر لملف MP4 أو MP3.': ['Enter a direct HTTPS URL for an MP4 or MP3 file.','Wpisz bezpośredni adres HTTPS pliku MP4 lub MP3.'],
  'رابط مباشر لملف MP4 أو MP3': ['Direct MP4 or MP3 URL','Bezpośredni adres MP4 lub MP3'],
  'YouTube و TikTok': ['YouTube & TikTok','YouTube i TikTok'],
  'HEMA ONLINE': ['HEMA ONLINE','HEMA ONLINE'],
  'الصق رابط فيديو أولًا.': ['Paste a video link first.','Najpierw wklej link do filmu.'],
  'الرابط غير صالح. تأكد من نسخه كاملًا.': ['Invalid link. Make sure you copied the full URL.','Nieprawidłowy link. Upewnij się, że skopiowano cały adres.'],
  'استخدم رابط HTTP أو HTTPS فقط.': ['Use an HTTP or HTTPS URL only.','Użyj wyłącznie adresu HTTP lub HTTPS.'],
  'الرابط غير مدعوم. استخدم رابط YouTube أو TikTok.': ['Unsupported link. Use a YouTube or TikTok link.','Nieobsługiwany link. Użyj linku YouTube lub TikTok.'],
  'انحفظ الرابط محليًا داخل HEMA.': ['Link saved locally in HEMA.','Link zapisany lokalnie w HEMA.'],
  'أُزيل من المفضلة.': ['Removed from favorites.','Usunięto z ulubionych.'],
  'أُضيف للمفضلة وحُفظ في المكتبة.': ['Added to favorites and library.','Dodano do ulubionych i biblioteki.'],
  'أُضيف للطابور.': ['Added to queue.','Dodano do kolejki.'],
  'طابور الروابط فارغ. أضف فيديو بزر الطابور.': ['Link queue is empty. Add a video to the queue.','Kolejka linków jest pusta. Dodaj film do kolejki.'],
  'لا يوجد فيديو سابق في السجل.': ['No previous video in history.','Brak poprzedniego filmu w historii.'],
  'نُسخ الرابط. شاركه في أي تطبيق.': ['Link copied. Share it in any app.','Link skopiowany. Udostępnij go w dowolnej aplikacji.'],
  'تعذرت المشاركة من هذا الجهاز.': ['Sharing is unavailable on this device.','Udostępnianie jest niedostępne na tym urządzeniu.'],
  'فشل تشغيل فيديو TikTok. افتحه على المنصة؛ ربما حُذف أو قيّد التضمين.': ['TikTok playback failed. Open it in TikTok; the post may be deleted or embedding blocked.','Nie udało się odtworzyć TikToka. Otwórz go w TikToku; film może być usunięty lub blokować osadzanie.'],
  'فشل تضمين YouTube. افتح الفيديو على المنصة؛ قد يمنع صاحبه التضمين.': ['Could not embed YouTube. Open it on YouTube; the owner may block embedding.','Nie można osadzić YouTube. Otwórz film w YouTube; właściciel mógł zablokować osadzanie.'],
  'التنزيل بدأ. ستظهر النتيجة في إشعارات الهاتف.': ['Download started. Check your phone notifications for progress.','Pobieranie rozpoczęte. Postęp sprawdzisz w powiadomieniach telefonu.'],
  'اسم اختياري للحفظ': ['Optional name to save','Opcjonalna nazwa zapisu'],
  'الصق رابطًا أو شاركه من YouTube / TikTok → اختر HEMA. الروابط والسجل والمفضلة تُحفظ محليًا على الجهاز.': ['Paste a link or share it from YouTube / TikTok → choose HEMA. Links, history and favorites stay on this device.','Wklej link lub udostępnij go z YouTube / TikTok → wybierz HEMA. Linki, historia i ulubione pozostają na tym urządzeniu.'],
  'بحث الملفات': ['Search media','Szukaj multimediów'],
  'اللغة': ['Language','Język'],
  'لغة التطبيق': ['App language','Język aplikacji'],
  'العربية': ['Arabic','Arabski'],
  'English': ['English','Angielski'],
  'Polski': ['Polish','Polski'],
  'تشغيل بالخلفية': ['Background playback','Odtwarzanie w tle'],
  'الملفات المحلية': ['Local files','Pliki lokalne'],
  'مكتبة محلية': ['Local library','Biblioteka lokalna'],
  'إضافة': ['Add','Dodaj'],
  'متابعة الاستماع': ['Continue listening','Kontynuuj słuchanie'],
  'قفل الخزنة': ['Lock vault','Zablokuj sejf'],
  'الخزنة الخاصة المشفّرة': ['Encrypted private vault','Szyfrowany sejf prywatny'],
  'إدخال الرمز': ['Enter PIN','Wpisz PIN'],
  'اضغط مرة أخرى للخروج': ['Press back again to exit','Naciśnij ponownie, aby wyjść'],
  'إدارة القوائم': ['Playlist management','Zarządzanie playlistami'],
  'النسخ الاحتياطي': ['Backup','Kopia zapasowa'],
  'حفظ بروفايل المقطع': ['Save track profile','Zapisz profil utworu'],
  'تطبيق البروفايل': ['Apply profile','Zastosuj profil'],
  'نهاية المقطع': ['End of track','Koniec utworu'],
  'ملء': ['Fill','Wypełnij'],
  'احتواء': ['Fit','Dopasuj'],
  'قفل اللمس': ['Lock touch','Zablokuj dotyk'],
  'فتح اللمس': ['Unlock touch','Odblokuj dotyk'],
  'معلومات الملف': ['File information','Informacje o pliku'],
  'مجلد': ['Folder','Folder'],
  'حذف': ['Delete','Usuń'],
  'المزاج، يرتب موسيقاك.': ['Describe your mood; HEMA arranges your music.','Opisz nastrój, a HEMA ułoży muzykę.'],
  'صف المزاج، يرتب موسيقاك.': ['Describe your mood; HEMA arranges your music.','Opisz nastrój, a HEMA ułoży muzykę.'],
  'هادي للدراسة، حماسي للرياضة…': ['Calm for studying, energetic for exercise…','Spokojna do nauki, energiczna do ćwiczeń…'],
  'رتّب بالذكاء': ['Build smart playlist','Ułóż inteligentną playlistę'],
  'رتّب بالذكاء الاصطناعي': ['Build AI playlist','Utwórz playlistę AI'],
  'الإعدادات المتقدمة': ['Advanced settings','Ustawienia zaawansowane'],
  'عرض التقدم والملفات المحفوظة': ['View progress and saved files','Zobacz postęp i zapisane pliki'],
  'مزامنة الكلمات': ['Sync lyrics','Synchronizuj tekst'],
  'لا إعلانات. الخزنة تستخدم AES-GCM ومفتاح PBKDF2 محليًا. ملفات الخزنة لا تدخل النسخة الاحتياطية العادية.': ['No ads. The vault uses local AES-GCM encryption and PBKDF2. Vault files are not included in regular backups.','Bez reklam. Sejf używa lokalnego szyfrowania AES-GCM i PBKDF2. Pliki sejfu nie są częścią zwykłej kopii zapasowej.'],
  'استيراد': ['Import','Importuj'],
  'تصدير': ['Export','Eksportuj'],
  'فتح': ['Open','Otwórz'],
  'حذف الملف': ['Delete file','Usuń plik']
}

const entries = Object.entries(strings).sort((a, b) => b[0].length - a[0].length)

export function translateText(value: string, language: Language): string {
  if (language === 'ar' || !value) return value
  if (!value.trim()) return value
  const leading = value.length - value.trimStart().length
  const trailing = value.length - value.trimEnd().length
  const prefix = value.slice(0, leading)
  const suffix = trailing ? value.slice(-trailing) : ''
  const core = value.trim()
  const exact = strings[core]
  if (exact) return prefix + exact[language === 'en' ? 0 : 1] + suffix
  let out = core
  for (const [source, pair] of entries) {
    if (source.length < 3 || !out.includes(source)) continue
    out = out.split(source).join(pair[language === 'en' ? 0 : 1])
  }
  return prefix + out + suffix
}

type TextRecord = { original: string; translated: string }
const textRecords = new WeakMap<Text, TextRecord>()
const attrRecords = new WeakMap<Element, Map<string, TextRecord>>()
const attrs = ['placeholder', 'aria-label', 'title']

export function initLocalization(language: Language): () => void {
  const root = document.documentElement
  root.lang = language
  root.dir = language === 'ar' ? 'rtl' : 'ltr'
  document.title = language === 'ar' ? 'HEMA ROKSI PLAYER' : language === 'en' ? 'HEMA ROKSI PLAYER — Music & Video' : 'HEMA ROKSI PLAYER — Muzyka i wideo'
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (meta) meta.content = language === 'ar'
    ? 'HEMA ROKSI PLAYER — مشغل موسيقى وفيديو بميزات صوت متقدمة ومكتبة محلية.'
    : language === 'en'
      ? 'HEMA ROKSI PLAYER — music and video player with advanced audio tools and local library.'
      : 'HEMA ROKSI PLAYER — odtwarzacz muzyki i wideo z zaawansowanym dźwiękiem i lokalną biblioteką.'

  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const n = node as Text
      if (!n.parentElement || n.parentElement.closest('script,style,textarea')) return
      const current = n.nodeValue ?? ''
      const record = textRecords.get(n)
      const original = record && current === record.translated ? record.original : current
      const translated = translateText(original, language)
      textRecords.set(n, { original, translated })
      if (current !== translated) n.nodeValue = translated
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    for (const attr of attrs) {
      const current = el.getAttribute(attr)
      if (current === null) continue
      let records = attrRecords.get(el)
      if (!records) { records = new Map(); attrRecords.set(el, records) }
      const record = records.get(attr)
      const original = record && current === record.translated ? record.original : current
      const translated = translateText(original, language)
      records.set(attr, { original, translated })
      if (current !== translated) el.setAttribute(attr, translated)
    }
    for (const child of Array.from(el.childNodes)) translateNode(child)
  }

  translateNode(document.body)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' && mutation.target.parentElement) translateNode(mutation.target)
      for (const node of Array.from(mutation.addedNodes)) translateNode(node)
      if (mutation.type === 'attributes' && mutation.target instanceof Element) translateNode(mutation.target)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attrs })
  return () => observer.disconnect()
}
