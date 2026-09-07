# البوابة الإلكترونية — مدرسة قرية 7 الابتدائية

## البنية النهائية

- `index.html` — واجهة الموقع.
- `functions/api.js` — Cloudflare Pages Function، وتعمل كوسيط بين الموقع وGoogle Apps Script.
- `code.gs` — Backend على Google Apps Script.
- `assets/logo.png` — شعار المدرسة.

الموقع يستخدم `/api` من نفس النطاق، لذلك لا يحتاج إلى وضع رابط Apps Script داخل JavaScript الخاص بالواجهة ولا يعتمد على CORS من المتصفح.

## 1. Google Sheets

أنشئ Google Spreadsheet واجعله مصدر البيانات، مع الأوراق التالية:

- `Students`: أول عمود رقم الجلوس، ثاني عمود اسم الطالب، ثم باقي بيانات/درجات الطالب.
- `Attendance`: `Date | Grade | Name | Status | Notes`
- `News`: `ID | Date | Title | Text | Image`
- `Gallery`: `ID | Date | Title | Image`
- `Requests`: `Date | Name | Phone | Address | Text`
- `Settings`: `Key | Value`

إذا كانت أوراقك الحالية بأسماء مختلفة، عدّل ثوابت `SHEETS` في `code.gs`.

## 2. مهم جدًا: إعداد Google Apps Script

في Apps Script افتح:
**Project Settings → Script Properties**

أضف خاصيتين:

`SPREADSHEET_ID`
= معرّف Google Spreadsheet

`ADMIN_PASSWORD`
= كلمة مرور الإدارة

تم تصحيح خطأ موجود في النسخة التي أرسلتها: `getProperty()` يجب أن يستقبل اسم الخاصية (`SPREADSHEET_ID` و`ADMIN_PASSWORD`) وليس قيمة المعرّف أو كلمة المرور نفسها.

## 3. نشر Apps Script

Deploy → New deployment → Web app

- Execute as: Me
- Who has access: Anyone

استخدم رابط النشر الذي أرسلته في إعداد Cloudflare إذا أردت تغييره من المتغير الافتراضي داخل `functions/api.js`.

## 4. GitHub + Cloudflare Pages

ارفع محتويات هذا المجلد إلى مستودع GitHub.

في Cloudflare Pages:
- اربط مستودع GitHub.
- Framework preset: None.
- Build command: اتركه فارغًا.
- Output directory: `/`

لا تحتاج إلى إنشاء Worker منفصل؛ `functions/api.js` تعمل كـ Pages Function.

ويمكنك — اختياريًا — إنشاء Environment Variable في Cloudflare Pages:

`APPS_SCRIPT_URL`

ووضع رابط Web App الخاص بـ Apps Script. عند وجوده سيستخدمه الموقع بدل الرابط الافتراضي الموجود في الملف.

## 5. اختبار الموقع

بعد النشر:
- الصفحة الرئيسية يجب أن تظهر مع الشعار.
- الأخبار والمعرض يقرآن من Google Sheets.
- نموذج الطلب يكتب في `Requests`.
- البحث يقرأ من `Students`.
- الغياب يقرأ من `Attendance`.
- إدارة الصفحة تتطلب كلمة المرور الموجودة في `ADMIN_PASSWORD`.

## تنبيه أمني

لا تضع كلمة مرور الإدارة داخل `index.html` أو GitHub.
النسخة النهائية تعتمد على Script Properties.

كما يفضل عدم عرض جميع أعمدة بيانات الطلاب للعامة. ضع فقط الأعمدة التي تريد إظهارها في نتيجة الطالب، ويمكنني لاحقًا تخصيص ذلك حسب ملف Excel الفعلي.
