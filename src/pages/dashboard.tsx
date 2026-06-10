import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import ReadingList from '../components/ReadingList';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  want:    { bg: '#FFF3E0', color: '#E65100' },
  reading: { bg: '#E0F7FF', color: '#0077BE' },
  done:    { bg: '#C8E6C9', color: '#2E7D32' },
};

export default function Dashboard() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [firstName, setFirstName] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | null>(null);
  const router = useRouter();

  const totalItems = items.length;
  const listTitle = statusFilter
    ? `${readingStatusLabels[statusFilter]} materials`
    : 'All materials';

  const report = Object.entries(readingStatusLabels).map(([status, label]) => {
    const count = items.filter((item) => item.status === status).length;
    const percentage = totalItems === 0 ? 0 : Math.round((count / totalItems) * 100);
    return { status: status as ReadingStatus, label, count, percentage };
  });

  const filteredItems = statusFilter
    ? items.filter((item) => item.status === statusFilter)
    : items;

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const firstNameValue = session.user.user_metadata?.first_name;
      if (typeof firstNameValue === 'string') setFirstName(firstNameValue);
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('reading_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error(error);
      else setItems((data || []) as ReadingItem[]);
    };
    fetchItems();
  }, []);

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <p style={s.eyebrow}>Reading Tracker</p>
          <h1 style={s.title}>
            {firstName ? `${firstName}'s Library` : 'My Library'}
          </h1>
        </div>
        <nav style={s.nav}>
          <button style={s.btnSecondary} onClick={() => setStatusFilter(null)}>Dashboard</button>
          <button
            type="button"
            style={s.btnSecondary}
            onClick={() => router.push('/reading-list')}
          >
            My Reading List
          </button>
          <button style={s.btnPrimary} onClick={() => router.push('/add-material')}>+ Add material</button>
          <button style={s.btnGhost} onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>Sign out</button>
        </nav>
      </header>

      {/* Stat cards */}
      <section style={s.statGrid} aria-label="Reading progress">
        <button
          style={{ ...s.statCard, ...(statusFilter === null ? s.statCardActive : {}) }}
          onClick={() => setStatusFilter(null)}
        >
          <span style={s.statLabel}>Total</span>
          <strong style={s.statValue}>{totalItems}</strong>
          <span style={s.statMeta}>All materials</span>
        </button>
        {report.map((r) => (
          <button
            key={r.status}
            style={{ ...s.statCard, ...(statusFilter === r.status ? s.statCardActive : {}) }}
            onClick={() => setStatusFilter(r.status)}
          >
            <span style={s.statLabel}>{r.label}</span>
            <strong style={s.statValue}>{r.count}</strong>
            <span style={s.statMeta}>{r.percentage}% of list</span>
          </button>
        ))}
      </section>

      {/* Materials grid */}
      <section>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>{listTitle}</h2>
          <span style={s.sectionCount}>{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
        </div>
        {filteredItems.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>Nothing here yet.</p>
            <button style={s.btnPrimary} onClick={() => router.push('/add-material')}>Add your first material</button>
          </div>
        ) : (
          <div style={s.grid}>
            {filteredItems.map((item) => (
              <MaterialCard key={item.id} item={item} onClick={() => router.push(`/materials/${item.id}`)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MaterialCard({ item, onClick }: { item: ReadingItem; onClick: () => void }) {
  const badge = STATUS_COLORS[item.status] ?? { bg: '#f4f4f4', color: '#555' };
  return (
    <div style={s.card} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div style={s.cardTop}>
        <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>
          {readingStatusLabels[item.status as ReadingStatus] ?? item.status}
        </span>
        <span style={s.cardType}>{item.type}</span>
      </div>
      <h3 style={s.cardTitle}>{item.title}</h3>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F7FF 100%)',
    color: '#0C3A66',
    fontFamily: "'Georgia', serif",
    maxWidth: '1100px',
    margin: '0 auto',
  },
  // Header
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #B3E5FC',
    flexWrap: 'wrap',
  },
  eyebrow: {
    margin: '0 0 4px',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#0077BE',
    fontFamily: "'Arial', sans-serif",
    fontWeight: 600,
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  nav: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  btnPrimary: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    background: '#0077BE',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Arial', sans-serif",
    transition: 'background 0.2s',
  },
  btnSecondary: {
    padding: '8px 16px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    background: '#fff',
    color: '#0077BE',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Arial', sans-serif",
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  btnGhost: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: '#0077BE',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Arial', sans-serif",
    transition: 'color 0.2s',
  },
  // Stat cards
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '2rem',
  },
  statCard: {
    display: 'grid',
    textAlign: 'left' as const,
    gap: '2px',
    padding: '1rem 1.1rem',
    border: '1px solid #B3E5FC',
    borderLeft: '3px solid transparent',
    borderRadius: '8px',
    background: '#fff',
    color: '#0C3A66',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Arial', sans-serif",
    boxShadow: '0 1px 3px rgba(0, 119, 190, 0.05)',
  },
  statCardActive: {
    borderLeftColor: '#0077BE',
    background: '#E0F7FF',
    boxShadow: '0 2px 8px rgba(0, 119, 190, 0.15)',
  },
  statLabel: {
    color: '#0099FF',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  statValue: {
    fontSize: '2.2rem',
    lineHeight: 1.1,
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
  },
  statMeta: {
    color: '#aaa',
    fontSize: '12px',
  },
  // Section
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginBottom: '1rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    fontFamily: "'Arial', sans-serif",
    color: '#0C3A66',
  },
  sectionCount: {
    fontSize: '12px',
    color: '#0099FF',
    fontFamily: "'Arial', sans-serif",
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  empty: {
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    border: '1px dashed #B3E5FC',
    borderRadius: '8px',
    background: '#fff',
  },
  emptyText: {
    color: '#0099FF',
    marginBottom: '1rem',
    fontFamily: "'Arial', sans-serif",
  },
  // Material card
  card: {
    border: '1px solid #B3E5FC',
    borderRadius: '8px',
    background: '#fff',
    padding: '1rem 1.1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    boxShadow: '0 1px 3px rgba(0, 119, 190, 0.05)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: "'Arial', sans-serif",
    textTransform: 'capitalize' as const,
  },
  cardType: {
    fontSize: '11px',
    color: '#0099FF',
    fontFamily: "'Arial', sans-serif",
    textTransform: 'capitalize' as const,
    fontWeight: 500,
  },
  cardTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.3,
    fontFamily: "'Georgia', serif",
    color: '#0C3A66',
  },
  cardNotes: {
    margin: 0,
    fontSize: '12px',
    color: '#0077BE',
    lineHeight: 1.5,
    fontFamily: "'Arial', sans-serif",
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
};