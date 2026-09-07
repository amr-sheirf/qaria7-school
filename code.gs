/**
 * مدرسة قرية 7 الابتدائية - Google Apps Script Backend
 * -----------------------------------------------
 * أنشئ Google Spreadsheet واحدًا، ثم ضع معرّفه في Script Properties:
 * SPREADSHEET_ID = معرّف الملف
 * ADMIN_PASSWORD = كلمة مرور الإدارة
 *
 * أوراق العمل:
 * News: ID | Date | Title | Text | Image
 * Students: SeatNo | Name | Grade | ... باقي الدرجات
 * Attendance: Date | Grade | Name | Status | Notes
 * Requests: Date | Name | Phone | Address | Text
 * Gallery: ID | Date | Title | Image
 * Settings: Key | Value
 */

const SHEETS = {
  news: "News",
  students: "Students",
  attendance: "Attendance",
  requests: "Requests",
  gallery: "Gallery",
  settings: "Settings"
};
const SESSION_TTL_SECONDS = 60 * 60 * 2;

function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: p.getProperty("SPREADSHEET_ID"),
    adminPassword: p.getProperty("ADMIN_PASSWORD")
  };
}

function getSS_() {
  const c = getConfig_();
  if (!c.spreadsheetId) throw new Error("لم يتم ضبط SPREADSHEET_ID في Script Properties");
  return SpreadsheetApp.openById(c.spreadsheetId);
}

function doGet(e) {
  // صفحة اختبار بسيطة؛ الواجهة الأساسية مستضافة على Cloudflare Pages.
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "Qaria7 School API",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    return json_(route_(body));
  } catch (err) {
    return json_({status:"error", message:safeError_(err)});
  }
}

function route_(b) {
  const action = String(b.action || "");
  switch (action) {
    case "publicData": return publicData_();
    case "searchResult": return searchResult_(b);
    case "searchAbsence": return searchAbsence_(b);
    case "submitRequest": return submitRequest_(b);
    case "adminLogin": return adminLogin_(b);
    case "adminData": requireAdmin_(b.token); return adminData_();
    case "addNews": requireAdmin_(b.token); return addNews_(b);
    case "addGallery": requireAdmin_(b.token); return addGallery_(b);
    case "deleteItem": requireAdmin_(b.token); return deleteItem_(b);
    case "saveSettings": requireAdmin_(b.token); return saveSettings_(b);
    default: throw new Error("عملية غير معروفة");
  }
}

function publicData_() {
  return {status:"ok", news:readNews_(8), gallery:readGallery_(12), settings:readSettings_()};
}

function readSheetObjects_(sheetName) {
  const sh = getSS_().getSheetByName(sheetName);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== "")).map(r => {
    const o = {};
    headers.forEach((h,i)=>o[h]=r[i]);
    return o;
  });
}

function readNews_(limit) {
  const rows = readSheetObjects_(SHEETS.news).map(o=>({
    id: Number(o.ID)||0, date: formatDate_(o.Date), title: String(o.Title||""),
    text: String(o.Text||""), image: String(o.Image||"")
  }));
  return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,limit);
}

function readGallery_(limit) {
  const rows = readSheetObjects_(SHEETS.gallery).map(o=>({
    id:Number(o.ID)||0,date:formatDate_(o.Date),title:String(o.Title||""),image:String(o.Image||"")
  }));
  return rows.reverse().slice(0,limit);
}

function readSettings_() {
  const rows = readSheetObjects_(SHEETS.settings), out={};
  rows.forEach(o=>out[String(o.Key||"")]=String(o.Value||""));
  return out;
}

function searchResult_(b) {
  const seat=norm_(b.seatNo), name=norm_(b.name);
  if(!seat && !name) throw new Error("أدخل رقم الجلوس أو الاسم");
  const sh=getSS_().getSheetByName(SHEETS.students);
  if(!sh) throw new Error("ورقة Students غير موجودة");
  const values=sh.getDataRange().getDisplayValues();
  if(values.length<2) return {status:"ok",headers:values[0]||[],rows:[]};
  const headers=values[0];
  const rows=values.slice(1).filter(r=>{
    const seatCell=norm_(r[0]), nameCell=norm_(r[1]);
    return (seat && seatCell===seat) || (name && nameCell.indexOf(name)>=0);
  }).slice(0,20);
  return {status:"ok",headers,rows};
}

