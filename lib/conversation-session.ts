import {z} from 'zod';
import {memoryPlanSchema} from './contracts';
import {filterSchema} from './domain';
import type {Deal} from './domain';
import type {Turn,TurnScope,Investigation} from '../app/components/chat-types';
import {executePlan} from './investigation';
import {executeScoped,resolveSelection} from './scoped-investigation';
import {sameScope} from './conversation-context';
export const CHAT_STORAGE_KEY='madlan-map-conversation-v2';
const scopeSchema=z.object({selectedIds:z.array(z.string().regex(/^D\d{6}$/)).max(3),filters:filterSchema,asOf:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),dataVersion:z.string().max(80)}).strict();
const savedSchema=z.object({version:z.literal(2),dataVersion:z.string().max(80),turns:z.array(z.object({id:z.string().max(100),question:z.string().max(2000),scope:scopeSchema,plan:memoryPlanSchema.optional(),error:z.string().max(600).optional(),mode:z.enum(['ai','deterministic']).optional()}).strict()).max(20)}).strict();
export function serializeConversation(turns:Turn[],dataVersion:string){
 const saved=turns.slice(-20).filter(t=>t.scope).map(t=>{const plan=memoryPlanSchema.safeParse(t.response?.plan);return {id:t.id,question:t.question,scope:t.scope!,...(plan.success?{plan:plan.data}:{}),...(t.error?{error:t.error.slice(0,600)}:!plan.success?{error:'הבקשה לא הושלמה או לא ניתנת לשחזור. אפשר לשלוח אותה שוב.'}:{}),mode:t.response?.mode==='deterministic'?'deterministic' as const:'ai' as const};});
 let output=JSON.stringify({version:2,dataVersion,turns:saved});while(output.length>200000&&saved.length){saved.shift();output=JSON.stringify({version:2,dataVersion,turns:saved});}return output;
}
export function restoreConversation(raw:string|null,deals:Deal[],dataVersion:string,asOf:string):Turn[]{
 if(!raw||raw.length>200000)return [];
 try{const saved=savedSchema.parse(JSON.parse(raw));if(saved.dataVersion!==dataVersion)return [];
  return saved.turns.map(t=>{
   const scope:TurnScope={...t.scope,asOf,dataVersion};
   if(!t.plan||t.error)return {id:t.id,question:t.question,scope,error:t.error??'לא ניתן לשחזר את התוצאה. שלחו את השאלה שוב.'};
   try{const p=t.plan,selected=resolveSelection(deals,t.scope.selectedIds);
    if(p.intent==='compare'&&!selected.length)throw new Error('Invalid scope');
    if(p.intent==='deal'&&(!p.dealId||(selected.length&&!selected.some(d=>d.id===p.dealId))))throw new Error('Invalid deal scope');
    const answer=selected.length?executeScoped(selected,p,asOf):executePlan(deals,p,asOf);
    const response:Investigation={...answer,plan:p,mode:t.mode??'ai',context:{dataVersion,asOf,selectedIds:t.scope.selectedIds,restored:true}};
    return {id:t.id,question:t.question,scope:{...scope,filters:response.result?.filters??response.evidenceBasis?.filters??response.quality?.filters??p.filters},response};
   }catch{return {id:t.id,question:t.question,scope,error:'לא ניתן לשחזר את התוצאה בנתונים הנוכחיים. אפשר לשלוח את השאלה שוב.'};}
  });
 }catch{return [];}
}
export function memoryForScope(turns:Turn[],selectedIds:string[]){
 return turns.filter(t=>t.response&&t.scope&&sameScope(t.scope.selectedIds,selectedIds)).flatMap(t=>{const p=memoryPlanSchema.safeParse(t.response?.plan);return p.success?[{question:t.question.slice(0,600),selectedIds:t.scope!.selectedIds,plan:p.data}]:[];}).slice(-6);
}
const filterNames:Record<string,string>={city:'עיר',neighborhood:'שכונה',propertyType:'סוג נכס',roomsMin:'מחדרים',roomsMax:'עד חדרים',dateFrom:'מתאריך',dateTo:'עד תאריך',parking:'חניה',elevator:'מעלית',safeRoom:'ממ״ד'};
export function turnScopeLabel(scope:TurnScope){return `${scope.selectedIds.length?'בחירה: '+scope.selectedIds.join(', '):'כל המדגם'}${Object.keys(scope.filters).length?' · '+Object.entries(scope.filters).map(([k,v])=>`${filterNames[k]??k}: ${typeof v==='boolean'?(v?'כן':'לא'):v}`).join(' · '):''}`;}
export function conversationRequest(message:string,turns:Turn[],selectedIds:string[],dataVersion:string){
 const memory=memoryForScope(turns,selectedIds),body={message,memory,dataVersion,selectedIds};
 while(memory.length&&new TextEncoder().encode(JSON.stringify(body)).byteLength>18000)memory.shift();
 return body;
}
