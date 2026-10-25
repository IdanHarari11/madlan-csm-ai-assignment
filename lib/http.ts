import { z } from 'zod';
export class AppError extends Error { constructor(public code:string,public status:number,public userMessage:string){super(code);} }
export async function readBody<T>(request:Request,schema:z.ZodType<T>):Promise<T>{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AppError('ORIGIN_DENIED',403,'הבקשה הגיעה ממקור לא מורשה.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('CONTENT_TYPE',415,'נדרש תוכן JSON.');
 const reader=request.body?.getReader();if(!reader)throw new AppError('EMPTY_BODY',400,'הבקשה ריקה.');
 let size=0;const parts:Uint8Array[]=[];
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>20000){await reader.cancel();throw new AppError('BODY_TOO_LARGE',413,'הבקשה ארוכה מדי.');}parts.push(r.value);}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
 try{return schema.parse(JSON.parse(new TextDecoder().decode(bytes)));}catch{throw new AppError('INVALID_INPUT',400,'יש לבדוק את השדות, הטווחים והתאריכים שנשלחו.');}
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function endpoint(fn:(traceId:string)=>Promise<unknown>){const traceId=crypto.randomUUID();const started=Date.now();try{const result=await fn(traceId);console.info(JSON.stringify({traceId,event:'request_complete',elapsedMs:Date.now()-started}));return json({...result as object,traceId});}catch(e){const a=e instanceof AppError?e:new AppError('INTERNAL',500,'לא הצלחנו להשלים את הבקשה. אפשר לנסות שוב עם מזהה הבדיקה.');console.error(JSON.stringify({traceId,event:'request_failed',code:a.code,elapsedMs:Date.now()-started}));return json({error:{code:a.code,message:a.userMessage},traceId},a.status);}}
