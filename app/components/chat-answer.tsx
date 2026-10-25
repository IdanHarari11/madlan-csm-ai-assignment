'use client';
import { useState } from 'react';
import { ArrowUpLeft,ChevronDown,FileText,AlertTriangle } from 'lucide-react';
import type { Deal } from '../../lib/domain';
import type { Investigation,TaskContext } from './chat-types';
import { format } from './chat-types';
const filterNames:Record<string,string>={city:'עיר',neighborhood:'שכונה',propertyType:'סוג נכס',roomsMin:'מחדרים',roomsMax:'עד חדרים',dateFrom:'מתאריך',dateTo:'עד תאריך',parking:'חניה',elevator:'מעלית',safeRoom:'ממ״ד'};
const qualityNames:Record<string,string>={duplicate:'כפילויות זהות',conflicting_duplicate:'עסקאות עם סתירות',invalid_size:'שטח חסר או לא תקין',month_precision:'תאריך ברמת חודש',ppsm_mismatch:'פער במחיר למ״ר',missing_neighborhood:'שכונה חסרה',invalid_price:'מחיר חסר או לא תקין',price_suspicious:'מחיר חריג לבדיקה',future_date:'תאריך עתידי',invalid_date:'תאריך לא תקין',floor_mismatch:'סתירה בקומה',year_suspicious:'שנת בנייה חשודה',size_suspicious:'שטח חריג',invalid_rooms:'חדרים לא תקינים'};
export default function ChatAnswer({answer,question,turnId,onTask}:{answer:Investigation;question:string;turnId:string;onTask:(context:TaskContext)=>void}){
 const [selected,setSelected]=useState<string[]>([]),[expanded,setExpanded]=useState(false);
 const deals=answer.deals??[],result=answer.result;
 function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<30?[...s,id]:s);}
 const suggestedIds=deals.length===1?[deals[0].id]:[];
 return <div className="answer-content">
  {answer.mode==='deterministic'&&<div className="direct-label">בדיקה ישירה של הנתונים · ללא AI</div>}
  {result?<>
   <p>{result.value===null?'אין מספיק נתונים תקינים לחישוב המבוקש.':result.includedCount===0?'לא נמצאו עסקאות שתואמות לבקשה.':<>{result.label} הוא <strong>{format(result.value)} {result.unit}</strong>, על בסיס {result.includedCount} עסקאות.</>}</p>
   {result.includedCount>0&&result.includedCount<5&&<p className="inline-warning"><AlertTriangle size={15}/>זהו מדגם קטן. התוצאה מתארת את העסקאות שנכללו בלבד.</p>}
   {result.excluded.length>0&&<p>{result.excluded.length} עסקאות הוחרגו עקב נתונים חסרים, חשודים או סותרים.</p>}
  </>:<p>{answer.kind==='clarify'&&answer.suggestedQuestion?answer.suggestedQuestion:answer.message}</p>}
  {answer.quality&&<><p>נמצאו {answer.quality.conflictingDeals} מזהים עם נתונים סותרים. בסך הכול {answer.quality.flaggedDeals} עסקאות סומנו בבדיקות האיכות.</p><p className="muted">חריגה בנתונים אינה מוכיחה שקיים באג בתוכנה.</p></>}
  {answer.kind==='deal'&&deals[0]&&<p><bdi>{deals[0].id}</bdi> · {deals[0].city} · {deals[0].street}<br/>{deals[0].conflict?'קיימים מחירים סותרים לאותו מזהה. לא נבחר מחיר קובע והעסקה מוחרגת מחישובי מחיר.':<>מחיר: ₪{format(deals[0].price)} · שטח: {deals[0].size??'חסר'} מ״ר</>}</p>}
  {(result||deals.length>0||answer.quality)&&<details className="evidence-disclosure"><summary><FileText size={16}/>הצגת הנתונים והחישוב<ChevronDown size={15}/></summary><div className="evidence-body">
   {result&&<><p><strong>המסננים שהופעלו:</strong> {Object.keys(result.filters).length?Object.entries(result.filters).map(([k,v])=>`${filterNames[k]??k}: ${typeof v==='boolean'?(v?'כן':'לא'):v}`).join(' · '):'כל העסקאות במדגם'}</p><p>{result.formula}</p>{result.warnings.map(w=><p key={w} className="evidence-note">{w}</p>)}{result.excluded.length>0&&<details><summary>עסקאות שהוחרגו</summary>{result.excluded.map(d=><p key={d.id}><bdi>{d.id}</bdi> — {d.reason}</p>)}</details>}<p>נכללו {result.includedCount} מתוך {result.matchedCount} עסקאות תואמות. תאריך בדיקה: <bdi>{result.asOf}</bdi>.</p></>}
   {answer.quality&&<ul>{Object.entries(answer.quality.counts).map(([k,n])=><li key={k}>{qualityNames[k]??k}: {n}</li>)}</ul>}
   {deals.length>0&&<><p className="evidence-note">אפשר לפתוח רשומת מקור ולסמן עד 30 עסקאות כראיות למשימת המשך.</p>{(expanded?deals:deals.slice(0,8)).map(d=><div className="evidence-record" key={d.id}><label className="record-select"><input type="checkbox" checked={selected.includes(d.id)} onChange={()=>toggle(d.id)} aria-label={'בחירת '+d.id}/><bdi>{d.id}</bdi><span>{d.city}</span>{d.conflict&&<span className="conflict-label">סתירה</span>}</label><SourceRecord deal={d}/></div>)}{deals.length>8&&<button className="text-button" onClick={()=>setExpanded(!expanded)}>{expanded?'הצגת פחות':`הצגת כל ${deals.length} העסקאות`}</button>}</>}
   {answer.traceId&&<p className="trace">מזהה בדיקה: <bdi>{answer.traceId}</bdi></p>}
  </div></details>}
  {(deals.length>0||answer.kind==='unsupported')&&<button className="follow-up-action" onClick={()=>onTask({turnId,request:question,evidenceIds:selected.length?selected:suggestedIds})}>הכנת {deals.length?'משימת המשך':'בקשת פיצ׳ר'}{selected.length?` (${selected.length===1?'עסקה אחת':selected.length+' עסקאות'})`:''}<ArrowUpLeft size={15}/></button>}
 </div>;
}
function SourceRecord({deal:d}:{deal:Deal}){return <details className="source-record"><summary>רשומת מקור · {d.conflict?'מחירים סותרים':`₪${format(d.price)}`} · {d.size??'שטח חסר'}{d.size?' מ״ר':''}</summary><div>
 {d.flags.map(f=><p className="evidence-note" key={f.code}>{f.message}</p>)}
 {!d.conflict&&<p>מחיר למ״ר מחושב: {format(d.computedPpsm)}. המדווח בקובץ: {format(d.reportedPpsm)}.</p>}
 {d.raw.map((raw,i)=><details key={i}><summary>שורה {d.rows[i]} · מקור מדווח: {raw.source}</summary><dl className="raw-fields">{Object.entries(raw).map(([k,v])=><div key={k}><dt><code>{k}</code></dt><dd>{v||'חסר'}</dd></div>)}</dl></details>)}
 </div></details>;}
