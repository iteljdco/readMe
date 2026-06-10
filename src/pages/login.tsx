import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState<'login' | 'signup' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push('/dashboard');
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading('login');
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(null);

    if (error) {
      setMessage(
        error.message === 'Invalid login credentials'
          ? 'Invalid login credentials. Check that the email and password match an existing confirmed account.'
          : error.message
      );
      return;
    }

    router.push('/dashboard');
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading('signup');
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
        },
        emailRedirectTo:
          typeof window === 'undefined' ? undefined : `${window.location.origin}/dashboard`,
      },
    });

    setLoading(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push('/dashboard');
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!loginError) {
      router.push('/dashboard');
      return;
    }

    setMessage(
      'Account created, but automatic login is blocked. In Supabase, turn off email confirmation to go directly to the dashboard after sign up.'
    );
  };

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <main style={styles.page}>
      <section style={styles.authPanel}>
        <div style={styles.header}>
          <h1 style={styles.title}>{mode === 'login' ? 'Log In' : 'Sign Up'}</h1>
          <p style={styles.subtitle}>
            {mode === 'login'
              ? 'Enter your account details to open your dashboard.'
              : 'Create an account if you do not have one yet.'}
          </p>
        </div>

        <div style={styles.toggle} aria-label="Choose authentication form">
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              ...styles.toggleButton,
              ...(mode === 'login' ? styles.activeToggleButton : {}),
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            style={{
              ...styles.toggleButton,
              ...(mode === 'signup' ? styles.activeToggleButton : {}),
            }}
          >
            Sign Up
          </button>
        </div>

        {message && <p style={styles.message}>{message}</p>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Password
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={styles.input}
              />
            </label>
            <button type="submit" disabled={loading !== null} style={styles.button}>
              {loading === 'login' ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={styles.form}>
            <div style={styles.nameFields}>
              <label style={styles.label}>
                First name
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Last name
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  style={styles.input}
                />
              </label>
            </div>
            <label style={styles.label}>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Password
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Confirm password
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                style={styles.input}
              />
            </label>
            <button type="submit" disabled={loading !== null} style={styles.button}>
              {loading === 'signup' ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '2rem',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F7FF 100%)',
    color: '#0C3A66',
    fontFamily: 'Arial, sans-serif',
  },
  authPanel: {
    width: '100%',
    maxWidth: '430px',
    padding: '2rem',
    background: '#ffffff',
    border: '1px solid #B3E5FC',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 119, 190, 0.15)',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    margin: '0 0 0.35rem',
    fontSize: '2rem',
    color: '#0C3A66',
  },
  subtitle: {
    margin: 0,
    color: '#0077BE',
  },
  toggle: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.35rem',
    padding: '0.35rem',
    marginBottom: '1rem',
    background: '#E0F7FF',
    borderRadius: '8px',
  },
  toggleButton: {
    padding: '0.7rem 0.85rem',
    border: 0,
    borderRadius: '6px',
    background: 'transparent',
    color: '#0099FF',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
  },
  activeToggleButton: {
    background: '#ffffff',
    color: '#0077BE',
    boxShadow: '0 1px 4px rgba(0, 119, 190, 0.2)',
  },
  message: {
    margin: '0 0 1rem',
    padding: '0.75rem',
    background: '#E0F7FF',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    color: '#0077BE',
    fontSize: '0.95rem',
  },
  form: {
    display: 'grid',
    gap: '0.85rem',
  },
  nameFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.85rem',
  },
  label: {
    display: 'grid',
    gap: '0.4rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#0C3A66',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.75rem',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    fontSize: '1rem',
    backgroundColor: '#F0F9FF',
  },
  button: {
    width: '100%',
    padding: '0.8rem 1rem',
    border: 0,
    borderRadius: '6px',
    background: '#0077BE',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 700,
    transition: 'background 0.2s',
  },
};
