import { AppError } from './http';
export type JiraConfig={baseUrl:string;email:string;token:string;project:string;issueTypeId:string};
export type JiraIssue={key:string;summary:string;url:string};
export interface JiraPort {findExisting(fingerprint:string,title:string):Promise<JiraIssue[]>;create(input:{title:string;body:string;fingerprint:string;operationId:string}):Promise<JiraIssue>;}
export function validateJiraConfig(c:JiraConfig){
 const u=new URL(c.baseUrl);
 if(u.protocol!=='https:'||!u.hostname.endsWith('.atlassian.net')||u.username||u.password||u.port||!['','/'].includes(u.pathname)||u.search||u.hash||!/^\w[\w-]{0,30}$/.test(c.project)||!/^\d+$/.test(c.issueTypeId))throw new AppError('JIRA_CONFIG',503,'חיבור Jira אינו מוגדר כראוי. הטיוטה נשמרה.');
 return {...c,baseUrl:u.origin};
}
export class JiraClient implements JiraPort {
 config:JiraConfig;fetcher:typeof fetch;
 constructor(config:JiraConfig,fetcher:typeof fetch=fetch){this.config=validateJiraConfig(config);this.fetcher=fetcher;}
 async call(path:string,method:string,body:unknown){
  try{
   const r=await this.fetcher(this.config.baseUrl+path,{method,headers:{Authorization:`Basic ${btoa(this.config.email+':'+this.config.token)}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!r.ok){if(r.status>=400&&r.status<500)throw new AppError('JIRA_REJECTED',502,'Jira דחה את הבקשה. הטיוטה זמינה לבדיקה, ולא נשלח ניסיון חוזר אוטומטי.');throw new Error('JIRA_UNCERTAIN');}
   return await r.json() as Record<string,unknown>;
  }catch(e){if(e instanceof AppError)throw e;throw new AppError('JIRA_UNCERTAIN',503,'לא ניתן לאשר אם Jira קיבל את הבקשה. לא ניצור משימה נוספת; נדרשת בדיקת הסטטוס.');}
 }
 async findExisting(fingerprint:string,title:string){
  const label='madlan-fp-'+fingerprint;
  const words=title.replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/).filter(s=>s.length>2).slice(0,4);
  // Similarity candidates are deliberately conservative: show them, never silently merge.
  const clauses=words.map(w=>`text ~ "${w}"`).join(' AND ');
  const result=await this.call('/rest/api/3/search/jql','POST',{jql:`project = "${this.config.project}" AND (labels = "${label}"${clauses?' OR (statusCategory != Done AND '+clauses+')':''})`,fields:['summary'],maxResults:5});
  if(!Array.isArray(result.issues))throw new AppError('JIRA_BAD_RESPONSE',502,'לא הצלחנו לבדוק כפילויות ב־Jira. היצירה נעצרה.');
  return result.issues.map((issue:unknown)=>{const i=issue as {key:string;fields:{summary:string}};if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(i.key)||typeof i.fields?.summary!=='string')throw new AppError('JIRA_BAD_RESPONSE',502,'תשובת Jira לא תקינה.');return {key:i.key,summary:i.fields.summary,url:this.config.baseUrl+'/browse/'+i.key};});
 }
 async create(input:{title:string;body:string;fingerprint:string;operationId:string}){
  const result=await this.call('/rest/api/3/issue','POST',{fields:{project:{key:this.config.project},issuetype:{id:this.config.issueTypeId},summary:input.title,labels:['madlan-evidence-desk','madlan-fp-'+input.fingerprint,'madlan-op-'+input.operationId],description:{type:'doc',version:1,content:input.body.split('\n').map(t=>({type:'paragraph',content:t?[{type:'text',text:t}]:[]}))}}});
  if(typeof result.key!=='string'||!/^[A-Z][A-Z0-9_]*-\d+$/.test(result.key))throw new AppError('JIRA_UNCERTAIN',503,'Jira החזיר תשובה לא צפויה; יש לבדוק אם נוצרה משימה לפני ניסיון נוסף.');
  return {key:result.key,summary:input.title,url:this.config.baseUrl+'/browse/'+result.key};
 }
}
