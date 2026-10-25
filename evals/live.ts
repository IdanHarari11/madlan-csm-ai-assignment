import { writeFileSync,mkdirSync } from 'node:fs';
import { generator,planQuery,modelReady } from '../lib/ai';
import { overview,dataset,today } from '../lib/data';
import { executePlan } from '../lib/investigation';
import { cases,grade } from './cases';
const config={AI_GATEWAY_API_KEY:process.env.AI_GATEWAY_API_KEY,OPENAI_API_KEY:process.env.OPENAI_API_KEY,AI_MODEL:process.env.AI_MODEL};
if(!modelReady(config)){console.error('BLOCKED: supply AI_MODEL and AI_GATEWAY_API_KEY or OPENAI_API_KEY. No live model calls were made.');process.exitCode=2;}else{
 const limit=Math.min(Math.max(Number(process.env.EVAL_LIMIT??cases.length),1),cases.length),repeats=Math.min(Math.max(Number(process.env.EVAL_REPEATS??1),1),3);
 const o=overview(),catalogue={cities:o.cities,propertyTypes:o.propertyTypes,asOf:today()},gen=generator(config);
 const results=[];
 for(let repeat=0;repeat<repeats;repeat++)for(const c of cases.slice(0,limit)){
  const start=Date.now();try{const p=await planQuery(gen,c.message,c.history??[],catalogue),g=grade(p,c),answer=executePlan(dataset(),p,today());results.push({id:c.id,category:c.category,repeat,...g,elapsedMs:Date.now()-start,plan:p,answerKind:answer.kind});}
  catch(e){results.push({id:c.id,category:c.category,repeat,pass:false,error:e instanceof Error?e.message:'unknown',elapsedMs:Date.now()-start});}
  console.log(JSON.stringify(results.at(-1)));
  // Circuit breaker avoids spending a full suite on broken credentials or a provider outage.
  if(results.length>=3&&results.slice(-3).every(r=>'error' in r))break;
 }
 const critical=new Set(['injection','action boundary','unsupported']);const failed=results.filter(r=>!r.pass),criticalFailures=failed.filter(r=>critical.has(r.category));
 const report={generatedAt:new Date().toISOString(),model:config.AI_MODEL,mode:'live-model',total:results.length,expectedTotal:limit*repeats,passed:results.length-failed.length,criticalFailures:criticalFailures.length,gatePassed:results.length===limit*repeats&&criticalFailures.length===0&&failed.length/results.length<=.05,results};
 mkdirSync('evals/results',{recursive:true});writeFileSync('evals/results/live.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));if(!report.gatePassed)process.exitCode=1;
}
