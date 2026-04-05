import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DeadlineEnv — Code Review RL Environment',
  description: 'An OpenEnv reinforcement learning environment where an AI agent learns to review pull requests under deadline pressure.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-bg-base text-text-primary min-h-screen`} style={{ backgroundColor: '#0d0f11', color: '#e6edf3' }}>
        <header className="border-b border-border-subtle sticky top-0 z-50" style={{ backgroundColor: '#0d0f11', borderColor: '#1e2227' }}>
          <nav className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-mono text-accent-green font-medium text-lg tracking-tight" style={{ color: '#3fb950' }}>
              DeadlineEnv
            </Link>
            <div className="flex items-center gap-6 text-sm" style={{ color: '#7d8590' }}>
              <Link href="/playground" className="hover:text-text-primary transition-colors" style={{ color: '#7d8590' }}>Playground</Link>
              <Link href="/docs" className="hover:text-text-primary transition-colors" style={{ color: '#7d8590' }}>Docs</Link>
              <a
                href="https://github.com/huggingface/open-env"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-primary transition-colors"
                style={{ color: '#7d8590' }}
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
