import { z } from 'zod';

export type RawDeal = Record<string, string>;
export type Flag = { code: string; message: string };
export type Deal = {
  id: string; rows: number[]; raw: RawDeal[]; city: string; neighborhood: string; street: string;
  propertyType: string; rooms: number | null; size: number | null; price: number | null;
  reportedPpsm: number | null; computedPpsm: number | null; date: string | null; datePrecision: 'day'|'month'|'invalid';
  floor: number | null; totalFloors: number | null; yearBuilt: number | null;
  parking: boolean | null; elevator: boolean | null; balcony: boolean | null; safeRoom: boolean | null;
  conflict: boolean; flags: Flag[];
};
export const text = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ');
const aliases: Record<string,string> = {
 'תל אביב':'תל אביב-יפו','תל אביב יפו':'תל אביב-יפו','ת״א':'תל אביב-יפו','ת"א':'תל אביב-יפו','Tel Aviv-Yafo':'תל אביב-יפו',
 'Jerusalem':'ירושלים','באר-שבע':'באר שבע','ב"ש':'באר שבע','ב״ש':'באר שבע','בית-שמש':'בית שמש',
 'מודיעין':'מודיעין מכבים רעות','מודיעין-מכבים-רעות':'מודיעין מכבים רעות'
};
export const cityName = (s:string) => aliases[text(s)] ?? text(s);
export function numberValue(s:string): number|null {
 const v=text(s).replace(/^₪\s*/, '');
 if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(v)) return null;
 const n=Number(v.replaceAll(',','')); return Number.isFinite(n)?n:null;
}
export function boolValue(s:string): boolean|null {
 const t=text(s).toLowerCase(); return ['כן','true','yes','1'].includes(t)?true:['לא','false','no','0'].includes(t)?false:null;
}
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function parseDate(s:string): {value:string|null; precision:'day'|'month'|'invalid'} {
 const t=text(s); let y:number,m:number,d:number;
 const a=t.match(/^(\d{4})-(\d{2})-(\d{2})$/), b=t.match(/^(\d{2})[/.](\d{2})[/.](\d{4})$/), c=t.match(/^([A-Za-z]{3}) (\d{4})$/);
 if(c && months.includes(c[1])) return {value:`${c[2]}-${String(months.indexOf(c[1])+1).padStart(2,'0')}`,precision:'month'};
 if(a) [,y,m,d]=a.map(Number); else if(b) { d=+b[1];m=+b[2];y=+b[3]; } else return {value:null,precision:'invalid'};
 const date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d?{value:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,precision:'day'}:{value:null,precision:'invalid'};
}
function normalize(raw:RawDeal, row:number, asOf:string): Deal {
 const flags:Flag[]=[]; const add=(code:string,message:string)=>flags.push({code,message});
 const positive=(key:string)=>{const v=numberValue(raw[key]??'');return v!==null&&v>0?v:null;};
 const price=positive('price_nis'), size=positive('size_sqm'),rooms=positive('rooms')??positiveTextRooms(raw.rooms);
 const date=parseDate(raw.deal_date),floor=numberValue(raw.floor),totalFloors=numberValue(raw.total_floors),yearBuilt=numberValue(raw.year_built);
 const reportedPpsm=positive('price_per_sqm'),computedPpsm=price!==null&&size!==null?price/size:null;
 if(price===null) add('invalid_price','מחיר חסר או לא תקין');
 if(size===null) add('invalid_size','שטח חסר או לא תקין');
 if(rooms===null) add('invalid_rooms','מספר חדרים חסר או לא תקין');
 if(!date.value) add('invalid_date','תאריך לא תקין');
 if(date.precision==='month') add('month_precision','התאריך ידוע ברמת חודש בלבד');
 if(date.value && (date.precision==='day'?date.value>asOf:date.value>asOf.slice(0,7))) add('future_date','תאריך העסקה מאוחר מתאריך הבדיקה');
 if(computedPpsm!==null&&reportedPpsm!==null&&Math.abs(computedPpsm-reportedPpsm)>Math.max(1,computedPpsm*.01)) add('ppsm_mismatch','המחיר למ״ר המדווח שונה מהחישוב ביותר מ־1%');
 if(floor!==null&&totalFloors!==null&&(floor>totalFloors||floor< -3)) add('floor_mismatch','הקומה אינה מתאימה למספר הקומות');
 if(yearBuilt!==null&&(yearBuilt<1800||yearBuilt>Number(asOf.slice(0,4)))) add('year_suspicious','שנת הבנייה דורשת בדיקה');
 if(size!==null&&(size<15||size>1000)) add('size_suspicious','שטח חריג דורש בדיקה');
 if(computedPpsm!==null&&(computedPpsm<2000||computedPpsm>200000)) add('price_suspicious','מחיר למ״ר חריג דורש בדיקה; אין הוכחה שהוא שגוי');
 if(!text(raw.neighborhood)) add('missing_neighborhood','שכונה חסרה');
 return {id:text(raw.deal_id),rows:[row],raw:[raw],city:cityName(raw.city),neighborhood:text(raw.neighborhood),street:text(raw.street),propertyType:text(raw.property_type),rooms,size,price,reportedPpsm,computedPpsm,date:date.value,datePrecision:date.precision,floor,totalFloors,yearBuilt,parking:boolValue(raw.has_parking),elevator:boolValue(raw.has_elevator),balcony:boolValue(raw.has_balcony),safeRoom:boolValue(raw.has_safe_room),conflict:false,flags};
}
function positiveTextRooms(s:string) { const m=text(s).match(/^(\d+(?:\.\d+)?) חדרים$/);return m&&+m[1]>0?+m[1]:null; }
export function normalizeDataset(raw:RawDeal[], asOf:string):Deal[] {
 const byId=new Map<string,Deal>();
 raw.forEach((r,i)=>{
  const d=normalize(r,i+2,asOf), old=byId.get(d.id);
  if(!old){byId.set(d.id,d);return;}
  old.rows.push(...d.rows);old.raw.push(r);
  // Sources and whitespace are not material differences. Every typed business field is.
  const fields: (keyof Deal)[]=['city','neighborhood','street','propertyType','rooms','size','price','reportedPpsm','date','datePrecision','floor','totalFloors','yearBuilt','parking','elevator','balcony','safeRoom'];
  const conflict=fields.some(k=>old[k]!==d[k])||text(old.raw[0].condition)!==text(r.condition);
  if(conflict){old.conflict=true;if(!old.flags.some(f=>f.code==='conflicting_duplicate')) old.flags.push({code:'conflicting_duplicate',message:'אותו מזהה מופיע עם נתונים סותרים; הוצא מחישובי מחיר'});}
  else if(!old.flags.some(f=>f.code==='duplicate')) old.flags.push({code:'duplicate',message:'מזהה חוזר עם אותם נתונים; נספר פעם אחת'});
 });
 return [...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
export const filterSchema=z.object({
 city:z.string().trim().min(1).max(80).optional(),neighborhood:z.string().trim().min(1).max(100).optional(),propertyType:z.enum(['דירה','בית פרטי','פנטהאוז','דירת גג','דופלקס','דירת גן']).optional(),
 roomsMin:z.number().min(.5).max(20).optional(),roomsMax:z.number().min(.5).max(20).optional(),
 dateFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),dateTo:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
 parking:z.boolean().optional(),elevator:z.boolean().optional(),safeRoom:z.boolean().optional(),
}).strict().superRefine((f,ctx)=>{
 if(f.roomsMin!==undefined&&f.roomsMax!==undefined&&f.roomsMin>f.roomsMax)ctx.addIssue({code:'custom',message:'טווח חדרים הפוך'});
 for(const k of ['dateFrom','dateTo'] as const)if(f[k]&&parseDate(f[k]!).precision==='invalid')ctx.addIssue({code:'custom',message:'תאריך לא תקין'});
 if(f.dateFrom&&f.dateTo&&f.dateFrom>f.dateTo)ctx.addIssue({code:'custom',message:'טווח תאריכים הפוך'});
});
export type Filters=z.infer<typeof filterSchema>;
export const metricSchema=z.enum(['count','median_price','mean_price','median_ppsm','mean_ppsm']);
export type Metric=z.infer<typeof metricSchema>;
export function findDeals(deals:Deal[], f:Filters):{matches:Deal[]; excludedPartialDates:number} {
 let excludedPartialDates=0;
 const matches=deals.filter(d=>{
  if(f.city&&d.city!==cityName(f.city))return false;
  if(f.neighborhood&&d.neighborhood!==text(f.neighborhood))return false;
  if(f.propertyType&&d.propertyType!==f.propertyType)return false;
  if(f.roomsMin!==undefined&&(d.rooms===null||d.rooms<f.roomsMin))return false;
  if(f.roomsMax!==undefined&&(d.rooms===null||d.rooms>f.roomsMax))return false;
  for(const k of ['parking','elevator','safeRoom'] as const)if(f[k]!==undefined&&d[k]!==f[k])return false;
  if(f.dateFrom||f.dateTo){
   if(!d.date)return false;
   if(d.datePrecision==='month'){
    const start=d.date+'-01'; const [y,m]=d.date.split('-').map(Number); const end=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
    if((f.dateFrom&&start<f.dateFrom)||(f.dateTo&&end>f.dateTo)){excludedPartialDates++;return false;}
   }else if((f.dateFrom&&d.date<f.dateFrom)||(f.dateTo&&d.date>f.dateTo))return false;
  }
  return true;
 });return {matches,excludedPartialDates};
}
export function getDealDetails(deals:Deal[],id:string){return deals.find(d=>d.id===id)??null;}
export function checkDataQuality(deals:Deal[]){
 const counts:Record<string,number>={};for(const d of deals)for(const f of d.flags)counts[f.code]=(counts[f.code]??0)+1;
 return {uniqueDeals:deals.length,sourceRows:deals.reduce((a,d)=>a+d.rows.length,0),flaggedDeals:deals.filter(d=>d.flags.length).length,conflictingDeals:deals.filter(d=>d.conflict).length,counts};
}
export const metricNames:Record<Metric,string>={count:'מספר עסקאות ייחודיות',median_price:'חציון מחיר עסקה',mean_price:'ממוצע מחיר עסקה',median_ppsm:'חציון מחיר למ״ר',mean_ppsm:'ממוצע מחיר למ״ר'};
export function calculateMetrics(deals:Deal[],filters:Filters,metric:Metric,asOf:string){
 const {matches,excludedPartialDates}=findDeals(deals,filters);const excluded:{id:string;reason:string}[]=[];
 const included=matches.filter(d=>{
  let reason='';
  if(metric!=='count'){
   if(d.conflict)reason='נתונים סותרים לאותו מזהה';
   else if(d.flags.some(f=>['future_date','price_suspicious','size_suspicious'].includes(f.code)))reason='נתון חשוד דורש בדיקה';
   else if(d.price===null)reason='מחיר חסר או לא תקין';
   else if(metric.endsWith('ppsm')&&d.computedPpsm===null)reason='שטח חסר או לא תקין';
  }
  if(reason)excluded.push({id:d.id,reason});return !reason;
 });
 const values=included.map(d=>metric.endsWith('ppsm')?d.computedPpsm!:d.price!).sort((a,b)=>a-b);
 const value=metric==='count'?included.length:values.length===0?null:metric.startsWith('median')?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:values.reduce((a,b)=>a+b,0)/values.length;
 const warnings=['הנתונים הם מדגם שסופק למטלה; אין להסיק מהם שווי נכס או תמונת שוק מייצגת.'];
 if(included.length>0&&included.length<5)warnings.push('מדגם קטן: פחות מ־5 עסקאות נכללו.');
 if(excluded.length)warnings.push('עסקאות עם נתונים חסרים, חשודים או סותרים הוחרגו מהחישוב.');
 if(excludedPartialDates)warnings.push('עסקאות עם תאריך ברמת חודש לא נכללו כאשר החודש אינו כלול במלואו בטווח.');
 return {tool:'calculate_metrics' as const,metric,label:metricNames[metric],value,unit:metric==='count'?'עסקאות':metric.endsWith('ppsm')?'₪ למ״ר':'₪',filters,asOf,matchedCount:matches.length,includedCount:included.length,evidenceIds:included.map(d=>d.id),excluded,excludedPartialDates,warnings,formula:metric==='count'?'ספירת מזהי עסקאות ייחודיים':metric.endsWith('ppsm')?'מחיר למ״ר = מחיר העסקה ÷ השטח; לאחר מכן חציון או ממוצע של היחסים, ללא שקלול שטח':'חציון או ממוצע מחירי עסקאות ייחודיות'};
}
export type MetricResult=ReturnType<typeof calculateMetrics>;
export const impactSchema=z.object({production:z.boolean().nullable(),affectedCustomers:z.number().int().min(0).max(100000000).nullable(),workaround:z.boolean().nullable(),impact:z.enum(['incorrect_data','blocked','cosmetic','enhancement','unknown']),deadline:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()}).strict().superRefine((v,c)=>{if(v.deadline&&parseDate(v.deadline).precision==='invalid')c.addIssue({code:'custom',message:'תאריך יעד לא תקין'});});
export type Impact=z.infer<typeof impactSchema>;
export function prioritize(i:Impact,today:string){
 const missing:string[]=[];
 if(i.impact==='unknown')missing.push('מה ההשפעה בפועל?');
 if(i.impact!=='enhancement'&&i.impact!=='cosmetic'){
 if(i.production===null)missing.push('האם התקלה פעילה בפרודקשן?');
 if(i.affectedCustomers===null)missing.push('כמה לקוחות מושפעים?');
 if(i.workaround===null)missing.push('האם קיים פתרון זמני?');
 }
 if(missing.length)return {priority:'TRIAGE',severity:i.impact,urgency:'unknown',reason:'אין מספיק מידע לתעדוף. הנתונים לבדם אינם מוכיחים פגיעה בלקוחות.',missing};
 const near=i.deadline!==null&&i.deadline>=today&&Date.parse(i.deadline)-Date.parse(today)<=2*86400000;
 if(i.production&&i.affectedCustomers!>0&&!i.workaround&&['incorrect_data','blocked'].includes(i.impact))return {priority:'P1',severity:i.impact,urgency:'high',reason:'דיווח CSM: פגיעה פעילה בלקוחות בפרודקשן ללא פתרון זמני.',missing};
 if((i.production&&i.affectedCustomers!>0)||near)return {priority:'P2',severity:i.impact,urgency:near?'high':'medium',reason:near?'קיים דדליין מדווח בטווח יומיים.':'דווחה השפעה בפרודקשן; לא מתקיימים תנאי P1.',missing};
 return {priority:'P3',severity:i.impact,urgency:'low',reason:'לא דווחה פגיעה פעילה בלקוחות או דחיפות קרובה. הדחיפות מבוססת על דיווח CSM.',missing};
}
