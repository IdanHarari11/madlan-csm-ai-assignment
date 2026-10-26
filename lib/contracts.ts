import { z } from 'zod';
import { filterSchema,metricSchema,impactSchema } from './domain';
// Nullable, required model fields yield a closed JSON schema across providers.
export const modelFilters=z.object({city:z.string().max(80).nullable(),neighborhood:z.string().max(100).nullable(),propertyType:z.enum(['דירה','בית פרטי','פנטהאוז','דירת גג','דופלקס','דירת גן']).nullable(),roomsMin:z.number().min(.5).max(20).nullable(),roomsMax:z.number().min(.5).max(20).nullable(),dateFrom:z.string().nullable(),dateTo:z.string().nullable(),parking:z.boolean().nullable(),elevator:z.boolean().nullable(),safeRoom:z.boolean().nullable()}).strict();
export const planSchema=z.object({intent:z.enum(['query','deal','quality','clarify','unsupported']),filters:modelFilters,metric:metricSchema,dealId:z.string().max(30).nullable(),clarification:z.string().max(500).nullable()}).strict();
export type Plan=z.infer<typeof planSchema>;
export const emptyFilters={city:null,neighborhood:null,propertyType:null,roomsMin:null,roomsMax:null,dateFrom:null,dateTo:null,parking:null,elevator:null,safeRoom:null};
export function validatePlan(value:unknown){
 const p=planSchema.parse(value);const filters=filterSchema.parse(Object.fromEntries(Object.entries(p.filters).filter(([,v])=>v!==null)));
 if(p.intent==='deal'&&(!p.dealId||!/^D\d{6}$/.test(p.dealId)))throw new Error('INVALID_PLAN');
 if(p.intent==='clarify'&&!p.clarification?.trim())throw new Error('INVALID_PLAN');
 return {...p,filters};
}
export const taskContentSchema=z.object({
 title:z.string().min(8).max(140),category:z.enum(['data_quality','suspected_bug','feature_request']),
 description:z.string().min(20).max(1800),expectedBehavior:z.string().min(10).max(800),
 acceptanceCriteria:z.array(z.string().min(8).max(300)).min(1).max(5),
 evidenceIds:z.array(z.string().regex(/^D\d{6}$/)).max(30),
 unknowns:z.array(z.string().max(250)).max(6),
}).strict();
export type TaskContent=z.infer<typeof taskContentSchema>;
export const exploreSchema=z.object({filters:filterSchema,metric:metricSchema,dealId:z.string().regex(/^D\d{6}$/).optional()}).strict();
export const chatSchema=z.object({message:z.string().trim().min(2).max(2000),selectedIds:z.array(z.string().regex(/^D\d{6}$/)).max(3).default([]),history:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().max(2500)}).strict()).max(8).default([])}).strict();
export const draftRequestSchema=z.object({request:z.string().trim().min(15).max(2000),evidenceIds:z.array(z.string().regex(/^D\d{6}$/)).max(30),impact:impactSchema}).strict();
export const createIssueSchema=z.object({draftId:z.string().uuid(),revision:z.number().int().min(1),approved:z.literal(true)}).strict();
