import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {normalizeDataset} from '../lib/domain';
import {buildCustomerCase} from '../lib/customer-case';
import {executePlan} from '../lib/investigation';
import {dataset} from '../lib/data';
import {raw} from './fixtures';
import ChatAnswer from '../app/components/chat-answer';
import Desk from '../app/desk';
const asOf='2026-10-26';
const one=(changes:Parameters<typeof raw>[0]={})=>normalizeDataset([raw(changes)],asOf)[0];
test('conflicting source variants never become a customer-facing authoritative price',()=>{
 const d=normalizeDataset([raw(),raw({price_nis:'3000000'})],asOf)[0];
 const c=buildCustomerCase(d,asOf);
 assert.match(c.assessment,/רשומות סותרות/);assert.match(c.calculation,/לא מוצג מחיר/);
 assert.doesNotMatch(c.customerReply,/20,000|30,000|2,000,000|3,000,000/);
 assert.deepEqual(c.sourceRows,[2,3]);assert.match(c.nextStep,/אין לתקן או לבחור מקור אוטומטית/);
 assert.match(c.internalSummary,/לא נוצר טיקט/);assert.match(c.customerReply,/עדיין אין בסיס לקבוע/);
});
test('missing area never becomes a guessed per-square-metre price',()=>{
 const c=buildCustomerCase(one({size_sqm:''}),asOf);
 assert.match(c.calculation,/לא מוצג מחיר/);assert.doesNotMatch(c.calculation,/NaN|Infinity|20,000/);
});
test('reconstructed calculation states inputs, precision and reported difference without inventing cause',()=>{
 const c=buildCustomerCase(one({price_nis:'2000001',size_sqm:'99',price_per_sqm:'25000'}),asOf);
 assert.match(c.assessment,/קיים פער/);assert.match(c.calculation,/2,000,001 ₪ ÷ 99/);assert.match(c.calculation,/20,202\.03/);assert.match(c.calculation,/25,000/);
 assert.doesNotMatch(c.customerReply,/תוקן|נגרם בגלל|תקלה במערכת שלנו/);
});
test('future and suspicious records retain the same price exclusion policy as numeric tools',()=>{
 for(const d of [one({deal_date:'2030-01-01'}),one({size_sqm:'1'})])assert.match(buildCustomerCase(d,asOf).calculation,/לא מוצג מחיר/);
});
test('valid record is reproducible, not claimed verified against customer production',()=>{
 const c=buildCustomerCase(one(),asOf);assert.match(c.calculation,/20,000/);assert.match(c.assessment,/אין בכך אימות/);assert.match(c.customerReply,/לצילום עם המדד והמסננים/);
});
test('real conflict renders findings, customer reply and source rows; Jira is absent from default public answer',()=>{
 const answer=executePlan(dataset(asOf),{intent:'deal',filters:{},metric:'count',dealId:'D100017',clarification:null},asOf);
 const html=renderToStaticMarkup(React.createElement(ChatAnswer,{answer,question:'מחיר שגוי',turnId:'test',onTask:()=>{}}));
 for(const text of ['מה מצאנו','מה עושים עכשיו','נוסח מוצע לתשובה ללקוח','סיכום לבירור פנימי','שורה 11','שורה 475','1919000','1851548'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/הכנת משימת המשך/);assert.ok(answer.customerCase);
});
test('unknown deal produces no fabricated case or customer response',()=>{
 const answer=executePlan(dataset(asOf),{intent:'deal',filters:{},metric:'count',dealId:'D999999',clarification:null},asOf);
 assert.equal(answer.customerCase,undefined);assert.deepEqual(answer.deals,[]);
});
test('welcome screen presents a customer investigation, not a generic dashboard',()=>{
 const html=renderToStaticMarkup(React.createElement(Desk));assert.match(html,/לקוח אומר שהמספר לא נכון/);assert.match(html,/D100017/);assert.doesNotMatch(html,/התחברות<\/a>/);
});
