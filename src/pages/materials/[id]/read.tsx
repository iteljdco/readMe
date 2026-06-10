import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

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

export default function ReadFile() {
  const router = useRouter();
  const { id, fileId } = router.query;
  const [file, setFile] = useState<MaterialFile | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (!id || !fileId) return;
    const fetch = async () => {
      const { data: fileData, error } = await supabase
        .from('material_files')
        .select('*')
        .eq('id', fileId)
        .eq('material_id', id)
        .single();
      if (error) console.error(error);
      else setFile(fileData as MaterialFile);
    };
    fetch();
  }, [id, fileId]);

  useEffect(() => {
    if (!file) return;
    const loadFile = async () => {
      setLoadingContent(true);
      const { data, error } = await supabase.storage
        .from('reading-materials')
        .download(file.file_path);

      if (error || !data) {
        setFileContent('Could not load file.');
        setLoadingContent(false);
        return;
      }

      const text = await data.text();
      setFileContent(text);
      setLoadingContent(false);
    };
    loadFile();
  }, [file]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setSelectedText(selection.toString());
      setShowNoteForm(true);
    }
  };

  const addHighlight = () => {
    if (selectedText.trim()) {
      const newHighlight: Highlight = {
        id: `${Date.now()}-${Math.random()}`,
        text: selectedText,
        note: noteText,
        position: fileContent?.indexOf(selectedText) ?? 0,
        timestamp: Date.now(),
      };
      setHighlights([...highlights, newHighlight]);
      setSelectedText('');
      setNoteText('');
      setShowNoteForm(false);
    }
  };

  const deleteHighlight = (highlightId: string) => {
    setHighlights(highlights.filter((h) => h.id !== highlightId));
  };

  const contentLength = fileContent?.length ?? 0;
  const highlightedLength = highlights.reduce((sum, h) => sum + h.text.length, 0);
  const progressPercentage = contentLength > 0 ? Math.round((highlightedLength / contentLength) * 100) : 0;

  if (!file) return <p style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>Loading…</p>;

  return (
    <main style={s.page}>
      <button style={s.backBtn} onClick={() => router.push(`/materials/${id}`)}>
        ← Back to material
      </button>

      <div style={s.container}>
        {/* Left: File info */}
        <div style={s.sidebar}>
          <div style={s.card}>
            <p style={s.eyebrow}>Reading</p>
            <h1 style={s.title}>{file.file_name.split('/').pop()}</h1>
            <p style={s.fileSize}>{(file.file_size / 1024).toFixed(1)} KB</p>
            <hr style={s.divider} />
            
            {highlights.length > 0 && (
              <>
                <div style={s.progressSection}>
                  <div style={s.progressHeader}>
                    <span style={s.progressLabel}>Progress</span>
                    <span style={s.progressPercent}>{progressPercentage}%</span>
                  </div>
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${progressPercentage}%` }}></div>
                  </div>
                  <p style={s.progressMeta}>{highlights.length} highlights</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: File content */}
        <div style={s.reader}>
          <div style={s.readerHeader}>
            <h2 style={s.readerTitle}>{file.file_name.split('/').pop()}</h2>
          </div>
          <hr style={s.divider} />
          <div style={s.readerContent}>
            {loadingContent ? (
              <p style={s.loadingText}>Loading…</p>
            ) : (
              <>
                <pre style={s.fileContent} onMouseUp={handleTextSelection}>
                  {fileContent}
                </pre>

                {showNoteForm && selectedText && (
                  <div style={s.noteForm}>
                    <p style={s.noteFormLabel}>Add a note to this highlight:</p>
                    <blockquote style={s.selectedQuote}>
                      "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
                    </blockquote>
                    <textarea
                      style={s.noteInput}
                      placeholder="Add your notes or insights..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <div style={s.noteFormActions}>
                      <button style={s.btnPrimary} onClick={addHighlight}>
                        ✓ Add highlight
                      </button>
                      <button
                        style={s.btnSecondary}
                        onClick={() => {
                          setShowNoteForm(false);
                          setSelectedText('');
                          setNoteText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Highlights */}
        {highlights.length > 0 && (
          <div style={s.highlightsPanel}>
            <div style={s.highlightsPanelHeader}>
              <h3 style={s.highlightsPanelTitle}>Highlights & Notes</h3>
            </div>
            <div style={s.highlightsList}>
              {highlights.map((h) => (
                <div key={h.id} style={s.highlightItem}>
                  <blockquote style={s.highlightText}>"{h.text}"</blockquote>
                  {h.note && <p style={s.highlightNote}>{h.note}</p>}
                  <button
                    style={s.deleteBtn}
                    onClick={() => deleteHighlight(h.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    background: '#F7F6F2',
    fontFamily: "'Arial', sans-serif",
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#aaa',
    fontSize: '13px',
    padding: '0 0 1.25rem',
  },
  container: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  sidebar: {
    flex: '0 0 280px',
    minWidth: '250px',
  },
  card: {
    background: '#fff',
    border: '1px solid #E0DDD5',
    borderRadius: '10px',
    padding: '1.5rem',
  },
  eyebrow: {
    margin: '0 0 4px',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#aaa',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '1.1rem',
    fontWeight: 700,
    lineHeight: 1.25,
    color: '#1A1A18',
    fontFamily: "'Georgia', serif",
    wordBreak: 'break-word' as const,
  },
  fileSize: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #E0DDD5',
    margin: '1.25rem 0',
  },
  progressSection: {
    padding: '0.75rem',
    background: '#F7F6F2',
    borderRadius: '6px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#555',
  },
  progressPercent: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#C78A2B',
  },
  progressBar: {
    height: '4px',
    background: '#E0DDD5',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    background: '#C78A2B',
    transition: 'width 0.3s ease',
  },
  progressMeta: {
    margin: 0,
    fontSize: '10px',
    color: '#aaa',
  },
  // Reader
  reader: {
    flex: 1,
    minWidth: '400px',
    background: '#fff',
    border: '1px solid #E0DDD5',
    borderRadius: '10px',
    padding: '1.5rem',
    minHeight: '600px',
  },
  readerHeader: {
    marginBottom: '1rem',
  },
  readerTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A18',
  },
  readerContent: {
    position: 'relative' as const,
  },
  loadingText: {
    color: '#aaa',
    fontSize: '13px',
  },
  fileContent: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.75,
    color: '#1A1A18',
    fontFamily: "'Georgia', serif",
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflowY: 'auto' as const,
    maxHeight: 'calc(100vh - 300px)',
    userSelect: 'text' as const,
  },
  noteForm: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#FAEEDA',
    borderRadius: '6px',
    borderLeft: '3px solid #C78A2B',
  },
  noteFormLabel: {
    margin: '0 0 8px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#854F0B',
  },
  selectedQuote: {
    margin: '0 0 12px',
    fontSize: '13px',
    color: '#555',
    fontStyle: 'italic',
    padding: '8px 12px',
    background: '#fff',
    borderRadius: '4px',
    borderLeft: '2px solid #C78A2B',
  },
  noteInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #C78A2B',
    borderRadius: '4px',
    fontFamily: "'Arial', sans-serif",
    minHeight: '60px',
    boxSizing: 'border-box' as const,
    marginBottom: '8px',
  },
  noteFormActions: {
    display: 'flex',
    gap: '8px',
  },
  btnPrimary: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: '6px',
    background: '#1A1A18',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  btnSecondary: {
    padding: '8px 14px',
    border: '1px solid #D5D2CA',
    borderRadius: '6px',
    background: '#fff',
    color: '#555',
    cursor: 'pointer',
    fontSize: '12px',
  },
  // Highlights panel
  highlightsPanel: {
    flex: '0 0 280px',
    background: '#fff',
    border: '1px solid #E0DDD5',
    borderRadius: '10px',
    padding: '1.5rem',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  },
  highlightsPanelHeader: {
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #E0DDD5',
  },
  highlightsPanelTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 700,
    color: '#1A1A18',
  },
  highlightsList: {
    display: 'grid',
    gap: '12px',
  },
  highlightItem: {
    padding: '0.75rem',
    background: '#F7F6F2',
    borderRadius: '6px',
    border: '1px solid #E0DDD5',
  },
  highlightText: {
    margin: '0 0 6px',
    fontSize: '12px',
    color: '#1A1A18',
    fontStyle: 'italic',
    borderLeft: '3px solid #C78A2B',
    paddingLeft: '8px',
    lineHeight: 1.4,
  },
  highlightNote: {
    margin: '6px 0',
    fontSize: '11px',
    color: '#555',
    lineHeight: 1.4,
    padding: '6px',
    background: '#fff',
    borderRadius: '4px',
  },
  deleteBtn: {
    padding: '3px 8px',
    fontSize: '10px',
    border: '1px solid #E0DDD5',
    borderRadius: '4px',
    background: '#fff',
    color: '#888',
    cursor: 'pointer',
  },
};
