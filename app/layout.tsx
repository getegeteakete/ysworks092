import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Y'sworks Marketing Dashboard",
  robots: 'noindex, nofollow',  // 管理画面はインデックスしない
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
