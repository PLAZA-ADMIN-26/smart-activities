import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [welcomeUser, setWelcomeUser] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(username, password);
    if (ok) {
      setError('');
      setWelcomeUser(username.trim().toUpperCase());
      setTimeout(() => navigate('/', { replace: true }), 1100);
    } else {
      setError('Utente o password non corretti.');
    }
  };

  if (welcomeUser) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center bg-bg dark:bg-dark-bg px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="animate-fade-in-slow text-center px-6">
          <img src="/icons/logo-96.png" alt="Prioritize" className="w-14 h-14 mx-auto mb-5 rounded-2xl object-cover" />
          <h1 className="text-2xl font-extrabold text-textMain dark:text-dark-text">
            Bentornato {welcomeUser}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 bg-bg dark:bg-dark-bg"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-10">
          <img src="/icons/logo-96.png" alt="Prioritize" className="mx-auto mb-5 w-16 h-16 rounded-2xl object-cover shadow-soft" />
          <h1 className="text-2xl font-extrabold text-textMain dark:text-dark-text leading-snug">
            Prioritize
          </h1>
          <p className="text-sm text-textSoft dark:text-dark-text/60 mt-1">Organizza le tue giornate con chiarezza.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-textSoft dark:text-dark-text/70 mb-1.5">
              Utente
            </label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Inserisci il tuo utente"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              name="prioritize-user-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSoft dark:text-dark-text/70 mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la password"
              autoComplete="new-password"
              name="prioritize-pass-field"
            />
          </div>

          {error && <p className="text-sm text-primary dark:text-dark-primary font-medium">{error}</p>}

          <button type="submit" className="btn-primary w-full mt-2 min-h-[48px]">
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
}
