import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ResetPasswordPage = () => {
  const { lang } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError(
        lang === 'fr'
          ? 'Lien de réinitialisation invalide ou incomplet'
          : 'Invalid or incomplete reset link'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        lang === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'
      );
      return;
    }

    if (password.length < 6) {
      setError(
        lang === 'fr'
          ? 'Le mot de passe doit contenir au moins 6 caractères'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            (lang === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting password')
        );
        setLoading(false);
        return;
      }

      setSuccess(
        lang === 'fr'
          ? 'Mot de passe réinitialisé avec succès. Redirection vers la connexion...'
          : 'Password reset successfully. Redirecting to login...'
      );

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(
        lang === 'fr' ? 'Impossible de contacter le serveur' : 'Cannot reach server'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-card px-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <span className="text-2xl font-extrabold text-primary-foreground">PO</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {lang === 'fr' ? 'Nouveau mot de passe' : 'New password'}
          </h1>
          <p className="text-muted-foreground">
            {lang === 'fr'
              ? 'Choisissez un nouveau mot de passe pour votre compte'
              : 'Choose a new password for your account'}
          </p>
        </div>

        {!token && (
          <p className="text-destructive text-sm font-medium mb-4 text-center">
            {lang === 'fr'
              ? "Aucun token trouvé dans l'URL. Utilisez le lien fourni par la demande de réinitialisation."
              : 'No token found in the URL. Use the link provided by the reset request.'}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              {lang === 'fr' ? 'Nouveau mot de passe' : 'New password'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={!token}
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {lang === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={!token}
              className="h-12"
            />
          </div>

          {error && <p className="text-destructive text-sm font-medium">{error}</p>}
          {success && <p className="text-success text-sm font-medium">{success}</p>}

          <Button
            type="submit"
            disabled={loading || !token || !!success}
            className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? '...' : lang === 'fr' ? 'Réinitialiser' : 'Reset password'}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {lang === 'fr' ? 'Retour à la connexion' : 'Back to login'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;