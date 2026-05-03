-- ==========================================
-- Y'sworks マーケティングオートメーション DB
-- ==========================================

-- SEO記事
create table articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text unique not null,
  body        text not null,          -- 本文（Markdown）
  meta_desc   text,                   -- metaディスクリプション
  keywords    text[],                 -- SEOキーワード
  status      text default 'draft',  -- draft | published | scheduled
  note_url    text,                   -- Note.com投稿URL
  published_at timestamptz,
  created_at  timestamptz default now()
);

-- SNS投稿ログ
create table social_posts (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,          -- x | note
  content     text not null,
  article_id  uuid references articles(id),
  post_id     text,                   -- プラットフォーム側のID
  status      text default 'pending', -- pending | posted | failed
  posted_at   timestamptz,
  error_msg   text,
  created_at  timestamptz default now()
);

-- アクセス解析
create table page_views (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,
  referrer    text,
  ua          text,
  ip_hash     text,                   -- ハッシュ化済みIP（プライバシー配慮）
  country     text,
  session_id  text,
  created_at  timestamptz default now()
);

-- チャット履歴（管理者閲覧用）
create table chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  session_id  text unique not null,
  messages    jsonb default '[]',
  lead_score  int default 0,          -- 0-100：見込み度スコア
  contact_info jsonb,                 -- 電話/メール等をBotが取得した場合
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- リード（見込み客）
create table leads (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  email        text unique,
  company      text,
  phone        text,
  source       text,                  -- chat | web | manual | x_search
  score        int default 0,        -- AIスコア 0-100
  status       text default 'new',   -- new | contacted | replied | converted | lost
  notes        text,
  chat_session_id uuid references chat_sessions(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- メール送受信ログ
create table email_logs (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads(id),
  direction   text not null,          -- outbound | inbound
  subject     text not null,
  body        text not null,
  from_email  text,
  to_email    text,
  status      text default 'sent',   -- sent | failed | replied
  sent_at     timestamptz default now()
);

-- SEOキーワード設定
create table seo_keywords (
  id          uuid primary key default gen_random_uuid(),
  keyword     text not null unique,
  priority    int default 5,          -- 1-10
  last_used   timestamptz,
  article_count int default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- 初期キーワードデータ
insert into seo_keywords (keyword, priority) values
  ('AI導入 中小企業', 10),
  ('補助金 IT導入 福岡', 10),
  ('AIシステム 月額 安い', 9),
  ('LINE AI 自動返信', 8),
  ('マッチングサイト 制作', 8),
  ('小規模事業者持続化補助金 2025', 9),
  ('AI顧客管理 CRM', 7),
  ('ECサイト AI 構築', 7),
  ('福岡 ホームページ制作', 8),
  ('補助金 申請代行 福岡', 9);

-- 分析用ビュー
create or replace view daily_stats as
select
  date_trunc('day', created_at) as date,
  count(*) as views,
  count(distinct session_id) as sessions,
  count(distinct ip_hash) as unique_visitors
from page_views
group by 1
order by 1 desc;

-- RLS（Row Level Security）- 管理者のみアクセス
alter table articles     enable row level security;
alter table social_posts enable row level security;
alter table page_views   enable row level security;
alter table chat_sessions enable row level security;
alter table leads        enable row level security;
alter table email_logs   enable row level security;
alter table seo_keywords enable row level security;

-- service_roleキーからは全アクセス許可（APIサーバー用）
create policy "service_role full access" on articles     for all using (true);
create policy "service_role full access" on social_posts for all using (true);
create policy "service_role full access" on page_views   for all using (true);
create policy "service_role full access" on chat_sessions for all using (true);
create policy "service_role full access" on leads        for all using (true);
create policy "service_role full access" on email_logs   for all using (true);
create policy "service_role full access" on seo_keywords for all using (true);
