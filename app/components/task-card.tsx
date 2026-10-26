'use client';
import { useState } from 'react';
import { FileCheck2,ArrowLeft,Check,LoaderCircle,ExternalLink,X,Copy } from 'lucide-react';
import { prioritize } from '../../lib/domain';
import type { Impact } from '../../lib/domain';
import type { TaskContent } from '../../lib/contracts';
import { initialImpact,requestJSON } from './chat-types';
import type { ServiceStatus,Draft,TaskContext,IssueResult } from './chat-types';
type Step='request'|'impact'|'production'|'customers'|'workaround'|'deadline'|'review';
const impactNames:Record<Impact['impact'],string>={unknown:'לא ידוע עדיין',incorrect_data:'מידע שגוי',blocked:'פעולה חסומה',cosmetic:'בעיה בתצוגה',enhancement:'בקשת שיפור'};
export default function TaskCard({context,status,onClose,onBusyChange}:{context:TaskContext;status:ServiceStatus|null;onClose:()=>void;onBusyChange:(busy:boolean)=>void}){
 const [step,setStep]=useState<Step>('request'),[request,setRequest]=useState(context.request),[impact,setImpact]=useState<Impact>({...initialImpact});
 const [draft,setDraft]=useState<Draft|null>(null),[edited,setEdited]=useState<TaskContent|null>(null),[editMode,setEditMode]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[approved,setApproved]=useState(false),[issue,setIssue]=useState<IssueResult|null>(null),[copied,setCopied]=useState(false);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const priority=prioritize(impact,today);
 async function prepare(){
  if(busy)return;setBusy(true);onBusyChange(true);setError('');
  try{const d=await requestJSON<Draft>('/api/drafts',{request,evidenceIds:context.evidenceIds,impact});setDraft(d);setEdited(d.content);setApproved(false);setStep('review');}
  catch(e){setError(e instanceof Error?e.message:'לא הצלחנו להכין טיוטה.');}finally{setBusy(false);onBusyChange(false);}
 }
 async function send(){
  if(!draft||!edited||!approved||busy)return;setBusy(true);onBusyChange(true);setError('');
  try{const saved=await requestJSON<Draft>('/api/drafts',{draftId:draft.draftId,revision:draft.revision,content:edited,impact},'PATCH');setDraft(saved);const r=await requestJSON<IssueResult>('/api/issues',{draftId:saved.draftId,revision:saved.revision,approved:true});setIssue(r);setApproved(false);}
  catch(e){setError(e instanceof Error?e.message:'הבקשה לא הושלמה.');}finally{setBusy(false);onBusyChange(false);}
 }
 function update(p:Partial<Impact>,next:Step){setImpact(i=>({...i,...p}));setStep(next);setApproved(false);}
 function choices<T extends string|boolean|null>(items:{label:string;value:T}[],choose:(v:T)=>void){return <div className="choice-buttons">{items.map((c,i)=><button key={i} className="option" onClick={()=>choose(c.value)}>{c.label}</button>)}</div>;}
 return <section className="task-card" aria-labelledby={'task-'+context.turnId}>
  <div className="task-heading"><FileCheck2 size={17}/><h3 id={'task-'+context.turnId}>{draft?'טיוטת משימה':'נכין משימת המשך'}</h3><button className="icon-button" disabled={busy} onClick={onClose} aria-label="סגירת הכנת המשימה"><X size={17}/></button></div>
  {!status?.canCreate?<p>{status?.user?'החשבון שלך מחובר, אך יצירת משימות דורשת הרשאת CSM.':<>כדי להכין ולשלוח משימות, צריך <a className="inline-link" href="/auth/sign-in" target="_top">להתחבר כ־CSM מורשה</a>. השיחה תישמר בלשונית הזו.</>}</p>:<>
   {step!=='request'&&step!=='review'&&<p className="context-hint">כמה שאלות קצרות כדי לתעדף נכון. אפשר לבחור ״לא ידוע״ — לא נשלים מידע בניחוש.</p>}
   {step==='request'&&<><p>{context.evidenceIds.length?`צורפו ${context.evidenceIds.length} עסקאות כראיות. `:'למשימת נתונים נדרשות עסקאות מסומנות. בקשת פיצ׳ר אינה דורשת עסקה. '}מה בדיוק צריך לבדוק או לשנות?</p><label className="sr-only" htmlFor={'task-request-'+context.turnId}>תיאור המשימה</label><textarea id={'task-request-'+context.turnId} value={request} onChange={e=>setRequest(e.target.value)} maxLength={2000} placeholder="תיאור הבעיה או השינוי המבוקש…"/><button className="primary" disabled={request.trim().length<15} onClick={()=>setStep('impact')}>המשך<ArrowLeft size={15}/></button></>}
   {step==='impact'&&<><p className="question-label">מה ההשפעה בפועל?</p>{choices(Object.entries(impactNames).map(([value,label])=>({value:value as Impact['impact'],label})),v=>update({impact:v},v==='enhancement'||v==='cosmetic'?'deadline':'production'))}</>}
   {step==='production'&&<><p className="question-label">האם הבעיה מתרחשת עכשיו בפרודקשן?</p>{choices([{label:'כן',value:true},{label:'לא',value:false},{label:'לא ידוע',value:null}],v=>update({production:v},'customers'))}</>}
   {step==='customers'&&<><p className="question-label">כמה לקוחות מושפעים לפי המידע שבידך?</p><label htmlFor={'customer-count-'+context.turnId}>מספר לקוחות<input id={'customer-count-'+context.turnId} type="number" min={0} max={100000000} value={impact.affectedCustomers??''} onChange={e=>setImpact({...impact,affectedCustomers:e.target.value===''?null:Number(e.target.value)})} placeholder="מספר ידוע בלבד"/></label><div className="choice-buttons"><button className="primary" disabled={impact.affectedCustomers===null||!Number.isInteger(impact.affectedCustomers)||impact.affectedCustomers<0||impact.affectedCustomers>100000000} onClick={()=>setStep('workaround')}>המשך</button><button className="option" onClick={()=>update({affectedCustomers:null},'workaround')}>לא ידוע</button></div></>}
   {step==='workaround'&&<><p className="question-label">האם קיים פתרון זמני?</p>{choices([{label:'כן',value:true},{label:'לא',value:false},{label:'לא ידוע',value:null}],v=>update({workaround:v},'deadline'))}</>}
   {step==='deadline'&&<><p className="question-label">יש דדליין מחייב?</p><label htmlFor={'deadline-'+context.turnId}>תאריך יעד (אם ידוע)<input id={'deadline-'+context.turnId} type="date" value={impact.deadline??''} onChange={e=>setImpact({...impact,deadline:e.target.value||null})}/></label><Priority impact={impact} today={today}/><button className="primary" disabled={busy} onClick={prepare}>{busy?<LoaderCircle className="spin" size={16}/>:<FileCheck2 size={16}/>}הכנת טיוטה לבדיקה</button><button className="text-button" disabled={busy} onClick={()=>setStep('request')}>חזרה לתיאור ולהקשר</button></>}
   {step==='review'&&draft&&edited&&<><div className="task-priority"><span className={'priority-tag '+priority.priority.toLowerCase()}>{priority.priority==='TRIAGE'?'נדרש בירור לתעדוף':priority.priority}</span><span>{impactNames[impact.impact]}</span></div><h4>{edited.title}</h4><p className="proposal-label">ניסוח מוצע — יש לבדוק מול הראיות</p><p>{edited.description}</p><p><strong>התנהגות רצויה:</strong> {edited.expectedBehavior}</p><ul>{edited.acceptanceCriteria.map((c,i)=><li key={i}>{c}</li>)}</ul><Priority impact={impact} today={today}/>
    <details><summary>הראיות והמידע החסר</summary>{draft.facts.map((f,i)=><p className="small" key={i}>{f}</p>)}{edited.unknowns.map((u,i)=><p key={i}>{u}</p>)}</details>
    <button className="text-button" disabled={busy||Boolean(issue)} onClick={()=>{setEditMode(!editMode);setApproved(false);}}>{editMode?'סיום עריכה':'עריכת הטיוטה'}</button>
    {editMode&&<div className="edit-draft"><label>כותרת<input value={edited.title} maxLength={140} onChange={e=>{setEdited({...edited,title:e.target.value});setApproved(false);}}/></label><label>תיאור<textarea value={edited.description} maxLength={1800} onChange={e=>{setEdited({...edited,description:e.target.value});setApproved(false);}}/></label><label>התנהגות רצויה<textarea value={edited.expectedBehavior} maxLength={800} onChange={e=>{setEdited({...edited,expectedBehavior:e.target.value});setApproved(false);}}/></label><label>קריטריוני קבלה (שורה לכל קריטריון)<textarea value={edited.acceptanceCriteria.join('\n')} onChange={e=>{setEdited({...edited,acceptanceCriteria:e.target.value.split('\n')});setApproved(false);}}/></label></div>}
    {!issue&&<><label className="approval"><input type="checkbox" checked={approved} disabled={busy||editMode} onChange={e=>setApproved(e.target.checked)}/>בדקתי את הראיות, ההקשר והתעדוף. אני מאשר/ת את יצירת המשימה הזו.</label><div className="task-actions"><button className="primary" disabled={!approved||busy||!status.jiraReady||editMode} onClick={send}>{busy?<LoaderCircle className="spin" size={16}/>:<ExternalLink size={16}/>}יצירה ב־Jira</button><button className="option" onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify({...draft,content:edited},null,2));setCopied(true);}catch{setError('ההעתקה לא הצליחה.');}}}><Copy size={14}/>{copied?'הועתק':'העתקת הטיוטה'}</button></div>{!status.jiraReady&&<p className="context-hint">Jira עדיין אינו מחובר. הטיוטה לא תישלח עד לחיבור.</p>}</>}
    {issue&&<div className="issue-result" role="status">{issue.state==='created'?<p><Check size={16}/>המשימה נוצרה: {issue.url?<a href={issue.url} target="_blank" rel="noreferrer">{issue.issueKey}</a>:issue.issueKey}</p>:<><p>נמצאו משימות דומות. לא נוצרה משימה נוספת.</p>{issue.candidates?.map(c=><p key={c.key}><a href={c.url} target="_blank" rel="noreferrer">{c.key} — {c.summary}</a></p>)}</>}</div>}
   </>}
  </>}
  {error&&<p role="alert" className="error-message">{error}</p>}
 </section>;
}
function Priority({impact,today}:{impact:Impact;today:string}){const p=prioritize(impact,today);return <div className="priority-explanation"><strong>עדיפות מוצעת: {p.priority==='TRIAGE'?'נדרש בירור':p.priority}</strong><p>{p.reason}</p>{p.missing.length>0&&<ul>{p.missing.map(m=><li key={m}>{m}</li>)}</ul>}</div>;}
