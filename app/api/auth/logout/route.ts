import {authClient} from '@/lib/supabase';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 const client=await authClient();await client.auth.signOut();return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
