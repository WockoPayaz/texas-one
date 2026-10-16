import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/tests/',import.meta.url);mkdirSync(dir,{recursive:true});
const compile=(src,dst)=>{let s=readFileSync(new URL('../'+src,import.meta.url),'utf8');s=s.replace("import {Pool,type PoolClient} from 'pg';","const Pool=globalThis.__testPool;").replace("import {getManagerUser,photos} from '@/lib/supabase';","const getManagerUser=async()=>globalThis.__testUser; const photos=globalThis.__testPhotos;").replaceAll("'@/lib/database'","'./database.mjs'").replaceAll("'@/lib/menu'","'./menu.mjs'").replaceAll("'@/lib/order'","'./order.mjs'").replaceAll("'@/lib/dine-in'","'./dine-in.mjs'").replaceAll("'./database'","'./database.mjs'");writeFileSync(new URL(dst,dir),ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);};
compile('lib/dine-in.ts','dine-in.mjs');compile('lib/menu.ts','menu.mjs');compile('lib/order.ts','order.mjs');compile('lib/database.ts','database.mjs');compile('app/api/[...path]/route.ts','api.mjs');
const postgres=new PGlite();
await postgres.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
await postgres.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
// PGlite has one connection: serialize checkouts to preserve transaction boundaries.
let queue=Promise.resolve();
async function lock(){let release;const prior=queue;queue=new Promise(r=>release=r);await prior;return release;}
async function query(sql,args){if(globalThis.__testDbError)throw globalThis.__testDbError;const r=await postgres.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows};}
globalThis.__testPool=class {async query(sql,args){const release=await lock();try{return await query(sql,args);}finally{release();}}async connect(){const release=await lock();return {query,release};}};
const storedPhotos=new Map();globalThis.__testUser=null;globalThis.__testPhotos={get:async key=>storedPhotos.get(key)||null,put:async(key,bytes,options)=>{storedPhotos.set(key,{body:bytes,httpMetadata:options.httpMetadata});},remove:async key=>{storedPhotos.delete(key);}};
process.env.DATABASE_URL='postgresql://test-only';process.env.OWNER_EMAIL='owner@example.test';
const {GET,POST,PUT,DELETE}=await import(new URL('api.mjs',dir));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64');
let cookie='';
const send=async(path,method='GET',body,origin='https://test.local')=>{if(body?.receipt){const f=new FormData();f.set('order',JSON.stringify(body));f.set('receipt',new File([png],'receipt.png',{type:'image/png'}));body=f;}const r=await ({GET,POST,PUT,DELETE}[method])(new Request('https://test.local/api/'+path,{method,headers:{origin,cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'}),'x-vercel-forwarded-for':'127.0.0.1'},body:body instanceof FormData?body:body?JSON.stringify(body):undefined}));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};};
test('an arbitrary first visitor cannot claim the owner role',async()=>{globalThis.__testUser={email:'outsider@example.test'};assert.equal((await send('admin')).status,403);globalThis.__testUser=null;});
const customer=()=>({requestId:crypto.randomUUID(),mode:'delivery',name:'Test Customer',phone:'03178103338',address:'Test address Quetta',payment:'cash',lines:[{id:'chicken-tikka-pizza',variant:1,quantity:1}],total:1});
test('manager requires sign in and prevents unlisted accounts',async()=>{assert.equal((await send('admin')).status,401);globalThis.__testUser={email:'owner@example.test'};assert.equal((await send('admin')).status,200);globalThis.__testUser={email:'outsider@example.test'};assert.equal((await send('admin')).status,403);globalThis.__testUser={email:'owner@example.test'};});
test('server computes totals and retries create only one order',async()=>{const i=customer();const a=await send('orders','POST',i);assert.equal(a.status,201);const b=await send('orders','POST',i);assert.deepEqual(b.body,a.body);const o=await send('orders/'+a.body.token);assert.equal(o.body.total,1500);assert.equal(o.body.paymentStatus,'unpaid');assert.equal((await send('orders/unknown')).status,404);assert(!('address' in o.body));});
test('CSRF origin rejected',async()=>assert.equal((await send('orders','POST',customer(),'https://other.test')).status,403));
test('advance payment unavailable until account configuration',async()=>{const i=customer();i.payment='jazzcash';i.receipt=true;assert.equal((await send('orders','POST',i)).status,400);const c=(await send('catalog')).body;c.settings.payments.jazzcash={title:'Restaurant Test',account:'03000000000'};assert.equal((await send('admin/settings','PUT',c.settings)).status,200);const o=await send('orders','POST',i);assert.equal(o.status,201);assert.equal((await send('admin/order','PUT',{id:o.body.id,status:'accepted'})).status,400);assert.equal((await send('admin/order','PUT',{id:o.body.id,paymentStatus:'paid'})).status,200);assert.equal((await send('admin/order','PUT',{id:o.body.id,status:'accepted'})).status,200);});
test('dine-in requires active table and charges no delivery',async()=>{const t=await send('admin/table','POST',{label:'Table 01'});const i=customer();i.mode='dine-in';i.lines=[{id:'chicken-burger',variant:0,quantity:1}];i.table='not-a-table';assert.equal((await send('orders','POST',i)).status,400);i.table=t.body.id;
 await send('dine-session','POST');i.position={latitude:30.2,longitude:67,accuracy:15,timestamp:Date.now()};
 assert.equal((await send('orders','POST',i)).status,503);
 const settings=(await send('catalog')).body.settings;settings.dineInLocation={latitude:30.2,longitude:67,radiusMeters:150};await send('admin/settings','PUT',settings);
 const a=await send('orders','POST',i);assert.equal(a.status,201);const o=await send('orders/'+a.body.token);assert.equal(o.body.total,360);assert.equal(o.body.table.label,'Table 01');await send('admin/table','PUT',{id:i.table,active:false});i.requestId=crypto.randomUUID();assert.equal((await send('orders','POST',i)).status,400);});
test('manager price changes affect the server total',async()=>{const c=(await send('catalog')).body;const i=c.menu.find(x=>x.id==='chicken-burger');i.variants[0].price=420;assert.equal((await send('admin/item','PUT',i)).status,200);const o=customer();o.mode='pickup';o.lines=[{id:i.id,variant:0,quantity:1}];const a=await send('orders','POST',o);assert.equal((await send('orders/'+a.body.token)).body.total,420);});
test('cash must be collected before completion; order transitions validated',async()=>{const a=(await send('orders','POST',customer())).body;assert.equal((await send('admin/order','PUT',{id:a.id,status:'completed'})).status,400);for(const status of ['accepted','preparing','ready'])assert.equal((await send('admin/order','PUT',{id:a.id,status})).status,200);assert.equal((await send('admin/order','PUT',{id:a.id,status:'completed'})).status,400);await send('admin/order','PUT',{id:a.id,paymentStatus:'paid'});assert.equal((await send('admin/order','PUT',{id:a.id,status:'completed'})).status,200);});

test('unconfigured deployment shows a read-only menu and rejects ordering',async()=>{delete process.env.DATABASE_URL;try{const c=await send('catalog');assert.equal(c.status,200);assert.equal(c.body.setupRequired,true);assert.equal(c.body.settings.acceptingOrders,false);assert.equal((await send('orders','POST',customer())).status,503);}finally{process.env.DATABASE_URL='postgresql://test-only';}});
test('removed manager loses access immediately',async()=>{await send('admin/manager','POST',{email:'staff@example.test'});globalThis.__testUser={email:'staff@example.test'};assert.equal((await send('admin')).status,200);assert.equal((await send('admin/manager','POST',{email:'other@example.test'})).status,403);globalThis.__testUser={email:'owner@example.test'};await send('admin/manager','DELETE',{email:'staff@example.test'});globalThis.__testUser={email:'staff@example.test'};assert.equal((await send('admin')).status,403);globalThis.__testUser={email:'owner@example.test'};});
test('stale checkout total is rejected',async()=>{const c=customer();c.expectedTotal=1;assert.equal((await send('orders','POST',c)).status,400);});
test.after(async()=>await postgres.close());

test('database errors report a safe diagnosis without leaking credentials',async()=>{const original=console.error;const logged=[];console.error=(...args)=>logged.push(args);try{for(const [code,reference] of [['28P01','DB_PASSWORD'],['42P01','DB_TABLES'],['SELF_SIGNED_CERT_IN_CHAIN','DB_CERTIFICATE']]){globalThis.__testDbError=Object.assign(new Error('postgresql://secret-password@private-host'),{code});const r=await send('catalog');assert.equal(r.status,503);assert.equal(r.body.reference,reference);assert(!JSON.stringify(r).includes('secret-password'));}assert(!JSON.stringify(logged).includes('secret-password'));}finally{globalThis.__testDbError=null;console.error=original;}});

test('receipts are mandatory, private and accessible only to managers',async()=>{
 const i={...customer(),payment:'jazzcash'};assert.equal((await send('orders','POST',i)).status,400);
 i.receipt=true;const before=storedPhotos.size;const order=await send('orders','POST',i);assert.equal(order.status,201);assert.equal(storedPhotos.size,before+1);
 const retry=await send('orders','POST',i);assert.equal(retry.body.id,order.body.id);assert.equal(storedPhotos.size,before+1);
 const tracking=(await send('orders/'+order.body.token)).body;assert(!('receiptKey' in tracking));
 const dashboard=(await send('admin')).body;const key=dashboard.orders.find(o=>o.id===order.body.id).receiptKey;assert(key.startsWith('receipts/'));
 assert.equal((await send('media/'+key)).status,404);
 const request=()=>new Request('https://test.local/api/admin/receipt/'+order.body.id);
 globalThis.__testUser=null;assert.equal((await GET(request())).status,401);
 globalThis.__testUser={email:'outsider@example.test'};assert.equal((await GET(request())).status,403);
 globalThis.__testUser={email:'owner@example.test'};const image=await GET(request());assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
});
test('invalid and oversized receipts are rejected before storage',async()=>{
 for(const file of [new File(['<svg></svg>'],'fake.png',{type:'image/png'}),new File([new Uint8Array(4000001)],'large.png',{type:'image/png'})]){
 const f=new FormData();f.set('order',JSON.stringify({...customer(),payment:'jazzcash'}));f.set('receipt',file);const before=storedPhotos.size;const result=await send('orders','POST',f);assert([400,413].includes(result.status));assert.equal(storedPhotos.size,before);
 }
});

let testPhone=0;
async function dineCustomer(){
 cookie='';await send('dine-session','POST');
 const table=(await send('admin/table','POST',{label:'Guard test'})).body.id;
 return {...customer(),phone:'030'+String(++testPhone).padStart(8,'0'),mode:'dine-in',table,position:{latitude:30.2,longitude:67,accuracy:10,timestamp:Date.now()}};
}
test('dine-in rejects missing, remote, inaccurate, stale and future location readings',async()=>{
 const i=await dineCustomer();
 for(const position of [undefined,{...i.position,latitude:31},{...i.position,accuracy:1000},{...i.position,timestamp:Date.now()-180000},{...i.position,timestamp:Date.now()+60000}]){
  const r=await send('orders','POST',{...i,position});assert.equal(r.status,403,JSON.stringify(r));
 }
 assert.equal((await send('orders','POST',i)).status,201);
});
test('pending protection covers new IDs, phone formats and another session; acknowledgement releases it',async()=>{
 const i=await dineCustomer();const first=await send('orders','POST',i);assert.equal(first.status,201);
 assert.equal((await send('orders','POST',{...i,requestId:crypto.randomUUID()})).status,409);
 cookie='';await send('dine-session','POST');
 assert.equal((await send('orders','POST',{...i,phone:'+92'+i.phone.slice(1),requestId:crypto.randomUUID()})).status,409);
 await send('admin/order','PUT',{id:first.body.id,status:'accepted'});
 assert.equal((await send('orders','POST',{...i,requestId:crypto.randomUUID()})).status,201);
 const stored=(await postgres.query('SELECT body FROM orders WHERE id=$1',[first.body.id])).rows[0];assert(!('position' in JSON.parse(stored.body)));
 const tracking=(await send('orders/'+first.body.token)).body;assert(!('dineSession' in tracking));
});
test('concurrent requests yield only one pending order and retries return the original',async()=>{
 const i=await dineCustomer();const results=await Promise.all([send('orders','POST',i),send('orders','POST',{...i,requestId:crypto.randomUUID()})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 const same=await dineCustomer();const retries=await Promise.all([send('orders','POST',same),send('orders','POST',same)]);assert.equal(retries[0].body.id,retries[1].body.id);
});
test('browser session limits prevent flooding even when the phone number changes',async()=>{
 const i=await dineCustomer();for(let n=0;n<6;n++)assert.equal((await send('orders','POST',{...i,position:undefined})).status,403);
 assert.equal((await send('orders','POST',{...i,phone:'03099999999'})).status,429);
});
test('blocked and expired sessions cannot place more orders; block action requires manager',async()=>{
 const i=await dineCustomer();const first=await send('orders','POST',i);assert.equal(first.status,201);
 globalThis.__testUser=null;assert.equal((await send('admin/block-dine-session','POST',{orderId:first.body.id})).status,401);
 globalThis.__testUser={email:'owner@example.test'};assert.equal((await send('admin/block-dine-session','POST',{orderId:first.body.id})).status,200);
 assert.equal((await send('dine-session','POST')).status,403);
 assert.equal((await send('orders','POST',{...i,requestId:crypto.randomUUID()})).status,403);
 const expired=await dineCustomer();const {hash}=await import(new URL('dine-in.mjs',dir));
 await postgres.query('UPDATE rate_limits SET expires=0 WHERE key=$1',['dine-session:'+hash(cookie.split('=')[1])]);
 assert.equal((await send('orders','POST',expired)).status,403);
 cookie='';assert.equal((await send('orders','POST',expired)).status,403);
});
test('restaurant coordinates and radius are validated; customer cannot change settings',async()=>{
 const s=(await send('catalog')).body.settings;
 for(const loc of [{latitude:91,longitude:67,radiusMeters:150},{latitude:30,longitude:null,radiusMeters:150},{latitude:30,longitude:67,radiusMeters:5000}])assert.equal((await send('admin/settings','PUT',{...s,dineInLocation:loc})).status,400);
 globalThis.__testUser=null;assert.equal((await send('admin/settings','PUT',s)).status,401);globalThis.__testUser={email:'owner@example.test'};
});

test('table deletion requires a manager, invalidates its QR, and keeps order history',async()=>{
 const i=await dineCustomer();const made=await send('orders','POST',i);assert.equal(made.status,201);
 globalThis.__testUser=null;assert.equal((await send('admin/table','DELETE',{id:i.table})).status,401);
 globalThis.__testUser={email:'owner@example.test'};
 assert.equal((await send('admin/table','DELETE',{id:i.table})).status,200);
 assert.equal((await send('catalog?table='+i.table)).body.table,null);
 assert.equal((await send('orders','POST',{...i,requestId:crypto.randomUUID()})).status,400);
 assert.equal((await send('orders/'+made.body.token)).body.table.label,'Guard test');
 assert.equal((await send('admin')).body.tables.some(t=>t.id===i.table),false);
 assert.equal((await send('admin/table','DELETE',{id:i.table})).status,404);
});
async function returnFixture(status='completed',payment='paid'){
 const id=crypto.randomUUID(),token=crypto.randomUUID();
 const body={name:'Return test',phone:'03012345678',mode:'pickup',payment:'cash',items:[{id:'chicken-burger',name:'Chicken Burger',variant:'Regular',quantity:1,unitPrice:360}],subtotal:360,deliveryFee:0,total:360};
 await postgres.query('INSERT INTO orders(id,token,request_id,created_at,status,payment_status,body) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,token,crypto.randomUUID(),new Date().toISOString(),status,payment,JSON.stringify(body)]);
 return {id,token};
}
test('full refund records audit details and cannot be repeated or changed back to paid',async()=>{
 const o=await returnFixture();globalThis.__testUser=null;assert.equal((await send('admin/return-order','POST',{id:o.id,refund:true})).status,401);globalThis.__testUser={email:'owner@example.test'};
 const result=await send('admin/return-order','POST',{id:o.id,refund:true,reason:'Customer returned the order'});assert.equal(result.status,200);
 const order=(await send('admin')).body.orders.find(v=>v.id===o.id);assert.equal(order.status,'returned');assert.equal(order.paymentStatus,'refunded');assert.equal(order.refundAmount,360);assert.equal(order.returnedBy,'owner@example.test');assert.equal(order.refundedBy,'owner@example.test');assert.equal(order.returnReason,'Customer returned the order');assert(order.refundedAt);
 const tracked=(await send('orders/'+o.token)).body;assert.equal(tracked.status,'returned');assert.equal(tracked.paymentStatus,'refunded');assert(!('refundedBy' in tracked));
 assert.equal((await send('admin/return-order','POST',{id:o.id,refund:true})).status,409);
 assert.equal((await send('admin/order','PUT',{id:o.id,paymentStatus:'paid'})).status,400);
 assert.equal((await send('admin/order','PUT',{id:o.id,status:'accepted'})).status,400);
});
test('return and refund are separate; unpaid or unverified orders cannot be refunded',async()=>{
 const paid=await returnFixture();assert.equal((await send('admin/return-order','POST',{id:paid.id,refund:false,reason:'First record the return'})).status,200);
 let order=(await send('admin')).body.orders.find(v=>v.id===paid.id);assert.equal(order.paymentStatus,'paid');assert(!order.refundedAt);
 assert.equal((await send('admin/return-order','POST',{id:paid.id,refund:false})).status,409);
 assert.equal((await send('admin/return-order','POST',{id:paid.id,refund:true})).status,200);
 order=(await send('admin')).body.orders.find(v=>v.id===paid.id);assert.equal(order.returnReason,'First record the return');assert.equal(order.paymentStatus,'refunded');
 const unpaid=await returnFixture('new','unpaid');assert.equal((await send('admin/return-order','POST',{id:unpaid.id,refund:true})).status,400);assert.equal((await send('admin/return-order','POST',{id:unpaid.id,refund:false})).status,200);
 const unverified=await returnFixture('new','awaiting-verification');assert.equal((await send('admin/return-order','POST',{id:unverified.id,refund:false})).status,400);
 const bypass=await returnFixture();assert.equal((await send('admin/order','PUT',{id:bypass.id,status:'returned'})).status,400);
});
test('concurrent refund recording succeeds once',async()=>{
 const o=await returnFixture();const results=await Promise.all([send('admin/return-order','POST',{id:o.id,refund:true}),send('admin/return-order','POST',{id:o.id,refund:true})]);assert.deepEqual(results.map(v=>v.status).sort(),[200,409]);
});
