import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Eye, EyeOff, Globe, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const LoginPage = () => {
  const { login, lang, setLang } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const tr = t(lang);

  // =====================================================
  // MOT DE PASSE OUBLIÉ
  // =====================================================
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotError('');
    setForgotMessage('');
    setResetLink('');
    setLinkCopied(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');
    setResetLink('');

    if (!forgotEmail) {
      setForgotError(
        lang === 'fr' ? 'Veuillez saisir votre email' : 'Please enter your email'
      );
      setForgotLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotError(
          data.error ||
            (lang === 'fr' ? 'Erreur lors de la demande' : 'Error processing request')
        );
        setForgotLoading(false);
        return;
      }

      setForgotMessage(data.message || '');

      // Mode dev/test : le backend renvoie directement le lien
      // (pas d'envoi d'email pour l'instant).
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err) {
      setForgotError(
        lang === 'fr' ? 'Impossible de contacter le serveur' : 'Cannot reach server'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopyLink = async () => {
    // Le clipboard API moderne (navigator.clipboard) exige un contexte
    // sécurisé (https ou localhost) ET que le document ait le focus.
    // On tente d'abord cette méthode, puis on retombe sur un fallback
    // (textarea + execCommand) si elle échoue ou n'est pas disponible.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(resetLink);
        setLinkCopied(true);
        setForgotError('');
        setTimeout(() => setLinkCopied(false), 2000);
        return;
      }
      throw new Error('clipboard API unavailable');
    } catch (err) {
      // -----------------------------------------------------
      // Fallback : textarea temporaire + document.execCommand
      // -----------------------------------------------------
      try {
        const textarea = document.createElement('textarea');
        textarea.value = resetLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (ok) {
          setLinkCopied(true);
          setForgotError('');
          setTimeout(() => setLinkCopied(false), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackErr) {
        setForgotError(
          lang === 'fr'
            ? 'Copie automatique impossible : sélectionnez et copiez le lien manuellement (Ctrl+C)'
            : 'Automatic copy failed: select and copy the link manually (Ctrl+C)'
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isSignup) {
      if (password !== confirmPassword) {
        setError(lang === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError(lang === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, shopName, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || (lang === 'fr' ? 'Erreur lors de la création du compte' : 'Error creating account'));
          setLoading(false);
          return;
        }

        setSuccess(lang === 'fr' ? 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.' : 'Account created successfully! You can now log in.');
        setIsSignup(false);
        setPassword('');
        setConfirmPassword('');
      } catch (err) {
        setError(lang === 'fr' ? 'Impossible de contacter le serveur' : 'Cannot reach server');
      } finally {
        setLoading(false);
      }
    } else {
      const ok = await login(email, password);
      if (!ok) setError(tr.loginError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-1 bg-foreground items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-primary/20" />
        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-8">
            <span className="text-3xl font-extrabold text-primary-foreground">PO</span>
          </div>
          <h2 className="text-4xl font-extrabold text-card mb-4">
            PASS OPTIQUE
          </h2>
          <p className="text-lg text-card/70 font-medium mb-2">by MTN</p>
          <p className="text-card/50 text-sm max-w-xs mx-auto leading-relaxed">
            {lang === 'fr'
              ? 'La solution de gestion complète pour les opticiens-lunetiers'
              : 'The complete management solution for opticians'}
          </p>
          <div className="mt-12 text-card/30 text-xs">
            © Pass Santé Mousso
          </div>
        </div>
      </div>

      {/* Right - Login/Signup/Forgot Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 bg-card">
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="h-4 w-4" />
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>

        <div className="w-full max-w-md mx-auto animate-fade-in">

          {showForgotPassword ? (
            // =================================================
            // VUE : MOT DE PASSE OUBLIÉ
            // =================================================
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                  {lang === 'fr' ? 'Mot de passe oublié' : 'Forgot password'}
                </h1>
                <p className="text-muted-foreground">
                  {lang === 'fr'
                    ? 'Saisissez votre email, un lien de réinitialisation sera généré.'
                    : 'Enter your email, a reset link will be generated.'}
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail">{tr.email}</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="nom@optique.ci"
                    required
                    className="h-12"
                    disabled={!!resetLink}
                  />
                </div>

                {forgotError && (
                  <p className="text-destructive text-sm font-medium">{forgotError}</p>
                )}

                {forgotMessage && !resetLink && (
                  <p className="text-success text-sm font-medium">{forgotMessage}</p>
                )}

                {resetLink && (
                  <div className="p-4 rounded-lg bg-muted space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {lang === 'fr'
                        ? "Aucun service d'email n'est configuré pour l'instant. Copiez ce lien ou cliquez sur \"Ouvrir\" pour réinitialiser le mot de passe :"
                        : 'No email service is configured yet. Copy this link or click "Open" to reset the password:'}
                    </p>

                    <div className="flex items-center gap-2">
                      {/* Vraie balise <a> : le simple affichage en <code>
                          n'était pas cliquable, d'où le "ça ne fait rien" */}
                      <a
                        href={resetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-xs break-all bg-background rounded px-2 py-2 border text-primary hover:underline"
                      >
                        {resetLink}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="shrink-0 p-2 rounded-md border hover:bg-background transition-colors"
                        title={lang === 'fr' ? 'Copier' : 'Copy'}
                      >
                        {linkCopied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {linkCopied && (
                      <p className="text-success text-xs font-medium">
                        {lang === 'fr' ? 'Lien copié !' : 'Link copied!'}
                      </p>
                    )}

                    <a href={resetLink} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" className="w-full">
                        {lang === 'fr' ? 'Ouvrir le lien' : 'Open link'}
                      </Button>
                    </a>
                  </div>
                )}

                {!resetLink && (
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {forgotLoading
                      ? '...'
                      : lang === 'fr'
                      ? 'Générer le lien'
                      : 'Generate link'}
                  </Button>
                )}

                <button
                  type="button"
                  onClick={resetForgotPasswordState}
                  className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
                >
                  {lang === 'fr' ? 'Retour à la connexion' : 'Back to login'}
                </button>
              </form>
            </>
          ) : (
            // =================================================
            // VUE : LOGIN / SIGNUP
            // =================================================
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                  {isSignup
                    ? (lang === 'fr' ? 'Créer un compte' : 'Create account')
                    : tr.login}
                </h1>
                <p className="text-muted-foreground">
                  {isSignup
                    ? (lang === 'fr' ? 'Inscrivez-vous pour accéder à PASS OPTIQUE' : 'Sign up to access PASS OPTIQUE')
                    : tr.loginSubtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{lang === 'fr' ? 'Nom complet' : 'Full name'}</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder={lang === 'fr' ? 'Dr. Kouamé Jean' : 'Dr. Kouamé Jean'}
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopName">{lang === 'fr' ? 'Nom de la boutique' : 'Shop name'}</Label>
                      <Input
                        id="shopName"
                        value={shopName}
                        onChange={e => setShopName(e.target.value)}
                        placeholder={lang === 'fr' ? 'Optique Vision Plus' : 'Vision Plus Optics'}
                        required
                        className="h-12"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{tr.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@optique.ci"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{tr.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
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

                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{lang === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-12"
                    />
                  </div>
                )}

                {error && <p className="text-destructive text-sm font-medium">{error}</p>}
                {success && <p className="text-success text-sm font-medium">{success}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? '...' : isSignup
                    ? (lang === 'fr' ? 'Créer mon compte' : 'Create my account')
                    : tr.loginBtn}
                </Button>

                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
                  >
                    {tr.forgotPassword}
                  </button>
                )}
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignup(!isSignup); setError(''); setSuccess(''); }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {isSignup
                    ? (lang === 'fr' ? 'Déjà inscrit ? Se connecter' : 'Already registered? Log in')
                    : (lang === 'fr' ? 'Pas encore de compte ? Créer un compte' : "Don't have an account? Sign up")}
                </button>
              </div>

              {!isSignup && (
                <div className="mt-6 p-4 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Comptes démo :</p>
                  <p>Super Admin : superadmin@passoptique.ci / super123</p>
                  <p>Admin : admin@passoptique.ci / admin123</p>
                  <p>Directeur : directeur@passoptique.ci / directeur123</p>
                  <p>Vendeur : vendeur@passoptique.ci / vendeur123</p>
                  <p>Caissier : caissier@passoptique.ci / caissier123</p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;