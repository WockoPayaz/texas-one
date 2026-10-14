import {authClient} from '@/lib/supabase';
export const runtime='nodejs';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 try{
 const raw=await req.text();if(raw.length>4096)return Response.json({error:'Request too large.'},{status:413});
 const {email,password}=JSON.parse(raw);
 if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>256)return Response.json({error:'Enter your email and password.'},{status:400});
 const client=await authClient();const {error}=await client.auth.signInWithPassword({email,password});
 if(error)return Response.json({error:'Unable to sign in. Check your credentials or try again later.'},{status:401,headers:{'Cache-Control':'no-store'}});
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Sign-in is unavailable. Check the Supabase configuration.'},{status:503});}
}
