import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { path, referrer, sessionId } = await req.json()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || ''
    const ipHash = createHash('sha256').update(ip + (process.env.ANALYTICS_SALT || 'salt')).digest('hex').slice(0, 16)
    const ua = req.headers.get('user-agent') || ''

    await supabaseAdmin.from('page_views').insert({
      path: path || '/',
      referrer: referrer || '',
      ua,
      ip_hash: ipHash,
      session_id: sessionId,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get('days') || 30)
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data: daily } = await supabaseAdmin
      .from('page_views')
      .select('created_at, session_id, ip_hash, referrer, path')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const rows = daily || []

    const byDay: Record<string, { views: number; sessions: Set<string>; visitors: Set<string> }> = {}
    const pathCount: Record<string, number> = {}
    const refCount: Record<string, number> = {}

    for (const row of rows) {
      const day = row.created_at.slice(0, 10)
      if (!byDay[day]) byDay[day] = { views: 0, sessions: new Set(), visitors: new Set() }
      byDay[day].views++
      if (row.session_id) byDay[day].sessions.add(row.session_id)
      if (row.ip_hash) byDay[day].visitors.add(row.ip_hash)
      pathCount[row.path] = (pathCount[row.path] || 0) + 1
      if (row.referrer) refCount[row.referrer] = (refCount[row.referrer] || 0) + 1
    }

    const dailyStats = Object.entries(byDay).map(([date, v]) => ({
      date,
      views: v.views,
      sessions: v.sessions.size,
      visitors: v.visitors.size,
    }))

    const topPaths = Object.entries(pathCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([path, count]) => ({ path, count }))

    const topReferrers = Object.entries(refCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([ref, count]) => ({ ref, count }))

    const { count: leadCount } = await supabaseAdmin
      .from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    const { count: chatCount } = await supabaseAdmin
      .from('chat_sessions').select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    return NextResponse.json({
      summary: {
        totalViews: rows.length,
        totalSessions: new Set(rows.map(r => r.session_id)).size,
        totalVisitors: new Set(rows.map(r => r.ip_hash)).size,
        leads: leadCount || 0,
        chats: chatCount || 0,
      },
      daily: dailyStats,
      topPaths,
      topReferrers,
    })
  } catch (e: any) {
    // テーブル未作成などの場合も空データで返す
    return NextResponse.json({
      summary: { totalViews: 0, totalSessions: 0, totalVisitors: 0, leads: 0, chats: 0 },
      daily: [],
      topPaths: [],
      topReferrers: [],
    })
  }
}
