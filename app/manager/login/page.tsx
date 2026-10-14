'use client';
import {useState} from 'react';
export default function Login(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const form=new FormData(e.currentTarget);try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});const d=await r.json();if(!r.ok)throw Error(d.error);location.assign('/manager');}catch(e){setError(e instanceof Error?e.message:'Could not sign in.');}finally{setBusy(false);}}
 return <main className="manager-login"><img src="/logo.png" alt="TEXAS ONE"/><h1>Manager sign-in</h1><p>Use the email and password provided by the restaurant owner.</p><form onSubmit={submit} className="checkout-form full"><label>Email<input type="email" name="email" autoComplete="username" required maxLength={254}/></label><label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={256}/></label>{error&&<p role="alert" className="notice error">{error}</p>}<button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form><a href="/">Back to restaurant</a></main>;
}
