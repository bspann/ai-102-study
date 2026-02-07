import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI-102 Study App',
  description: 'Azure AI Engineer Certification Study App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
