import type {z} from 'zod';
import {memoryStepSchema} from './contracts';
import {resolveSelection,executeScoped} from './scoped-investigation';
import {executePlan} from './investigation';
import type {ExecutablePlan} from './investigation';
import type {Deal} from './domain';
export type MemoryStep=z.infer<typeof memoryStepSchema>;
export const sameScope=(a:string[],b:string[])=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
// Client-reported values never enter context: replay bounded, validated plans instead.
export function reconstructContext(deals:Deal[],steps:MemoryStep[],selectedIds:string[],asOf:string,dataVersion:string){
 const current=steps.filter(step=>sameScope(step.selectedIds,selectedIds)).slice(-6);
 let lastCalculation:ExecutablePlan|null=null;
 const history:{role:'user'|'assistant';content:string}[]=[],verifiedResults=[];
 for(const step of current){
  try{
   const selected=resolveSelection(deals,step.selectedIds),p=step.plan;
   if(p.intent==='compare'&&!selected.length)continue;
   if(p.intent==='deal'&&(!p.dealId||(selected.length&&!selected.some(d=>d.id===p.dealId))))continue;
   const answer=selected.length?executeScoped(selected,p,asOf):executePlan(deals,p,asOf);
   if(answer.kind==='metric'||answer.kind==='evidence')lastCalculation=p;else if(!['clarify','unsupported'].includes(answer.kind))lastCalculation=null;
   history.push({role:'user',content:step.question},{role:'assistant',content:JSON.stringify({kind:answer.kind,plan:p})});
   verifiedResults.push({question:step.question,plan:p,kind:answer.kind,...('result'in answer&&answer.result?{result:{metric:answer.result.metric,value:answer.result.value,unit:answer.result.unit,filters:answer.result.filters,matchedCount:answer.result.matchedCount,includedCount:answer.result.includedCount,evidenceIds:answer.result.evidenceIds.slice(0,12),evidencePreview:true}}:{}),...('evidenceBasis'in answer&&answer.evidenceBasis?{evidenceBasis:{metric:answer.evidenceBasis.metric,filters:answer.evidenceBasis.filters,evidenceIds:answer.evidenceBasis.evidenceIds.slice(0,12),includedCount:answer.evidenceBasis.includedCount,evidencePreview:true}}:{}),...('comparison'in answer?{comparison:answer.comparison}:{}),...('quality'in answer&&answer.quality?{quality:{uniqueDeals:answer.quality.uniqueDeals,flaggedDeals:answer.quality.flaggedDeals,conflictingDeals:answer.quality.conflictingDeals,filters:answer.quality.filters}}:{})});
  }catch{/* Invalid/out-of-scope memory is not evidence and cannot affect the current selection. */}
 }
 return {history:history.slice(-8),state:{dataVersion,asOf,selectedIds,verifiedResults,lastCalculation,reconstructed:true}};
}
