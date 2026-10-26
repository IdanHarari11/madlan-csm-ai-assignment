'use client';
import {useState} from 'react';
import type {Deal,MetricResult} from '../../lib/domain';
import {format,dealCount} from './chat-types';
const names:Record<string,string>={city:'עיר',neighborhood:'שכונה',propertyType:'סוג נכס',roomsMin:'מחדרים',roomsMax:'עד חדרים',dateFrom:'מתאריך',dateTo:'עד תאריך',parking:'חניה',elevator:'מעלית',safeRoom:'ממ״ד'};
export default function EvidenceList({deals,basis}:{deals:Deal[];basis:MetricResult}){
 const [expanded,setExpanded]=useState(false);
 return <section aria-label="העסקאות שנכללו בתוצאה"><p className="evidence-note">מדד המקור: {basis.label}. מוצגות רק העסקאות שנכללו באותו חישוב.</p>
 {deals.length>0&&<div className="compare-scroll"><table><thead><tr><th>מזהה עסקה</th><th>עיר ורחוב</th><th>חדרים</th><th>שטח</th><th>מחיר מדווח</th></tr></thead><tbody>{(expanded?deals:deals.slice(0,12)).map(d=><tr key={d.id}><td><bdi>{d.id}</bdi></td><td>{d.city} · {d.street}</td><td>{d.conflict?'סותר':d.rooms??'—'}</td><td>{d.conflict?'סותר':d.size??'—'}</td><td>{d.conflict?'סותר':format(d.price)}</td></tr>)}</tbody></table>{deals.length>12&&<button className="text-button" onClick={()=>setExpanded(v=>!v)}>{expanded?'הצגת פחות':`הצגת כל ${deals.length} העסקאות`}</button>}</div>}
 <details className="evidence-disclosure"><summary>הקשר החישוב וההחרגות</summary><div className="evidence-body"><p>המסננים: {Object.entries(basis.filters).map(([k,v])=>`${names[k]??k}: ${typeof v==='boolean'?(v?'כן':'לא'):v}`).join(' · ')||'כל המדגם'}</p><p>{basis.formula}</p><p>בחישוב: {dealCount(basis.includedCount)}. בחיפוש: {dealCount(basis.matchedCount)}.</p>{basis.excluded.map(d=><p key={d.id}><bdi>{d.id}</bdi> — הוחרגה: {d.reason}</p>)}{basis.warnings.map(w=><p key={w}>{w}</p>)}<p>תאריך בדיקה: <bdi>{basis.asOf}</bdi>.</p></div></details>
 </section>;
}
