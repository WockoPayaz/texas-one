import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
export async function authClient(){
 const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel to enable manager sign-in.');
 const jar=await cookies();
 return createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'},cookies:{getAll:()=>jar.getAll(),setAll:values=>{for(const {name,value,options} of values)jar.set(name,value,options);}}});
}
export async function getManagerUser(){
 const client=await authClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user?.email||!user.email_confirmed_at)return null;
 return {userId:user.id,email:user.email,displayName:user.email};
}
function storage(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Configure Supabase Storage before uploading photos.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('menu-images');
}
export const photos={
 async remove(key:string){const {error}=await storage().remove([key]);if(error)throw Error('Could not remove unused upload.');},
 async get(key:string){const {data,error}=await storage().download(key);if(error||!data)return null;return {body:data,httpMetadata:{contentType:data.type}};},
 async put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}){const {error}=await storage().upload(key,bytes,{contentType:options.httpMetadata.contentType,upsert:false});if(error)throw new Error('Photo upload failed. Check the menu-images bucket and storage configuration.');}
};
