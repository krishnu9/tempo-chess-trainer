'use client'

import { use, type ReactNode } from 'react'
import { browser } from 'react-dom'

/**
 * The store seeds from localStorage and Date.now(), so server markup cannot
 * match the client. `browser()` suspends during prerender and renders here only.
 */
export function StoreGate({ children }: { children: ReactNode }) {
  use(browser('Study data lives in localStorage.'))
  return <>{children}</>
}
