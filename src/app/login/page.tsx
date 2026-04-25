'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'TEACHER') {
          router.push('/teacher/dashboard');
        } else if (data.user.mustChangePassword) {
          router.push('/parent/change-password');
        } else {
          router.push('/parent/dashboard');
        }
      } else {
        setError(data.error || 'Correo o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'TEACHER') {
          router.push('/teacher/dashboard');
        } else {
          router.push('/parent/dashboard');
        }
      } else {
        setError(data.error || 'Error al iniciar sesión con Google');
      }
    } catch (err) {
      setError('Ocurrió un error de red al contactar Google');
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      
      <div className="login-glass-box">
        <div className="login-header-premium">
          <span className="login-logo">🥗</span>
          <h1>NutriTracker School</h1>
          <p>Bienvenido. Por favor, ingresa a tu cuenta.</p>
        </div>

        {error && (
          <div className="error-card">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="premium-form">
          <div className="input-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              className="premium-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="premium-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-premium" disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Acceder'}
          </button>
        </form>

        <div className="premium-divider">
          <span>O ingresa rápidamente con</span>
        </div>

        <div className="google-auth-wrapper">
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('La autenticación con Google ha fallado')}
              theme="outline"
              size="large"
              shape="rectangular"
              text="continue_with"
            />
          </GoogleOAuthProvider>
        </div>
      </div>
    </div>
  );
}
