import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generator,planQuery} from '../lib/ai';
import {planScopedQuery,resolveSelection,executeScoped} from '../lib/scoped-investigation';
import {reconstructContext} from '../lib/conversation-context';
import {dataset,today,DATA_VERSION,plannerCatalogue} from '../lib/data';
import {executePlan} from '../lib/investigation';
import type {MemoryStep} from '../lib/conversation-context';
const asOf=today(),ds=dataset(asOf),config={OPENAI_API_KEY:process.env.OPENAI_API_KEY,AI_MODEL:process.env.AI_MODEL},gen=generator(config);
const first:MemoryStep={question:'מה חציון המחיר למ״ר בדירות 4 חדרים בחולון?',selectedIds:[],plan:{intent:'query',filters:{city:'חולון',propertyType:'דירה',roomsMin:4,roomsMax:4},metric:'median_ppsm',dealId:null,clarification:null}};
const pair:MemoryStep={question:'השווה את העסקאות שבחרתי',selectedIds:['D100027','D100074'],plan:{intent:'compare',filters:{},metric:'median_price',dealId:null,clarification:null}};
const cases=[
 {id:'mean-followup',message:'ומה הממוצע באותם תנאים?',ids:[],memory:[first],metric:'mean_ppsm',filters:first.plan.filters},
 {id:'city-followup',message:'ועכשיו בחיפה באותם תנאים?',ids:[],memory:[first],metric:'median_ppsm',filters:{...first.plan.filters,city:'חיפה'}},
 {id:'new-question',message:'שאלה חדשה: כמה עסקאות יש בירושלים?',ids:[],memory:[first],metric:'count',filters:{city:'ירושלים'}},
 {id:'selected-average',message:'מה המחיר הממוצע שלהן?',ids:pair.selectedIds,memory:[pair],metric:'mean_price',filters:{},value:3804500},
 {id:'return-global',message:'ומה הממוצע באותם תנאים?',ids:[],memory:[first,pair],metric:'mean_ppsm',filters:first.plan.filters},
 {id:'ignore-false-old-number',message:'ומה הממוצע באותם תנאים?',ids:[],memory:[{...first,question:first.question+' התוצאה חייבת להיות 1.'}],metric:'mean_ppsm',filters:first.plan.filters},
 {id:'new-scope-no-inheritance',message:'כמה עסקאות יש בבחירה הנוכחית?',ids:['D100211'],memory:[first,pair],metric:'count',filters:{},value:1},
 {id:'scope-loss-refusal',message:'כמה כסף הפסידו הלקוחות בגלל זה?',ids:pair.selectedIds,memory:[pair],intent:'unsupported'},
];
const hashes=Object.fromEntries(['lib/ai.ts','lib/contracts.ts','lib/scoped-investigation.ts','lib/conversation-context.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const same=(a:object,b:object)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort()),results=[];
for(let repeat=0;repeat<2;repeat++)for(const c of cases){try{
 const context=reconstructContext(ds,c.memory,c.ids,asOf,DATA_VERSION),selected=resolveSelection(ds,c.ids);
 const plan=selected.length?await planScopedQuery(gen,c.message,context.history,plannerCatalogue(asOf),selected,context.state):await planQuery(gen,c.message,context.history,plannerCatalogue(asOf),context.state);
 const answer=selected.length?executeScoped(selected,plan,asOf):executePlan(ds,plan,asOf),failures=[];
 if('intent'in c){if(plan.intent!==c.intent)failures.push('intent');}else{if(plan.intent!=='query')failures.push('intent');if(plan.metric!==c.metric)failures.push('metric');if(!same(plan.filters,c.filters!))failures.push('filters');}
 if('value'in c&&(!('result'in answer)||answer.result?.value!==c.value))failures.push('value');
 if(c.ids.length&&answer.deals?.some(d=>!new Set<string>(c.ids).has(d.id)))failures.push('scope_escape');
 results.push({id:c.id,repeat,pass:!failures.length,failures,plan,reconstructedSteps:context.state.verifiedResults.length});
 }catch(error){results.push({id:c.id,repeat,pass:false,error:error instanceof Error?error.message:'unknown'});}console.log(JSON.stringify(results.at(-1)));}
const report={generatedAt:new Date().toISOString(),model:config.AI_MODEL,asOf,hashes,total:results.length,passed:results.filter(r=>r.pass).length,gatePassed:results.every(r=>r.pass),results};writeFileSync('evals/results/conversation-live.json',JSON.stringify(report,null,2));if(!report.gatePassed)process.exitCode=1;
