import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AddItemForm from '../components/AddItemForm';
import { supabase } from '../lib/supabaseClient';

export default function AddMaterial() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
    };
    checkSession();
  }, [router]);

  return (
    <main style={s.page}>
      <div style={s.container}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>
          ← Back to dashboard
        </button>
        <div style={s.panel}>
          <p style={s.eyebrow}>New entry</p>
          <h1 style={s.title}>Add material</h1>
          <p style={s.subtitle}>Add a book, article, module, or any material you want to track.</p>
          <hr style={s.divider} />
          <AddItemForm
            onAdd={() => router.push('/dashboard')}
            onCancel={() => router.push('/dashboard')}
          />
        </div>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F7FF 100%)',
    fontFamily: "'Arial', sans-serif",
  },
  container: {
    maxWidth: '580px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#0077BE',
    fontSize: '13px',
    padding: '0 0 1.25rem',
    fontFamily: "'Arial', sans-serif",
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  panel: {
    background: '#fff',
    border: '1px solid #B3E5FC',
    borderRadius: '10px',
    padding: '1.75rem',
    boxShadow: '0 2px 8px rgba(0, 119, 190, 0.08)',
  },
  eyebrow: {
    margin: '0 0 4px',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#0077BE',
    fontWeight: 600,
  },
  title: {
    margin: '0 0 6px',
    fontSize: '1.5rem',
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
    color: '#0C3A66',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#0099FF',
    lineHeight: 1.5,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #B3E5FC',
    margin: '1.25rem 0',
  },
};