import { useTheme } from '../hooks/useTheme'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`
        w-12 h-6 rounded-full px-1 flex items-center
        transition-colors duration-300  cursor-pointer 
        ${theme === 'dark' ? 'bg-blue-900 justify-end' : 'bg-yellow-300 justify-start'}
      `}
    >
      <span
        className={`
          w-4 h-4 rounded-full flex items-center justify-center
          text-white transition-transform duration-300
          ${theme === 'dark' ? 'bg-blue-500' : 'bg-yellow-500'}
        `}
      >
        {theme === 'dark' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
      </span>
    </button>
  )
}
