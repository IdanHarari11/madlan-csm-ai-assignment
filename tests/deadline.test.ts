import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline} from '../lib/deadline';
test('hung provider ignoring abort cannot hold the caller past its deadline',async()=>{
 let signal:AbortSignal|undefined,calls=0;
 const start=Date.now();
 await assert.rejects(withDeadline(s=>{signal=s;calls++;return new Promise(()=>{});},30),e=>e instanceof Error&&e.name==='TimeoutError');
 assert.equal(signal?.aborted,true);assert.equal(calls,1);assert.ok(Date.now()-start<1000);
});
test('late provider rejection after deadline is handled without a retry',async()=>{
 let rejectProvider:(e:Error)=>void=()=>{};
 await assert.rejects(withDeadline(()=>new Promise((_,reject)=>{rejectProvider=reject;}),10),/deadline/);
 rejectProvider(new Error('late secret provider failure'));
 await new Promise(resolve=>setImmediate(resolve));
});
test('successful provider result is preserved and its timer is cancelled',async()=>{
 let signal:AbortSignal|undefined;
 assert.equal(await withDeadline(async s=>{signal=s;return 42;},10),42);
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(signal?.aborted,false);
});
