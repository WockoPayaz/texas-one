import {Pool} from 'pg';
let pool:Pool|undefined;
export function databaseConfigured(){return !!process.env.DATABASE_URL;}
function connection(){
 if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL in Vercel and run supabase/schema.sql to enable ordering.');
 return pool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,idleTimeoutMillis:20000,connectionTimeoutMillis:10000});
}
// Keep parameterized statements while moving the existing queries to PostgreSQL.
class Statement{
 constructor(private sql:string,private args:unknown[]=[]){ }
 bind(...args:unknown[]){return new Statement(this.sql,args);}
 private execute(){let n=0;return connection().query(this.sql.replace(/\?/g,()=>'$'+(++n)),this.args);}
 async first<T=Record<string,unknown>>():Promise<T|null>{const r=await this.execute();return (r.rows[0] as T)||null;}
 async all<T=Record<string,unknown>>():Promise<{results:T[]}>{return {results:(await this.execute()).rows as T[]};}
 async run(){return {meta:{changes:(await this.execute()).rowCount||0}};}
}
export const db={prepare:(sql:string)=>new Statement(sql)};
