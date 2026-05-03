'use client'
import { useState, useEffect } from 'react'

type Stats = {
  summary: { totalViews: number; totalSessions: number; totalVisitors: number; leads: number; chats: number }
  daily: { date: string; views: number; sessions: number; visitors: number }[]
  topPaths: { path: string; count: number }[]
  topReferrers: { ref: string; count: number }[]
}

type Article = { id: string; title: string; status: string; keywords: string[]; published_at: string; note_url: string; created_at: string }
type Lead = { id: string; name: string; email: string; score: number; status: string; notes: string; created_at: string }
type Post = { id: string; platform: string; content: string; status: string; posted_at: string }

export default function Dashboard() {
  const [tab, setTab] = useState<'analytics' | 'articles' | 'social' | 'leads'>('analytics')
  const [stats, setStats] = useState<Stats | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [keyword, setKeyword] = useState('')
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (tab === 'analytics') fetch('/api/analytics?days=30').then(r => r.json()).then(setStats)
    if (tab === 'articles') fetch('/api/articles').then(r => r.json()).then(d => setArticles(d.articles || []))
    if (tab === 'social') fetch('/api/social').then(r => r.json()).then(d => setPosts(d.posts || []))
    if (tab === 'leads') fetch('/api/leads').then(r => r.json()).then(d => setLeads(d.leads || []))
  }, [tab])

  async function generateArticle() {
    if (!keyword.trim()) return
    setGenerating(true); setMsg('')
    const r = await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword }) })
    const d = await r.json()
    if (d.ok) { setMsg('記事を生成しました！'); setKeyword(''); fetch('/api/articles').then(r => r.json()).then(d => setArticles(d.articles || [])) }
    else setMsg('エラー: ' + d.error)
    setGenerating(false)
  }

  async function publishNote(articleId: string) {
    setMsg('Note.comに投稿中...')
    const r = await fetch('/api/articles/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId }) })
    const d = await r.json()
    setMsg(d.ok ? `Note投稿完了: ${d.noteUrl}` : `エラー: ${d.error}`)
    fetch('/api/articles').then(r => r.json()).then(d => setArticles(d.articles || []))
  }

  async function postX(articleId?: string) {
    setMsg('X(Twitter)に投稿中...')
    const r = await fetch('/api/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId }) })
    const d = await r.json()
    setMsg(d.ok ? 'X投稿完了！' : `エラー: ${d.error}`)
    fetch('/api/social').then(r => r.json()).then(d => setPosts(d.posts || []))
  }

  const S = { fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f6f5f0', color: '#17171e' }
  const header = { background: '#17171e', color: '#fff', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const tabs = { display: 'flex', gap: 0, padding: '0 32px', background: '#fff', borderBottom: '1px solid #e3e0d6' }
  const tabBtn = (active: boolean) => ({ padding: '14px 20px', border: 'none', background: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: active ? '#e8592b' : '#9896aa', borderBottom: active ? '2px solid #e8592b' : '2px solid transparent' })
  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e3e0d6', padding: 20, marginBottom: 12 }
  const kpiBox = { background: '#fff', borderRadius: 12, border: '1px solid #e3e0d6', padding: '20px 24px', textAlign: 'center' as const }
  const kpiNum = { fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 700, color: '#e8592b', lineHeight: 1 }
  const kpiLbl = { fontSize: 12, color: '#9896aa', marginTop: 4, fontWeight: 600 }
  const inp = { padding: '10px 14px', border: '1px solid #e3e0d6', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none' }
  const btn = (color = '#17171e') => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' })
  const badge = (s: string) => {
    const c: any = { draft: '#9896aa', published: '#0d9e72', posted: '#0d9e72', pending: '#f5a623', failed: '#e85959', new: '#1a6bbf', contacted: '#f5a623', replied: '#0d9e72', converted: '#e8592b', lost: '#9896aa' }
    return { background: (c[s] || '#9896aa') + '22', color: c[s] || '#9896aa', border: `1px solid ${(c[s] || '#9896aa')}44`, padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700 }
  }

  return (
    <div style={S}>
      <div style={header}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -1 }}>Y<span style={{ color: '#e8592b' }}>'s</span>works <span style={{ fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Marketing Dashboard</span></span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{new Date().toLocaleDateString('ja-JP')}</span>
      </div>

      <div style={tabs}>
        {(['analytics', 'articles', 'social', 'leads'] as const).map(t => (
          <button key={t} style={tabBtn(tab === t)} onClick={() => setTab(t)}>
            {{ analytics: 'アクセス解析', articles: 'SEO記事', social: 'SNS投稿', leads: 'リード管理' }[t]}
          </button>
        ))}
      </div>

      {msg && <div style={{ background: '#fff3ef', border: '1px solid #f5a98a', color: '#9a3515', padding: '10px 32px', fontSize: 13 }}>{msg}</div>}

      <div style={{ padding: 32 }}>

        {/* ===== ANALYTICS ===== */}
        {tab === 'analytics' && stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { n: stats.summary.totalViews, l: 'PV（30日）' },
                { n: stats.summary.totalSessions, l: 'セッション' },
                { n: stats.summary.totalVisitors, l: 'UU' },
                { n: stats.summary.leads, l: '新規リード' },
                { n: stats.summary.chats, l: 'AI相談数' },
              ].map(k => (
                <div key={k.l} style={kpiBox}>
                  <div style={kpiNum}>{k.n.toLocaleString()}</div>
                  <div style={kpiLbl}>{k.l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>日次PV推移（直近14日）</div>
                {stats.daily.slice(-14).map(d => (
                  <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#9896aa', width: 72, flexShrink: 0 }}>{d.date.slice(5)}</span>
                    <div style={{ flex: 1, background: '#f6f5f0', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#e8592b', height: '100%', width: `${Math.min(100, d.views / (Math.max(...stats.daily.map(x => x.views)) || 1) * 100)}%`, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, width: 28, textAlign: 'right' }}>{d.views}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={card}>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>流入元 TOP5</div>
                  {stats.topReferrers.slice(0, 5).map(r => (
                    <div key={r.ref} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f0ede5' }}>
                      <span style={{ color: '#58576b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{r.ref || '直接流入'}</span>
                      <span style={{ fontWeight: 700 }}>{r.count}</span>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>人気ページ TOP5</div>
                  {stats.topPaths.slice(0, 5).map(p => (
                    <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f0ede5' }}>
                      <span style={{ color: '#58576b' }}>{p.path}</span>
                      <span style={{ fontWeight: 700 }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== ARTICLES ===== */}
        {tab === 'articles' && (
          <>
            <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
              <input style={{ ...inp, maxWidth: 400 }} placeholder="SEOキーワードを入力（例：AI導入 補助金 福岡）" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateArticle()} />
              <button style={btn('#e8592b')} onClick={generateArticle} disabled={generating}>{generating ? '生成中...' : 'AI記事を生成'}</button>
            </div>
            {articles.map(a => (
              <div key={a.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#9896aa' }}>{a.created_at?.slice(0, 10)}</div>
                </div>
                <span style={badge(a.status)}>{a.status}</span>
                {a.status === 'draft' && <button style={btn('#0d9e72')} onClick={() => publishNote(a.id)}>Note投稿</button>}
                {a.status === 'published' && <button style={btn('#1a6bbf')} onClick={() => postX(a.id)}>X投稿</button>}
                {a.note_url && <a href={a.note_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1a6bbf' }}>Note↗</a>}
              </div>
            ))}
          </>
        )}

        {/* ===== SOCIAL ===== */}
        {tab === 'social' && (
          <>
            <div style={{ ...card, display: 'flex', gap: 10, marginBottom: 24 }}>
              <button style={btn('#1a6bbf')} onClick={() => postX()}>Xに手動投稿（最新記事）</button>
            </div>
            {posts.map(p => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: p.platform === 'x' ? '#1a6bbf' : '#0d9e72' }}>{p.platform.toUpperCase()}</span>
                  <span style={badge(p.status)}>{p.status}</span>
                  <span style={{ fontSize: 11, color: '#9896aa', marginLeft: 'auto' }}>{p.posted_at?.slice(0, 16)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#58576b', lineHeight: 1.6 }}>{p.content}</div>
              </div>
            ))}
          </>
        )}

        {/* ===== LEADS ===== */}
        {tab === 'leads' && (
          <>
            {leads.map(l => (
              <div key={l.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: l.score >= 70 ? '#e8592b' : l.score >= 50 ? '#f5a623' : '#e3e0d6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: l.score >= 50 ? '#fff' : '#9896aa' }}>{l.score}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{l.name} <span style={{ fontWeight: 400, fontSize: 12, color: '#9896aa' }}>{l.email}</span></div>
                    <div style={{ fontSize: 12, color: '#9896aa', marginTop: 2 }}>{l.notes}</div>
                  </div>
                  <span style={badge(l.status)}>{l.status}</span>
                  <span style={{ fontSize: 11, color: '#9896aa' }}>{l.created_at?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}
