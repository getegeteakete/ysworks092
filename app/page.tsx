import type { Metadata } from 'next'
import { lpHead, lpBody } from '@/lib/lp-html'

export const metadata: Metadata = {
  title: "月3万円からAI導入｜補助金採択率9割超・実務10年AIエンジニア監修｜Y'sworks",
  description: "「AIって難しそう」「高そう」はもう昔の話。補助金採択率9割超のコンサル監修・実務10年以上のAIエンジニアと提携。初期費用9万円・月額2万円〜でAIシステムをすぐ導入できます。",
}

export default function LandingPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: lpHead }} />
      <div dangerouslySetInnerHTML={{ __html: lpBody }} />
    </>
  )
}
