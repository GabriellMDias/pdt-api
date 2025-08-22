import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import DefaultButton from '../components/inputs/DefaultButton'
import DefaultInput from '../components/inputs/DefaultInput'
import ThemeSwitch from '../components/ThemeSwitch'
import { toast } from 'react-toastify'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loginUser, isAuthenticated } = useAuth()

  const navigate = useNavigate()

  // Se o usuário já estiver logado, redireciona para /home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true })
    }
  }, [isAuthenticated, navigate])


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginUser(email, password)
      navigate('/home')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',
      })
    }
  }

  return (
    <div className="min-h-screen bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark  text-white flex items-center justify-center px-4 transition-colors duration-300">
      <div className='absolute top-4 right-4 z-10'>
        <ThemeSwitch />
      </div>
      

      <div className="w-full max-w-md bg-pilar-green rounded-xl p-8 shadow-xl border border-white/10">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo Pilar da Terra" className="h-28" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4">
          Login
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <DefaultInput
            type="email"
            label="Email"
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <DefaultInput
            type="password"
            label="Senha"
            placeholder='Senha'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <DefaultButton
            type='submit'
            onClick={() => console.log('clicked')}
          >
            Entrar
          </DefaultButton>
        </form>
      </div>
    </div>
  )
}