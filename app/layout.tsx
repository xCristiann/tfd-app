import type { Metadata } from 'next'
import './globals.css'
import NewsletterPopup from '@/components/ui/NewsletterPopup'

export const metadata: Metadata = {
  title: 'TheFundedDiaries - Find Your Prop Firm',
  description: 'Independent prop firm comparison. Verified data, real trader reviews, transparent rankings.',
  openGraph: {
    title: 'TheFundedDiaries - Find Your Prop Firm',
    description: 'Independent prop firm comparison platform.',
    url: 'https://www.thefundeddiaries.com',
    siteName: 'TheFundedDiaries',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NewsletterPopup />
        {children}
      </body>
    </html>
  )
}
