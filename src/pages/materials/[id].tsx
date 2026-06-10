import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../../types';

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
  want:    { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  reading: { bg: '#E6F1FB', color: '#0C447C', border: '#B5D4F4' },
  done:    { bg: '#EAF3DE', color: '#27500A', border: '#C0DD97' },
};

type MaterialFile = {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
};

export default function MaterialDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState<ReadingItem | null>(null);
  const [files, setFiles] = useState<MaterialFile[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
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
    load();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from('reading_items')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) alert(error.message);
    else setItem((prev) => prev ? { ...prev, status: newStatus as ReadingStatus } : prev);
  };

  const deleteMaterial = async () => {
    if (!confirm('Delete this material? This cannot be undone.')) return;
    const { error } = await supabase.from('reading_items').delete().eq('id', id);
    if (error) alert(error.message);
    else router.push('/dashboard');
  };

  const unwantMaterial = async () => {
    if (!confirm('Remove this from your want list?')) return;
    const { error } = await supabase.from('reading_items').delete().eq('id', id);
    if (error) alert(error.message);
    else router.push('/dashboard');
  };

  if (!item) return (
    <main style={s.page}>
      <p style={{ color: '#85B7EB', fontSize: '13px', padding: '2rem' }}>Loading…</p>
    </main>
  );

  const cfg = STATUS_CONFIG[item.status] ?? { bg: '#F1EFE8', color: '#444441', border: '#D3D1C7' };

  const grouped = files.reduce<Record<string, MaterialFile[]>>((acc, f) => {
    const parts = f.file_name.split('/');
    const folder = parts.length > 1 ? parts[0] : '—';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(f);
    return acc;
  }, {});

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  const fileExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

  const extColor: Record<string, { bg: string; color: string }> = {
    pdf:  { bg: '#FCEBEB', color: '#791F1F' },
    md:   { bg: '#E6F1FB', color: '#0C447C' },
    txt:  { bg: '#F1EFE8', color: '#444441' },
    docx: { bg: '#EEEDFE', color: '#3C3489' },
  };

  return (
    <main style={s.page}>
      {/* Breadcrumb */}
      <nav style={s.breadcrumb}>
        <button style={s.crumbBtn} onClick={() => router.push('/dashboard')}>
          Dashboard
        </button>
        <span style={s.crumbSep}>/</span>
        <button style={s.crumbBtn} onClick={() => router.push('/reading-list')}>
          Reading list
        </button>
        <span style={s.crumbSep}>/</span>
        <span style={s.crumbCurrent}>{item.title}</span>
      </nav>

      <div style={s.layout}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sidebarCard}>
            {/* Status + type */}
            <div style={s.cardTop}>
              <span style={{
                ...s.pill,
                background: cfg.bg,
                color: cfg.color,
                border: `0.5px solid ${cfg.border}`,
              }}>
                {readingStatusLabels[item.status as ReadingStatus] ?? item.status}
              </span>
              <span style={s.typePill}>{item.type}</span>
            </div>

            <h1 style={s.title}>{item.title}</h1>

            {item.notes && (
              <div style={s.notesBlock}>
                <p style={s.notesLabel}>Notes</p>
                <p style={s.notesText}>{item.notes}</p>
              </div>
            )}

            <div style={s.divider} />

            {/* Move to */}
            <p style={s.actionLabel}>Move to</p>
            <div style={s.actionRow}>
              {(['reading', 'want', 'done'] as const).map((st) => {
                const scfg = STATUS_CONFIG[st];
                const isActive = item.status === st;
                const labels: Record<string, string> = {
                  reading: 'Reading list',
                  want: 'Want',
                  done: 'Done',
                };
                return (
                  <button
                    key={st}
                    disabled={isActive}
                    style={{
                      ...s.statusBtn,
                      background: isActive ? scfg.bg : 'transparent',
                      color: isActive ? scfg.color : '#85B7EB',
                      border: isActive ? `0.5px solid ${scfg.border}` : '0.5px solid rgba(0,0,0,0.1)',
                      cursor: isActive ? 'default' : 'pointer',
                      fontWeight: isActive ? 600 : 400,
                    }}
                    onClick={() => !isActive && updateStatus(st)}
                  >
                    {labels[st]}
                  </button>
                );
              })}
            </div>

            <div style={s.divider} />

            {/* Danger zone */}
            <div style={s.dangerRow}>
              <button style={s.btnGhost} onClick={unwantMaterial}>Unwant</button>
              <button style={s.btnDanger} onClick={deleteMaterial}>Delete</button>
            </div>
          </div>
        </aside>

        {/* Files */}
        <div style={s.main}>
          <div style={s.mainHeader}>
            <p style={s.eyebrow}>Files</p>
            <h2 style={s.mainTitle}>
              {files.length === 0
                ? 'No files yet'
                : `${files.length} file${files.length !== 1 ? 's' : ''}`}
            </h2>
          </div>

          {files.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyTitle}>No files attached</p>
              <p style={s.emptyText}>Upload files when adding a new material.</p>
              <button style={s.navAdd} onClick={() => router.push('/add-material')}>
                + Add new material
              </button>
            </div>
          ) : (
            <div style={s.fileGroups}>
              {Object.entries(grouped).map(([folder, folderFiles]) => (
                <div key={folder} style={s.folderGroup}>
                  {folder !== '—' && (
                    <div style={s.folderHeader}>
                      <i className="ti ti-folder" style={{ fontSize: '15px', color: '#378ADD' }} aria-hidden="true" />
                      <span style={s.folderName}>{folder}</span>
                      <span style={s.folderCount}>
                        {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div style={s.filesGrid}>
                    {folderFiles.map((f) => {
                      const displayName = folder !== '—'
                        ? f.file_name.split('/').pop()!
                        : f.file_name;
                      const ext = fileExt(f.file_name);
                      const extUpper = ext.toUpperCase();
                      const extCfg = extColor[ext] ?? { bg: '#F1EFE8', color: '#5F5E5A' };

                      return (
                        <button
                          key={f.id}
                          style={s.fileCard}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#85B7EB';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.08)';
                          }}
                          onClick={() => router.push(`/read/${id}/${f.id}`)}
                        >
                          <div style={s.fileCardTop}>
                            <span style={{
                              ...s.extBadge,
                              background: extCfg.bg,
                              color: extCfg.color,
                            }}>
                              {extUpper || 'FILE'}
                            </span>
                            <span style={s.fileSize}>{formatSize(f.file_size)}</span>
                          </div>
                          <p style={s.fileName}>{displayName}</p>
                          <div style={s.fileFooter}>
                            <span style={s.openLabel}>Open to read →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
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
  // Breadcrumb
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: '6px',
    marginBottom: '1.5rem',
  },
  crumbBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#378ADD', fontSize: '12px', padding: '2px 4px',
    fontFamily: 'inherit',
  },
  crumbSep: { fontSize: '12px', color: 'rgba(0,0,0,0.2)' },
  crumbCurrent: {
    fontSize: '12px', color: '#85B7EB',
    maxWidth: '200px', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  // Layout
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '16px',
    alignItems: 'flex-start',
  },
  // Sidebar
  sidebar: { position: 'sticky' as const, top: '1.5rem' },
  sidebarCard: {
    background: '#fff',
    border: '0.5px solid rgba(0,0,0,0.08)',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  cardTop: {
    display: 'flex', alignItems: 'center',
    gap: '6px', marginBottom: '10px', flexWrap: 'wrap' as const,
  },
  pill: {
    fontSize: '10px', fontWeight: 600,
    padding: '3px 9px', borderRadius: '20px',
    textTransform: 'capitalize' as const,
  },
  typePill: {
    fontSize: '10px', padding: '3px 9px', borderRadius: '20px',
    background: '#E6F1FB', color: '#0C447C',
    border: '0.5px solid #B5D4F4',
    textTransform: 'capitalize' as const,
  },
  title: {
    margin: '0 0 12px',
    fontSize: '1.05rem', fontWeight: 600,
    lineHeight: 1.4, color: '#042C53',
    letterSpacing: '-0.01em',
  },
  notesBlock: { marginBottom: '12px' },
  notesLabel: {
    margin: '0 0 5px', fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#85B7EB',
  },
  notesText: {
    margin: 0, fontSize: '12px', color: '#378ADD',
    lineHeight: 1.6, background: '#EBF4FD',
    borderRadius: '8px', padding: '8px 10px',
  },
  divider: {
    borderTop: '0.5px solid rgba(55,138,221,0.15)',
    margin: '12px 0',
  },
  actionLabel: {
    margin: '0 0 8px', fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#85B7EB',
  },
  actionRow: { display: 'flex', gap: '5px', flexWrap: 'wrap' as const },
  statusBtn: {
    padding: '6px 11px',
    borderRadius: '20px',
    fontSize: '11px',
    fontFamily: 'inherit',
  },
  dangerRow: { display: 'flex', gap: '6px' },
  btnGhost: {
    flex: 1, padding: '7px 10px',
    border: '0.5px solid rgba(0,0,0,0.1)',
    borderRadius: '8px', background: 'transparent',
    color: '#85B7EB', cursor: 'pointer',
    fontSize: '12px', fontFamily: 'inherit',
  },
  btnDanger: {
    flex: 1, padding: '7px 10px',
    border: '0.5px solid #F09595',
    borderRadius: '8px', background: '#fff',
    color: '#A32D2D', cursor: 'pointer',
    fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
  },
  // Main
  main: { minWidth: 0 },
  mainHeader: { marginBottom: '1rem' },
  eyebrow: {
    margin: '0 0 3px', fontSize: '10px',
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: '#85B7EB', fontWeight: 600,
  },
  mainTitle: {
    margin: 0, fontSize: '1.3rem', fontWeight: 600,
    color: '#042C53', letterSpacing: '-0.02em',
  },
  // Empty
  empty: {
    padding: '3rem 1rem', textAlign: 'center' as const,
    border: '0.5px dashed #B5D4F4',
    borderRadius: '12px', background: '#fff',
  },
  emptyTitle: { fontSize: '14px', fontWeight: 600, color: '#042C53', marginBottom: '6px' },
  emptyText: { color: '#85B7EB', fontSize: '12px', marginBottom: '1rem' },
  navAdd: {
    padding: '7px 16px', borderRadius: '20px',
    border: 'none', background: '#185FA5',
    color: '#fff', fontSize: '12px',
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  // File groups
  fileGroups: { display: 'grid', gap: '20px' },
  folderGroup: { display: 'grid', gap: '8px' },
  folderHeader: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '4px 0',
  },
  folderName: {
    fontSize: '12px', fontWeight: 600, color: '#042C53',
  },
  folderCount: {
    fontSize: '10px', color: '#85B7EB',
    background: '#E6F1FB', padding: '1px 8px',
    borderRadius: '20px', border: '0.5px solid #B5D4F4',
  },
  filesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '8px',
  },
  // File card — vertical tile style
  fileCard: {
    background: '#fff',
    border: '0.5px solid rgba(0,0,0,0.08)',
    borderRadius: '10px',
    padding: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontFamily: 'inherit',
  },
  fileCardTop: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
  },
  extBadge: {
    fontSize: '10px', fontWeight: 700,
    padding: '3px 7px', borderRadius: '6px',
    letterSpacing: '0.05em',
  },
  fileSize: { fontSize: '10px', color: '#85B7EB' },
  fileName: {
    margin: 0, fontSize: '12px', fontWeight: 500,
    color: '#042C53', lineHeight: 1.4,
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
  },
  fileFooter: { marginTop: 'auto' },
  openLabel: { fontSize: '11px', color: '#378ADD', fontWeight: 500 },
};