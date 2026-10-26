import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chatCases as regressionCases} from './chat-cases';
import {holdoutCases} from './chat-holdout';
import {customerCases} from './customer-cases';
const chatCases=process.argv.includes('--customer')?customerCases:process.argv.includes('--holdout')?holdoutCases:regressionCases;
import {dataset,overview,today,plannerCatalogue} from '../lib/data';
import {calculateMetrics} from '../lib/domain';
import type {Filters,Metric} from '../lib/domain';
import {executePlan} from '../lib/investigation';
import {generator,modelReady,planQuery} from '../lib/ai';

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const promptSha256=sha('lib/ai.ts');
const codeSha256=Object.fromEntries(['lib/domain.ts','lib/investigation.ts','lib/customer-case.ts','lib/data.ts','lib/contracts.ts','lib/deadline.ts','evals/chat-cases.ts','evals/customer-cases.ts','evals/chat-holdout.ts','evals/chat-oracle.py'].map(path=>[path,sha(path)]));
const asOf=process.env.EVAL_AS_OF??today(),ds=dataset(asOf);
const requests:{id:string;filters:Filters;metric:Metric;asOf:string}[]=[];
const metrics:Metric[]=['count','median_price','mean_price','median_ppsm','mean_ppsm'];
const filters:Filters[]=[{},...overview().cities.map(city=>({city})),{city:'אילת'},{city:'ת״א'},{city:'חולון',roomsMin:4,roomsMax:4,propertyType:'דירה'},{city:'חיפה',roomsMin:3.5,roomsMax:3.5},{city:'חולון',neighborhood:'קריית שרת'},{city:'חולון',parking:false},{city:'חיפה',elevator:true,safeRoom:true},{roomsMin:3,roomsMax:4},{dateFrom:'2025-01-01',dateTo:'2025-12-31'},{dateFrom:'2025-08-15',dateTo:'2025-08-20'},{dateFrom:'2025-08-01',dateTo:'2025-08-31'},{city:'חולון',neighborhood:'אין-שכונה-כזו'}];
for(let i=0;i<filters.length;i++)for(const metric of metrics)requests.push({id:`cohort-${i}-${metric}`,filters:filters[i],metric,asOf});
for(const c of chatCases)if(c.expected.intent.includes('query')||c.expected.intent.includes('quality'))requests.push({id:c.id,filters:c.expected.filters??{},metric:c.expected.metric??'count',asOf});
const oracleRun=spawnSync('python3',['evals/chat-oracle.py'],{input:JSON.stringify(requests),encoding:'utf8'});
if(oracleRun.status!==0)throw new Error('Independent CSV audit failed: '+oracleRun.stderr.slice(0,800));
type Oracle={id:string;value:number|null;matchedCount:number;includedCount:number;evidenceIds:string[];excludedIds:string[];matchedIds:string[];flaggedIds:string[];excludedPartialDates:number};
const oracle=JSON.parse(oracleRun.stdout) as {sourceRows:number;uniqueDeals:number;csvSha256:string;jsonMatchesCsv:boolean;results:Oracle[]};
const byId=new Map(oracle.results.map(r=>[r.id,r]));
function same(a:unknown,b:unknown){return JSON.stringify(a)===JSON.stringify(b);}
function numericChecks(result:ReturnType<typeof calculateMetrics>,o:Oracle){
 const failures:string[]=[];
 if(result.value===null?o.value!==null:o.value===null||Math.abs(result.value-o.value)>1e-6)failures.push('numeric_value');
 if(result.matchedCount!==o.matchedCount)failures.push('matched_count');
 if(result.includedCount!==o.includedCount)failures.push('included_count');
 if(!same(result.evidenceIds,o.evidenceIds))failures.push('evidence_ids');
 if(!same(result.excluded.map(r=>r.id),o.excludedIds))failures.push('excluded_ids');
 if(result.excludedPartialDates!==o.excludedPartialDates)failures.push('partial_date_exclusions');
 return failures;
}
const deterministic=requests.filter(r=>r.id.startsWith('cohort-')).map(r=>{const actual=calculateMetrics(ds,r.filters,r.metric,asOf),failures=numericChecks(actual,byId.get(r.id)!);return {id:r.id,pass:!failures.length,failures};});
mkdirSync('evals/results',{recursive:true});
const source={sourceRows:oracle.sourceRows,uniqueDeals:oracle.uniqueDeals,csvSha256:oracle.csvSha256,jsonMatchesCsv:oracle.jsonMatchesCsv};
const base={generatedAt:new Date().toISOString(),asOf,source,deterministic:{passed:deterministic.filter(r=>r.pass).length,total:deterministic.length,results:deterministic}};
writeFileSync('evals/results/chat-source-audit.json',JSON.stringify(base,null,2));
console.log(JSON.stringify({...base,deterministic:{...base.deterministic,results:deterministic.filter(r=>!r.pass)}},null,2));
if(deterministic.some(r=>!r.pass)){process.exitCode=1;}else if(process.argv.includes('--live')){
 const config={OPENAI_API_KEY:process.env.OPENAI_API_KEY,AI_MODEL:process.env.AI_MODEL,AI_GATEWAY_API_KEY:process.env.AI_GATEWAY_API_KEY};
 if(!modelReady(config))throw new Error('BLOCKED: live audit requires a configured model; no live calls made.');
 const repeat=Number(process.env.EVAL_REPEATS??1);if(!Number.isInteger(repeat)||repeat<1||repeat>3)throw new Error('EVAL_REPEATS must be 1 through 3');
 const catalogue=plannerCatalogue(asOf);
 const gen=generator(config),results=[];let halted=false;
 for(let run=0;run<repeat&&!halted;run++)for(const c of chatCases){
  const start=Date.now();try{
   // Only these fields enter the planner. Category/expectations/oracle stay outside.
   const plan=await planQuery(gen,c.message,c.history??[],catalogue);
   const answer=executePlan(ds,plan,asOf),failures:string[]=[];
   if(!c.expected.intent.includes(plan.intent))failures.push('intent');
   if(plan.intent==='query'||plan.intent==='quality'){
    if(!same(Object.entries(plan.filters).sort(),Object.entries(c.expected.filters??{}).sort()))failures.push('filters');
    const expected=byId.get(c.id);
    if(plan.intent==='query'){
     if(plan.metric!==c.expected.metric)failures.push('metric');
     if(answer.result&&expected)failures.push(...numericChecks(answer.result,expected));else failures.push('unexpected_numeric_answer');
    }else if(expected){
     if(answer.quality?.uniqueDeals!==expected.matchedCount)failures.push('quality_cohort');
     if(!same(answer.deals?.map(d=>d.id),expected.flaggedIds))failures.push('quality_evidence');
    }else failures.push('unexpected_quality_answer');
   }
   if(c.expected.dealId&&plan.dealId!==c.expected.dealId)failures.push('deal_id');
   if(plan.intent==='deal'){
    const found=ds.find(d=>d.id===c.expected.dealId);
    if(!same(answer.deals?.map(d=>d.id),found?[found.id]:[]))failures.push('deal_evidence');
    if(found&&!same(answer.deals?.[0].raw,found.raw))failures.push('raw_provenance');
    if(found&&(!answer.customerCase||answer.customerCase.dealId!==found.id||!same(answer.customerCase.sourceRows,found.rows)))failures.push('customer_case_provenance');
    if(found?.conflict&&answer.customerCase&&!answer.customerCase.calculation.includes('לא מוצג מחיר'))failures.push('conflict_authoritative_value');
    if(!found&&answer.customerCase)failures.push('invented_customer_case');
   }
   if((plan.intent==='clarify'||plan.intent==='unsupported')&&(answer.tools.length||answer.result))failures.push('unexpected_tool_execution');
   if(plan.intent==='clarify'&&!answer.suggestedQuestion?.trim())failures.push('missing_clarification');
   results.push({id:c.id,category:c.category,repeat:run,pass:!failures.length,failures,plan,answerKind:answer.kind,value:answer.result?.value,evidenceIds:answer.result?.evidenceIds??answer.deals?.map(d=>d.id),elapsedMs:Date.now()-start});
  }catch(error){results.push({id:c.id,category:c.category,repeat:run,pass:false,error:error instanceof Error?error.message:'unknown',elapsedMs:Date.now()-start});}
  console.log(JSON.stringify(results.at(-1)));
  if(results.length>=3&&results.slice(-3).every(r=>'error' in r)){halted=true;break;}
 }
 const passed=results.filter(r=>r.pass).length;
 const report={...base,model:config.AI_MODEL,promptSha256,codeSha256,mode:'live-chat-with-independent-csv-oracle',total:results.length,expectedTotal:chatCases.length*repeat,passed,gatePassed:passed===results.length&&results.length===chatCases.length*repeat,results};
 const output=process.env.EVAL_REPORT_PATH??'evals/results/chat-live-audit.json';
 if(!/^evals\/results\/[a-zA-Z0-9_.-]+\.json$/.test(output))throw new Error('Report path must be a JSON file under evals/results');
 writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,total:report.total,passed,gatePassed:report.gatePassed},null,2));if(!report.gatePassed)process.exitCode=1;
}
