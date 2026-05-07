-- ============================================================
-- device_fingerprints 表 (Layer 3 反欺诈：设备指纹检测)
--
-- 历史：表于 2026-03-16 直接在 Supabase 上手动创建（提交
--      38ad514b），未落迁移文件。生产 PostgREST schema cache
--      未识别该表，导致 /api/user/device-check 持续报 PGRST205。
--      本文件为补迁移。
--
-- 安全性：完全幂等。所有 DDL 使用 IF NOT EXISTS，可重复执行。
--
-- 关联代码：lib/fraud/device-checker.ts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id           SERIAL PRIMARY KEY,
  fingerprint  VARCHAR NOT NULL,
  user_uuid    UUID NOT NULL REFERENCES public.users(uuid),
  ip_address   VARCHAR,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- fingerprint 单列：device-checker.ts 频繁用 .eq('fingerprint', ...) 查询
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fp
  ON public.device_fingerprints(fingerprint);

-- (fingerprint, user_uuid) 唯一：让 device-checker.ts 中
-- `if (insertError.code === '23505')` 的并发防重逻辑生效
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_fingerprints_unique
  ON public.device_fingerprints(fingerprint, user_uuid);

-- user_uuid 单列：幂等检查 .eq('user_uuid', userUuid) 用
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_uuid
  ON public.device_fingerprints(user_uuid);

-- service_role 自动绕过 RLS；启用仅为防止 anon/authenticated 越权访问
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- 强制 PostgREST 重载 schema cache，修复 PGRST205
NOTIFY pgrst, 'reload schema';
