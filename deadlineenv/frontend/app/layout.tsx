import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DeadlineEnv — Premium Code Review',
  description: 'AI Code Review in an RL Environment',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} min-h-screen text-white antialiased`}>
        <header className="sticky top-0 z-50 glass-panel border-b-0 border-white/5 shadow-sm">
          <nav className="max-w-screen-2xl mx-auto px-8 h-16 flex items-center justify-between">
            <Link href="/" className="font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-semibold text-xl tracking-tighter">
              DeadlineEnv
            </Link>
            <div className="flex items-center gap-6 text-[12px] font-mono whitespace-nowrap">
              <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity" title="Reward for finding a correct bug line">
                <span className="text-green-400">💎 +0.5</span>
                <span className="text-white/50">Bug</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity" title="Reward for correctly classifying bug severity">
                <span className="text-green-400">💎 +0.25</span>
                <span className="text-white/50">Severity</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity" title="Penalty for incorrectly highlighting a clean line">
                <span className="text-red-400">⚠️ -0.05</span>
                <span className="text-white/50">False Alarm</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity" title="Penalty applied each step to simulate deadline pressure">
                <span className="text-red-400">⏱ -0.02</span>
                <span className="text-white/50">Per Step</span>
              </div>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
