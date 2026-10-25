import { json } from '../../../lib/http';
import { dataset,today } from '../../../lib/data';
import { executePlan } from '../../../lib/investigation';
export async function GET(){return json({...executePlan(dataset(),{intent:'quality',filters:{},metric:'count',dealId:null,clarification:null},today()),mode:'deterministic'});}
