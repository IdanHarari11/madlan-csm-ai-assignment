import { AppError } from './http';
export type DraftRecord={id:string;revision:number;owner:string;payload:string;fingerprint:string;created_at:number;expires_at:number};
export type Operation={id:string;draft_revision:number;draft_id:string;owner:string;fingerprint:string;status:'pending'|'created'|'unknown'|'failed';issue_key:string|null;created_at:number;updated_at:number};
export interface TaskStore {
 putDraft(d:DraftRecord):Promise<void>;getDraft(id:string,owner:string):Promise<DraftRecord|null>;
 getOperation(draftId:string,fingerprint:string):Promise<Operation|null>;
 reserve(o:Operation):Promise<boolean>;setState(id:string,status:Operation['status'],key?:string):Promise<void>;
 log(traceId:string,actor:string,event:string,code:string):Promise<void>;
}
export class D1Store implements TaskStore {
 db:D1Database; constructor(db:D1Database){this.db=db;}
 async putDraft(d:DraftRecord){await this.db.prepare('INSERT INTO drafts(id,owner,payload,fingerprint,created_at,expires_at) VALUES(?,?,?,?,?,?)').bind(d.id,d.owner,d.payload,d.fingerprint,d.created_at,d.expires_at).run();}
 async getDraft(id:string,owner:string){return this.db.prepare('SELECT * FROM drafts WHERE id=? AND owner=?').bind(id,owner).first<DraftRecord>();}
 async getOperation(draftId:string,fingerprint:string){return this.db.prepare('SELECT * FROM operations WHERE draft_id=? OR fingerprint=? LIMIT 1').bind(draftId,fingerprint).first<Operation>();}
 async reserve(o:Operation){
 try{await this.db.prepare('INSERT INTO operations(id,draft_id,owner,fingerprint,status,created_at,updated_at,draft_revision) VALUES(?,?,?,?,?,?,?,?)').bind(o.id,o.draft_id,o.owner,o.fingerprint,o.status,o.created_at,o.updated_at,o.draft_revision).run();return true;}
 catch(e){const message=e instanceof Error?e.message:'';
 if(message.includes('DRAFT_STALE'))throw new AppError('DRAFT_STALE',409,'הטיוטה השתנתה או פג תוקפה. יש לבדוק אותה שוב.');
 if(message.includes('QUOTA'))throw new AppError('JIRA_QUOTA',429,'הגעת למכסת היצירה. משימות דחופות אינן עוקפות את המכסה.');
 if(message.includes('UNIQUE'))return false;throw e;}
 }
 async setState(id:string,status:Operation['status'],key?:string){await this.db.prepare('UPDATE operations SET status=?, issue_key=?,updated_at=? WHERE id=?').bind(status,key??null,Date.now(),id).run();}
 async log(traceId:string,actor:string,event:string,code:string){await this.db.prepare('INSERT INTO audit(id,trace_id,actor,event,code,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),traceId,actor,event,code,Date.now()).run();}
}
export async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function reserveBudget(db:D1Database,key:string,limit:number,expiresAt:number){
 const row=await db.prepare('INSERT INTO budget(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count').bind(key,expiresAt,limit).first();
 if(!row)throw new AppError('RATE_LIMIT',429,'הגעת למכסת הבקשות. אפשר לנסות מאוחר יותר; לא נשלחה בקשה נוספת למודל.');
}
export async function modelBudget(db:D1Database,actor:string){
 const now=Date.now(),day=Math.floor(now/86400000),minute=Math.floor(now/60000);
 await reserveBudget(db,`model:global:${day}`,150,(day+1)*86400000);
 await reserveBudget(db,`model:actor:${actor}:${day}`,30,(day+1)*86400000);
 await reserveBudget(db,`model:minute:${actor}:${minute}`,5,(minute+1)*60000);
 // Bounded opportunistic maintenance, no request text or secrets in audit.
 await db.batch([db.prepare('DELETE FROM budget WHERE key IN (SELECT key FROM budget WHERE expires_at<? LIMIT 100)').bind(now-86400000),db.prepare('DELETE FROM drafts WHERE id IN (SELECT id FROM drafts WHERE expires_at<? LIMIT 100)').bind(now-86400000)]);
}
