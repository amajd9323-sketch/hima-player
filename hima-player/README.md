# Hima Player V2

نسخة مصدرية جديدة بواجهة عربية/RTL ومجموعة ميزات كبيرة:
- مكتبة صوت وفيديو محلية
- بحث وفرز
- Favorites
- Queue
- Playlists
- Shuffle / Repeat
- Sleep Timer
- Media Session API للتحكم من النظام عندما يدعمه WebView
- Picture-in-Picture ومحاولة Fullscreen
- Smart Mix / Hima AI محلي
- إحصائيات تشغيل
- Dark/Light mode
- تصميم متجاوب للهاتف
- دعم تشغيل الفيديو داخل التطبيق
- موازن صوت بواجهة جاهزة للتكامل مع Web Audio/native EQ

## مهم
هذه الحزمة هي **مصدر V2** وليست APK موقّعًا. الـAPK الأصلي الذي أرسلته ملف compiled، لذلك لا يمكن ضمان إضافة خدمات Android الأصلية مثل Media3/MediaSessionService/Android Auto إلى الـAPK نفسه دون مشروع Android/Capacitor الأصلي.

لإخراج APK احترافي كامل، اربط هذا المصدر بمشروع Capacitor ثم أضف طبقة Android Native لـ Media3 وMediaSessionService والصلاحيات المطلوبة.
