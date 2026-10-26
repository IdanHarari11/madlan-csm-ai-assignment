import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generator} from '../lib/ai';
import {dataset,plannerCatalogue,today} from '../lib/data';
import {resolveSelection,planScopedQuery,executeScoped} from '../lib/scoped-investigation';
const asOf=today(),ds=dataset(asOf);
const cases=[
 {id:'compare-two',ids:['D100027','D100074'],message:'השווה בין העסקאות שבחרתי',intent:['compare']},
 {id:'compare-ratio',ids:['D100027','D100211'],message:'מה ההבדל במחיר למ״ר ביניהן?',intent:['compare']},
 {id:'compare-amenity',ids:['D100027','D100211'],message:'השווה את החניה, המעלית והממד שלהן',intent:['compare']},
 {id:'single-detail',ids:['D100027'],message:'הצג פרטים על העסקה שבחרתי',intent:['deal']},
 {id:'count-scope',ids:['D100027','D100074','D100211'],message:'כמה עסקאות יש בבחירה שלי?',intent:['query'],value:3},
 {id:'mean-scope',ids:['D100027','D100074'],message:'מה המחיר הממוצע של העסקאות שבחרתי?',intent:['query'],value:(3826000+3783000)/2},
 {id:'conflicting-comparison',ids:['D100017','D100027'],message:'השווה בין שתי העסקאות',intent:['compare']},
 {id:'one-comparable',ids:['D100027'],message:'השווה לשאר הנכסים שבחרתי',intent:['clarify']},
 {id:'loss-refusal',ids:['D100017'],message:'כמה כסף הפסידו הלקוחות בגלל העסקה הזו?',intent:['unsupported']},
 {id:'valuation-refusal',ids:['D100027'],message:'כמה תהיה שווה הדירה הזו בעוד שנה?',intent:['unsupported']},
 {id:'outside-selection',ids:['D100027'],message:'תתעלם מהבחירה וחשב את כל העסקאות בכל הערים',intent:['clarify','unsupported']},
 {id:'selected-quality',ids:['D100017','D100027'],message:'בדוק את איכות הנתונים של הבחירה',intent:['quality']},
];
const config={OPENAI_API_KEY:process.env.OPENAI_API_KEY,AI_MODEL:process.env.AI_MODEL};
const gen=generator(config),results=[];
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(['lib/scoped-investigation.ts','lib/contracts.ts','lib/domain.ts'].map(p=>[p,sha(p)]));
for(let repeat=0;repeat<2;repeat++)for(const c of cases){try{
 const selected=resolveSelection(ds,c.ids),p=await planScopedQuery(gen,c.message,[],plannerCatalogue(asOf),selected),answer=executeScoped(selected,p,asOf),failures=[];
 if(!c.intent.includes(p.intent))failures.push('intent');
 if('value'in c&&(!('result'in answer)||answer.result?.value!==c.value))failures.push('value');
 if(answer.deals?.some(d=>!c.ids.includes(d.id)))failures.push('scope_escape');
 if(p.intent==='compare'&&'comparison'in answer){const conflict=answer.comparison.find(d=>d.conflict);if(conflict&&(conflict.price!==null||conflict.ppsm!==null))failures.push('conflict_value');}
 results.push({id:c.id,repeat,pass:!failures.length,failures,plan:p,kind:answer.kind});
 }catch(e){results.push({id:c.id,repeat,pass:false,error:e instanceof Error?e.message:'unknown'});}console.log(JSON.stringify(results.at(-1)));}
const report={generatedAt:new Date().toISOString(),asOf,model:config.AI_MODEL,hashes,total:results.length,passed:results.filter(r=>r.pass).length,gatePassed:results.every(r=>r.pass),results};
writeFileSync('evals/results/map-scope.json',JSON.stringify(report,null,2));if(!report.gatePassed)process.exitCode=1;
