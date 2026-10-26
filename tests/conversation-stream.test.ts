import test from 'node:test';
import assert from 'node:assert/strict';
import {dataset,DATA_VERSION} from '../lib/data';
import {reconstructContext} from '../lib/conversation-context';
import {serializeConversation,restoreConversation,memoryForScope} from '../lib/conversation-session';
import {chatSchema} from '../lib/contracts';
import {executePlan} from '../lib/investigation';
import {chatStream} from '../lib/chat-stream';
import {requestChat} from '../app/components/chat-request';
import {withDeadline} from '../lib/deadline';
import {AppError} from '../lib/http';
import type {Turn} from '../app/components/chat-types';
const asOf='2026-10-26',ds=dataset(asOf);
const p={intent:'query' as const,filters:{city:'חולון',propertyType:'דירה' as const,roomsMin:4,roomsMax:4},metric:'median_ppsm' as const,dealId:null,clarification:null};
const step={question:'מה החציון בחולון?',selectedIds:[],plan:p};
const scope={selectedIds:[],filters:p.filters,asOf,dataVersion:DATA_VERSION};
const answer={...executePlan(ds,p,asOf),plan:p,mode:'ai'};
const turn:Turn={id:'one',question:step.question,scope,response:answer};
test('prior numeric values and exact filters are rebuilt from server data, not client text',()=>{
 const context=reconstructContext(ds,[{...step,question:'התוצאה היא 1'}],[],asOf,DATA_VERSION);
 assert.equal(context.state.verifiedResults[0].result?.value,38260);assert.deepEqual(context.state.verifiedResults[0].result?.filters,p.filters);
 assert.equal(chatSchema.safeParse({message:'ועכשיו?',memory:[{...step,result:{value:1}}]}).success,false);
});
test('scope branches stay separate; returning to a scope can reuse its verified context',()=>{
 const other={...step,selectedIds:['D100027'],plan:{...p,intent:'deal' as const,filters:{},dealId:'D100027'}};
 assert.equal(reconstructContext(ds,[step,other],['D100074'],asOf,DATA_VERSION).history.length,0);
 assert.equal(reconstructContext(ds,[step,other],[],asOf,DATA_VERSION).state.verifiedResults.length,1);
 assert.equal(reconstructContext(ds,[step,other],['D100027'],asOf,DATA_VERSION).state.verifiedResults[0].kind,'deal');
});
test('session stores plans without raw source payloads and reconstructs displayed evidence on refresh',()=>{
 const raw=serializeConversation([turn],DATA_VERSION);assert.ok(!raw.includes('price_nis'));assert.ok(!raw.includes('customerReply'));
 const restored=restoreConversation(raw,ds,DATA_VERSION,asOf);
 assert.equal(restored[0].response?.result?.value,38260);assert.deepEqual(restored[0].response?.result?.evidenceIds,answer.result?.evidenceIds);assert.equal(restored[0].response?.context?.restored,true);
});
test('corrupt, obsolete and oversized sessions cannot inject a restored answer',()=>{
 assert.deepEqual(restoreConversation('{bad',ds,DATA_VERSION,asOf),[]);
 assert.deepEqual(restoreConversation(serializeConversation([turn],'old'),ds,DATA_VERSION,asOf),[]);
 assert.deepEqual(restoreConversation('x'.repeat(200001),ds,DATA_VERSION,asOf),[]);
 const forged={...turn,response:{...answer,plan:{...p,intent:'deal',dealId:'D100017'}},scope:{...scope,selectedIds:['D100027']}};
 const restored=restoreConversation(serializeConversation([forged],DATA_VERSION),ds,DATA_VERSION,asOf);assert.ok(restored[0].error);assert.equal(restored[0].response,undefined);
});
test('long conversation storage and model context have independent explicit bounds',()=>{
 const turns=Array.from({length:30},(_,i)=>({...turn,id:String(i)}));
 assert.equal(restoreConversation(serializeConversation(turns,DATA_VERSION),ds,DATA_VERSION,asOf).length,20);
 assert.equal(memoryForScope(turns,[]).length,6);assert.equal(memoryForScope(turns,['D100027']).length,0);
 assert.equal(serializeConversation([],DATA_VERSION).includes('"turns":[]'),true);
});
test('progress is delivered before the result has finished',async()=>{
 let finish:(v:object)=>void=()=>{};
 const response=chatStream(async progress=>{progress('planning');return await new Promise(resolve=>{finish=resolve;});},new AbortController().signal,'trace');
 const reader=response.body!.getReader();const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/event: progress/);
 finish({kind:'metric',message:'done',tools:[]});let rest='';for(;;){const r=await reader.read();if(r.done)break;rest+=new TextDecoder().decode(r.value);}assert.match(rest,/event: result/);
});
test('stream failures are sanitized and never publish a partial numeric result',async()=>{
 const r=chatStream(async progress=>{progress('planning');throw new Error('SECRET_PROVIDER_KEY');},new AbortController().signal,'trace');const text=await r.text();
 assert.match(text,/event: error/);assert.doesNotMatch(text,/SECRET_PROVIDER_KEY|event: result/);
});
test('cancelling stream consumption immediately reaches the running provider boundary',async()=>{
 let providerSignal:AbortSignal|undefined;
 const response=chatStream(async(progress,signal)=>{providerSignal=signal;progress('planning');return withDeadline(()=>new Promise(()=>{}),10000,signal);},new AbortController().signal,'trace');
 const reader=response.body!.getReader();await reader.read();await reader.cancel();assert.equal(providerSignal?.aborted,true);
});
test('upstream abort bounds an uncooperative provider with zero retries',async()=>{
 const abort=new AbortController();let calls=0,provider:AbortSignal|undefined;
 const result=withDeadline(signal=>{calls++;provider=signal;return new Promise(()=>{});},10000,abort.signal);
 await new Promise(resolve=>setImmediate(resolve));abort.abort();await assert.rejects(result,e=>e instanceof Error&&e.name==='AbortError');assert.equal(calls,1);assert.equal(provider?.aborted,true);
 let invoked=false;await assert.rejects(withDeadline(async()=>{invoked=true;return 1;},100,abort.signal));assert.equal(invoked,false);
});
function chunked(text:string){const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});}
test('SSE client handles fragmented UTF-8 and CRLF without exposing incomplete values',async()=>{
 const stages:string[]=[];const payload={kind:'metric',message:'תוצאה ✅',tools:[]};
 const r=await requestChat({},s=>stages.push(s),new AbortController().signal,async()=>chunked('event: progress\r\ndata: {"stage":"planning"}\r\n\r\nevent: result\r\ndata: '+JSON.stringify(payload)+'\r\n\r\n'));
 assert.equal(r.message,payload.message);assert.deepEqual(stages,['planning']);
});
test('truncated streams and terminal error frames fail honestly',async()=>{
 const signal=new AbortController().signal;
 await assert.rejects(requestChat({},()=>{},signal,async()=>chunked('event: result\ndata: {"kind":"metric"')),/לפני שהתקבלה תוצאה מלאה/);
 await assert.rejects(requestChat({},()=>{},signal,async()=>chatStream(async()=>{throw new AppError('MODEL_DOWN',503,'המודל לא זמין');},signal,'tr-1')),/המודל לא זמין.*tr-1/);
});
test('provider SDK receives caller cancellation, and cancelled work is not retried',async()=>{
 const {generator}=await import('../lib/ai');const {planSchema}=await import('../lib/contracts');
 const abort=new AbortController();let signal:AbortSignal|undefined,calls=0,start:()=>void=()=>{};const started=new Promise<void>(resolve=>{start=resolve;});
 const gen=generator({OPENAI_API_KEY:'test-only',AI_MODEL:'test-model'},async(_input,init)=>{calls++;signal=init?.signal??undefined;start();return await new Promise(()=>{});},abort.signal);
 const result=gen(planSchema,'test','test');await started;abort.abort();await assert.rejects(result,e=>e instanceof Error&&e.name==='AbortError');assert.equal(calls,1);assert.equal(signal?.aborted,true);
});
test('network failure is a clear user error rather than a transport exception',async()=>{
 await assert.rejects(requestChat({},()=>{},new AbortController().signal,async()=>{throw new TypeError('fetch failed SECRET');}),/החיבור לשרת נותק/);
});
test('restored scope labels come from the executed plan, not editable cached labels',()=>{
 const value=JSON.parse(serializeConversation([turn],DATA_VERSION));value.turns[0].scope.filters={city:'חיפה'};
 const restored=restoreConversation(JSON.stringify(value),ds,DATA_VERSION,asOf);
 assert.equal(restored[0].scope?.filters.city,'חולון');assert.equal(restored[0].response?.result?.value,38260);
});
test('a disconnected SSE result retains the request trace for debugging',async()=>{
 const response=chunked('event: progress\ndata: {"stage":"planning","traceId":"request-42"}\n\n');
 await assert.rejects(requestChat({},()=>{},new AbortController().signal,async()=>response),/request-42/);
});
test('upstream request disconnect closes the stream without a result or retry',async()=>{
 const abort=new AbortController();let calls=0;
 const response=chatStream(async(progress,signal)=>{calls++;progress('planning');return withDeadline(()=>new Promise(()=>{}),10000,signal);},abort.signal,'disconnect');
 const reader=response.body!.getReader();await reader.read();abort.abort();const end=await reader.read();assert.equal(end.done,true);assert.equal(calls,1);
});
test('long encoded history fits the request byte budget without truncating the new question',async()=>{
 const {conversationRequest}=await import('../lib/conversation-session');
 const large={...turn,question:'א\u0001'.repeat(1000),response:{...answer,plan:{...p,clarification:'א'.repeat(500),filters:{city:'א'.repeat(80),neighborhood:'א'.repeat(100)}}}};
 const question='ה'.repeat(2000),body=conversationRequest(question,Array.from({length:12},()=>large),[],DATA_VERSION);
 assert.equal(body.message,question);assert.ok(new TextEncoder().encode(JSON.stringify(body)).byteLength<=18000);assert.ok(body.memory.length>0&&body.memory.length<6);
});
