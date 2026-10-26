import {AppError,json} from './http';
export type ChatStage='planning'|'executing';
export function safeChatError(error:unknown){return error instanceof AppError?error:new AppError('INTERNAL',500,'לא הצלחנו להשלים את הבקשה. אפשר לנסות שוב עם מזהה הבדיקה.');}
export function chatStream(run:(progress:(stage:ChatStage)=>void,signal:AbortSignal)=>Promise<object>,requestSignal:AbortSignal,traceId:string){
 const abort=new AbortController();let closed=false;
 const stop=()=>{if(!abort.signal.aborted){abort.abort(new DOMException('Operation cancelled','AbortError'));console.info(JSON.stringify({event:'chat_stream_cancelled',traceId}));}};
 if(requestSignal.aborted)stop();else requestSignal.addEventListener('abort',stop,{once:true});
 const stream=new ReadableStream<Uint8Array>({
  start(controller){void(async()=>{
   const encoder=new TextEncoder();
   const send=(type:string,data:unknown)=>{if(closed||abort.signal.aborted)return;controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));};
   try{if(abort.signal.aborted)return;const result=await run(stage=>send('progress',{stage,traceId}),abort.signal);if(!abort.signal.aborted){send('result',{...result,traceId});console.info(JSON.stringify({event:'chat_stream_complete',traceId}));}}
   catch(error){if(!abort.signal.aborted){const e=safeChatError(error);send('error',{error:{code:e.code,message:e.userMessage},traceId});console.error(JSON.stringify({event:'chat_stream_failed',traceId,code:e.code}));}}
   finally{requestSignal.removeEventListener('abort',stop);if(!closed){closed=true;controller.close();}}
  })();},
  cancel(){closed=true;stop();requestSignal.removeEventListener('abort',stop);}
 });
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','Vary':'Accept','X-Trace-ID':traceId}});
}
export function chatFailure(error:unknown,traceId:string){const e=safeChatError(error);console.error(JSON.stringify({event:'chat_preflight_failed',traceId,code:e.code}));return json({error:{code:e.code,message:e.userMessage},traceId},e.status);}
