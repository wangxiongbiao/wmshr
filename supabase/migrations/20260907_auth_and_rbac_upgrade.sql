-- Migration: 20260907_auth_and_rbac_upgrade.sql
-- Purpose: Unified authentication, RBAC, overseas warehouse nodes, and employee account consolidation.

-- 1. 统一账号认证凭据表 (Web 管理端 + 移动端 App 统一账号源)
CREATE TABLE IF NOT EXISTS public.workspace_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id bigint REFERENCES public.employees(id) ON DELETE CASCADE,
  account text NOT NULL,
  password_hash text NOT NULL,
  account_type text NOT NULL DEFAULT 'employee' 
    CHECK (account_type IN ('superadmin', 'admin', 'employee')),
  status text NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'disabled', 'locked')),
  last_selected_country text DEFAULT '🇹🇭 泰国',
  last_selected_currency text DEFAULT 'THB',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (owner_user_id, account),
  UNIQUE (owner_user_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_accounts_lookup ON public.workspace_accounts (owner_user_id, account);

-- 2. 成员角色与细粒度权限配置表
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.workspace_accounts(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role_name text NOT NULL DEFAULT '普通员工' 
    CHECK (role_name IN ('超级管理员', '系统管理员', '仓储主管', '普通员工')),
  permissions jsonb NOT NULL DEFAULT '["dashboard_view", "sop_view"]'::jsonb,
  allowed_warehouses text[] NOT NULL DEFAULT '{"*"}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (owner_user_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members (owner_user_id, role_name);

-- 3. 海外仓节点配置表 (18+ 全球节点)
CREATE TABLE IF NOT EXISTS public.workspace_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  continent text NOT NULL,
  country_name text NOT NULL,
  country_code text NOT NULL,
  flag_emoji text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (owner_user_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_workspace_nodes_code ON public.workspace_nodes (owner_user_id, country_code);

-- 4. 商品与客户订单快照表 (轻量快照扩展)
CREATE TABLE IF NOT EXISTS public.admin_product_snapshots (
  owner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_order_snapshots (
  owner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  orders jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. 放宽考勤配置表的币种约束，支持多国海外仓币种
ALTER TABLE public.attendance_config DROP CONSTRAINT IF EXISTS attendance_config_currency_check;
