import test from 'node:test';
import assert from 'node:assert/strict';
import { createIssue,fingerprint,validateEvidence,issueBody } from '../lib/task-service';
import { createIssueSchema,taskContentSchema } from '../lib/contracts';
import type { TaskStore,DraftRecord,Operation } from '../lib/store';
import type { JiraPort } from '../lib/jira';
import { JiraClient } from '../lib/jira';
import { AppError } from '../lib/http';
import { payload } from './fixtures';
class MemoryStore implements TaskStore{
 drafts=new Map<string,DraftRecord>();ops=new Map<string,Operation>();events:string[]=[];
 async putDraft(d:DraftRecord){this.drafts.set(d.id,d);}async getDraft(id:string,owner:string){const d=this.drafts.get(id);return d?.owner===owner?d:null;}
 async getOperation(id:string,fp:string){return [...this.ops.values()].find(o=>o.draft_id===id||o.fingerprint===fp)??null;}
 async reserve(o:Operation){if([...this.ops.values()].some(x=>x.fingerprint===o.fingerprint||x.draft_id===o.draft_id))return false;this.ops.set(o.id,o);return true;}
 async setState(id:string,status:Operation['status'],key?:string){Object.assign(this.ops.get(id)!,{status,issue_key:key??null});}
 async log(_trace:string,_actor:string,event:string){this.events.push(event);}
}
async function setup(){const store=new MemoryStore(),p=payload(),draftId=crypto.randomUUID();await store.putDraft({id:draftId,revision:1,owner:'csm-1',payload:JSON.stringify(p),fingerprint:await fingerprint(p),created_at:1000,expires_at:100000});let calls=0;const jira:JiraPort={async findExisting(){return [];},async create(){calls++;return {key:'MAD-1',summary:'test',url:'https://test.atlassian.net/browse/MAD-1'};}};return {store,p,draftId,jira,args:{store,jira,draftId,owner:'csm-1',expectedRevision:1,traceId:'trace',now:2000},calls:()=>calls};}
for(const value of [{draftId:crypto.randomUUID(),approved:false},{draftId:crypto.randomUUID(),approved:true,priority:'P1'},{draftId:'x',approved:true}])test('creation payload cannot bypass confirmation or add fields',()=>assert.equal(createIssueSchema.safeParse(value).success,false));
test('cross-owner draft access denied',async()=>{const s=await setup();await assert.rejects(()=>createIssue({...s.args,owner:'attacker'}),/DRAFT_NOT_FOUND/);assert.equal(s.calls(),0);});
test('expired draft cannot be submitted',async()=>{const s=await setup();await assert.rejects(()=>createIssue({...s.args,now:100001}),/DRAFT_EXPIRED/);assert.equal(s.calls(),0);});
test('20 parallel submits yield exactly one external POST',async()=>{const s=await setup();const results=await Promise.allSettled(Array.from({length:20},()=>createIssue(s.args)));assert.equal(s.calls(),1);assert(results.some(r=>r.status==='fulfilled'));assert.equal(s.store.ops.size,1);});
test('successful replay returns existing issue without new POST',async()=>{const s=await setup();await createIssue(s.args);const r=await createIssue(s.args);assert.equal(r.issueKey,'MAD-1');assert.equal(r.reused,true);assert.equal(s.calls(),1);});
test('same evidence and category deduplicates AI paraphrases',async()=>{const s=await setup(),p=payload();p.content.title='אותה תקלה עם ניסוח אחר לגמרי';assert.equal(await fingerprint(p),await fingerprint(s.p));});
test('semantic candidates stop creation rather than silently merging',async()=>{const s=await setup();s.jira.findExisting=async()=>[{key:'MAD-9',summary:'דומה',url:'https://test.atlassian.net/browse/MAD-9'}];const r=await createIssue(s.args);assert.equal(r.state,'duplicates');assert.equal(s.calls(),0);});
test('timeout after POST quarantines outcome and never retries',async()=>{const s=await setup();let calls=0;s.jira.create=async()=>{calls++;throw new AppError('JIRA_UNCERTAIN',503,'unknown');};await assert.rejects(()=>createIssue(s.args),/JIRA_UNCERTAIN/);assert.equal([...s.store.ops.values()][0].status,'unknown');await assert.rejects(()=>createIssue(s.args),/STATUS_UNKNOWN/);assert.equal(calls,1);});
test('search failure never invokes create',async()=>{const s=await setup();s.jira.findExisting=async()=>{throw new AppError('JIRA_UNCERTAIN',503,'unknown');};await assert.rejects(()=>createIssue(s.args));assert.equal(s.calls(),0);assert.equal([...s.store.ops.values()][0].status,'failed');});
test('definite Jira rejection is failed, not unknown',async()=>{const s=await setup();s.jira.create=async()=>{throw new AppError('JIRA_REJECTED',502,'rejected');};await assert.rejects(()=>createIssue(s.args));assert.equal([...s.store.ops.values()][0].status,'failed');});
test('quota rejection cannot be overridden by urgency in payload',async()=>{const s=await setup();s.store.reserve=async()=>{throw new AppError('JIRA_QUOTA',429,'quota');};await assert.rejects(()=>createIssue(s.args),/JIRA_QUOTA/);assert.equal(s.calls(),0);});
test('unknown evidence rejected',()=>assert.throws(()=>validateEvidence({...payload().content,evidenceIds:['D999999']},['D100001']),/UNSUPPORTED_EVIDENCE/));
test('data issue requires evidence; actual feature may have none',()=>{assert.throws(()=>validateEvidence({...payload().content,evidenceIds:[]},[]),/EVIDENCE_REQUIRED/);assert.doesNotThrow(()=>validateEvidence({...payload().content,category:'feature_request',evidenceIds:[]},[]));});
test('extra structured task fields cannot set priority or execute commands',()=>assert.equal(taskContentSchema.safeParse({...payload().content,priority:'P1',command:'rm -rf'}).success,false));
test('Jira body distinguishes reported impact, AI interpretation and computed facts',()=>{const b=issueBody(payload());assert.match(b,/דיווח משתמש/);assert.match(b,/יש לאמת/);assert.match(b,/עובדות שחושבו בקוד/);assert.match(b,/test-v1/);});
const config={baseUrl:'https://dedicated.atlassian.net',email:'csm@example.com',token:'test-only',project:'MAD',issueTypeId:'10001'};
for(const url of ['http://dedicated.atlassian.net','https://evil.example','https://dedicated.atlassian.net.evil.example','https://dedicated.atlassian.net/path','https://user@dedicated.atlassian.net','https://dedicated.atlassian.net:8443'])test('reject unsafe Jira origin '+url,()=>assert.throws(()=>new JiraClient({...config,baseUrl:url})));
test('Jira create uses ADF, scoped project, labels and no retry',async()=>{let requests=0;const client=new JiraClient(config,async(_url,init)=>{requests++;const b=JSON.parse(String(init?.body));assert.equal(b.fields.project.key,'MAD');assert.equal(b.fields.description.type,'doc');assert(b.fields.labels.includes('madlan-op-op1'));return Response.json({key:'MAD-123'});});const r=await client.create({title:'test',body:'line1\nline2',fingerprint:'abc',operationId:'op1'});assert.equal(r.key,'MAD-123');assert.equal(requests,1);});
test('Jira HTTP 500 has uncertain outcome and only one request',async()=>{let calls=0;const client=new JiraClient(config,async()=>{calls++;return new Response('',{status:500});});await assert.rejects(()=>client.create({title:'test',body:'x',fingerprint:'abc',operationId:'op1'}),/JIRA_UNCERTAIN/);assert.equal(calls,1);});
test('malformed successful Jira create is uncertain',async()=>{const client=new JiraClient(config,async()=>Response.json({ok:true}));await assert.rejects(()=>client.create({title:'test',body:'x',fingerprint:'abc',operationId:'op1'}),/JIRA_UNCERTAIN/);});

test('a reviewed stale revision cannot be submitted even if fingerprint is unchanged',async()=>{const s=await setup();await assert.rejects(()=>createIssue({...s.args,expectedRevision:2}),/DRAFT_STALE/);assert.equal(s.calls(),0);});
test('only the explicit reviewed revision is a valid confirmation contract',()=>{assert.equal(createIssueSchema.safeParse({draftId:crypto.randomUUID(),revision:1,approved:true}).success,true);});
