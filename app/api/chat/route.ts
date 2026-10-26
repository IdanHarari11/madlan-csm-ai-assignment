import {resolveSelection,planScopedQuery,executeScoped} from '../../../lib/scoped-investigation';
import {readBody,AppError,endpoint} from '../../../lib/http';
import {chatSchema} from '../../../lib/contracts';
import {dataset,today,plannerCatalogue,DATA_VERSION} from '../../../lib/data';
import {executePlan} from '../../../lib/investigation';
import {generator,modelReady,planQuery} from '../../../lib/ai';
import {getEnv,reserveAI,identity} from '../../../lib/server';
import {reconstructContext} from '../../../lib/conversation-context';
import {chatStream,chatFailure} from '../../../lib/chat-stream';
import type {ChatStage} from '../../../lib/chat-stream';
export async function POST(request:Request){
 const traceId=crypto.randomUUID(),started=Date.now();
 try{
  const b=await readBody(request,chatSchema),e=getEnv();
  if(!modelReady(e))throw new AppError('MODEL_NOT_CONFIGURED',503,'ה־AI עדיין לא מחובר. אפשר להריץ דוגמאות בדיקה ישירה; לא הופק מענה AI.');
  if(b.memory?.length&&b.dataVersion!==DATA_VERSION)throw new AppError('CONTEXT_STALE',409,'גרסת הנתונים השתנתה. רעננו את הדף כדי להתחיל הקשר מעודכן.');
  const asOf=today(),deals=dataset(asOf),selected=resolveSelection(deals,b.selectedIds??[]);
  const context=reconstructContext(deals,b.memory??[],b.selectedIds??[],asOf,DATA_VERSION);
  const {user}=await identity();await reserveAI(request,user?.userId);
  const run=async(progress:(stage:ChatStage)=>void,signal:AbortSignal)=>{
   if(signal.aborted)throw new DOMException('Operation cancelled','AbortError');
   progress('planning');
   const gen=generator(e,fetch,signal),history=b.memory?.length?context.history:b.history??[];
   const p=selected.length?await planScopedQuery(gen,b.message,history,plannerCatalogue(asOf),selected,context.state):await planQuery(gen,b.message,history,plannerCatalogue(asOf),context.state);
   if(signal.aborted)throw new DOMException('Operation cancelled','AbortError');
   if(p.intent!=='unsupported'&&p.intent!=='clarify')progress('executing');
   const answer=selected.length?executeScoped(selected,p,asOf):executePlan(deals,p,asOf);
   console.info(JSON.stringify({event:'chat_complete',traceId,elapsedMs:Date.now()-started,scopeCount:selected.length,memorySteps:context.state.verifiedResults.length}));
   return {mode:'ai',plan:p,...answer,context:{dataVersion:DATA_VERSION,asOf,selectedIds:b.selectedIds??[],reconstructedSteps:context.state.verifiedResults.length}};
  };
  if(request.headers.get('accept')?.includes('text/event-stream'))return chatStream(run,request.signal,traceId);
  return endpoint(()=>run(()=>{},request.signal));
 }catch(error){return chatFailure(error,traceId);}
}
