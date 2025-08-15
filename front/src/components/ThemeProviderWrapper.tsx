// src/components/ThemeProviderWrapper.tsx
import { useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
