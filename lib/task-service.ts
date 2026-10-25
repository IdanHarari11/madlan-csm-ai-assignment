import type { TaskContent } from './contracts';
import { prioritize,text } from './domain';
import type { Impact } from './domain';
import { AppError } from './http';
import type { TaskStore,Operation } from './store';
import { hash } from './store';
import type { JiraPort } from './jira';
export type DraftPayload={content:TaskContent;request:string;impact:Impact;priority:ReturnType<typeof prioritize>;facts:string[];dataVersion:string;asOf:string};
export function validateEvidence(content:TaskContent,allowedIds:string[]){
 if(content.evidenceIds.some(id=>!allowedIds.includes(id)))throw new AppError('UNSUPPORTED_EVIDENCE',422,'המודל הפנה לעסקה שלא נכללה בחקירה. הטיוטה לא נשמרה.');
 if(content.category!=='feature_request'&&content.evidenceIds.length===0)throw new AppError('EVIDENCE_REQUIRED',422,'נדרשת לפחות עסקה אחת לביסוס משימת נתונים או באג חשוד.');
}
export async function fingerprint(p:DraftPayload){
 // Same records + category is a conservative duplicate gate, irrespective of AI wording.
 const scope=p.content.evidenceIds.length?[...p.content.evidenceIds].sort().join(','):text(p.request).toLowerCase();
 return hash(p.dataVersion+'|'+p.content.category+'|'+scope);
}
export function issueBody(p:DraftPayload){return [
 'טיוטה שנבדקה ואושרה על ידי CSM. אין כאן קביעה שהתקלה אומתה בפרודקשן.',
 'בקשת המקור (דיווח משתמש):',p.request,'',
 'סיווג מוצע: '+p.content.category,'עדיפות מוצעת לפי מדיניות: '+p.priority.priority,p.priority.reason,
 'הקשר מדווח על ידי CSM: '+JSON.stringify(p.impact),'',
 'תיאור מוצע על ידי AI — יש לאמת:',p.content.description,
 'התנהגות רצויה / דרישה מוצעת:',p.content.expectedBehavior,
 'קריטריוני קבלה מוצעים:',...p.content.acceptanceCriteria.map(x=>'• '+x),'',
 'עובדות שחושבו בקוד:',...p.facts,'מזהי עסקאות: '+p.content.evidenceIds.join(', '),
 'גרסת נתונים: '+p.dataVersion+' | תאריך בדיקה: '+p.asOf,
 'שאלות פתוחות:',...p.content.unknowns,...p.priority.missing
 ].join('\n');}
function existingResult(o:Operation){
 if(o.status==='created')return {state:'created',issueKey:o.issue_key,reused:true};
 if(o.status==='failed')throw new AppError('PREVIOUS_REJECTED',409,'ניסיון קודם נדחה. יש לבדוק את הגדרות Jira לפני ניסיון נוסף.');
 throw new AppError(o.status==='unknown'?'STATUS_UNKNOWN':'IN_PROGRESS',409,o.status==='unknown'?'תוצאת ניסיון קודם אינה ידועה. לא נשלח ניסיון נוסף כדי למנוע כפילות. יש לבדוק ב־Jira לפי מזהה הפעולה.':'המשימה כבר בתהליך יצירה. אין צורך לשלוח שוב.');
}
export async function createIssue(args:{store:TaskStore;jira:JiraPort;owner:string;draftId:string;expectedRevision:number;traceId:string;now:number}){
 const {store,jira,owner,draftId,traceId,now}=args;
 const draft=await store.getDraft(draftId,owner);if(!draft)throw new AppError('DRAFT_NOT_FOUND',404,'הטיוטה לא נמצאה או אינה שייכת לך.');
 if(draft.expires_at<now)throw new AppError('DRAFT_EXPIRED',410,'תוקף הטיוטה פג. יש להכין טיוטה מעודכנת.');
 if(draft.revision!==args.expectedRevision)throw new AppError('DRAFT_STALE',409,'הטיוטה השתנתה מאז הבדיקה. יש לפתוח ולאשר את הגרסה העדכנית.');
 const payload=JSON.parse(draft.payload) as DraftPayload;
 const previous=await store.getOperation(draft.id,draft.fingerprint);if(previous)return existingResult(previous);
 const operation:Operation={id:crypto.randomUUID(),draft_revision:draft.revision,draft_id:draft.id,owner,fingerprint:draft.fingerprint,status:'pending',issue_key:null,created_at:now,updated_at:now};
 // Reserve before external calls; uniqueness and quota checks share one DB transaction.
 if(!await store.reserve(operation)){
  const winner=await store.getOperation(draft.id,draft.fingerprint);if(winner)return existingResult(winner);throw new AppError('RESERVATION_FAILED',409,'היצירה כבר התחילה. יש לבדוק סטטוס.');
 }
 await store.log(traceId,owner,'jira_reserved',operation.id);
 let creating=false;
 try{
  const existing=await jira.findExisting(draft.fingerprint,payload.content.title);
  if(existing.length){await store.setState(operation.id,'failed');await store.log(traceId,owner,'jira_duplicate',existing[0].key);return {state:'duplicates',candidates:existing,operationId:operation.id};}
  creating=true;
  const issue=await jira.create({title:payload.content.title,body:issueBody(payload),fingerprint:draft.fingerprint,operationId:operation.id});
  await store.setState(operation.id,'created',issue.key);
  try{await store.log(traceId,owner,'jira_created',issue.key);}catch{console.error(JSON.stringify({traceId,event:'audit_write_failed_after_create',operationId:operation.id}));}
  return {state:'created',issueKey:issue.key,url:issue.url,operationId:operation.id,reused:false};
 }catch(e){
  // Search failures cannot create issues; any uncertain POST outcome must stay quarantined.
  const definite=e instanceof AppError&&e.code==='JIRA_REJECTED';
  await store.setState(operation.id,creating&&!definite?'unknown':'failed');
  await store.log(traceId,owner,'jira_failed',e instanceof AppError?e.code:'UNKNOWN');
  throw e;
 }
}
