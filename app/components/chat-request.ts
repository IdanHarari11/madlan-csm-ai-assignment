import type {Investigation} from './chat-types';
export type ProgressStage='planning'|'executing';
export const stageText:Record<ProgressStage,string>={planning:'מפרש את הבקשה וההקשר…',executing:'התוכנית אומתה. בודק נתונים ומחשב…'};
async function consumeChat(body:unknown,onProgress:(stage:ProgressStage)=>void,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<Investigation>{
 const response=await fetcher('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(45000)])});
 if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')){
  const value=await response.json() as Investigation&{error?:{message?:string};traceId?:string};if(!response.ok)throw new Error((value.error?.message??'הבקשה נכשלה.')+(value.traceId?' · מזהה בדיקה: '+value.traceId:''));return value as Investigation;
 }
 if(!response.body)throw new Error('לא התקבלה זרימת תשובה. אפשר לנסות שוב.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',bytes=0,traceId=response.headers.get('x-trace-id')??'';
 try{for(;;){if(signal.aborted)throw new DOMException('Cancelled','AbortError');const {value,done}=await reader.read();if(done)throw new Error('החיבור הסתיים לפני שהתקבלה תוצאה מלאה. אפשר לנסות שוב.');bytes+=value.byteLength;if(bytes>4*1024*1024)throw new Error('התשובה ארוכה מדי. צמצמו את הבקשה.');buffer+=decoder.decode(value,{stream:true});
  let match:RegExpExecArray|null;
  while((match=/\r?\n\r?\n/.exec(buffer))){const frame=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const lines=frame.split(/\r?\n/),event=lines.find(l=>l.startsWith('event:'))?.slice(6).trim(),data=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data)continue;const payload=JSON.parse(data);if(typeof payload.traceId==='string')traceId=payload.traceId.slice(0,100);
   if(event==='progress'){if(payload.stage==='planning'||payload.stage==='executing')onProgress(payload.stage);}
   if(event==='error')throw new Error((payload.error?.message??'הבדיקה לא הושלמה.')+(payload.traceId?' · מזהה בדיקה: '+payload.traceId:''));
   if(event==='result'){if(typeof payload.kind!=='string'||typeof payload.message!=='string'||!Array.isArray(payload.tools))throw new Error('התקבלה תשובה לא תקינה.');return payload as Investigation;}
  }
 }}catch(error){if(error instanceof Error&&error.name==='AbortError')throw error;const message=error instanceof TypeError?'החיבור לשרת נותק. לא התקבלה תוצאה מאומתת.':error instanceof SyntaxError?'זרימת התשובה לא הייתה תקינה.':error instanceof Error&&error.name==='TimeoutError'?'הבדיקה לא הושלמה בזמן. אפשר לנסות שוב.':error instanceof Error?error.message:'לא ניתן לקרוא את התשובה.';throw new Error(message+(traceId&&!message.includes(traceId)?' · מזהה בדיקה: '+traceId:''));}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export async function requestChat(body:unknown,onProgress:(stage:ProgressStage)=>void,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<Investigation>{
 try{return await consumeChat(body,onProgress,signal,fetcher);}catch(error){
  if(error instanceof Error&&error.name==='TimeoutError')throw new Error('הבדיקה לא הושלמה בזמן. אפשר לנסות שוב.');
  if(error instanceof TypeError)throw new Error('החיבור לשרת נותק. לא התקבלה תוצאה מאומתת; אפשר לנסות שוב.');
  if(error instanceof SyntaxError)throw new Error('זרימת התשובה לא הייתה תקינה. לא הוצגה תוצאה חלקית.');
  throw error;
 }
}
