import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ChatAnswer from '../app/components/chat-answer';
import {executePlan} from '../lib/investigation';
import {normalizeDataset} from '../lib/domain';
import {raw} from './fixtures';
const asOf='2026-10-26';
test('CSM sees quality scope, cohort and full evidence count in answer',()=>{
 const ds=normalizeDataset([raw({size_sqm:''}),raw({deal_id:'D100002',city:'חיפה',size_sqm:''})],asOf);
 const answer=executePlan(ds,{intent:'quality',filters:{city:'חולון'},metric:'count',dealId:null,clarification:null},asOf);
 const html=renderToStaticMarkup(React.createElement(ChatAnswer,{answer,question:'בדוק איכות בחולון',turnId:'test',onTask:()=>{}}));
 assert.match(html,/עיר: חולון/);assert.match(html,/נבדקו 1 עסקאות/);assert.match(html,/מוצגות כל 1 העסקאות/);
 assert.match(html,/D100001/);assert.doesNotMatch(html,/D100002/);
});
test('empty cohort displays no matching deals rather than a market claim',()=>{
 const answer=executePlan(normalizeDataset([raw()],asOf),{intent:'query',filters:{city:'אילת'},metric:'count',dealId:null,clarification:null},asOf);
 const html=renderToStaticMarkup(React.createElement(ChatAnswer,{answer,question:'כמה עסקאות באילת',turnId:'test',onTask:()=>{}}));
 assert.match(html,/לא נמצאו עסקאות שתואמות לבקשה/);assert.match(html,/עיר: אילת/);assert.doesNotMatch(html,/הוא <strong>0/);
});
