import test from 'node:test';
import assert from 'node:assert/strict';
import {dataset} from '../lib/data';
import {normalizeDataset} from '../lib/domain';
import {executePlan} from '../lib/investigation';
import {raw} from './fixtures';
const asOf='2026-10-26';
test('quality analysis applies the requested city and exposes that scope',()=>{
 const ds=normalizeDataset([raw({city:'חולון',size_sqm:''}),raw({deal_id:'D100002',city:'חיפה',price_nis:''})],asOf);
 const answer=executePlan(ds,{intent:'quality',filters:{city:'חולון'},metric:'count',dealId:null,clarification:null},asOf);
 assert.equal(answer.kind,'quality');
 assert.equal(answer.quality?.uniqueDeals,1);
 assert.ok(answer.deals?.every(d=>d.city==='חולון'));
 assert.deepEqual((answer.quality as unknown as {filters:unknown})?.filters,{city:'חולון'});
});
test('quality evidence covers every flagged transaction in the reported cohort',()=>{
 const answer=executePlan(dataset(asOf),{intent:'quality',filters:{},metric:'count',dealId:null,clarification:null},asOf);
 assert.equal(answer.deals?.length,answer.quality?.flaggedDeals);
});
test('quality boolean and room filters are not silently ignored',()=>{
 const ds=normalizeDataset([raw({size_sqm:'',has_parking:'לא',rooms:'4'}),raw({deal_id:'D100002',size_sqm:'',has_parking:'כן',rooms:'4'}),raw({deal_id:'D100003',size_sqm:'',has_parking:'לא',rooms:'3'})],asOf);
 const answer=executePlan(ds,{intent:'quality',filters:{parking:false,roomsMin:4,roomsMax:4},metric:'count',dealId:null,clarification:null},asOf);
 assert.deepEqual(answer.deals?.map(d=>d.id),['D100001']);
});
