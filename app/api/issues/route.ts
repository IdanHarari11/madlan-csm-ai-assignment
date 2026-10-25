import { endpoint,readBody } from '../../../lib/http';
import { createIssueSchema } from '../../../lib/contracts';
import { getJira,getStore,requireCSM } from '../../../lib/server';
import { createIssue } from '../../../lib/task-service';
export async function POST(request:Request){return endpoint(async(traceId)=>{const b=await readBody(request,createIssueSchema);const user=await requireCSM();return createIssue({store:getStore(),jira:getJira(),owner:user.userId,draftId:b.draftId,expectedRevision:b.revision,traceId,now:Date.now()});});}
