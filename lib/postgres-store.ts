import postgres from 'postgres';
import { AppError } from './http';
import type { DraftRecord, Operation, TaskStore } from './store';

export type Database = ReturnType<typeof postgres>;
let connection: Database | undefined;
export function database() {
 if (!process.env.DATABASE_URL) throw new AppError('STORAGE_UNAVAILABLE',503,'שירות השמירה אינו מוגדר.');
 return connection ??= postgres(process.env.DATABASE_URL,{ssl:'require',max:3,idle_timeout:20,connect_timeout:15,prepare:false});
}
export class PostgresStore implements TaskStore {
 constructor(public sql:Database=database(),public schema='public'){if(!/^[a-z][a-z0-9_]*$/.test(schema))throw new Error('Invalid schema');}
 async putDraft(d:DraftRecord){await this.sql`INSERT INTO ${this.sql(this.schema+'.drafts')}(id,revision,owner,payload,fingerprint,created_at,expires_at) VALUES(${d.id},${d.revision},${d.owner},${d.payload},${d.fingerprint},${d.created_at},${d.expires_at})`;}
 async getDraft(id:string,owner:string){return (await this.sql<DraftRecord[]>`SELECT * FROM ${this.sql(this.schema+'.drafts')} WHERE id=${id} AND owner=${owner}`)[0]??null;}
 async getOperation(draftId:string,fingerprint:string){return (await this.sql<Operation[]>`SELECT * FROM ${this.sql(this.schema+'.operations')} WHERE draft_id=${draftId} OR fingerprint=${fingerprint} LIMIT 1`)[0]??null;}
 async reserve(o:Operation){
  try {await this.sql`INSERT INTO ${this.sql(this.schema+'.operations')}(id,draft_revision,draft_id,owner,fingerprint,status,issue_key,created_at,updated_at) VALUES(${o.id},${o.draft_revision},${o.draft_id},${o.owner},${o.fingerprint},${o.status},${o.issue_key},${o.created_at},${o.updated_at})`;return true;}
  catch(error){const e=error as {message?:string;code?:string};
   if(e.message?.includes('DRAFT_STALE'))throw new AppError('DRAFT_STALE',409,'הטיוטה השתנתה או פג תוקפה. יש לבדוק אותה שוב.');
   if(e.message?.includes('QUOTA'))throw new AppError('JIRA_QUOTA',429,'הגעת למכסת היצירה. משימות דחופות אינן עוקפות את המכסה.');
   if(e.code==='23505')return false;throw error;
  }
 }
 async editDraft(id:string,owner:string,revision:number,payload:string,fingerprint:string){
  return this.sql.begin(async sql=>{
   await sql`SELECT pg_advisory_xact_lock(739102601)`;
   const rows=await sql<{revision:number}[]>`UPDATE ${sql(this.schema+'.drafts')} AS d SET payload=${payload},fingerprint=${fingerprint},revision=revision+1 WHERE id=${id} AND owner=${owner} AND revision=${revision} AND expires_at>=${Date.now()} AND NOT EXISTS (SELECT 1 FROM ${sql(this.schema+'.operations')} WHERE draft_id=d.id) RETURNING revision`;
   return rows[0]??null;
  });
 }
 async setState(id:string,status:Operation['status'],key?:string){await this.sql`UPDATE ${this.sql(this.schema+'.operations')} SET status=${status},issue_key=${key??null},updated_at=${Date.now()} WHERE id=${id}`;}
 async log(traceId:string,actor:string,event:string,code:string){await this.sql`INSERT INTO ${this.sql(this.schema+'.audit')}(id,trace_id,actor,event,code,created_at) VALUES(${crypto.randomUUID()},${traceId},${actor},${event},${code},${Date.now()})`;}
}
export async function reservePgBudget(sql:Database,key:string,limit:number,expiresAt:number,schema='public'){
 const rows=await sql`INSERT INTO ${sql(schema+'.budget')} AS b(key,count,expires_at) VALUES(${key},1,${expiresAt}) ON CONFLICT(key) DO UPDATE SET count=b.count+1 WHERE b.count<${limit} RETURNING count`;
 if(!rows.length)throw new AppError('RATE_LIMIT',429,'הגעת למכסת הבקשות. אפשר לנסות מאוחר יותר; לא נשלחה בקשה נוספת למודל.');
}
export async function postgresModelBudget(sql:Database,actor:string){
 const now=Date.now(),day=Math.floor(now/86400000),minute=Math.floor(now/60000);
 await reservePgBudget(sql,`model:global:${day}`,150,(day+1)*86400000);
 await reservePgBudget(sql,`model:actor:${actor}:${day}`,30,(day+1)*86400000);
 await reservePgBudget(sql,`model:minute:${actor}:${minute}`,5,(minute+1)*60000);
 await sql`DELETE FROM public.budget WHERE key IN (SELECT key FROM public.budget WHERE expires_at<${now-86400000} LIMIT 100)`;
 await sql`DELETE FROM public.drafts WHERE id IN (SELECT id FROM public.drafts WHERE expires_at<${now-86400000} LIMIT 100)`;
}
