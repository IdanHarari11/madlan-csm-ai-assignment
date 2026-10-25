import { endpoint,readBody } from '../../../lib/http';
import { exploreSchema } from '../../../lib/contracts';
import { dataset,today } from '../../../lib/data';
import { executePlan } from '../../../lib/investigation';
export async function POST(request:Request){return endpoint(async()=>{const b=await readBody(request,exploreSchema);return {mode:'deterministic',...executePlan(dataset(),{intent:b.dealId?'deal':'query',filters:b.filters,metric:b.metric,dealId:b.dealId??null,clarification:null},today())};});}
