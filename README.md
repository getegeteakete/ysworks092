# Y'sworks Marketing Automation

AIオーケストレーション搭載のマーケティング自動化システム。

## できること

| 機能 | 内容 | タイミング |
|------|------|-----------|
| SEO記事自動生成 | Claude Opusがキーワードから2000〜3000字の記事を生成 | 月水金 8:00 自動 or 手動 |
| Note.com自動投稿 | 生成した記事をNote.comに自動公開 | 記事生成直後 |
| X(Twitter)自動投稿 | 記事の要約を140字でX投稿 | 毎日 9:00・18:00 |
| アクセス解析 | PV・UU・流入元・人気ページを自前で計測 | リアルタイム |
| リード自動発掘 | チャットBot履歴をAIがスコアリング（0〜100点） | チャット終了後 |
| メール自動送信 | スコア70以上のリードに自動でファーストメール | リード登録後即時 |
| フォローアップ | 3日間未連絡のリードに自動リマインド | 火木 10:00 |
| 返信検知 | XserverのIMAPをチェックして返信を自動検知 | 火木 10:00 |

---

## セットアップ手順

### 1. 必要なアカウント

- [Supabase](https://supabase.com) - 無料プランでOK
- [Twitter Developer](https://developer.twitter.com) - Free プラン（月1500ツイートまで無料）
- Note.comアカウント
- Anthropic APIキー（[console.anthropic.com](https://console.anthropic.com)）

### 2. Supabaseセットアップ

1. supabase.com でプロジェクト作成
2. SQL Editor に `supabase/schema.sql` の内容を貼り付けて実行
3. Project Settings → API から以下を取得：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Twitter APIセットアップ

1. developer.twitter.com → Create Project & App
2. App Settings → Keys and tokens から4つのキーを取得
3. Permissions → Read and Write に設定（必須）

### 4. Note.comのセッションCookie取得

1. Chromeでnote.comにログイン
2. F12 → Application → Cookies → https://note.com
3. `_note_session_v2` の値をコピー → `NOTE_SESSION_COOKIE` に設定
4. ※Cookieは定期的に失効するため、月1回程度更新が必要

### 5. GitHubにプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/あなたのID/ysworks-marketing.git
git push -u origin main
```

### 6. Vercelにデプロイ

1. vercel.com → Add New Project → GitHubリポジトリ選択
2. Framework: Next.js（自動検出）
3. Environment Variables に `.env.example` の全変数を設定
4. Deploy

### 7. LPにトラッキングコードを追加

`ysworks-lp/public/index.html` の `</body>` 直前に追加：

```html
<script>
(function(){
  const sid = localStorage.getItem('_sid') || Math.random().toString(36).slice(2);
  localStorage.setItem('_sid', sid);
  fetch('https://marketing.ysworks-hakata.com/api/analytics', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ path: location.pathname, referrer: document.referrer, sessionId: sid })
  });
})();
</script>
```

---

## Cronスケジュール（vercel.json）

| エンドポイント | スケジュール | 内容 |
|--------------|------------|------|
| `/api/cron/articles` | 月水金 8:00 JST | SEO記事生成＋Note投稿 |
| `/api/cron/social` | 毎日 9:00・18:00 JST | X自動投稿 |
| `/api/cron/leads` | 火木 10:00 JST | リードフォローアップ＋返信検知 |

---

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local に値を入力
npm run dev
```

http://localhost:3000 でダッシュボードが開きます。
