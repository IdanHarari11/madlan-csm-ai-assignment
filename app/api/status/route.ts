import { json } from '../../../lib/http';
import { identity,getEnv } from '../../../lib/server';
import { modelReady } from '../../../lib/ai';
import { overview } from '../../../lib/data';
export async function GET(){const {user,canCreate}=await identity();const e=getEnv();return json({dataset:overview(),modelReady:modelReady(e),jiraReady:Boolean(e.JIRA_ENABLED==='true'&&e.JIRA_BASE_URL&&e.JIRA_EMAIL&&e.JIRA_API_TOKEN&&e.JIRA_PROJECT_KEY&&e.JIRA_ISSUE_TYPE_ID),user:user?{displayName:user.displayName}:null,canCreate});}
