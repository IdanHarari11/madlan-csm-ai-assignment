import { getAuth } from '../../../../lib/auth';
import { json,AppError } from '../../../../lib/http';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
async function handle(request:Request,context:Context){
 try{
  if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:{message:'מקור בקשה לא מורשה.'}},403);
  const handlers=getAuth().handler();
  return request.method==='GET'?handlers.GET(request,context):handlers.POST(request,context);
 }catch(e){return json({error:{message:e instanceof AppError?e.userMessage:'לא ניתן להתחבר כרגע.'}},503);}
}
export const GET=handle;
export const POST=handle;
