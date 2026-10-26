'use client';
import { useEffect,useRef,useState } from 'react';
import { ArrowUp,Plus,MessageCircle,LoaderCircle,Square,RotateCcw } from 'lucide-react';
import ChatAnswer from './components/chat-answer';
import TaskCard from './components/task-card';
import { requestJSON } from './components/chat-types';
import {requestChat,stageText} from './components/chat-request';
import type {ProgressStage} from './components/chat-request';
import type {Deal} from '../lib/domain';
import {CHAT_STORAGE_KEY,serializeConversation,restoreConversation,conversationRequest,turnScopeLabel} from '../lib/conversation-session';
import {memoryPlanSchema} from '../lib/contracts';
import type { Investigation,ServiceStatus,TaskContext,Turn } from './components/chat-types';
const EXAMPLES=[
 {label:'מה חציון המחיר למ״ר בדירות 4 חדרים בחולון?',kind:'metric'},
 {label:'בדוק את פרטי העסקה D100017',kind:'deal'},
 {label:'אילו בעיות יש בנתונים?',kind:'quality'},
] as const;
const STORAGE_KEY=CHAT_STORAGE_KEY;
export default function Desk({embedded=false,selectedIds=[],onResults,sourceDeals=[],dataVersion='madlan-sample-v1',asOf=new Date().toISOString().slice(0,10)}:{embedded?:boolean;selectedIds?:string[];sourceDeals?:Deal[];dataVersion?:string;asOf?:string;onResults?:(filters:import('../lib/domain').Filters)=>void}={}){
 const [status,setStatus]=useState<ServiceStatus|null>(null),[serviceError,setServiceError]=useState(false);
 const [turns,setTurns]=useState<Turn[]>([]),[question,setQuestion]=useState(''),[pendingId,setPendingId]=useState<string|null>(null),[task,setTask]=useState<TaskContext|null>(null),[taskBusy,setTaskBusy]=useState(false),[ready,setReady]=useState(false);
 const turnSequence=useRef(0),scopeKey=[...selectedIds].sort().join(','),previousScope=useRef(scopeKey);
 const [storageAvailable,setStorageAvailable]=useState(true);
 const [progress,setProgress]=useState<ProgressStage|null>(null);
 const input=useRef<HTMLTextAreaElement>(null),bottom=useRef<HTMLDivElement>(null),controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  const abort=new AbortController();
  requestJSON<ServiceStatus>('/api/status',undefined,'GET',abort.signal).then(setStatus).catch(e=>{if(!(e instanceof Error&&e.name==='AbortError'))setServiceError(true);});
  try{setTurns(restoreConversation(sessionStorage.getItem(STORAGE_KEY),sourceDeals,dataVersion,asOf));}catch{setStorageAvailable(false);}
  setReady(true);return()=>{abort.abort();controller.current?.abort();};
 },[]);
 useEffect(()=>{if(!ready)return;try{sessionStorage.setItem(STORAGE_KEY,serializeConversation(turns,dataVersion));}catch{setStorageAvailable(false);}},[turns,ready,dataVersion]);
 useEffect(()=>{if(turns.length||pendingId||task){const container=bottom.current?.parentElement;if(embedded&&container)container.scrollTo({top:container.scrollHeight,behavior:'auto'});else bottom.current?.scrollIntoView({behavior:'auto',block:'end'});}},[turns,pendingId,task]);
 useEffect(()=>{if(previousScope.current===scopeKey)return;previousScope.current=scopeKey;controller.current?.abort();controller.current=null;setTurns(ts=>ts.map(t=>t.id===pendingId&&!t.response?{...t,error:'הבחירה השתנתה והבקשה הקודמת בוטלה.'}:t));setPendingId(null);setProgress(null);setTask(null);setQuestion('');},[scopeKey]);
 async function send(text=question,preset?:typeof EXAMPLES[number]['kind']){
  const q=text.trim();if(q.length<2||q.length>2000||pendingId||controller.current||taskBusy)return;
  const id=`turn-${Date.now()}-${++turnSequence.current}`,abort=new AbortController();controller.current=abort;
  const body=conversationRequest(q,turns,selectedIds,dataVersion),scope={selectedIds:[...selectedIds],filters:{},asOf,dataVersion};
  setTurns(t=>[...t,{id,question:q,scope}]);setQuestion('');setProgress(null);setPendingId(id);
  try{
   let answer:Investigation;
   if(preset&&status&&!status.modelReady&&!selectedIds.length){
    // Only these explicit sample buttons use direct tools. Free text is never silently faked by rules.
    answer=preset==='quality'?await requestJSON<Investigation>('/api/quality',undefined,'GET',abort.signal):await requestJSON<Investigation>('/api/explore',preset==='deal'?{filters:{},metric:'count',dealId:'D100017'}:{filters:{city:'חולון',propertyType:'דירה',roomsMin:4,roomsMax:4},metric:'median_ppsm'},'POST',abort.signal);
   }else answer=await requestChat(body,stage=>{if(controller.current===abort)setProgress(stage);},abort.signal);
   if(controller.current!==abort)return;if(abort.signal.aborted)throw new DOMException('Cancelled','AbortError');
   if(!answer.plan&&preset){answer.plan={intent:preset==='deal'?'deal':preset==='quality'?'quality':'query',filters:preset==='metric'?{city:'חולון',propertyType:'דירה',roomsMin:4,roomsMax:4}:{},metric:preset==='metric'?'median_ppsm':'count',dealId:preset==='deal'?'D100017':null,clarification:null};}
   const planned=memoryPlanSchema.safeParse(answer.plan);const resolvedScope={...scope,asOf:answer.context?.asOf??asOf,filters:answer.result?.filters??answer.quality?.filters??(planned.success?planned.data.filters:{})};
   setTurns(t=>t.map(v=>v.id===id?{...v,response:answer,scope:resolvedScope}:v));if(answer.result&&!selectedIds.length)onResults?.(answer.result.filters);
  }catch(e){const error=e instanceof Error&&e.name==='AbortError'?'הבקשה בוטלה. לא תוצג תשובה חלקית כתוצאה מאומתת.':e instanceof Error&&e.name==='TimeoutError'?'הבדיקה לא הושלמה בזמן. אפשר לנסות שוב.':e instanceof Error?e.message:'לא הצלחנו להשלים את הבקשה. אפשר לנסות שוב.';setTurns(t=>t.map(v=>v.id===id?{...v,error}:v));}
  finally{if(controller.current===abort){controller.current=null;setPendingId(null);setProgress(null);input.current?.focus();}}
 }
 function reset(){if(pendingId||taskBusy)return;setTurns([]);setTask(null);setQuestion('');try{sessionStorage.removeItem(STORAGE_KEY);}catch{}input.current?.focus();}
 return <div className={'chat-app '+(embedded?'embedded-chat':'')}>
  <a className="skip-link" href="#conversation">דילוג לשיחה</a>
  {!embedded&&<header className="chat-header"><a className="chat-brand" href="/" aria-label="מדלן עוזר CSM"><span className="brand-symbol"><MessageCircle size={18}/></span><span>מדלן <span className="brand-divider">/</span> עוזר CSM</span></a><nav aria-label="פעולות שיחה"><a href="/guide">מדריך</a><button onClick={reset} disabled={Boolean(pendingId)||taskBusy}><Plus size={16}/><span>שיחה חדשה</span></button>{status?.user?<button className="account-name" title={status.user.displayName} onClick={async()=>{try{const response=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw new Error('SIGN_OUT_FAILED');window.location.assign('/');}catch{setServiceError(true);}}}>התנתקות</button>:status?.jiraReady?<a className="sign-in" href="/auth/sign-in" target="_top">התחברות CSM</a>:null}</nav></header>}
  {embedded&&<div className="embedded-toolbar"><button className="text-button" onClick={reset} disabled={Boolean(pendingId)}>ניקוי השיחה</button></div>}
  <main className={'chat-main '+(turns.length?'has-messages':'')} id="conversation">
   {!turns.length&&<section className="welcome"><span className="welcome-symbol"><MessageCircle size={27} strokeWidth={1.6}/></span><h1>{embedded?'מה תרצו לגלות?':'לקוח אומר שהמספר לא נכון?'}</h1><p>{embedded?'שאלו על העסקאות, בחרו כרטיסים למיקוד או השוו ביניהם.':'שלחו מזהה עסקה או תארו את הפער. נבדוק את המקור והחישוב ונכין נוסח לתשובה.'}</p><p className="welcome-note">מדגם עסקאות היסטוריות · ללא הערכת שווי</p><div className="suggestions" aria-label="שאלות לדוגמה">{(selectedIds.length? [{label:selectedIds.length>1?'השווה בין העסקאות שבחרתי':'הצג פרטים על העסקה שבחרתי',kind:'deal' as const}]:EXAMPLES).map(e=><button key={e.kind} disabled={!status||Boolean(pendingId)} onClick={()=>send(e.label,e.kind)}><span>{e.label}</span><ArrowUp size={14}/></button>)}</div></section>}
   <div className="conversation" role="log" aria-label="הודעות בשיחה" aria-live="polite" aria-relevant="additions text">
    {turns.map(t=><article key={t.id} className="chat-turn" aria-label={'שאלה: '+t.question}>
     {t.scope&&<div className="turn-scope" title={turnScopeLabel(t.scope)}>{turnScopeLabel(t.scope)} · {t.scope.asOf}{t.response?.context?.restored?' · שוחזר מהמדגם':''}</div>}
     <div className="user-message"><span className="sr-only">השאלה שלך: </span>{t.question}</div>
     <div className="assistant-message"><span className="assistant-icon" aria-hidden="true"><MessageCircle size={17}/></span><div className="assistant-body">
      {t.response&&<ChatAnswer answer={t.response} question={t.question} turnId={t.id} customerWorkflow={!embedded} taskEnabled={status?.jiraReady??false} onTask={context=>{if(!taskBusy)setTask(context);}}/>}
      {t.error&&<div className="chat-error"><p role="alert">{t.error}</p>{t.error.includes('בוטלה')?<button className="text-button" onClick={()=>setQuestion(t.question)}>עריכת השאלה</button>:<button className="text-button" disabled={Boolean(pendingId)||taskBusy} onClick={()=>setQuestion(t.question)}><RotateCcw size={13}/>החזרת השאלה לעריכה</button>}{!status?.modelReady&&<p className="small muted">אפשר לנסות דוגמה ישירה: <button className="text-button" disabled={Boolean(pendingId)||taskBusy} onClick={()=>send(EXAMPLES[1].label,'deal')}>בדיקת עסקה מהקובץ</button></p>}</div>}
      {pendingId===t.id&&<p className="thinking"><LoaderCircle size={15} className="spin"/>{progress?stageText[progress]:'ממתין לתחילת הבדיקה…'}</p>}
      {task?.turnId===t.id&&status?.jiraReady&&<TaskCard key={task.turnId+task.evidenceIds.join(',')} context={task} status={status} onClose={()=>setTask(null)} onBusyChange={setTaskBusy}/>}
     </div></div>
    </article>)}
   </div><div ref={bottom}/>
  </main>
  <div className="composer-area"><div className="composer-width">
   {serviceError&&<p role="alert" className="connection-note">לא הצלחנו לבדוק את זמינות השירות. אפשר לרענן את הדף.</p>}
   {status&&!status.modelReady&&<p className="connection-note">ה־AI עדיין ממתין לחיבור. השאלות לדוגמה מפעילות בדיקות ישירות בנתונים.</p>}
   <form className="composer" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor="chat-input">הודעה לעוזר</label><textarea id="chat-input" ref={input} value={question} maxLength={2000} rows={2} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}} placeholder={selectedIds.length?'שאלו על העסקאות שבחרתם…':'למשל: כמה דירות 4 חדרים יש בחולון?'} disabled={taskBusy}/>{pendingId?<button type="button" className="send-button stop-button" onClick={()=>controller.current?.abort()} aria-label="ביטול הבקשה"><Square size={14}/></button>:<button type="submit" className="send-button" disabled={question.trim().length<2||taskBusy} aria-label="שליחת הודעה"><ArrowUp size={19}/></button>}</form>
   {turns.some(t=>t.scope&&[...t.scope.selectedIds].sort().join(',')!==scopeKey)&&<p className="scope-history-note">תשובות קודמות נשמרו בהיקף המקורי שלהן. הבקשה הבאה תשתמש בבחירה הנוכחית.</p>}
   <p className="composer-note">{storageAvailable?'עד 20 סבבים נשמרים בלשונית זו':'לא ניתן לשמור שיחה במצב הדפדפן הנוכחי'} · תשובות מבוססות על מדגם העסקאות שסופק. פרטי המקור זמינים בכל תשובה.</p>
  </div></div>
 </div>;
}
