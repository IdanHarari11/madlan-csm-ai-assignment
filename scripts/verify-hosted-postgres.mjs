import {spawnSync} from 'node:child_process';
if(!process.env.DATABASE_URL)throw new Error('Database is not configured');
const result=spawnSync(process.execPath,['--import','tsx','--test','tests/postgres.integration.ts'],{stdio:'inherit',env:{...process.env,PG_TEST_DATABASE_URL:process.env.DATABASE_URL}});
if(result.error)throw result.error;
process.exit(result.status??1);
