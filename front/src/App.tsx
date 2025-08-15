import './App.css'
import ThemeProviderWrapper from './components/ThemeProviderWrapper'
import { AppRouter } from './routes/AppRouter'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


function App() {

  return (
    <ThemeProviderWrapper>
      <ToastContainer />
      <AppRouter />
    </ThemeProviderWrapper>
  )
}

export default App
