import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,grade} from '../evals/cases';
import {dataset} from '../lib/data';
import {executePlan} from '../lib/investigation';
test('planner city grading accepts a supported alias only when its executed cohort is identical',()=>{
 const c=cases.find(c=>c.id==='alias-modiin')!;
 const plan={intent:'query',metric:'median_price' as const,filters:{city:'מודיעין'},dealId:null,clarification:null};
 assert.equal(grade(plan,c).pass,true);
 assert.equal(grade({...plan,filters:{city:'מודיעין עילית'}},c).pass,false);
 const ds=dataset('2026-10-26');
 const actual=executePlan(ds,plan,'2026-10-26').result!;
 const expected=executePlan(ds,{...plan,filters:{city:'מודיעין מכבים רעות'}},'2026-10-26').result!;
 assert.ok(actual.includedCount>0);assert.equal(actual.value,expected.value);assert.deepEqual(actual.evidenceIds,expected.evidenceIds);
});
