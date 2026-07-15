import type { Metadata } from 'next'
import NewsletterPopup from '@/components/ui/NewsletterPopup'
import './globals.css'

export const metadata: Metadata = {
  title: 'TheFundedDiaries â€” Find Your Prop Firm',
  description: 'Independent prop firm comparison. Verified rules, real reviews, transparent data.',
  openGraph: {
    title: 'TheFundedDiaries',
    description: 'Independent prop firm comparison. Verified rules, real reviews.',
    siteName: 'TheFundedDiaries',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="ambient-blob" style={{width:'800px',height:'500px',top:'-200px',left:'50%',transform:'translateX(-55%)',background:'radial-gradient(circle,rgba(0,229,160,0.2),transparent 70%)'}} />
        <div className="ambient-blob" style={{width:'500px',height:'500px',top:'35%',right:'-180px',background:'radial-gradient(circle,rgba(167,139,250,0.18),transparent 70%)'}} />
        <div className="ambient-blob" style={{width:'380px',height:'380px',bottom:'5%',left:'-100px',background:'radial-gradient(circle,rgba(0,200,133,0.1),transparent 70%)'}} />
        <div style={{position:'relative',zIndex:1}}>
          {children}
        </div>
      <NewsletterPopup /></body>
    </html>
  )
}
