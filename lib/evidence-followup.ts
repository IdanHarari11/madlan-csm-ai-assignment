import {cityName} from './domain';
import type {ExecutablePlan} from './investigation';
// Evidence requests reuse a server-reconstructed calculation. They cannot silently change its cohort.
export function resolveEvidencePlan(proposed:ExecutablePlan,previous?:ExecutablePlan|null):ExecutablePlan{
 if(proposed.intent!=='evidence')return proposed;
 if(!previous||!['query','evidence'].includes(previous.intent))return {...proposed,intent:'clarify',clarification:'לאיזה חישוב אתם מתכוונים? בקשו קודם מדד או ציינו את המסננים.'};
 for(const [key,value]of Object.entries(proposed.filters)){
  const old=previous.filters[key as keyof typeof previous.filters];
  const same=key==='city'&&typeof old==='string'&&typeof value==='string'?cityName(old)===cityName(value):old===value;
  if(!same)return {...proposed,intent:'clarify',clarification:'הבקשה משנה את תנאי החישוב הקודם. האם להציג את העסקאות שנכללו בו, או לבצע חיפוש חדש בתנאים אחרים?'};
 }
 return {...previous,intent:'evidence',filters:{...previous.filters},dealId:null,clarification:null};
}
