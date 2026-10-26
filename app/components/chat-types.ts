import type {CustomerCase} from '../../lib/customer-case';
import type { Deal,Filters,Impact,MetricResult } from '../../lib/domain';
import type { DraftPayload } from '../../lib/task-service';
export type ServiceStatus={dataset:{asOf:string;version:string};modelReady:boolean;jiraReady:boolean;canCreate:boolean;user:{displayName:string}|null};
export type Investigation={kind:string;message:string;tools:string[];context?:{dataVersion:string;asOf:string;selectedIds:string[];reconstructedSteps?:number;restored?:boolean};scopeIds?:string[];comparison?:{id:string;city:string;street:string;propertyType:string;rooms:number|null;size:number|null;price:number|null;ppsm:number|null;date:string|null;parking:boolean|null;elevator:boolean|null;safeRoom:boolean|null;balcony:boolean|null;yearBuilt:number|null;floor:number|null;conflict:boolean;notes:string[]}[];customerCase?:CustomerCase;customerReply?:string;deals?:Deal[];result?:MetricResult;quality?:{counts:Record<string,number>;uniqueDeals:number;conflictingDeals:number;flaggedDeals:number;filters?:Filters;excludedPartialDates?:number;asOf?:string};mode?:string;traceId?:string;suggestedQuestion?:string|null;plan?:unknown};
export type TurnScope={selectedIds:string[];filters:Filters;asOf:string;dataVersion:string};
export type Turn={id:string;question:string;scope?:TurnScope;response?:Investigation;error?:string};
export type Draft=DraftPayload&{draftId:string;revision:number;expiresAt:number};
export type TaskContext={turnId:string;request:string;evidenceIds:string[]};
export type IssueResult={state:string;issueKey?:string;url?:string;candidates?:{key:string;summary:string;url:string}[]};
export const initialImpact:Impact={production:null,affectedCustomers:null,workaround:null,impact:'unknown',deadline:null};
export const format=(n:number|null)=>n===null?'—':new Intl.NumberFormat('he-IL',{maximumFractionDigits:0}).format(n);
export async function requestJSON<T>(path:string,body?:unknown,method='POST',signal?:AbortSignal):Promise<T>{
 let response:Response;
 try{response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});}
 catch(e){if(e instanceof Error&&e.name==='TimeoutError')throw new Error('הבקשה לא הושלמה בזמן. אפשר לנסות שוב; לא נשלח ניסיון חוזר אוטומטי.');throw e;}
 const data=await response.json() as {error?:{message?:string};traceId?:string};
 if(!response.ok)throw new Error((data.error?.message??'לא הצלחנו להשלים את הבקשה.')+(data.traceId?' · מזהה בדיקה: '+data.traceId:''));
 return data as T;
}
