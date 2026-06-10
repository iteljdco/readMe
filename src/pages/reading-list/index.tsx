import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../../types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  want:    { bg: '#FFF3E0', color: '#E65100' },
  reading: { bg: '#E0F7FF', color: '#0077BE' },
  done:    { bg: '#C8E6C9', color: '#2E7D32' },
};

export default function ReadingListPage() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus>('reading');
  const router = useRouter();

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('reading_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setItems((data || []) as ReadingItem[]);
  };

  useEffect(() => { fetchItems(); }, []);

  const markDone = async (id: string) => {
    const { error } = await supabase
      .from('reading_items')
      .update({ status: 'done' })
      .eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      fetchItems(); // refresh list after update
    }
  };

  const filtered = statusFilter ? items.filter((item) => item.status === statusFilter) : items;

  return (
    <main style={s.page}>
      <button style={s.backBtn} onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      {/* Header */}
      <header style={s.header}>
        <h1 style={s.title}>My Reading List</h1>
        <button style={s.btnPrimary} onClick={() => router.push('/add-material')}>
          + Add material
        </button>
      </header>

      {/* Tabs */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(statusFilter === 'reading' ? s.tabActive : {}) }}
          onClick={() => setStatusFilter('reading')}
        >
          Currently reading
          <span style={s.tabCount}>
            {items.filter((i) => i.status === 'reading').length}
          </span>
        </button>
        <button
          style={{ ...s.tab, ...(statusFilter === 'done' ? s.tabActive : {}) }}
          onClick={() => setStatusFilter('done')}
        >
          Done
          <span style={s.tabCount}>
            {items.filter((i) => i.status === 'done').length}
          </span>
        </button>
        <button
          style={{ ...s.tab, ...(statusFilter === 'want' ? s.tabActive : {}) }}
          onClick={() => setStatusFilter('want')}
        >
          Want
          <span style={s.tabCount}>
            {items.filter((i) => i.status === 'want').length}
          </span>
        </button>
        <button
          style={{ ...s.tab, ...(statusFilter === null ? s.tabActive : {}) }}
          onClick={() => setStatusFilter(null as any)}
        >
          All
          <span style={s.tabCount}>{items.length}</span>
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyText}>
            {statusFilter === 'reading'
              ? 'Nothing in progress — add a material to get started.'
              : statusFilter === 'done'
              ? 'No finished materials yet. Keep reading!'
              : statusFilter === 'want'
              ? 'No materials marked as want yet.'
              : 'No materials yet.'}
          </p>
          <button style={s.btnPrimary} onClick={() => router.push('/add-material')}>
            Add material
          </button>
        </div>
      ) : (
        <div style={s.list}>
          {filtered.map((item) => {
            const badge = STATUS_COLORS[item.status];
            return (
              <div key={item.id} style={s.row}>
                <div
                  style={s.rowMain}
                  onClick={() => router.push(`/materials/${item.id}`)}
                >
                  <div style={s.rowTop}>
                    <h2 style={s.itemTitle}>{item.title}</h2>
                    <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>
                      {readingStatusLabels[item.status as ReadingStatus]}
                    </span>
                  </div>
                  <div style={s.rowMeta}>
                    <span style={s.metaPill}>{item.type}</span>
                    {item.notes && <span style={s.notePreview}>{item.notes}</span>}
                  </div>
                </div>
                {item.status === 'reading' && (
                  <button style={s.doneBtn} onClick={() => markDone(item.id)}>
                    Mark done
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F7FF 100%)',
    fontFamily: "'Arial', sans-serif",
    maxWidth: '800px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#0077BE',
    fontSize: '13px',
    padding: '0 0 1.25rem',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #B3E5FC',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
    color: '#0C3A66',
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
    transition: 'background 0.2s',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #B3E5FC',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: '#0099FF',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '-1px',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#0077BE',
    borderBottomColor: '#0077BE',
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    background: '#E0F7FF',
    color: '#0077BE',
    borderRadius: '10px',
    padding: '1px 7px',
    minWidth: '20px',
  },
  empty: {
    padding: '2rem',
    textAlign: 'center' as const,
    background: '#fff',
    border: '1px dashed #B3E5FC',
    borderRadius: '8px',
  },
  emptyText: {
    color: '#0099FF',
    marginBottom: '1rem',
    fontSize: '14px',
  },
  list: { display: 'grid', gap: '8px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#fff',
    border: '1px solid #B3E5FC',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    boxShadow: '0 1px 3px rgba(0, 119, 190, 0.05)',
  },
  rowMain: {
    flex: 1,
    cursor: 'pointer',
    display: 'grid',
    gap: '6px',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  itemTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#0C3A66',
    fontFamily: "'Georgia', serif",
    lineHeight: 1.3,
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    textTransform: 'capitalize' as const,
    flexShrink: 0,
  },
  rowMeta: { display: 'flex', alignItems: 'center', gap: '8px' },
  metaPill: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    background: '#E0F7FF',
    color: '#0077BE',
    border: '1px solid #B3E5FC',
    textTransform: 'capitalize' as const,
    fontWeight: 500,
  },
  notePreview: {
    fontSize: '12px',
    color: '#0099FF',
  },
  doneBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    background: '#2E7D32',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'background 0.2s',
    whiteSpace: 'nowrap' as const,
  },
}