import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(username, password);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('Utente o password non corretti.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg dark:bg-dark-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 w-16 h-16 rounded-xl2 bg-primary dark:bg-dark-primary flex items-center justify-center text-2xl text-white shadow-soft">
            ✎
          </div>
          <h1 className="text-2xl font-extrabold text-textMain dark:text-dark-text leading-snug">
            Il sito per organizzare<br />le tue idee.
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSoft dark:text-dark-text/70 mb-1.5">
              Utente
            </label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="MIRKO / ADMIN"
              autoCapitalize="characters"
              autoComplete="username"
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
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-primary dark:text-dark-primary font-medium">{error}</p>}

          <button type="submit" className="btn-primary w-full mt-2">
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
}
