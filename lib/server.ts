import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { AppError } from './http';
import { D1Store,hash,modelBudget } from './store';
import { JiraClient } from './jira';
export function getEnv(){return env;}
export function getStore(){if(!env.DB)throw new AppError('STORAGE_UNAVAILABLE',503,'שירות השמירה אינו זמין. יצירת משימות נעצרה.');return new D1Store(env.DB);}
export async function identity(){
 const user=await getChatGPTUser();
 const list=(env.CSM_EMAILS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 return {user,canCreate:Boolean(user&&list.includes(user.email.toLowerCase()))};
}
export async function requireCSM(){const i=await identity();if(!i.user)throw new AppError('AUTH_REQUIRED',401,'יש להתחבר כדי להכין ולשלוח משימות.');if(!i.canCreate)throw new AppError('NOT_AUTHORIZED',403,'יצירת משימות זמינה רק לאנשי CSM מורשים.');return i.user;}
export async function reserveAI(request:Request,actor?:string){
 if(!env.DB)throw new AppError('STORAGE_UNAVAILABLE',503,'בקרת המכסות אינה זמינה. בקשות AI נעצרו.');
 // CF-Connecting-IP is injected by Cloudflare, not accepted from request JSON.
 const anonymous='anon-'+await hash(request.headers.get('cf-connecting-ip')??'shared-anonymous');
 await modelBudget(env.DB,actor??anonymous);
}
export function getJira(){
 if(env.JIRA_ENABLED!=='true')throw new AppError('JIRA_DISABLED',503,'שליחה ל־Jira אינה פעילה. אפשר לבדוק ולשמור את תוכן הטיוטה.');
 const {JIRA_BASE_URL:baseUrl,JIRA_EMAIL:email,JIRA_API_TOKEN:token,JIRA_PROJECT_KEY:project,JIRA_ISSUE_TYPE_ID:issueTypeId}=env;
 if(!baseUrl||!email||!token||!project||!issueTypeId)throw new AppError('JIRA_NOT_CONFIGURED',503,'חסרות הגדרות לחיבור Jira. לא נשלחה משימה.');
 return new JiraClient({baseUrl,email,token,project,issueTypeId});
}
