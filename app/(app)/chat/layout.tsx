import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Chat — Career Coach',
  description: 'Chat with your AI career coach. Get resume advice, interview prep, salary guidance, and job matching.',
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children
}
