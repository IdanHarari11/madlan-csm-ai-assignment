import { readFileSync } from 'node:fs';
import { database } from '../lib/postgres-store';
const sql=database();
try{await sql.begin(async tx=>{await tx`SELECT pg_advisory_xact_lock(739102602)`;await tx.unsafe(readFileSync('postgres/001_initial.sql','utf8'));});console.log('Postgres migration complete');}finally{await sql.end();}
