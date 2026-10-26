import { buildCustomerCase,metricCustomerReply } from './customer-case';
import { calculateMetrics,getDealDetails,checkDataQuality,findDeals } from './domain';
import type { Deal,Filters,Metric } from './domain';
export type ExecutablePlan={intent:string;filters:Filters;metric:Metric;dealId:string|null;clarification:string|null};
export function executePlan(deals:Deal[],p:ExecutablePlan,asOf:string){
 if(p.intent==='clarify')return {kind:'clarify',message:'נדרש חידוד כדי לבצע חיפוש אמין. ציינו עיר, מדד רצוי ותנאים רלוונטיים.',suggestedQuestion:p.clarification,tools:[]};
 if(p.intent==='unsupported')return {kind:'unsupported',message:'הבקשה חורגת ממה שאפשר לבדוק בנתונים ובכלים הזמינים. ניתן לחפש עסקאות, לחשב מדדים ולבדוק איכות נתונים. אין כאן הערכת שווי, מידע על לקוחות או גישה למערכת הפרודקשן.',tools:[]};
 if(p.intent==='quality'){
  const {matches,excludedPartialDates}=findDeals(deals,p.filters);
  return {kind:'quality',message:'בדיקת איכות הנתונים הושלמה בקוד עבור העסקאות התואמות לבקשה. חריגה היא סיבה לבדיקה ואינה הוכחה לבאג בתוכנה.',quality:{...checkDataQuality(matches),filters:p.filters,excludedPartialDates,asOf},deals:matches.filter(d=>d.flags.length),tools:['find_deals','check_data_quality']};
 }
 if(p.intent==='deal'){
  const d=getDealDetails(deals,p.dealId??'');
  return {kind:'deal',message:d?'נמצאו נתוני העסקה. הנתונים המקוריים והאזהרות מופיעים לצד החישוב.':'מזהה העסקה לא נמצא בקובץ שסופק.',deals:d?[d]:[],customerCase:d?buildCustomerCase(d,asOf):undefined,tools:['get_deal_details']};
 }
 if(p.intent==='evidence'){
  const evidenceBasis=calculateMetrics(deals,p.filters,p.metric,asOf),ids=new Set(evidenceBasis.evidenceIds);
  return {kind:'evidence',message:evidenceBasis.includedCount===0?'לא נכללו עסקאות תקינות בחישוב הקודם.':evidenceBasis.includedCount===1?'זו העסקה שנכללה בחישוב הקודם.':`אלה ${evidenceBasis.includedCount} העסקאות שנכללו בחישוב הקודם.`,evidenceBasis,deals:deals.filter(d=>ids.has(d.id)),tools:['inspect_calculation_evidence']};
 }
 const result=calculateMetrics(deals,p.filters,p.metric,asOf);
 const resultIds=new Set(result.evidenceIds);const excludedIds=new Set(result.excluded.map(d=>d.id));
 return {kind:'metric',message:result.value===null?'אין מספיק נתונים תקינים לחישוב המבוקש.':result.includedCount===0?'לא נמצאו עסקאות שתואמות למסננים.':'התוצאה חושבה בקוד מתוך העסקאות המוצגות בבסיס החישוב.',result,customerReply:metricCustomerReply(result),deals:deals.filter(d=>resultIds.has(d.id)||excludedIds.has(d.id)),tools:['find_deals','calculate_metrics']};
}
