import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/500.css'
import '@fontsource/fira-sans/400.css'
import '@fontsource/fira-sans/500.css'
import '@fontsource/fira-sans/600.css'
import '@fontsource/fira-sans/700.css'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { AppShell } from '@/components/AppShell'
import { StoreGate } from '@/components/StoreGate'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tempo — Chess opening trainer',
  description:
    'Tempo is a chess opening repertoire builder and spaced-repetition trainer. Build lines for White and Black, then drill them against the moves you actually face.',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0e13',
}

const themeScript = `try{var saved=JSON.parse(localStorage.getItem('tempo-state'));var t=saved&&saved.state&&saved.state.settings.theme;document.documentElement.classList.toggle('dark',t!=='light')}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Suspense
          fallback={
            <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold text-bg">
                T
              </span>
            </div>
          }
        >
          <StoreGate>
            <AppShell>{children}</AppShell>
          </StoreGate>
        </Suspense>
      </body>
    </html>
  )
}
