import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const drafts=sqliteTable('drafts',{
 id:text('id').primaryKey(),revision:integer('revision').notNull().default(1),owner:text('owner').notNull(),payload:text('payload').notNull(),fingerprint:text('fingerprint').notNull(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()
});
export const operations=sqliteTable('operations',{
 id:text('id').primaryKey(),draftRevision:integer('draft_revision').notNull().default(1),draftId:text('draft_id').notNull().unique(),owner:text('owner').notNull(),fingerprint:text('fingerprint').notNull().unique(),status:text('status').notNull(),issueKey:text('issue_key'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
});
export const audit=sqliteTable('audit',{
 id:text('id').primaryKey(),traceId:text('trace_id').notNull(),actor:text('actor').notNull(),event:text('event').notNull(),code:text('code').notNull(),createdAt:integer('created_at').notNull()
});
export const budget=sqliteTable('budget',{
 key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull()
});
