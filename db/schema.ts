import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const menu=sqliteTable('menu',{id:text('id').primaryKey(),body:text('body').notNull()});
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),body:text('body').notNull()});
export const orders=sqliteTable('orders',{id:text('id').primaryKey(),token:text('token').notNull().unique(),requestId:text('request_id').notNull().unique(),createdAt:text('created_at').notNull(),status:text('status').notNull(),paymentStatus:text('payment_status').notNull(),body:text('body').notNull()},t=>[index('orders_created_idx').on(t.createdAt)]);
export const tables=sqliteTable('dining_tables',{id:text('id').primaryKey(),label:text('label').notNull(),active:integer('active').notNull().default(1)});
export const managers=sqliteTable('managers',{email:text('email').primaryKey(),role:text('role').notNull()});
export const limits=sqliteTable('rate_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
