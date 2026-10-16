import {Pool,type PoolClient} from 'pg';
let pool:Pool|undefined;
export function databaseConfigured(){return !!process.env.DATABASE_URL;}
function connection(){
 if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL in Vercel and run supabase/schema.sql to enable ordering.');
 return pool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,idleTimeoutMillis:20000,connectionTimeoutMillis:10000});
}
// Keep parameterized statements while moving the existing queries to PostgreSQL.
class Statement{
 constructor(private sql:string,private args:unknown[]=[],private client?:PoolClient){ }
 bind(...args:unknown[]){return new Statement(this.sql,args,this.client);}
 private execute(){let n=0;return (this.client||connection()).query(this.sql.replace(/\?/g,()=>'$'+(++n)),this.args);}
 async first<T=Record<string,unknown>>():Promise<T|null>{const r=await this.execute();return (r.rows[0] as T)||null;}
 async all<T=Record<string,unknown>>():Promise<{results:T[]}>{return {results:(await this.execute()).rows as T[]};}
 async run(){return {meta:{changes:(await this.execute()).rowCount||0}};}
}
export const db={prepare:(sql:string)=>new Statement(sql)};

// A single checked-out connection keeps row locks and writes in one transaction.
export async function transaction<T>(work:(tx:typeof db)=>Promise<T>):Promise<T>{
 const client=await connection().connect();
 try{await client.query('BEGIN');const result=await work({prepare:(sql:string)=>new Statement(sql,[],client)});await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