function searchAbsence_(b) {
  const grade=norm_(b.grade), name=norm_(b.name);
  const sh=getSS_().getSheetByName(SHEETS.attendance);
  if(!sh) throw new Error("ورقة Attendance غير موجودة");
  const values=sh.getDataRange().getDisplayValues();
  if(values.length<2) return {status:"ok",headers:values[0]||[],rows:[]};
  const headers=values[0];
  // ترتيب الأعمدة الافتراضي: Date, Grade, Name, Status, Notes
  const rows=values.slice(1).filter(r=>{
    const g=norm_(r[1]), n=norm_(r[2]);
    return (!grade || g===grade) && (!name || n.indexOf(name)>=0);
  }).slice(0,100);
  return {status:"ok",headers,rows};
}

function submitRequest_(b) {
  const name=String(b.name||"").trim(), phone=String(b.phone||"").trim(),
        address=String(b.address||"").trim(), text=String(b.text||"").trim();
  if(!name || !phone || !text) throw new Error("يرجى استكمال البيانات المطلوبة");
  const sh=sheetOrCreate_(SHEETS.requests,["Date","Name","Phone","Address","Text"]);
  sh.appendRow([new Date(),name,phone,address,text]);
  return {status:"ok"};
}

function adminLogin_(b) {
  const c=getConfig_();
  if(!c.adminPassword) throw new Error("لم يتم ضبط ADMIN_PASSWORD في Script Properties");
  if(String(b.password||"")!==c.adminPassword) throw new Error("كلمة مرور الإدارة غير صحيحة");
  const token=Utilities.getUuid();
  CacheService.getScriptCache().put("admin:"+token,"1",SESSION_TTL_SECONDS);
  return {status:"ok",token};
}

function requireAdmin_(token) {
  if(!token || CacheService.getScriptCache().get("admin:"+token)!=="1")
    throw new Error("انتهت جلسة الإدارة، سجل الدخول مرة أخرى");
}

function adminData_() {
  return {status:"ok",news:readNews_(100),gallery:readGallery_(100),settings:readSettings_()};
}

function addNews_(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh=sheetOrCreate_(SHEETS.news,["ID","Date","Title","Text","Image"]);
    const title=String(b.title||"").trim();
    if(!title) throw new Error("عنوان الخبر مطلوب");
    sh.appendRow([nextId_(sh),new Date(),title,String(b.text||""),String(b.image||"")]);
    return {status:"ok"};
  } finally {
    lock.releaseLock();
  }
}

function addGallery_(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh=sheetOrCreate_(SHEETS.gallery,["ID","Date","Title","Image"]);
    const title=String(b.title||"").trim(), image=String(b.image||"").trim();
    if(!title || !image) throw new Error("عنوان الصورة ورابطها مطلوبان");
    sh.appendRow([nextId_(sh),new Date(),title,image]);
    return {status:"ok"};
  } finally {
    lock.releaseLock();
  }
}

function deleteItem_(b) {
  const map={news:SHEETS.news,gallery:SHEETS.gallery}, sheetName=map[String(b.type||"")];
  if(!sheetName) throw new Error("نوع الحذف غير صحيح");
  const sh=getSS_().getSheetByName(sheetName); if(!sh) throw new Error("الورقة غير موجودة");
  const id=Number(b.id);
  const values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++) if(Number(values[i][0])===id){sh.deleteRow(i+1);return {status:"ok"};}
  throw new Error("العنصر غير موجود");
}

function saveSettings_(b) {
  const sh=sheetOrCreate_(SHEETS.settings,["Key","Value"]);
  const wanted={about:String(b.about||""),address:String(b.address||""),phone:String(b.phone||""),facebook:String(b.facebook||"")};
  const values=sh.getDataRange().getValues();
  Object.keys(wanted).forEach(key=>{
    let found=0;
    for(let i=1;i<values.length;i++) if(String(values[i][0])===key){sh.getRange(i+1,2).setValue(wanted[key]);found=1;break;}
    if(!found) sh.appendRow([key,wanted[key]]);
  });
  return {status:"ok"};
}

function sheetOrCreate_(name,headers) {
  const ss=getSS_(); let sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.appendRow(headers);}
  else if(sh.getLastRow()===0) sh.appendRow(headers);
  return sh;
}
function nextId_(sh){return Math.max(0,...sh.getRange(2,1,Math.max(sh.getLastRow()-1,1),1).getValues().flat().map(Number).filter(Boolean))+1}
function norm_(v){return String(v??"").trim().toLowerCase().replace(/\s+/g," ")}
function formatDate_(v){return v instanceof Date ? Utilities.formatDate(v,Session.getScriptTimeZone(),"yyyy-MM-dd") : String(v||"")}
function safeError_(e){return e&&e.message?e.message:String(e)}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
