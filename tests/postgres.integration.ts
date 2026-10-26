import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
import { PostgresStore,reservePgBudget } from '../lib/postgres-store';
import type {DraftRecord,Operation} from '../lib/store';

const url=process.env.PG_TEST_DATABASE_URL;
if(!url)throw new Error('BLOCKED: PG_TEST_DATABASE_URL is required; use an isolated evaluation database.');
const schema='madlan_test_'+crypto.randomUUID().replaceAll('-','');
const sql=postgres(url,{ssl:'require',max:40,prepare:false});
const admin=postgres(url,{ssl:'require',max:1,prepare:false});
const now=Date.now();
function draft(id=crypto.randomUUID(),owner=id):DraftRecord{return {id,owner,revision:1,payload:'{}',fingerprint:'fp-'+id,created_at:now,expires_at:now+3600000};}
function op(d:DraftRecord):Operation{return {id:crypto.randomUUID(),draft_id:d.id,draft_revision:d.revision,owner:d.owner,fingerprint:d.fingerprint,status:'pending',issue_key:null,created_at:now,updated_at:now};}
await test('Postgres adapter preserves transactional guards on real independent connections',async t=>{
 try{
 await admin.unsafe(`CREATE SCHEMA ${schema}`);
 await sql.begin(async tx=>{
  await tx`SET LOCAL search_path TO ${tx(schema)}`;
  const rows=await tx<{schema:string}[]>`SELECT current_schema() AS schema`;
  assert.equal(rows[0].schema,schema,'DDL must target the isolated schema');
  await tx.unsafe(readFileSync('postgres/001_initial.sql','utf8'));
  await tx.unsafe(`ALTER FUNCTION ${schema}.guard_operation() SET search_path TO ${schema}`);
 });
 const store=new PostgresStore(sql,schema);
 await t.test('40 competing owners reserve exactly 25 global attempts',async()=>{
  const ds=Array.from({length:40},()=>draft());await Promise.all(ds.map(d=>store.putDraft(d)));
  const results=await Promise.allSettled(ds.map(d=>store.reserve(op(d))));
  assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value).length,25);
  assert.equal(results.filter(r=>r.status==='rejected').length,15);
 });
 await sql.unsafe(`TRUNCATE ${schema}.operations,${schema}.drafts`);
 await t.test('20 parallel duplicate requests reserve once',async()=>{
  const d=draft();await store.putDraft(d);
  const results=await Promise.all(Array.from({length:20},()=>store.reserve(op(d))));
  assert.equal(results.filter(Boolean).length,1);
 });
 await t.test('reserved drafts cannot be edited; unknown outcomes remain quarantined',async()=>{
  const d=(await sql<DraftRecord[]>`SELECT * FROM ${sql(schema+'.drafts')} LIMIT 1`)[0];
  assert.equal(await store.editDraft(d.id,d.owner,1,'changed','new-fp'),null);
  const o=await store.getOperation(d.id,d.fingerprint);assert.ok(o);
  await store.setState(o.id,'unknown');
  assert.equal((await store.getOperation(d.id,d.fingerprint))?.status,'unknown');
  assert.equal(await store.reserve(op(d)),false);
 });
 await sql.unsafe(`TRUNCATE ${schema}.operations,${schema}.drafts`);
 await t.test('edited revisions and owners are bound to reservation',async()=>{
  const d=draft();await store.putDraft(d);
  assert.equal(await store.getDraft(d.id,'other-owner'),null);
  assert.deepEqual(await store.editDraft(d.id,d.owner,1,'updated','edited-fp'),{revision:2});
  await assert.rejects(()=>store.reserve(op(d)),/DRAFT_STALE/);
  assert.equal(await store.reserve({...op(d),draft_revision:2,fingerprint:'edited-fp'}),true);
 });
 await sql.unsafe(`TRUNCATE ${schema}.operations,${schema}.drafts`);
 await t.test('minute quota counts failed attempts',async()=>{
  for(let i=0;i<3;i++){const d=draft(crypto.randomUUID(),'same-owner');await store.putDraft(d);const o=op(d);await store.reserve(o);await store.setState(o.id,'failed');}
  const d=draft(crypto.randomUUID(),'same-owner');await store.putDraft(d);
  await assert.rejects(()=>store.reserve(op(d)),/JIRA_QUOTA/);
 });
 await t.test('40 concurrent budget reservations permit exactly 30',async()=>{
  const results=await Promise.allSettled(Array.from({length:40},()=>reservePgBudget(sql,'concurrent-test',30,now+60000,schema)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,30);
 });
 }finally{await sql.end();await admin.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}
});
