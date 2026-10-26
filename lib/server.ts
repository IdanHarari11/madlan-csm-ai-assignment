import type { ModelConfig } from './ai';
const env:NodeJS.ProcessEnv&ModelConfig=process.env;
import { getCurrentUser } from './auth';
import { AppError } from './http';
import { hash } from './store';
import { PostgresStore,database,postgresModelBudget } from './postgres-store';
import { JiraClient } from './jira';
export function getEnv(){return env;}
export function getStore(){return new PostgresStore();}
export async function identity(){
 const user=await getCurrentUser();
 const list=(env.CSM_EMAILS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 return {user,canCreate:Boolean(user&&list.includes(user.email.toLowerCase()))};
}
export async function requireCSM(){const i=await identity();if(!i.user)throw new AppError('AUTH_REQUIRED',401,'יש להתחבר כדי להכין ולשלוח משימות.');if(!i.canCreate)throw new AppError('NOT_AUTHORIZED',403,'יצירת משימות זמינה רק לאנשי CSM מורשים.');return i.user;}
export async function reserveAI(request:Request,actor?:string){

 // Vercel injects x-vercel-forwarded-for. Do not trust client role/email headers.
 const anonymous='anon-'+await hash(request.headers.get('x-vercel-forwarded-for')??'shared-anonymous');
 await postgresModelBudget(database(),actor??anonymous);
}
export function getJira(){
 if(env.JIRA_ENABLED!=='true')throw new AppError('JIRA_DISABLED',503,'שליחה ל־Jira אינה פעילה. אפשר לבדוק ולשמור את תוכן הטיוטה.');
 const {JIRA_BASE_URL:baseUrl,JIRA_EMAIL:email,JIRA_API_TOKEN:token,JIRA_PROJECT_KEY:project,JIRA_ISSUE_TYPE_ID:issueTypeId}=env;
 if(!baseUrl||!email||!token||!project||!issueTypeId)throw new AppError('JIRA_NOT_CONFIGURED',503,'חסרות הגדרות לחיבור Jira. לא נשלחה משימה.');
 return new JiraClient({baseUrl,email,token,project,issueTypeId});
}
