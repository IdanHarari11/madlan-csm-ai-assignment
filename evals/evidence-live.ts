import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generator,planQuery} from '../lib/ai';
import {reconstructContext} from '../lib/conversation-context';
import type {MemoryStep} from '../lib/conversation-context';
import {resolveEvidencePlan} from '../lib/evidence-followup';
import {executePlan} from '../lib/investigation';
import {memoryPlanSchema} from '../lib/contracts';
import {dataset,today,DATA_VERSION,plannerCatalogue} from '../lib/data';
const asOf=today(),ds=dataset(asOf),config={OPENAI_API_KEY:process.env.OPENAI_API_KEY,AI_MODEL:process.env.AI_MODEL},gen=generator(config);
const holon={city:'חולון',propertyType:'דירה' as const,roomsMin:4,roomsMax:4};
const steps=[
 {id:'median',message:'מה חציון המחיר למ״ר בדירות ארבעה חדרים בחולון?',intent:'query',metric:'median_ppsm',filters:holon},
 {id:'actual-user-typo',message:'איזהנעסקאות?',intent:'evidence',metric:'median_ppsm',filters:holon},
 {id:'city-confirmation',message:'של חולון',intent:'evidence',metric:'median_ppsm',filters:holon},
 {id:'mean',message:'מה הממוצע באותם תנאים?',intent:'query',metric:'mean_ppsm',filters:holon},
 {id:'haifa',message:'ועכשיו בחיפה, בלי לשנות שום תנאי אחר.',intent:'query',metric:'mean_ppsm',filters:{...holon,city:'חיפה'}},
 {id:'new-jerusalem',message:'שאלה חדשה: כמה עסקאות יש בירושלים?',intent:'query',metric:'count',filters:{city:'ירושלים'}},
];
const raw=spawnSync('python3',['evals/chat-oracle.py'],{input:JSON.stringify(steps.map(c=>({id:c.id,filters:c.filters,metric:c.metric,asOf}))),encoding:'utf8'});if(raw.status!==0)throw Error(raw.stderr);
const oracle=new Map<string,{value:number|null;evidenceIds:string[];includedCount:number}>(JSON.parse(raw.stdout).results.map((r:{id:string})=>[r.id,r]));
const hashes=Object.fromEntries(['lib/ai.ts','lib/contracts.ts','lib/scoped-investigation.ts','lib/evidence-followup.ts','lib/conversation-context.ts','lib/investigation.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const results=[];
const same=(a:object,b:object)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
for(let repeat=0;repeat<2;repeat++){
 const memory:MemoryStep[]=[];
 for(const c of steps){try{
  const context=reconstructContext(ds,memory.slice(-6),[],asOf,DATA_VERSION),proposed=await planQuery(gen,c.message,context.history,plannerCatalogue(asOf),context.state),plan=resolveEvidencePlan(proposed,context.state.lastCalculation),answer=executePlan(ds,plan,asOf),expected=oracle.get(c.id)!,failures=[];
  if(plan.intent!==c.intent)failures.push('intent');if(plan.metric!==c.metric)failures.push('metric');if(!same(plan.filters,c.filters))failures.push('filters');
  const basis=answer.result??answer.evidenceBasis;
  if(!basis||(basis.value===null?expected.value!==null:expected.value===null||Math.abs(basis.value-expected.value)>1e-6))failures.push('numeric_value');
  if(basis?.includedCount!==expected.includedCount)failures.push('included_count');
  if(c.intent==='evidence'&&JSON.stringify(answer.deals?.map(d=>d.id))!==JSON.stringify(expected.evidenceIds))failures.push('listed_evidence_ids');
  memory.push({question:c.message,selectedIds:[],plan:memoryPlanSchema.parse(plan)});
  results.push({id:c.id,repeat,pass:!failures.length,failures,proposed,plan,kind:answer.kind,value:basis?.value,evidenceIds:basis?.evidenceIds});
 }catch(error){results.push({id:c.id,repeat,pass:false,error:error instanceof Error?error.message:'unknown'});}console.log(JSON.stringify(results.at(-1)));}
}
const report={generatedAt:new Date().toISOString(),asOf,model:config.AI_MODEL,hashes,total:results.length,passed:results.filter(r=>r.pass).length,gatePassed:results.every(r=>r.pass),results};writeFileSync('evals/results/evidence-live.json',JSON.stringify(report,null,2));if(!report.gatePassed)process.exitCode=1;
