-- Run once in a NEW Supabase project's SQL Editor. Safe to re-run.
BEGIN;
CREATE TABLE IF NOT EXISTS public.rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS public.managers (email text PRIMARY KEY, role text NOT NULL CHECK(role IN ('owner','manager')));
CREATE TABLE IF NOT EXISTS public.menu (id text PRIMARY KEY, body text NOT NULL);
CREATE TABLE IF NOT EXISTS public.orders (id text PRIMARY KEY,token text UNIQUE NOT NULL,request_id text UNIQUE NOT NULL,created_at text NOT NULL,status text NOT NULL,payment_status text NOT NULL,body text NOT NULL);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at);
CREATE TABLE IF NOT EXISTS public.settings (id text PRIMARY KEY,body text NOT NULL);
CREATE TABLE IF NOT EXISTS public.dining_tables (id text PRIMARY KEY,label text NOT NULL,active integer NOT NULL DEFAULT 1);
-- Only the trusted server's database connection can read/write restaurant data.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits,public.managers,public.menu,public.orders,public.settings,public.dining_tables FROM anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('menu-images','menu-images',false,4000000,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO NOTHING;
COMMIT;
