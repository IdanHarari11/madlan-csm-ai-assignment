import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { dataset } from '../lib/data';
import { calculateMetrics,normalizeDataset,prioritize,checkDataQuality } from '../lib/domain';
import { executePlan } from '../lib/investigation';
import { emptyFilters,validatePlan,taskContentSchema } from '../lib/contracts';
import { validateEvidence } from '../lib/task-service';
import { cases,grade } from './cases';
const ds=dataset('2026-10-25');const results:{id:string;category:string;pass:boolean;error?:string}[]=[];
function scenario(id:string,category:string,fn:()=>void){try{fn();results.push({id,category,pass:true});}catch(e){results.push({id,category,pass:false,error:String(e)});}}
// Independent, checked-in reference values calculated from CSV by Python (golden.json).
const golden=JSON.parse(readFileSync(new URL('./golden.json',import.meta.url),'utf8')) as {city:string;metric:'median_price'|'median_ppsm'|'count';value:number|null;includedCount:number}[];
for(const g of golden)scenario(`golden:${g.city}:${g.metric}`,'independent numeric oracle',()=>{const r=calculateMetrics(ds,g.city?{city:g.city}:{},g.metric,'2026-10-25');assert.equal(r.includedCount,g.includedCount);if(g.value===null)assert.equal(r.value,null);else assert(Math.abs(r.value!-g.value)<.000001);});
for(const metric of ['mean_price','median_price','mean_ppsm','median_ppsm','count'] as const)scenario('permutation:'+metric,'metamorphic',()=>{const base=ds.flatMap(d=>d.raw),a=calculateMetrics(ds,{},metric,'2026-10-25');for(let offset=1;offset<20;offset++){const rotated=base.slice(offset).concat(base.slice(0,offset));const b=calculateMetrics(normalizeDataset(rotated,'2026-10-25'),{},metric,'2026-10-25');assert.equal(a.value,b.value);assert.deepEqual(a.evidenceIds,b.evidenceIds);}});
for(const c of cases)scenario('grader:'+c.id,'eval grader self-check',()=>{
 // Verify graders reject an intentionally wrong plan; this is NOT a live model evaluation.
 const bad={intent:'not_allowed',filters:{},metric:'count',dealId:null};assert.equal(grade(bad,c).pass,false);
});
for(const intent of ['unsupported','clarify'])scenario('no-tools:'+intent,'safety boundary',()=>{const p=validatePlan({intent,filters:emptyFilters,metric:'count',dealId:null,clarification:intent==='clarify'?'איזו עיר?':null});const r=executePlan(ds,p,'2026-10-25');assert.deepEqual(r.tools,[]);assert(!('result' in r));});
scenario('unknowns-not-urgent','priority safety',()=>assert.equal(prioritize({production:null,affectedCustomers:null,workaround:null,impact:'unknown',deadline:null},'2026-10-25').priority,'TRIAGE'));
scenario('four-conflicts','real-data audit',()=>assert.equal(checkDataQuality(ds).conflictingDeals,4));
scenario('task-invalid-schema','structured output',()=>assert.equal(taskContentSchema.safeParse({title:'urgent',priority:'P0'}).success,false));
scenario('no-evidence-no-bug','task grounding',()=>{const p={title:'בדיקת בעיה חשודה',description:'נדרש בירור עם נתוני מקור לפני החלטה.',category:'suspected_bug' as const,expectedBehavior:'יש לברר מהי ההתנהגות הצפויה.',acceptanceCriteria:['בדיקת הנתונים הושלמה מול המקור.'],evidenceIds:[],unknowns:[]};assert.throws(()=>validateEvidence(p,[]));});
const report={generatedAt:new Date().toISOString(),mode:'deterministic',passed:results.filter(r=>r.pass).length,total:results.length,liveModelEvaluation:'SEPARATE_RUN_REQUIRED',results};
mkdirSync('evals/results',{recursive:true});writeFileSync('evals/results/deterministic.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,total:report.total,failed:results.filter(r=>!r.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
