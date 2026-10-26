import { endpoint,readBody,AppError } from '../../../lib/http';
import { chatSchema } from '../../../lib/contracts';
import { dataset,today,plannerCatalogue } from '../../../lib/data';
import { executePlan } from '../../../lib/investigation';
import { generator,modelReady,planQuery } from '../../../lib/ai';
import { getEnv,reserveAI,identity } from '../../../lib/server';
export async function POST(request:Request){return endpoint(async()=>{const b=await readBody(request,chatSchema);const e=getEnv();if(!modelReady(e))throw new AppError('MODEL_NOT_CONFIGURED',503,'ה־AI עדיין לא מחובר. אפשר להריץ דוגמאות בדיקה ישירה בתחילת שיחה; לא הופק מענה AI.');const {user}=await identity();await reserveAI(request,user?.userId);const asOf=today();const p=await planQuery(generator(e),b.message,b.history??[],plannerCatalogue(asOf));return {mode:'ai',plan:p,...executePlan(dataset(asOf),p,asOf)};});}
