import { readFileSync } from 'node:fs';
import postgres from 'postgres';
const url=process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL;
if(!url)throw new Error('Database is not configured');
const sql=postgres(url,{ssl:'require',max:1,prepare:false});
try{await sql.begin(async tx=>{
 await tx`SELECT pg_advisory_xact_lock(739102602)`;
 await tx`SET LOCAL search_path=public`;
 await tx.unsafe(readFileSync('postgres/001_initial.sql','utf8'));
 await tx`ALTER FUNCTION public.guard_operation() SET search_path TO public`;
 await tx`SELECT pg_advisory_xact_lock(739102601)`;
 const fixtures=await tx`SELECT count(*)::int AS count FROM public.drafts WHERE (payload='{}' AND fingerprint='fp-'||id AND (owner=id OR owner='same-owner')) OR (payload='updated' AND fingerprint='edited-fp' AND owner=id)`;
 console.log('Legacy synthetic fixture drafts found:',fixtures[0].count);
 await tx.unsafe(readFileSync('postgres/002_remove_test_fixtures.sql','utf8'));
});console.log('Postgres migration complete');}finally{await sql.end();}
