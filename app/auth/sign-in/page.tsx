'use client';
import { useState } from 'react';
import { createAuthClient } from '@neondatabase/auth/next';
const auth=createAuthClient();
export default function SignIn(){
 const [email,setEmail]=useState(''),[otp,setOtp]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');
  try{
   const result=sent?await auth.signIn.emailOtp({email,otp}):await auth.emailOtp.sendVerificationOtp({email,type:'sign-in'});
   if(result.error)throw new Error('AUTH_FAILED');
   if(sent)window.location.assign('/');else setSent(true);
  }catch{setError(sent?'הקוד לא אומת. בדקו את הקוד או בקשו קוד חדש.':'לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר.');}
  finally{setBusy(false);}
 }
 return <main className="auth-page" dir="rtl"><a href="/">חזרה לצ׳אט</a><h1>התחברות ל־CSM</h1><p>נשלח קוד חד־פעמי לכתובת הדוא״ל שלך. יצירת טיוטות זמינה רק לחשבונות שהורשו מראש.</p><form onSubmit={submit}><label>כתובת דוא״ל<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={sent||busy}/></label>{sent&&<label>הקוד שנשלח בדוא״ל<input inputMode="numeric" autoComplete="one-time-code" required maxLength={12} value={otp} onChange={e=>setOtp(e.target.value)}/></label>}<button disabled={busy}>{busy?'רגע…':sent?'אימות והתחברות':'שליחת קוד'}</button>{sent&&<button type="button" disabled={busy} onClick={()=>{setSent(false);setOtp('');}}>שינוי כתובת או בקשת קוד חדש</button>}{error&&<p role="alert">{error}</p>}</form></main>;
}
