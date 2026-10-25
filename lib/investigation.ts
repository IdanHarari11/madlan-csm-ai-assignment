import { calculateMetrics,getDealDetails,checkDataQuality } from './domain';
import type { Deal,Filters,Metric } from './domain';
export type ExecutablePlan={intent:string;filters:Filters;metric:Metric;dealId:string|null;clarification:string|null};
export function executePlan(deals:Deal[],p:ExecutablePlan,asOf:string){
 if(p.intent==='clarify')return {kind:'clarify',message:'נדרש חידוד כדי לבצע חיפוש אמין. ציינו עיר, מדד רצוי ותנאים רלוונטיים. אפשר גם להשתמש במסננים.',suggestedQuestion:p.clarification,tools:[]};
 if(p.intent==='unsupported')return {kind:'unsupported',message:'הבקשה חורגת ממה שאפשר לבדוק בנתונים ובכלים הזמינים. ניתן לחפש עסקאות, לחשב מדדים ולבדוק איכות נתונים. אין כאן הערכת שווי, מידע על לקוחות או גישה למערכת הפרודקשן.',tools:[]};
 if(p.intent==='quality')return {kind:'quality',message:'בדיקת איכות הנתונים הושלמה בקוד. חריגה היא סיבה לבדיקה ואינה הוכחה לבאג בתוכנה.',quality:checkDataQuality(deals),deals:deals.filter(d=>d.flags.length).slice(0,30),tools:['check_data_quality']};
 if(p.intent==='deal'){
  const d=getDealDetails(deals,p.dealId??'');
  return {kind:'deal',message:d?'נמצאו נתוני העסקה. הנתונים המקוריים והאזהרות מופיעים לצד החישוב.':'מזהה העסקה לא נמצא בקובץ שסופק.',deals:d?[d]:[],tools:['get_deal_details']};
 }
 const result=calculateMetrics(deals,p.filters,p.metric,asOf);
 const resultIds=new Set(result.evidenceIds);const excludedIds=new Set(result.excluded.map(d=>d.id));
 return {kind:'metric',message:result.value===null?'אין מספיק נתונים תקינים לחישוב המבוקש.':result.includedCount===0?'לא נמצאו עסקאות שתואמות למסננים.':'התוצאה חושבה בקוד מתוך העסקאות המוצגות בבסיס החישוב.',result,deals:deals.filter(d=>resultIds.has(d.id)||excludedIds.has(d.id)),tools:['find_deals','calculate_metrics']};
}
