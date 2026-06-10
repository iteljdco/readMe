import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../types';

const STATUS_CONFIG: Record<string, { pill: { bg: string; color: string }; bar: string }> = {
  want:    { pill: { bg: '#FAEEDA', color: '#633806' }, bar: '#EF9F27' },
  reading: { pill: { bg: '#E6F1FB', color: '#0C447C' }, bar: '#378ADD' },
  done:    { pill: { bg: '#EAF3DE', color: '#27500A' }, bar: '#639922' },
};

export default function Dashboard() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [firstName, setFirstName] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | null>(null);
  const router = useRouter();

  const totalItems = items.length;

  const report = Object.entries(readingStatusLabels).map(([status, label]) => {
    const count = items.filter((item) => item.status === status).length;
    const percentage = totalItems === 0 ? 0 : Math.round((count / totalItems) * 100);
    return { status: status as ReadingStatus, label, count, percentage };
  });

  const filteredItems = statusFilter
    ? items.filter((item) => item.status === statusFilter)
    : items;

  const listLabel = statusFilter
    ? readingStatusLabels[statusFilter]
    : 'All materials';

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
        <div style={s.logoRow}>
          <div style={s.logoDot}>
            <span style={s.logoIcon}>📚</span>
          </div>
          <div>
            <p style={s.logoName}>Biblios</p>
            <p style={s.logoSub}>Your reading tracker</p>
          </div>
        </div>
        <nav style={s.nav}>
          <button style={s.navLink} onClick={() => setStatusFilter(null)}>Dashboard</button>
          <button style={s.navLink} onClick={() => router.push('/reading-list')}>Reading list</button>
          <button style={s.navAdd} onClick={() => router.push('/add-material')}>+ Add material</button>
          <button style={s.navSignOut} onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>
            Sign out
          </button>
        </nav>
      </header>

      {/* Greeting */}
      <div style={s.greeting}>
        <p style={s.greetingSub}>Your library</p>
        <h1 style={s.greetingTitle}>
          {firstName ? `${firstName}'s library` : 'My library'}
        </h1>
      </div>

      {/* Stat cards */}
      <section style={s.statsGrid} aria-label="Reading progress">
        <button
          style={{ ...s.stat, ...(statusFilter === null ? s.statActive : {}) }}
          onClick={() => setStatusFilter(null)}
        >
          <p style={{ ...s.statNum, ...(statusFilter === null ? s.statNumActive : {}) }}>
            {totalItems}
          </p>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, width: '100%', background: '#378ADD' }} />
          </div>
          <p style={{ ...s.statLabel, ...(statusFilter === null ? s.statLabelActive : {}) }}>
            All materials
          </p>
        </button>

        {report.map((r) => {
          const cfg = STATUS_CONFIG[r.status];
          const isActive = statusFilter === r.status;
          return (
            <button
              key={r.status}
              style={{ ...s.stat, ...(isActive ? s.statActive : {}) }}
              onClick={() => setStatusFilter(r.status)}
            >
              <p style={{ ...s.statNum, ...(isActive ? s.statNumActive : {}) }}>
                {r.count}
              </p>
              <div style={s.barTrack}>
                <div style={{ ...s.barFill, width: `${r.percentage}%`, background: cfg.bar }} />
              </div>
              <p style={{ ...s.statLabel, ...(isActive ? s.statLabelActive : {}) }}>
                {r.label}
              </p>
            </button>
          );
        })}
      </section>

      {/* Materials */}
      <section>
        <div style={s.sectionRow}>
          <p style={s.sectionTitle}>{listLabel}</p>
          <span style={s.sectionCount}>
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>Nothing here yet.</p>
            <button style={s.navAdd} onClick={() => router.push('/add-material')}>
              + Add your first material
            </button>
          </div>
        ) : (
          <div style={s.grid}>
            {filteredItems.map((item) => (
              <MaterialCard
                key={item.id}
                item={item}
                onClick={() => router.push(`/materials/${item.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MaterialCard({ item, onClick }: { item: ReadingItem; onClick: () => void }) {
  const cfg = STATUS_CONFIG[item.status] ?? { pill: { bg: '#F1EFE8', color: '#444441' }, bar: '#888780' };
  return (
    <div
      style={s.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = '#85B7EB'}
      onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.08)'}
    >
      <div style={s.cardTop}>
        <span style={{ ...s.pill, background: cfg.pill.bg, color: cfg.pill.color }}>
          {readingStatusLabels[item.status as ReadingStatus] ?? item.status}
        </span>
        <span style={s.typeDot} />
      </div>
      <p style={s.cardTitle}>{item.title}</p>
      <div style={s.cardFooter}>
        <span style={s.cardType}>{item.type}</span>
        <span style={s.cardOpen}>Open →</span>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '1.5rem 2rem',
    background: '#F4F7FC',
    fontFamily: "'Inter', 'Arial', sans-serif",
    maxWidth: '1100px',
    margin: '0 auto',
  },
  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.75rem',
    paddingBottom: '1.25rem',
    borderBottom: '0.5px solid rgba(55, 138, 221, 0.2)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoDot: {
    width: '32px', height: '32px',
    borderRadius: '8px',
    background: '#185FA5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: '16px' },
  logoName: { margin: 0, fontSize: '14px', fontWeight: 600, color: '#042C53' },
  logoSub: { margin: 0, fontSize: '11px', color: '#85B7EB' },
  nav: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const },
  navLink: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '0.5px solid rgba(0,0,0,0.12)',
    background: '#fff',
    color: '#378ADD',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  navAdd: {
    padding: '7px 16px',
    borderRadius: '20px',
    border: 'none',
    background: '#185FA5',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  navSignOut: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: 'none',
    background: 'transparent',
    color: '#85B7EB',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // Greeting
  greeting: { marginBottom: '1.5rem' },
  greetingSub: { margin: '0 0 3px', fontSize: '12px', color: '#85B7EB', letterSpacing: '0.05em' },
  greetingTitle: { margin: 0, fontSize: '1.6rem', fontWeight: 600, color: '#042C53', letterSpacing: '-0.02em' },
  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '8px',
    marginBottom: '1.75rem',
  },
  stat: {
    background: '#fff',
    border: '0.5px solid rgba(0,0,0,0.08)',
    borderRadius: '10px',
    padding: '14px 16px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  statActive: {
    borderColor: '#378ADD',
    background: '#EBF4FD',
  },
  statNum: {
    margin: '0 0 8px',
    fontSize: '28px',
    fontWeight: 600,
    color: '#042C53',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  statNumActive: { color: '#0C447C' },
  barTrack: {
    height: '3px',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: '2px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  barFill: { height: '3px', borderRadius: '2px', minWidth: '4px' },
  statLabel: { margin: 0, fontSize: '11px', color: '#85B7EB', fontWeight: 500 },
  statLabelActive: { color: '#378ADD' },
  // Section
  sectionRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: '10px',
  },
  sectionTitle: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#378ADD', letterSpacing: '0.04em' },
  sectionCount: {
    fontSize: '11px', color: '#85B7EB',
    background: '#E6F1FB',
    padding: '2px 10px', borderRadius: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: '8px',
  },
  empty: {
    padding: '3rem 1rem', textAlign: 'center' as const,
    border: '0.5px dashed #B5D4F4',
    borderRadius: '10px', background: '#fff',
  },
  emptyText: { color: '#85B7EB', marginBottom: '1rem', fontSize: '13px' },
  // Card
  card: {
    background: '#fff',
    border: '0.5px solid rgba(0,0,0,0.08)',
    borderRadius: '10px',
    padding: '14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    transition: 'border-color 0.15s',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    fontSize: '10px', fontWeight: 600,
    padding: '3px 9px', borderRadius: '20px',
    textTransform: 'capitalize' as const,
  },
  typeDot: {
    width: '5px', height: '5px',
    borderRadius: '50%', background: 'rgba(0,0,0,0.12)',
  },
  cardTitle: {
    margin: 0, fontSize: '13px', fontWeight: 500,
    color: '#042C53', lineHeight: 1.45,
    flex: 1,
  },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardType: { fontSize: '11px', color: '#85B7EB', textTransform: 'capitalize' as const },
  cardOpen: { fontSize: '11px', color: '#378ADD', fontWeight: 500 },
};