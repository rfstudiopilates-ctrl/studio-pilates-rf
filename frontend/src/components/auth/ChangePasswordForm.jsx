import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/authService';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function ChangePasswordForm() {
  const { clearSession } = useAuth();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setMessage(result.message);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      clearSession();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? (
        <Alert variant="success">
          {message}. Volvé a iniciar sesión con tu nueva contraseña.
        </Alert>
      ) : null}

      <Input
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
        }
        required
      />

      <Input
        label="Nueva contraseña"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
        required
      />

      <Input
        label="Confirmar nueva contraseña"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
        }
        required
      />

      <Button type="submit" className="w-full sm:w-auto" isLoading={isLoading}>
        Guardar nueva contraseña
      </Button>
    </form>
  );
}
