import { z } from 'zod';
import { impactSchema } from '../../../lib/domain';
import { endpoint,readBody,AppError } from '../../../lib/http';
import { taskContentSchema,draftRequestSchema } from '../../../lib/contracts';
import { dataset,today,DATA_VERSION } from '../../../lib/data';
import { generator,planTask,modelReady } from '../../../lib/ai';
import { getEnv,getStore,requireCSM,reserveAI } from '../../../lib/server';
import { prioritize } from '../../../lib/domain';
import { fingerprint,validateEvidence } from '../../../lib/task-service';
import type { DraftPayload } from '../../../lib/task-service';
export async function POST(request:Request){return endpoint(async(traceId)=>{
 const b=await readBody(request,draftRequestSchema);const user=await requireCSM();const e=getEnv();
 if(!modelReady(e))throw new AppError('MODEL_NOT_CONFIGURED',503,'המודל אינו מחובר. לא נוצרה טיוטה.');
 const ds=dataset(),records=b.evidenceIds.map(id=>ds.find(d=>d.id===id));
 if(records.some(d=>!d))throw new AppError('EVIDENCE_NOT_FOUND',400,'אחת העסקאות אינה קיימת בנתונים.');
 await reserveAI(request,user.userId);
 const facts=records.flatMap(d=>d?[`${d.id}: ${d.city}; מחיר=${d.conflict?'קיימת סתירה':d.price??'חסר'}; שטח=${d.size??'חסר'}; מחיר למ״ר מחושב=${d.conflict?'לא נבחר מחיר':d.computedPpsm??'לא ניתן לחישוב'}; אזהרות=${d.flags.map(f=>f.message).join('; ')||'לא אותרו בבדיקות הקיימות'}; שורות מקור=${d.rows.join(',')}`]:[]);
 const content=await planTask(generator(e),{request:b.request,allowedEvidenceIds:b.evidenceIds,facts,reportedImpact:b.impact});validateEvidence(content,b.evidenceIds);
 const payload:DraftPayload={content,request:b.request,impact:b.impact,priority:prioritize(b.impact,today()),facts,dataVersion:DATA_VERSION,asOf:today()};
 const id=crypto.randomUUID(),now=Date.now(),expiresAt=now+3600000;const fp=await fingerprint(payload),store=getStore();
 await store.putDraft({id,revision:1,owner:user.userId,payload:JSON.stringify(payload),fingerprint:fp,created_at:now,expires_at:expiresAt});
 await store.log(traceId,user.userId,'draft_created',id);
 return {draftId:id,revision:1,expiresAt,...payload};
});}

export async function PATCH(request:Request){return endpoint(async(traceId)=>{
 const b=await readBody(request,z.object({draftId:z.string().uuid(),revision:z.number().int().min(1),content:taskContentSchema,impact:impactSchema}).strict());
 const user=await requireCSM(),store=getStore(),draft=await store.getDraft(b.draftId,user.userId);
 if(!draft||draft.expires_at<Date.now())throw new AppError('DRAFT_EXPIRED',410,'הטיוטה אינה זמינה לעריכה.');
 const old=JSON.parse(draft.payload) as DraftPayload;validateEvidence(b.content,old.content.evidenceIds);
 const updated:DraftPayload={...old,content:b.content,impact:b.impact,priority:prioritize(b.impact,today())};
 const fp=await fingerprint(updated);
 const row=await store.editDraft(draft.id,user.userId,b.revision,JSON.stringify(updated),fp);
 if(!row)throw new AppError('DRAFT_LOCKED',409,'הטיוטה כבר נשלחה או נמצאת בתהליך יצירה.');
 await store.log(traceId,user.userId,'draft_edited',draft.id);
 return {draftId:draft.id,revision:(row as {revision:number}).revision,expiresAt:draft.expires_at,...updated};
});}
