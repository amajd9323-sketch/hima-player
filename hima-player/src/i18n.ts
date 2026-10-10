export type Language = 'ar' | 'en' | 'pl'

type Pair = readonly [string, string]
const strings: Record<string, Pair> = {
  "الإعدادات": ['Settings','Ustawienia'],
  "اللون": ['Accent color','Kolor akcentu'],
  "الترتيب": ['Sort by','Sortuj według'],
  "الأحدث": ['Newest','Najnowsze'],
  "الاسم": ['Name','Nazwa'],
  "المدة": ['Duration','Czas trwania'],
  "الحجم": ['Size','Rozmiar'],
  "الفيديوهات": ['Videos','Wideo'],
  "الأغاني": ['Music','Muzyka'],
  "الطابور": ['Queue','Kolejka'],
  "الطابور · ": ['Queue · ','Kolejka · '],
  "الأكثر تشغيلًا": ['Most played','Najczęściej odtwarzane'],
  "القوائم": ['Playlists','Playlisty'],
  "المجلدات": ['Folders','Foldery'],
  "المفضلة": ['Favorites','Ulubione'],
  "الأخيرة": ['Recently played','Ostatnio odtwarzane'],
  "الأخيرة ": ['Recently played ','Ostatnio odtwarzane '],
  "ذكاء": ['AI DJ','DJ AI'],
  "يوتيوب / تيك توك": ['YouTube / TikTok','YouTube / TikTok'],
  "بحث": ['Search','Szukaj'],
  "إغلاق": ['Close','Zamknij'],
  "رجوع": ['Back','Wstecz'],
  "تحديث": ['Refresh','Odśwież'],
  "إضافة ملفات": ['Add media','Dodaj multimedia'],
  "فارغ. اضغط + لإضافة ملفات.": ['Library is empty. Tap + to add media.','Biblioteka jest pusta. Dotknij +, aby dodać pliki.'],
  "إعادة مسح الملفات": ['Rescan media','Przeskanuj multimedia ponownie'],
  "انتقال بين الأغاني": ['Track crossfade','Przenikanie utworów'],
  "إيقاف": ['Off','Wył.'],
  "الترجمة": ['Subtitles','Napisy'],
  "لون الترجمة": ['Subtitle color','Kolor napisów'],
  "الصوت والتحكم": ['Audio & controls','Dźwięk i sterowanie'],
  "رفع الصوت": ['Volume boost','Wzmocnienie głośności'],
  "هز = التالي": ['Shake to skip','Potrząśnij, aby pominąć'],
  "وضع القرآن (يكمل كل مقطع)": ['Quran mode (finish each track)','Tryb Koranu (dokończ każdy utwór)'],
  "وضع الكتب الصوتية": ['Audiobook mode','Tryb audiobooków'],
  "تعزيز الجهير": ['Bass boost','Wzmocnienie basów'],
  "صدى محيطي": ['Spatial sound','Dźwięk przestrzenny'],
  "إيقاف وقت الأذان": ['Pause for adhan','Wstrzymaj na czas adhan'],
  "ملخصي Hema Wrapped": ['My HEMA Wrapped','Moje HEMA Wrapped'],
  "إدارة المكتبة": ['Library management','Zarządzanie biblioteką'],
  "إدارة طابور التشغيل": ['Manage playback queue','Zarządzaj kolejką odtwarzania'],
  "خزنة خاصة مشفّرة": ['Encrypted private vault','Szyfrowany sejf prywatny'],
  "فحص الملفات المكررة SHA-256": ['Find duplicate files (SHA-256)','Znajdź duplikaty (SHA-256)'],
  "مجموعات مكررة:": ['Duplicate groups:','Grupy duplikatów:'],
  "لم نعثر على تكرار حسب الاسم والفنان.": ['No duplicates found by title and artist.','Nie znaleziono duplikatów według tytułu i wykonawcy.'],
  "فيديو": ['Video','Wideo'],
  "صوت": ['Audio','Audio'],
  "استيراد قائمة HEMA": ['Import HEMA playlist','Importuj playlistę HEMA'],
  "توازن الصوت تلقائيًا": ['Automatic volume leveling','Automatyczne wyrównywanie głośności'],
  "تصدير نسخة احتياطية": ['Export backup','Eksportuj kopię zapasową'],
  "استيراد نسخة احتياطية": ['Import backup','Importuj kopię zapasową'],
  "حفظ": ['Save','Zapisz'],
  "رجوع 10 ثواني": ['Back 10 seconds','Cofnij o 10 sekund'],
  "تقديم 10 ثواني": ['Forward 10 seconds','Przewiń o 10 sekund'],
  "السابق": ['Previous','Poprzedni'],
  "التالي": ['Next','Następny'],
  "تشغيل": ['Play','Odtwórz'],
  "إيقاف مؤقت": ['Pause','Wstrzymaj'],
  "عشوائي": ['Shuffle','Losowo'],
  "تكرار": ['Repeat','Powtarzaj'],
  "مفضلة": ['Favorite','Ulubione'],
  "قائمة": ['Playlist','Playlista'],
  "تشغيل بعد الحالي": ['Play next','Odtwórz jako następny'],
  "إضافة إلى قائمة": ['Add to playlist','Dodaj do playlisty'],
  "قائمة جديدة": ['New playlist','Nowa playlista'],
  "أضف إلى قائمة": ['Add to playlist','Dodaj do playlisty'],
  "تحميل كلمات LRC": ['Load LRC lyrics','Wczytaj tekst LRC'],
  "منبه نوم": ['Sleep timer','Wyłącznik czasowy'],
  "موازن صوت": ['Equalizer','Korektor dźwięku'],
  "قيادة": ['Car mode','Tryb samochodowy'],
  "خروج": ['Exit','Wyjdź'],
  "تم": ['Done','Gotowe'],
  "عادي": ['Normal','Normalny'],
  "باس": ['Bass','Bas'],
  "روك": ['Rock','Rock'],
  "ناعم": ['Soft','Łagodny'],
  "مخصص": ['Custom','Własny'],
  "فيديوهات": ['Videos','Wideo'],
  "اغاني": ['Songs','Utwory'],
  "اسم المقطع": ['Track title','Tytuł utworu'],
  "اسم الفنان": ['Artist name','Nazwa wykonawcy'],
  "اسم الفنان / الوصف": ['Artist / description','Wykonawca / opis'],
  "تعديل بيانات العرض": ['Edit display metadata','Edytuj metadane'],
  "اختيار غلاف من الصور": ['Choose cover image','Wybierz okładkę'],
  "إرجاع الأصل": ['Restore original','Przywróć oryginał'],
  "الفنان / الوصف": ['Artist / description','Wykonawca / opis'],
  "تحميل ملف وسائط مباشر": ['Download direct media file','Pobierz bezpośredni plik multimedialny'],
  "تنزيل ملف وسائط مباشر": ['Download direct media file','Pobierz bezpośredni plik multimedialny'],
  "تنزيل إلى الهاتف": ['Download to phone','Pobierz na telefon'],
  "أدخل رابط HTTPS مباشر لملف MP4 أو MP3.": ['Enter a direct HTTPS URL for an MP4 or MP3 file.','Wpisz bezpośredni adres HTTPS pliku MP4 lub MP3.'],
  "رابط مباشر لملف MP4 أو MP3": ['Direct MP4 or MP3 URL','Bezpośredni adres MP4 lub MP3'],
  "YouTube و TikTok": ['YouTube & TikTok','YouTube i TikTok'],
  "HEMA ONLINE": ['HEMA ONLINE','HEMA ONLINE'],
  "الصق رابط فيديو أولًا.": ['Paste a video link first.','Najpierw wklej link do filmu.'],
  "الرابط غير صالح. تأكد من نسخه كاملًا.": ['Invalid link. Make sure you copied the full URL.','Nieprawidłowy link. Upewnij się, że skopiowano cały adres.'],
  "استخدم رابط HTTP أو HTTPS فقط.": ['Use an HTTP or HTTPS URL only.','Użyj wyłącznie adresu HTTP lub HTTPS.'],
  "الرابط غير مدعوم. استخدم رابط YouTube أو TikTok.": ['Unsupported link. Use a YouTube or TikTok link.','Nieobsługiwany link. Użyj linku YouTube lub TikTok.'],
  "انحفظ الرابط محليًا داخل HEMA.": ['Link saved locally in HEMA.','Link zapisany lokalnie w HEMA.'],
  "أُزيل من المفضلة.": ['Removed from favorites.','Usunięto z ulubionych.'],
  "أُضيف للمفضلة وحُفظ في المكتبة.": ['Added to favorites and library.','Dodano do ulubionych i biblioteki.'],
  "أُضيف للطابور.": ['Added to queue.','Dodano do kolejki.'],
  "طابور الروابط فارغ. أضف فيديو بزر الطابور.": ['Link queue is empty. Add a video to the queue.','Kolejka linków jest pusta. Dodaj film do kolejki.'],
  "لا يوجد فيديو سابق في السجل.": ['No previous video in history.','Brak poprzedniego filmu w historii.'],
  "نُسخ الرابط. شاركه في أي تطبيق.": ['Link copied. Share it in any app.','Link skopiowany. Udostępnij go w dowolnej aplikacji.'],
  "تعذرت المشاركة من هذا الجهاز.": ['Sharing is unavailable on this device.','Udostępnianie jest niedostępne na tym urządzeniu.'],
  "فشل تشغيل فيديو TikTok. افتحه على المنصة؛ ربما حُذف أو قيّد التضمين.": ['TikTok playback failed. Open it in TikTok; the post may be deleted or embedding blocked.','Nie udało się odtworzyć TikToka. Otwórz go w TikToku; film może być usunięty lub blokować osadzanie.'],
  "فشل تضمين YouTube. افتح الفيديو على المنصة؛ قد يمنع صاحبه التضمين.": ['Could not embed YouTube. Open it on YouTube; the owner may block embedding.','Nie można osadzić YouTube. Otwórz film w YouTube; właściciel mógł zablokować osadzanie.'],
  "التنزيل بدأ. ستظهر النتيجة في إشعارات الهاتف.": ['Download started. Check your phone notifications for progress.','Pobieranie rozpoczęte. Postęp sprawdzisz w powiadomieniach telefonu.'],
  "اسم اختياري للحفظ": ['Optional name to save','Opcjonalna nazwa zapisu'],
  "الصق رابطًا أو شاركه من YouTube / TikTok → اختر HEMA. الروابط والسجل والمفضلة تُحفظ محليًا على الجهاز.": ['Paste a link or share it from YouTube / TikTok → choose HEMA. Links, history and favorites stay on this device.','Wklej link lub udostępnij go z YouTube / TikTok → wybierz HEMA. Linki, historia i ulubione pozostają na tym urządzeniu.'],
  "بحث الملفات": ['Search media','Szukaj multimediów'],
  "اللغة": ['Language','Język'],
  "لغة التطبيق": ['App language','Język aplikacji'],
  "العربية": ['Arabic','Arabski'],
  "English": ['English','Angielski'],
  "Polski": ['Polish','Polski'],
  "تشغيل بالخلفية": ['Background playback','Odtwarzanie w tle'],
  "الملفات المحلية": ['Local files','Pliki lokalne'],
  "مكتبة محلية": ['Local library','Biblioteka lokalna'],
  "إضافة": ['Add','Dodaj'],
  "متابعة الاستماع": ['Continue listening','Kontynuuj słuchanie'],
  "قفل الخزنة": ['Lock vault','Zablokuj sejf'],
  "الخزنة الخاصة المشفّرة": ['Encrypted private vault','Szyfrowany sejf prywatny'],
  "إدخال الرمز": ['Enter PIN','Wpisz PIN'],
  "اضغط مرة أخرى للخروج": ['Press back again to exit','Naciśnij ponownie, aby wyjść'],
  "إدارة القوائم": ['Playlist management','Zarządzanie playlistami'],
  "النسخ الاحتياطي": ['Backup','Kopia zapasowa'],
  "حفظ بروفايل المقطع": ['Save track profile','Zapisz profil utworu'],
  "تطبيق البروفايل": ['Apply profile','Zastosuj profil'],
  "نهاية المقطع": ['End of track','Koniec utworu'],
  "ملء": ['Fill','Wypełnij'],
  "احتواء": ['Fit','Dopasuj'],
  "قفل اللمس": ['Lock touch','Zablokuj dotyk'],
  "فتح اللمس": ['Unlock touch','Odblokuj dotyk'],
  "معلومات الملف": ['File information','Informacje o pliku'],
  "مجلد": ['Folder','Folder'],
  "حذف": ['Delete','Usuń'],
  "المزاج، يرتب موسيقاك.": ['Describe your mood; HEMA arranges your music.','Opisz nastrój, a HEMA ułoży muzykę.'],
  "صف المزاج، يرتب موسيقاك.": ['Describe your mood; HEMA arranges your music.','Opisz nastrój, a HEMA ułoży muzykę.'],
  "هادي للدراسة، حماسي للرياضة…": ['Calm for studying, energetic for exercise…','Spokojna do nauki, energiczna do ćwiczeń…'],
  "رتّب بالذكاء": ['Build smart playlist','Ułóż inteligentną playlistę'],
  "رتّب بالذكاء الاصطناعي": ['Build AI playlist','Utwórz playlistę AI'],
  "الإعدادات المتقدمة": ['Advanced settings','Ustawienia zaawansowane'],
  "عرض التقدم والملفات المحفوظة": ['View progress and saved files','Zobacz postęp i zapisane pliki'],
  "مزامنة الكلمات": ['Sync lyrics','Synchronizuj tekst'],
  "لا إعلانات. الخزنة تستخدم AES-GCM ومفتاح PBKDF2 محليًا. ملفات الخزنة لا تدخل النسخة الاحتياطية العادية.": ['No ads. The vault uses local AES-GCM encryption and PBKDF2. Vault files are not included in regular backups.','Bez reklam. Sejf używa lokalnego szyfrowania AES-GCM i PBKDF2. Pliki sejfu nie są częścią zwykłej kopii zapasowej.'],
  "استيراد": ['Import','Importuj'],
  "تصدير": ['Export','Eksportuj'],
  "فتح": ['Open','Otwórz'],
  "حذف الملف": ['Delete file','Usuń plik'],
  "تشغيل الرابط": ["Play link", "Odtwórz link"],
  "ملخص المكتبة": ["Library overview", "Przegląd biblioteki"],
  "عنصر": ["item", "element"],
  "موسيقى": ["Music", "Muzyka"],
  "الحجم التقريبي": ["Approx. size", "Szac. rozmiar"],
  "توفير البطارية": ["Battery saver", "Oszczędzanie baterii"],
  "تقليل الحركات والانتقالات لتخفيف الحمل البصري؛ لا يوقف تشغيل الوسائط بالخلفية.": ["Reduces visual motion; background playback remains available.", "Ogranicza animacje; odtwarzanie w tle nadal działa."],
  "الصق رابط HTTPS مباشر لملف MP4 أو MP3 تملك حق تنزيله. سيُحفظ في مجلد Downloads ويظهر تقدم التنزيل في إشعارات Android. روابط صفحات YouTube وTikTok لا تكفي للتنزيل.": ["Paste a direct HTTPS link to an MP4 or MP3 you are allowed to download. It will be saved to Downloads, with progress in Android notifications. YouTube and TikTok page links cannot be downloaded here.", "Wklej bezpośredni link HTTPS do pliku MP4 lub MP3, który możesz pobrać. Plik trafi do Downloads, a postęp pojawi się w powiadomieniach Androida. Linki do stron YouTube i TikTok nie wystarczą."],
  "جارٍ بدء التنزيل…": ["Starting download…", "Rozpoczynanie pobierania…"],
  "بدأ التنزيل:": ["Download started:", "Pobieranie rozpoczęte:"],
  "التنزيل متاح داخل نسخة Android فقط.": ["Downloads are available in the Android app only.", "Pobieranie jest dostępne tylko w aplikacji Android."],
  "تعذر بدء التنزيل. استخدم رابط ملف مباشر.": ["Could not start download. Use a direct file URL.", "Nie udało się rozpocząć pobierania. Użyj bezpośredniego adresu pliku."],
  "إنهاء التركيز": ["Exit focus", "Zakończ tryb skupienia"],
  "تركيز الموسيقى": ["Music focus", "Tryb muzyki"],
  "تشغيل رسمي مضمّن": ["Official embedded player", "Oficjalny osadzony odtwarzacz"],
  "حفظ الرابط": ["Save link", "Zapisz link"],
  "التكرار": ["Repeat", "Powtarzanie"],
  "تشغيل تلقائي": ["Autoplay", "Autoodtwarzanie"],
  "المحفوظ": ["Saved", "Zapisane"],
  "المحفوظة": ["Saved", "Zapisane"],
  "السجل": ["History", "Historia"],
  "سجل المشاهدة": ["Watch history", "Historia oglądania"],
  "طابور الروابط": ["Link queue", "Kolejka linków"],
  "تشغيل التالي": ["Play next", "Odtwórz następny"],
  "الفيديو السابق": ["Previous video", "Poprzedni film"],
  "فتح على YouTube": ["Open on YouTube", "Otwórz w YouTube"],
  "فتح على TikTok": ["Open on TikTok", "Otwórz w TikTok"],
  "إزالة من السجل": ["Remove from history", "Usuń z historii"],
  "إزالة من المفضلة": ["Remove from favorites", "Usuń z ulubionych"],
  "نسخ الرابط": ["Copy link", "Kopiuj link"],
  "مشاركة": ["Share", "Udostępnij"],
  "مشاركة الرابط": ["Share link", "Udostępnij link"],
  "إعادة التسمية": ["Rename", "Zmień nazwę"],
  "أضف للطابور": ["Add to queue", "Dodaj do kolejki"],
  "تشغيل الآن": ["Play now", "Odtwórz teraz"],
  "تفريغ الطابور": ["Clear queue", "Wyczyść kolejkę"],
  "اسحب لإعادة الترتيب": ["Drag to reorder", "Przeciągnij, aby zmienić kolejność"],
  "ملفات مكررة": ["Duplicate files", "Zduplikowane pliki"],
  "تم الحفظ": ["Saved", "Zapisano"],
  "تم التحديث": ["Updated", "Zaktualizowano"],
  "الملفات المستوردة": ["Imported files", "Zaimportowane pliki"],
  "إدارة التنزيلات": ["Download management", "Zarządzanie pobieraniem"],
  "التنزيلات": ["Downloads", "Pobrane"],
  "استخدام البيانات": ["Data usage", "Użycie danych"],
  "وضع توفير البيانات": ["Data saver mode", "Tryb oszczędzania danych"],
  "تشغيل دون إنترنت": ["Offline playback", "Odtwarzanie offline"],
  "الموسيقى والفيديو": ["Music & video", "Muzyka i wideo"],
  "الوضع الداكن": ["Dark mode", "Tryb ciemny"],
  "الأجهزة المتصلة": ["Connected devices", "Połączone urządzenia"],
  "إعدادات التشغيل": ["Playback settings", "Ustawienia odtwarzania"],
  "سرعة التشغيل": ["Playback speed", "Prędkość odtwarzania"],
  "السرعة": ["Speed", "Prędkość"],
  "صورة داخل صورة": ["Picture-in-picture", "Obraz w obrazie"],
  "ترجمة مدمجة": ["Embedded subtitles", "Wbudowane napisy"],
  "قفل الشاشة": ["Screen lock", "Blokada ekranu"],
  "السطوع": ["Brightness", "Jasność"],
  "الصوت": ["Volume", "Głośność"],
  "الملفات": ["Files", "Pliki"],
  "تم العثور على الملفات": ["Files found", "Znalezione pliki"],
  "إعادة المحاولة": ["Retry", "Spróbuj ponownie"],
  "فشل تحميل الملفات": ["Failed to load media", "Nie udało się wczytać multimediów"],
  "لا توجد ملفات": ["No files found", "Nie znaleziono plików"],
  "المكتبة فارغة": ["Library is empty", "Biblioteka jest pusta"],
  "مدة التشغيل": ["Duration", "Czas trwania"],
  "المجلد الحالي": ["Current folder", "Bieżący folder"],
  "أدخل اسم القائمة": ["Enter playlist name", "Wpisz nazwę playlisty"],
  "إضافة للقائمة": ["Add to playlist", "Dodaj do playlisty"],
  "تم إنشاء القائمة": ["Playlist created", "Utworzono playlistę"],
  "تعديل الاسم والفنان والغلاف": ["Edit title, artist and cover", "Edytuj tytuł, wykonawcę i okładkę"],
  "بيانات الملف": ["File details", "Szczegóły pliku"],
  "ملفات الصوت": ["Audio files", "Pliki audio"],
  "ملفات الفيديو": ["Video files", "Pliki wideo"],
  "إلغاء": ["Cancel", "Anuluj"],
  "تأكيد": ["Confirm", "Potwierdź"],
  "إعادة ضبط": ["Reset", "Resetuj"],
  "لا يمكن تشغيل هذا الملف.": ["Unable to play this file.", "Nie można odtworzyć tego pliku."],
  "حاول اختيار ملف آخر.": ["Try choosing another file.", "Spróbuj wybrać inny plik."],
  "التشغيل بالخلفية للملفات المحلية فقط؛ تشغيل YouTube/TikTok يتبع قيود المنصة.": ["Background playback is for local files; YouTube/TikTok follow platform restrictions.", "Odtwarzanie w tle dotyczy plików lokalnych; YouTube/TikTok podlegają ograniczeniom platformy."],
  "التنزيلات الرسمية أو الروابط المباشرة فقط.": ["Official downloads or direct file links only.", "Tylko oficjalne pobieranie lub bezpośrednie linki do plików."],
  "إزالة من الطابور": ["Remove from queue", "Usuń z kolejki"],
  "اختر مقطعًا أولًا.": ["Choose a track first.", "Najpierw wybierz utwór."],
  "تحريك لأعلى": ["Move up", "Przenieś w górę"],
  "تحريك لأسفل": ["Move down", "Przenieś w dół"],
  "تشغيل القائمة": ["Play playlist", "Odtwórz playlistę"],
  "تصدير القائمة": ["Export playlist", "Eksportuj playlistę"],
  "اسمح بالوصول للملفات من إعدادات التطبيق، ثم اضغط تحديث": ["Allow media access in app settings, then tap Refresh.", "Zezwól na dostęp do multimediów w ustawieniach aplikacji, a następnie dotknij Odśwież."],
  "رابط YouTube غير صالح أو لا يحتوي على فيديو واحد.": ["Invalid YouTube link or no single video ID found.", "Nieprawidłowy link YouTube lub brak pojedynczego identyfikatora filmu."],
  "رابط فيديو": ["Video URL", "Adres URL filmu"],
  "وصلنا للرابط، لكن المنصة لم تعطنا معرّف تضمين. احفظه أو افتحه على TikTok مباشرة.": ["Link received, but the platform did not provide an embed ID. Save it or open it directly in TikTok.", "Otrzymano link, ale platforma nie udostępniła identyfikatora osadzania. Zapisz go lub otwórz bezpośrednio w TikToku."],
  "اسم الرابط في HEMA": ["Link name in HEMA", "Nazwa linku w HEMA"],
  "تم تحديث الاسم محليًا.": ["Name updated locally.", "Nazwa została zaktualizowana lokalnie."],
  "رابط من HEMA ROKSI PLAYER": ["Link from HEMA ROKSI PLAYER", "Link z HEMA ROKSI PLAYER"],
  "انسخ الرابط يدويًا من حقل الرابط.": ["Copy the link manually from the URL field.", "Skopiuj link ręcznie z pola adresu."],
  "أداة التحكم تحتاج فيديو قابلًا للتضمين.": ["Controls require an embeddable video.", "Sterowanie wymaga filmu, który można osadzić."],
  "تغيير السرعة من تحكم TikTok غير متاح عبر المشغّل المضمّن.": ["Changing TikTok playback speed is not available in the embedded player.", "Zmiana prędkości odtwarzania TikTok nie jest dostępna w osadzonym odtwarzaczu."],
  "تم استلام الرابط من قائمة المشاركة.": ["Received link from the Share menu.", "Otrzymano link z menu Udostępnij."],
  "تم حفظ إعدادات الصوت لهذا المقطع.": ["Audio settings saved for this track.", "Zapisano ustawienia dźwięku dla tego utworu."],
  "لا يوجد بروفايل محفوظ لهذا المقطع.": ["No saved profile for this track.", "Brak zapisanego profilu dla tego utworu."],
  "تم تطبيق بروفايل الصوت.": ["Audio profile applied.", "Zastosowano profil dźwięku."],
  "تعذر تفعيل مؤثرات الصوت على هذا الملف أو الجهاز.": ["Audio effects could not be enabled for this file or device.", "Nie można włączyć efektów dźwiękowych dla tego pliku lub urządzenia."],
  "مكتبة Hema": ["HEMA library", "Biblioteka HEMA"],
  "اسمع شوي وارجع": ["Listen for a while, then come back", "Posłuchaj chwilę i wróć"],
  "تم تصدير النسخة الاحتياطية والإعدادات وبيانات العرض. ملفات الغلاف نفسها تُحفظ محليًا ولا تدخل الملف.": ["Backup, settings and display metadata exported. Cover files remain local and are not included.", "Wyeksportowano kopię zapasową, ustawienia i metadane. Pliki okładek pozostają lokalne i nie są dołączane."],
  "تم استيراد الإعدادات والقوائم وبيانات العرض. لم تتضمن النسخة ملفات الوسائط أو أغلفة الصور.": ["Settings, playlists and display metadata imported. Media files and cover images were not included.", "Zaimportowano ustawienia, playlisty i metadane. Pliki multimedialne i okładki nie zostały dołączone."],
  "ملف النسخة الاحتياطية غير صالح أو من إصدار غير مدعوم.": ["Backup file is invalid or from an unsupported version.", "Plik kopii zapasowej jest nieprawidłowy lub pochodzi z nieobsługiwanej wersji."],
  "جارٍ فحص التكرار بالبصمة الرقمية...": ["Checking duplicates by digital fingerprint…", "Sprawdzanie duplikatów na podstawie odcisku cyfrowego…"],
  "انتهى الفحص: SHA-256 للملفات المستوردة، وبيانات الاسم/الحجم/المدة لملفات الجهاز.": ["Scan complete: SHA-256 for imported files; title/size/duration for device files.", "Skanowanie zakończone: SHA-256 dla plików importowanych; tytuł/rozmiar/czas dla plików urządzenia."],
  "اكتب اسمًا صالحًا للمقطع.": ["Enter a valid track title.", "Wpisz prawidłowy tytuł utworu."],
  "تعذر حفظ البيانات. تحقق من مساحة التطبيق.": ["Could not save metadata. Check available app storage.", "Nie można zapisać metadanych. Sprawdź wolne miejsce aplikacji."],
  "تعذر حذف التعديل المحلي.": ["Could not remove local edits.", "Nie można usunąć lokalnych zmian."],
  "تم تصدير القائمة؛ ملفّات الوسائط نفسها لا تُنسخ ضمن القائمة.": ["Playlist exported; media files themselves are not copied.", "Playlista została wyeksportowana; pliki multimedialne nie są kopiowane."],
  "قائمة مستوردة": ["Imported playlist", "Zaimportowana playlista"],
  "ملف القائمة غير صالح.": ["Invalid playlist file.", "Nieprawidłowy plik playlisty."],
  "الخزنة مفتوحة. الملفات مشفّرة محليًا.": ["Vault unlocked. Files are encrypted locally.", "Sejf odblokowany. Pliki są szyfrowane lokalnie."],
  "رمز خاطئ أو سجل خزنة غير صالح.": ["Incorrect PIN or invalid vault record.", "Nieprawidłowy PIN lub wpis sejfu."],
  "استخدم رمزًا أو عبارة من 6 أحرف/أرقام على الأقل.": ["Use a PIN or passphrase with at least 6 characters.", "Użyj PIN-u lub hasła o długości co najmniej 6 znaków."],
  "التشفير غير مدعوم في بيئة التشغيل.": ["Encryption is not supported in this runtime.", "Szyfrowanie nie jest obsługiwane w tym środowisku."],
  "تعذر فتح الخزنة.": ["Could not open the vault.", "Nie można otworzyć sejfu."],
  "تم تشفير الملفات وحفظها داخل خزنة التطبيق.": ["Files encrypted and saved in the app vault.", "Pliki zaszyfrowano i zapisano w sejfie aplikacji."],
  "الحد الحالي للملف الواحد 120 MB.": ["Current per-file limit is 120 MB.", "Obecny limit pojedynczego pliku to 120 MB."],
  "فشل التشفير أو الحفظ؛ تحقق من مساحة التخزين.": ["Encryption or save failed; check storage space.", "Szyfrowanie lub zapis nie powiódł się; sprawdź miejsce w pamięci."],
  "تم فك التشفير وتصدير نسخة من الملف.": ["File decrypted and a copy exported.", "Plik odszyfrowano i wyeksportowano jego kopię."],
  "تعذر فك تشفير هذا الملف.": ["Could not decrypt this file.", "Nie można odszyfrować tego pliku."],
  "حذف الملف المشفّر من الخزنة نهائيًا؟": ["Permanently delete encrypted file from vault?", "Trwale usunąć zaszyfrowany plik z sejfu?"],
  "حُذف الملف المشفّر.": ["Encrypted file deleted.", "Zaszyfrowany plik usunięto."],
  "فشل حذف الملف.": ["Failed to delete file.", "Nie udało się usunąć pliku."],
  "لا نتيجة. جرب وصف ثاني.": ["No matches. Try another description.", "Brak wyników. Spróbuj innego opisu."],
  "DJ محلي · ": ["Local DJ · ", "Lokalny DJ · "],
  "خدمة AI غير متاحة؛ أنشأت ترتيبًا محليًا حسب الأسماء وسجل الاستماع.": ["AI service unavailable; created a local playlist using titles and listening history.", "Usługa AI niedostępna; utworzono lokalną playlistę na podstawie tytułów i historii odsłuchu."],
  "انحفظت قائمة AI DJ في «القوائم».": ["AI DJ playlist saved in Playlists.", "Playlista AI DJ została zapisana w Playlistach."],
  "AI غير مفعّل: اضبط VITE_AI_URL": ["AI is not configured: set VITE_AI_URL", "AI nie jest skonfigurowane: ustaw VITE_AI_URL"],
  "فشل AI. جرب لاحقا.": ["AI failed. Try again later.", "AI nie zadziałało. Spróbuj ponownie później."],
  "التقدم": ["Progress", "Postęp"],
  "إعدادات": ["Settings", "Ustawienia"],
  "الأكثر استماعًا": ["Most listened", "Najczęściej słuchane"],
  "https://youtu.be/... أو TikTok URL": ["https://youtu.be/... or TikTok URL", "https://youtu.be/... lub adres TikTok"],
  "بدأ التنزيل: ": ["Download started: ", "Pobieranie rozpoczęte: "],
  ". تابع التقدم من إشعارات الهاتف.": [" Check progress in your phone notifications.", " Sprawdź postęp w powiadomieniach telefonu."],
  "إغلاق اللاعب": ["Close player", "Zamknij odtwarzacz"],
  "إلغاء كتم": ["Unmute", "Wyłącz wyciszenie"],
  "كتم": ["Mute", "Wycisz"],
  "التكرار شغّال": ["Repeat is on", "Powtarzanie włączone"],
  "الانتقال إلى الثانية": ["Seek to second", "Przejdź do sekundy"],
  "مستوى صوت YouTube": ["YouTube volume", "Głośność YouTube"],
  "★ بالمفضلة": ["★ Favorited", "★ W ulubionych"],
  "☆ أضف للمفضلة": ["☆ Add to favorites", "☆ Dodaj do ulubionych"],
  "المكتبة": ["Library", "Biblioteka"],
  "الروابط المحفوظة": ["Saved links", "Zapisane linki"],
  "مفضلة الروابط": ["Favorite links", "Ulubione linki"],
  "تم مسح سجل الروابط.": ["Link history cleared.", "Historia linków została wyczyszczona."],
  "رابط مختصر": ["Short link", "Krótki link"],
  "إضافة للمفضلة": ["Add to favorites", "Dodaj do ulubionych"],
  "إضافة للطابور": ["Add to queue", "Dodaj do kolejki"],
  "تعديل الاسم": ["Rename", "Zmień nazwę"],
  "حذف الرابط المحفوظ": ["Delete saved link", "Usuń zapisany link"],
  "لا روابط محفوظة. شغّل رابطًا ثم اضغط حفظ.": ["No saved links. Open a link and tap Save.", "Brak zapisanych linków. Otwórz link i dotknij Zapisz."],
  "أضف روابط للمفضلة من زر ☆.": ["Add links to favorites using the ☆ button.", "Dodaj linki do ulubionych przyciskiem ☆."],
  "ما شغّلت روابط بعد.": ["No links played yet.", "Nie odtworzono jeszcze żadnych linków."],
  "الطابور فارغ. أضف فيديو بزر Q+.": ["Queue is empty. Add a video with Q+.", "Kolejka jest pusta. Dodaj film przyciskiem Q+."],
  "تم حفظ الكلمات محليًا": ["Lyrics saved locally", "Tekst zapisano lokalnie"],
  "ملف الكلمات غير صالح": ["Invalid lyrics file", "Nieprawidłowy plik tekstu"],
  "تأخير الكلمات نصف ثانية": ["Delay lyrics by half a second", "Opóźnij tekst o pół sekundy"],
  "تقديم الكلمات نصف ثانية": ["Advance lyrics by half a second", "Przyspiesz tekst o pół sekundy"],
  "حدد A أولًا، ثم B بعده.": ["Set A first, then B.", "Najpierw ustaw A, potem B."],
  "HEMA Audio Lab · 10 نطاقات": ["HEMA Audio Lab · 10 bands", "HEMA Audio Lab · 10 pasm"],
  "إيقاف تلقائي": ["Auto stop", "Automatyczne zatrzymanie"],
  "اختر أغنية": ["Choose a song", "Wybierz utwór"],
  "أدخل رمز الخزنة لفتح الملفات.": ["Enter vault PIN to unlock files.", "Wpisz PIN sejfu, aby odblokować pliki."],
  "أنشئ رمزًا لا يقل عن 6 أحرف/أرقام. نسيان الرمز يعني فقدان إمكانية فك الملفات.": ["Create a PIN with at least 6 characters. If you forget it, files cannot be decrypted.", "Utwórz PIN o długości co najmniej 6 znaków. Po jego utracie plików nie będzie można odszyfrować."],
  "PIN أو عبارة سرية (6+)": ["PIN or passphrase (6+)", "PIN lub hasło (min. 6 znaków)"],
  "فتح الخزنة": ["Unlock vault", "Odblokuj sejf"],
  "إنشاء خزنة مشفّرة": ["Create encrypted vault", "Utwórz szyfrowany sejf"],
  "تصدير وفك تشفير": ["Export and decrypt", "Eksportuj i odszyfruj"],
  "حذف من الخزنة": ["Delete from vault", "Usuń z sejfu"],
  "تم قفل الجلسة.": ["Session locked.", "Sesja zablokowana."],
  "ملف مستورد": ["Imported file", "Zaimportowany plik"],
  "حد الغلاف 8 MB.": ["Cover limit is 8 MB.", "Limit okładki wynosi 8 MB."],
  "تدوير": ["Rotate", "Obróć"],
  "PiP غير متاح على هذا الجهاز": ["PiP is unavailable on this device", "PiP nie jest dostępne na tym urządzeniu"]
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
