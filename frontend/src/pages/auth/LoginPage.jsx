import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import NavIcon from '../../components/ui/NavIcon';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const session = await login({
        username: form.username.trim(),
        password: form.password,
      });

      const redirectTo = session.user?.role === 'admin' ? '/admin' : '/cliente';
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresá tu usuario y contraseña para acceder al estudio."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <Input
          label="Usuario"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="admin"
          value={form.username}
          onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          required
        />

        <Input
          label="Contraseña"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="rounded-lg p-1 text-text-muted transition hover:text-text"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <NavIcon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
            </button>
          }
          required
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  );
}
