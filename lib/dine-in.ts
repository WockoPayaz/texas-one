import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db,transaction} from './database';

export class DineError extends Error {
 constructor(public status:number,message:string){super(message);}
}
export const dineLocationSchema=z.object({
 latitude:z.number().finite().min(-90).max(90).nullable(),
 longitude:z.number().finite().min(-180).max(180).nullable(),
 radiusMeters:z.number().int().min(50).max(500),
}).refine(s=>(s.latitude===null)===(s.longitude===null),'Set both restaurant coordinates.');
export const positionSchema=z.object({
 latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),
 accuracy:z.number().finite().positive(),timestamp:z.number().finite(),
});
export function verifyPosition(settings:unknown,position:unknown,now=Date.now()){
 const location=dineLocationSchema.safeParse(settings);
 if(!location.success||location.data.latitude===null||location.data.longitude===null)
  throw new DineError(503,'Table ordering needs the restaurant location to be set. Please order with a team member.');
 const parsed=positionSchema.safeParse(position);
 if(!parsed.success)throw new DineError(403,'Allow location access to place a table order.');
 const p=parsed.data;
 if(now-p.timestamp>120000||p.timestamp>now+15000)throw new DineError(403,'Your location reading expired. Please try again.');
 if(p.accuracy>100)throw new DineError(403,'Your location is not accurate enough. Enable precise location and try again, or ask a team member.');
 const radians=(n:number)=>n*Math.PI/180;
 const lat1=radians(location.data.latitude),lat2=radians(p.latitude);
 const a=Math.sin((lat2-lat1)/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(radians(p.longitude-location.data.longitude)/2)**2;
 const distance=6371000*2*Math.asin(Math.sqrt(Math.min(1,a)));
 // Do not enlarge the boundary using an untrusted accuracy value.
 if(distance>location.data.radiusMeters)throw new DineError(403,'Table orders are available at TEXAS ONE only. If you are elsewhere, choose delivery or pickup.');
}
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const normalizePhone=(phone:string)=>phone.replace(/^\+92/,'0');
export async function throttle(key:string,max:number,windowMs=600000){
 const now=Date.now();
 const row=await db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires<? THEN 1 ELSE rate_limits.count+1 END, expires=CASE WHEN rate_limits.expires<? THEN ? ELSE rate_limits.expires END RETURNING count').bind(key,now+windowMs,now,now,now+windowMs).first<{count:number}>();
 if((row?.count||0)>max)throw new DineError(429,'Too many attempts. Please wait 10 minutes or ask a team member.');
}
const cookieName='texas-dine-session';
export function sessionKey(req:Request){
 const token=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 return token&&/^[a-f0-9-]{36}$/.test(token)?hash(token):null;
}
export function clientKey(req:Request){
 // Trust the platform-supplied address, never a client-provided body field.
 return hash(req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'unknown');
}
export async function requireSession(req:Request){
 const key=sessionKey(req);
 const row=key?await db.prepare('SELECT count,expires FROM rate_limits WHERE key=?').bind('dine-session:'+key).first<{count:number;expires:number}>():null;
 if(!row||Number(row.expires)<Date.now())throw new DineError(403,'Your table session expired. Please try placing your order again.');
 if(row.count<0)throw new DineError(403,'Table ordering has been blocked for this browser. Please speak to a team member.');
 return key!;
}
export async function startSession(req:Request){
 await throttle('dine-start:'+clientKey(req),120);
 const key=sessionKey(req);
 if(key){
  const row=await db.prepare('SELECT expires FROM rate_limits WHERE key=?').bind('dine-session:'+key).first<{expires:number}>();
  if(row&&Number(row.expires)>Date.now()){await requireSession(req);return null;}
 }
 const token=randomUUID();
 await db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,0,?)').bind('dine-session:'+hash(token),Date.now()+4*3600000).run();
 return `${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=14400`;
}
export async function insertDineOrder(session:string,phone:string,requestId:string,insert:(tx:typeof db)=>Promise<void>){
 return transaction(async tx=>{
  const phoneKey='dine-phone-lock:'+hash(normalizePhone(phone));
  await tx.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,0,?) ON CONFLICT(key) DO NOTHING').bind(phoneKey,Date.now()+86400000).run();
  // Lock phone first and then session; concurrent submissions cannot both pass.
  await tx.prepare('SELECT key FROM rate_limits WHERE key=? FOR UPDATE').bind(phoneKey).first();
  const row=await tx.prepare('SELECT count,expires FROM rate_limits WHERE key=? FOR UPDATE').bind('dine-session:'+session).first<{count:number;expires:number}>();
  if(!row||Number(row.expires)<Date.now()||row.count<0)throw new DineError(403,'Your table session is unavailable. Please speak to a team member.');
  const replay=await tx.prepare('SELECT id,token FROM orders WHERE request_id=?').bind(requestId).first();
  if(replay)return replay;
  const pending=await tx.prepare("SELECT id FROM orders WHERE status='new' AND body::jsonb->>'mode'='dine-in' AND (body::jsonb->>'dineSession'=? OR body::jsonb->>'dinePhone'=?) LIMIT 1").bind(session,normalizePhone(phone)).first();
  if(pending)throw new DineError(409,'Your previous table order is awaiting acknowledgement. Please wait for staff to accept or cancel it before ordering again.');
  await insert(tx);return null;
 });
}
