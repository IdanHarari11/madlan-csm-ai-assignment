import {writeFileSync} from 'node:fs';
import {generator,planQuery} from '../lib/ai';
import {plannerCatalogue,dataset,today} from '../lib/data';
import {executePlan} from '../lib/investigation';
const cases=[
 {message:'הצג דירות ארבעה חדרים בחולון עם חניה',filters:{city:'חולון',propertyType:'דירה',roomsMin:4,roomsMax:4,parking:true},intent:'query'},
 {message:'סנן את העסקאות בחיפה לאלו שאין בהן חניה',filters:{city:'חיפה',parking:false},intent:'query'},
 {message:'תראה את כל העסקאות במדגם בכל הערים',filters:{},intent:'query'},
 {message:'הצג דירות בחיפה במחיר עד שלושה מיליון שקלים',intent:'unsupported'},
];
const config={OPENAI_API_KEY:process.env.OPENAI_API_KEY,AI_MODEL:process.env.AI_MODEL},gen=generator(config),asOf=today(),results=[];
const same=(a:unknown,b:unknown)=>JSON.stringify(Object.entries(a as object).sort())===JSON.stringify(Object.entries(b as object).sort());
for(const c of cases){try{const p=await planQuery(gen,c.message,[],plannerCatalogue(asOf)),answer=executePlan(dataset(asOf),p,asOf);const pass=p.intent===c.intent&&(c.intent!=='query'||(p.metric==='count'&&same(p.filters,c.filters)));results.push({message:c.message,expected:c,plan:p,pass,kind:answer.kind});}catch(e){results.push({message:c.message,pass:false,error:e instanceof Error?e.message:'unknown'});}}
const r={model:config.AI_MODEL,generatedAt:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.pass).length,results};writeFileSync('evals/results/map-browse.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));if(r.passed!==r.total)process.exitCode=1;
