import {calculateMetrics} from './domain';
import type {Deal,MetricResult} from './domain';
export type CustomerCase={dealId:string;asOf:string;assessment:string;findings:string[];calculation:string;nextStep:string;customerReply:string;internalSummary:string;sourceRows:number[]};
const number=(n:number)=>new Intl.NumberFormat('he-IL',{maximumFractionDigits:2}).format(n);
export function buildCustomerCase(deal:Deal,asOf:string):CustomerCase{
 const result=calculateMetrics([deal],{},'median_ppsm',asOf);
 const findings=deal.flags.map(f=>f.message);
 const assessment=deal.conflict?'נמצאו רשומות סותרות לאותה עסקה. אין בסיס לבחור איזו מהן נכונה.':result.value===null?'הנתונים אינם מאפשרים להציג מחיר למ״ר במסגרת כללי הבדיקה.':deal.flags.some(f=>f.code==='ppsm_mismatch')?'קיים פער בין המחיר למ״ר המדווח בקובץ לבין מחיר העסקה חלקי השטח.':'אפשר לשחזר את החישוב מתוך הקובץ. אין בכך אימות מול מערכת הלקוח.';
 const calculation=result.value!==null?`${number(deal.price!)} ₪ ÷ ${number(deal.size!)} מ״ר = ${number(result.value)} ₪ למ״ר (מעוגל לשתי ספרות). המחיר למ״ר המדווח בקובץ: ${deal.reportedPpsm===null?'חסר':number(deal.reportedPpsm)}.`:`לא מוצג מחיר למ״ר קובע: ${result.excluded.map(r=>r.reason).join(' · ')}.`;
 const nextStep=deal.conflict?'לבקש צילום של התוצאה והמסננים מהלקוח, ולברר את הגרסאות הסותרות עם בעל מקור הנתונים. אין לתקן או לבחור מקור אוטומטית.':result.value===null?'לבקש את הנתון החסר או אימות של הנתון החריג מבעל המקור, וכן צילום של התוצאה שהלקוח ראה.':deal.flags.some(f=>f.code==='ppsm_mismatch')?'להשוות את המדד והיחידות בצילום הלקוח לחישוב ולערך המדווח, ולברר את הפער מול בעל המקור.':'לבקש צילום עם המדד והמסננים, ולוודא שהלקוח משווה לאותה עסקה ולאותה הגדרת חישוב.';
 const rows=deal.rows.map(String).join(', ');
 const customerReply=`תודה שהצפת את הפער. בדקנו את עסקה ${deal.id} בקובץ העסקאות שסופק. ${assessment} ${calculation} כדי להשוות לתוצאה שראית, נשמח לצילום עם המדד והמסננים. הבדיקה מתייחסת למדגם בלבד; עדיין אין בסיס לקבוע שיש תקלה במוצר או מה גרם לפער.`;
 const internalSummary=`בירור נתונים — ${deal.id}\nתאריך בדיקה: ${asOf}\nמקור: קובץ העסקאות שסופק, שורות ${rows}\nממצא: ${assessment}\nחישוב: ${calculation}\nאזהרות: ${findings.length?findings.join('; '):'לא זוהו דגלים לפי כללי הבדיקה'}\nהמשך: ${nextStep}\nלא ידוע: המספר שהלקוח ראה, המסננים, מצב הפרודקשן, סיבת הפער והיקף ההשפעה.\nלא נוצר טיקט ולא נשלחה הודעה ללקוח.`;
 return {dealId:deal.id,asOf,assessment,findings,calculation,nextStep,customerReply,internalSummary,sourceRows:[...deal.rows]};
}
export function metricCustomerReply(result:MetricResult){
 const names:Record<string,string>={city:'עיר',neighborhood:'שכונה',propertyType:'סוג נכס',roomsMin:'מחדרים',roomsMax:'עד חדרים',dateFrom:'מתאריך',dateTo:'עד תאריך',parking:'חניה',elevator:'מעלית',safeRoom:'ממ״ד'};
 const scope=Object.entries(result.filters).map(([k,v])=>`${names[k]??k}: ${typeof v==='boolean'?(v?'כן':'לא'):v}`).join(', ')||'כל המדגם';
 const answer=result.value===null?'אין די נתונים תקינים לחישוב המבוקש.':result.includedCount===0?'לא נמצאו בקובץ עסקאות התואמות לבקשה.':`${result.label}: ${number(result.value)} ${result.unit}, על בסיס ${result.includedCount} עסקאות.`;
 return `בדקנו בקובץ העסקאות שסופק. ${answer} מסננים: ${scope}. ${result.excluded.length?`${result.excluded.length} עסקאות הוחרגו לפי כללי הבדיקה. `:''}${result.includedCount>0&&result.includedCount<5?'זהו מדגם קטן. ':''}התוצאה מתארת את המדגם בלבד. להשוואה למספר אחר נצטרך צילום עם המדד והמסננים. אין בכך הערכת שווי או אימות של נתוני הפרודקשן.`;
}
