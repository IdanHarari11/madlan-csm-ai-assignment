"""Execute the shipped SQL on real SQLite connections, including concurrent writes."""
import sqlite3,tempfile,pathlib,concurrent.futures,json,time,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
SQL='\n'.join(p.read_text() for p in sorted((ROOT/'drizzle').glob('*.sql')))
NOW=1792900000000
class Guards(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=str(pathlib.Path(self.temp.name)/'test.db');self.db=sqlite3.connect(self.path);self.db.execute('pragma journal_mode=WAL');self.db.executescript(SQL)
 def tearDown(self):self.db.close();self.temp.cleanup()
 def draft(self,id,owner='csm',fp=None):
  self.db.execute('insert into drafts(id,owner,payload,fingerprint,created_at,expires_at) values(?,?,?,?,?,?)',(id,owner,'{}',fp or id,NOW-1000,NOW+10000000));self.db.commit()
 def insert(self,id,owner='csm',fp=None,when=NOW):
  self.db.execute('insert into operations(id,draft_id,owner,fingerprint,status,issue_key,created_at,updated_at) values(?,?,?,?,?,?,?,?)',('op-'+id,id,owner,fp or id,'pending',None,when,when));self.db.commit()
 def test_missing_or_foreign_draft_rejected(self):
  with self.assertRaisesRegex(sqlite3.IntegrityError,'DRAFT_STALE'):self.insert('none')
  self.draft('one')
  with self.assertRaisesRegex(sqlite3.IntegrityError,'DRAFT_STALE'):self.insert('one','attacker')
 def test_stale_fingerprint_rejected(self):
  self.draft('a',fp='changed')
  with self.assertRaisesRegex(sqlite3.IntegrityError,'DRAFT_STALE'):self.insert('a',fp='old')
 def test_unique_fingerprint_across_drafts(self):
  self.draft('a',fp='same');self.draft('b',fp='same');self.insert('a',fp='same')
  with self.assertRaisesRegex(sqlite3.IntegrityError,'UNIQUE'):self.insert('b',fp='same')
 def test_stale_revision_rejected_even_when_fingerprint_is_unchanged(self):
  self.draft('a');self.db.execute('update drafts set revision=2');self.db.commit()
  with self.assertRaisesRegex(sqlite3.IntegrityError,'DRAFT_STALE'):self.insert('a')
 def test_three_per_minute(self):
  for i in range(4):self.draft(str(i))
  for i in range(3):self.insert(str(i))
  with self.assertRaisesRegex(sqlite3.IntegrityError,'QUOTA_MINUTE'):self.insert('3')
 def test_ten_per_rolling_day(self):
  for i in range(11):self.draft(str(i))
  for i in range(10):self.insert(str(i),when=NOW+i*61000)
  with self.assertRaisesRegex(sqlite3.IntegrityError,'QUOTA_USER_DAY'):self.insert('10',when=NOW+610000)
 def test_failed_attempts_still_consume_quota(self):
  for i in range(4):self.draft(str(i))
  for i in range(3):self.insert(str(i));self.db.execute("update operations set status='failed' where draft_id=?",(str(i),));self.db.commit()
  with self.assertRaisesRegex(sqlite3.IntegrityError,'QUOTA_MINUTE'):self.insert('3')
 def test_expired_draft_rejected(self):
  self.draft('a');self.db.execute('update drafts set expires_at=?',(NOW-1,));self.db.commit()
  with self.assertRaisesRegex(sqlite3.IntegrityError,'DRAFT_STALE'):self.insert('a')
 def test_edit_after_reservation_is_atomically_blocked(self):
  self.draft('a');self.insert('a')
  row=self.db.execute("update drafts set payload='edited' where id='a' and not exists(select 1 from operations where draft_id=drafts.id) returning id").fetchone();self.assertIsNone(row)
 def test_global_quota_is_atomic_across_40_concurrent_connections(self):
  for i in range(40):self.draft(str(i),'owner'+str(i))
  def worker(i):
   conn=sqlite3.connect(self.path,timeout=20)
   try:
    conn.execute('insert into operations(id,draft_id,owner,fingerprint,status,issue_key,created_at,updated_at) values(?,?,?,?,?,?,?,?)',('op'+str(i),str(i),'owner'+str(i),str(i),'pending',None,NOW,NOW));conn.commit();return 'ok'
   except sqlite3.IntegrityError as e:return str(e)
   finally:conn.close()
  with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:results=list(pool.map(worker,range(40)))
  self.assertEqual(results.count('ok'),25);self.assertTrue(all(r in ('ok','QUOTA_GLOBAL_DAY') for r in results));self.assertEqual(self.db.execute('select count(*) from operations').fetchone()[0],25)
 def test_model_budget_atomic_reservation_stops_at_limit(self):
  statement='insert into budget(key,count,expires_at) values(?,1,?) on conflict(key) do update set count=count+1 where count < ? returning count'
  for i in range(5):self.assertEqual(self.db.execute(statement,('user:day',NOW+1000,5)).fetchone(),(i+1,))
  self.assertIsNone(self.db.execute(statement,('user:day',NOW+1000,5)).fetchone())
if __name__=='__main__':unittest.main(verbosity=2)
