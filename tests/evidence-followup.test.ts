import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {normalizeDataset} from '../lib/domain';
import {dataset,DATA_VERSION} from '../lib/data';
import {executePlan} from '../lib/investigation';
import {resolveEvidencePlan} from '../lib/evidence-followup';
import {reconstructContext} from '../lib/conversation-context';
import {serializeConversation,restoreConversation} from '../lib/conversation-session';
import {raw} from './fixtures';
import ChatAnswer from '../app/components/chat-answer';
const asOf='2026-10-26';
const original={intent:'query',filters:{city:'חולון',propertyType:'דירה' as const,roomsMin:4,roomsMax:4},metric:'median_ppsm' as const,dealId:null,clarification:null};
const proposed={...original,intent:'evidence',filters:{},metric:'count' as const};
test('evidence inspection preserves the original metric/cohort and lists only its included IDs',()=>{
 const ds=normalizeDataset([raw(),raw({deal_id:'D100002',size_sqm:''}),raw({deal_id:'D100003',price_nis:'2500000'}),raw({deal_id:'D100003',price_nis:'2800000'})],asOf);
 const p=resolveEvidencePlan(proposed,original),answer=executePlan(ds,p,asOf);
 assert.equal(p.metric,'median_ppsm');assert.deepEqual(p.filters,original.filters);assert.equal(answer.kind,'evidence');assert.deepEqual(answer.deals?.map(d=>d.id),['D100001']);assert.equal(answer.evidenceBasis?.excluded.length,2);
 assert.equal(executePlan(ds,{...original,metric:'count'},asOf).result?.includedCount,3);
});
test('an evidence request cannot silently override the previous filters or invent prior context',()=>{
 assert.equal(resolveEvidencePlan(proposed,null).intent,'clarify');
 assert.equal(resolveEvidencePlan({...proposed,filters:{city:'חיפה'}},original).intent,'clarify');
 assert.equal(resolveEvidencePlan({...proposed,filters:{parking:true}},original).intent,'clarify');
});
test('clarifications do not erase the last successful calculation; different successful tools do',()=>{
 const steps=[{question:'חציון?',selectedIds:[],plan:{...original,intent:'query' as const}},{question:'לא הבנתי',selectedIds:[],plan:{...original,intent:'clarify' as const,clarification:'מה תרצו לבדוק?'}}];
 assert.equal(reconstructContext(dataset(asOf),steps,[],asOf,DATA_VERSION).state.lastCalculation?.metric,'median_ppsm');
 const quality={question:'איכות',selectedIds:[],plan:{...original,intent:'quality' as const}};
 assert.equal(reconstructContext(dataset(asOf),[...steps,quality],[],asOf,DATA_VERSION).state.lastCalculation,null);
});
test('canonical evidence plans restore and remain usable when the original turn falls out of bounded memory',()=>{
 const ds=dataset(asOf),p=resolveEvidencePlan(proposed,original),response={...executePlan(ds,p,asOf),plan:p};
 const scope={selectedIds:[],filters:p.filters,asOf,dataVersion:DATA_VERSION};
 const restored=restoreConversation(serializeConversation([{id:'ev',question:'איזה עסקאות?',scope,response}],DATA_VERSION),ds,DATA_VERSION,asOf);
 assert.equal(restored[0].response?.kind,'evidence');assert.deepEqual(restored[0].response?.deals?.map(d=>d.id),['D100027','D100074','D100211']);
 const context=reconstructContext(ds,[{question:'איזה עסקאות?',selectedIds:[],plan:{...p,intent:'evidence'}}],[],asOf,DATA_VERSION);
 assert.equal(context.state.lastCalculation?.metric,'median_ppsm');
});
test('the evidence list visibly identifies transactions instead of just repeating a count',()=>{
 const p=resolveEvidencePlan(proposed,original),answer=executePlan(dataset(asOf),p,asOf);
 const html=renderToStaticMarkup(React.createElement(ChatAnswer,{answer,question:'איזהנעסקאות?',turnId:'test',onTask:()=>{}}));
 for(const id of ['D100027','D100074','D100211'])assert.ok(html.indexOf(id)<html.indexOf('הצגת הנתונים והחישוב'));
 assert.match(html,/מזהה עסקה/);assert.doesNotMatch(html,/מספר עסקאות ייחודיות הוא/);
});
test('one included transaction uses singular wording and count avoids duplicate counts',()=>{
 const ds=normalizeDataset([raw()],asOf);
 const answer=executePlan(ds,original,asOf);
 const html=renderToStaticMarkup(React.createElement(ChatAnswer,{answer,question:'חציון?',turnId:'one',onTask:()=>{}}));
 assert.match(html,/עסקה אחת/);assert.doesNotMatch(html,/1 עסקאות/);
 const count=executePlan(ds,{...original,metric:'count'},asOf);
 const rendered=renderToStaticMarkup(React.createElement(ChatAnswer,{answer:count,question:'כמה?',turnId:'count',onTask:()=>{}}));assert.match(rendered,/נמצאה/);assert.match(rendered,/שתואמת/);
});
