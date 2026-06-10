import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../../types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  want:    { bg: '#FFF3E0', color: '#E65100' },
  reading: { bg: '#E0F7FF', color: '#0077BE' },
  done:    { bg: '#C8E6C9', color: '#2E7D32' },
};

type MaterialFile = {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
};

type Highlight = {
  id: string;
  text: string;
  note: string;
  position: number;
  timestamp: number;
};

export default function MaterialDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState<ReadingItem | null>(null);
  const [files, setFiles] = useState<MaterialFile[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from('reading_items')
        .select('*')
        .eq('id', id)
        .single();
      if (error) console.error(error);
      else setItem(data as ReadingItem);

      const { data: fileData } = await supabase
        .from('material_files')
        .select('*')
        .eq('material_id', id)
        .order('file_name');
      setFiles((fileData ?? []) as MaterialFile[]);
    };
    fetch();
  }, [id]);

  const openFile = async (file: MaterialFile) => {
    router.push(`/read/${id}/${file.id}`);
  };

  const markAsComplete = async () => {
    const { error } = await supabase
      .from('reading_items')
      .update({ status: 'done' })
      .eq('id', id);
    if (error) alert(error.message);
    else setItem((prev) => prev ? { ...prev, status: 'done' } : prev);
  };

  const deleteMaterial = async () => {
    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }
    const { error } = await supabase
      .from('reading_items')
      .delete()
      .eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      router.push('/reading-list');
    }
  };

  const archiveMaterial = async () => {
    if (!confirm('Are you sure you want to unwant this material?')) {
      return;
    }
    const { error } = await supabase
      .from('reading_items')
      .delete()
      .eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      router.push('/reading-list');
    }
  };

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from('reading_items')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) alert(error.message);
    else setItem((prev) => prev ? { ...prev, status: newStatus as ReadingStatus } : prev);
  };

  if (!item) return <p style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>Loading…</p>;

  const badge = STATUS_COLORS[item.status] ?? { bg: '#f4f4f4', color: '#555' };

  // Group files by folder prefix
  const grouped = files.reduce<Record<string, MaterialFile[]>>((acc, f) => {
    const parts = f.file_name.split('/');
    const folder = parts.length > 1 ? parts[0] : '—';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(f);
    return acc;
  }, {});

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  return (
    <main style={s.page}>
      <button style={s.backBtn} onClick={() => router.push('/reading-list')}>
        ← Back to reading list
      </button>

      <div style={s.container}>
        {/* Material Info */}
        <div style={s.infoCard}>
          <div style={s.cardHeader}>
            <div>
              <p style={s.eyebrow}>Material</p>
              <h1 style={s.title}>{item?.title}</h1>
            </div>
            <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>
              {item ? readingStatusLabels[item.status as ReadingStatus] : ''}
            </span>
          </div>

          {item?.type && <span style={s.typePill}>{item.type}</span>}

          <hr style={s.divider} />

          <div style={s.actions}>
            <button
              style={item?.status === 'reading' ? s.btnActiveReading : s.btnPrimary}
              disabled={item?.status === 'reading'}
              onClick={() => item && updateStatus('reading')}
            >
              {item?.status === 'reading' ? '📖 In reading list' : '+ Add to reading list'}
            </button>
            <button
              style={item?.status === 'want' ? s.btnActiveWant : s.btnSecondary}
              disabled={item?.status === 'want'}
              onClick={() => item && updateStatus('want')}
            >
              {item?.status === 'want' ? '🔖 Wanted' : '🔖 Want'}
            </button>
          </div>

          <hr style={s.divider} />

          <div style={s.actions}>
            <button style={s.btnArchive} onClick={archiveMaterial}>
              📋 Unwant
            </button>
            <button style={s.btnDelete} onClick={deleteMaterial}>
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* File List */}
        <div style={s.filesContainer}>
          <h2 style={s.filesTitle}>Select a file to read</h2>
          
          {files.length > 0 ? (
            <div style={s.filesList}>
              {Object.entries(grouped).map(([folder, folderFiles]) => (
                <div key={folder} style={s.folderGroup}>
                  {folder !== '—' && <p style={s.folderLabel}>📁 {folder}</p>}
                  <div style={s.filesGrid}>
                    {folderFiles.map((f) => (
                      <button
                        key={f.id}
                        style={s.fileCard}
                        onClick={() => openFile(f)}
                      >
                        <span style={s.fileCardIcon}>📄</span>
                        <span style={s.fileCardName}>
                          {folder !== '—' ? f.file_name.split('/').pop() : f.file_name}
                        </span>
                        <span style={s.fileCardSize}>{formatSize(f.file_size)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={s.emptyMessage}>No files available for this material.</p>
          )}
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
  container: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  infoCard: {
    background: '#fff',
    border: '1px solid #B3E5FC',
    borderRadius: '10px',
    padding: '1.5rem',
    height: 'fit-content',
    position: 'sticky' as const,
    top: '2rem',
    boxShadow: '0 2px 8px rgba(0, 119, 190, 0.08)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
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
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 700,
    lineHeight: 1.25,
    color: '#0C3A66',
    fontFamily: "'Georgia', serif",
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    textTransform: 'capitalize' as const,
  },
  typePill: {
    display: 'inline-block',
    fontSize: '12px',
    padding: '2px 10px',
    borderRadius: '4px',
    background: '#E0F7FF',
    color: '#0077BE',
    border: '1px solid #B3E5FC',
    textTransform: 'capitalize' as const,
    fontWeight: 500,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #B3E5FC',
    margin: '1.25rem 0',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  btnPrimary: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: '6px',
    background: '#0077BE',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'background 0.2s',
  },
  btnSecondary: {
    padding: '8px 14px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    background: '#F0F9FF',
    color: '#0077BE',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  },
  btnActiveReading: {
    padding: '8px 14px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    background: '#E0F7FF',
    color: '#0077BE',
    cursor: 'default',
    fontSize: '12px',
    fontWeight: 600,
  },
  btnActiveWant: {
    padding: '8px 14px',
    border: '1px solid #FFE0B2',
    borderRadius: '6px',
    background: '#FFF3E0',
    color: '#E65100',
    cursor: 'default',
    fontSize: '12px',
    fontWeight: 600,
  },
  btnArchive: {
    padding: '8px 14px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    background: '#F0F9FF',
    color: '#0077BE',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  },
  btnDelete: {
    padding: '8px 14px',
    border: '1px solid #FF6B6B',
    borderRadius: '6px',
    background: '#fff',
    color: '#FF6B6B',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  // Files section
  filesContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  filesTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0C3A66',
    fontFamily: "'Georgia', serif",
  },
  filesList: {
    display: 'grid',
    gap: '24px',
  },
  folderGroup: {
    display: 'grid',
    gap: '12px',
  },
  folderLabel: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 700,
    color: '#0077BE',
  },
  filesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  fileCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: '#fff',
    border: '2px solid #B3E5FC',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '140px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0, 119, 190, 0.05)',
  },
  fileCardIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  fileCardName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0C3A66',
    marginBottom: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    width: '100%',
  },
  fileCardSize: {
    fontSize: '11px',
    color: '#0099FF',
  },
  emptyMessage: {
    padding: '2rem',
    textAlign: 'center' as const,
    color: '#0099FF',
    fontSize: '14px',
    background: '#fff',
    border: '1px dashed #B3E5FC',
    borderRadius: '8px',
    margin: 0,
  },
};