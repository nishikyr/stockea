import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('comprobando…')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('sin conexión con el backend'))
  }, [])

  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-2xl font-bold text-teal-800">Backend: {status}</p>
    </main>
  )
}