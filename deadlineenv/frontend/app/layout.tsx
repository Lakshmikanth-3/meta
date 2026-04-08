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
            <div className="flex items-center gap-8 text-sm font-medium text-white/60">
              <Link href="/playground" className="hover:text-white transition-colors duration-300">Playground</Link>
              <a
                href="https://github.com/huggingface/open-env"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors duration-300"
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
