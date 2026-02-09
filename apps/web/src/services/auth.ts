export async function validateToken() {
  const token = localStorage.getItem('accessToken')

  if(token === null) {
    throw new Error('Token inexistente')
  }

  const res = await fetch('/api/auth/validate', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Token inválido')
  }

  return res
}


export async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const responseJson = await response.json()

  if (!response.ok) {
    const errorData = responseJson
    const message = Array.isArray(errorData.message)
      ? errorData.message.join('; \n')
      : errorData.message || 'Erro desconhecido.'

    throw new Error(message)
  }

  return responseJson // retorna { accessToken: string }
}