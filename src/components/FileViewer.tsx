import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#FFE066' },
  { label: 'Green',  value: '#B8F0B8' },
  { label: 'Pink',   value: '#FFB3C6' },
  { label: 'Blue',   value: '#B3D9FF' },
];

type Highlight = {
  id: number;
  selected_text: string;
  color: string;
  page_number: number | null;
};

type Props = {
  filePath: string;
  materialId: string;
  fileName: string;
  onClose: () => void;
};

export default function FileViewer({ filePath, materialId, fileName, onClose }: Props) {
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const [content, setContent] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedColor, setSelectedColor] = useState('#FFE066');
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load file
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.storage
        .from('reading-materials')
        .download(filePath);
      if (error || !data) return;

      if (isPdf) {
        const url = URL.createObjectURL(data);
        setPdfUrl(url);
      } else {
        const text = await data.text();
        setContent(text);
      }
    };
    load();
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [filePath]);

  // Load highlights
  useEffect(() => {
    const loadHighlights = async () => {
      const { data } = await supabase
        .from('reading_highlights')
        .select('*')
        .eq('material_id', materialId)
        .eq('file_path', filePath)
        .order('created_at');
      setHighlights((data ?? []) as Highlight[]);
    };
    loadHighlights();
  }, [filePath, materialId]);

  // Load last page from progress
  useEffect(() => {
    const loadProgress = async () => {
      const { data } = await supabase
        .from('reading_progress')
        .select('last_page')
        .eq('material_id', materialId)
        .eq('file_path', filePath)
        .single();
      if (data?.last_page) setCurrentPage(data.last_page);
    };
    if (isPdf) loadProgress();
  }, [filePath, materialId]);

  // Save page progress
  const saveProgress = useCallback(async (page: number) => {
    if (!userId) return;
    await supabase.from('reading_progress').upsert({
      material_id: materialId,
      file_path: filePath,
      user_id: userId,
      last_page: page,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'material_id,file_path,user_id' });
  }, [materialId, filePath, userId]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages));
    setCurrentPage(clamped);
    saveProgress(clamped);
  };

  // Highlight selected text
  const handleHighlight = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text || !userId) return;

    setSaving(true);
    const { data, error } = await supabase
      .from('reading_highlights')
      .insert([{
        material_id: materialId,
        file_path: filePath,
        user_id: userId,
        selected_text: text,
        color: selectedColor,
        page_number: isPdf ? currentPage : null,
      }])
      .select()
      .single();

    if (!error && data) {
      setHighlights((prev) => [...prev, data as Highlight]);
    }
    selection.removeAllRanges();
    setSaving(false);
  };

  const deleteHighlight = async (id: number) => {
    await supabase.from('reading_highlights').delete().eq('id', id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  // Apply highlights to plain text
  const renderHighlightedContent = () => {
    if (!content) return null;
    let result = content;
    const pageHighlights = highlights.filter((h) => !h.page_number);

    pageHighlights.forEach((h) => {
      result = result.split(h.selected_text).join(
        `<mark style="background:${h.color};border-radius:2px;">${h.selected_text}</mark>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />;
  };

  const pageHighlights = highlights.filter((h) => h.page_number === currentPage);

  return (
    <div style={s.container}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <p style={s.fileName}>{fileName}</p>
          {isPdf && (
            <div style={s.pageNav}>
              <button style={s.pageBtn} onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>‹</button>
              <span style={s.pageInfo}>{currentPage} / {numPages}</span>
              <button style={s.pageBtn} onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages}>›</button>
            </div>
          )}
        </div>
        <div style={s.toolbarRight}>
          <div style={s.colorPicker}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                style={{
                  ...s.colorDot,
                  background: c.value,
                  outline: selectedColor === c.value ? '2px solid #1A1A18' : 'none',
                  outlineOffset: '2px',
                }}
                onClick={() => setSelectedColor(c.value)}
              />
            ))}
          </div>
          <button style={s.highlightBtn} onClick={handleHighlight} disabled={saving}>
            {saving ? 'Saving…' : '✦ Highlight'}
          </button>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      <div style={s.body}>
        {/* File content */}
        <div style={s.contentArea} ref={contentRef}>
          {isPdf && pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<p style={s.loading}>Loading PDF…</p>}
            >
              <Page
                pageNumber={currentPage}
                width={Math.min(700, typeof window !== 'undefined' ? window.innerWidth - 340 : 700)}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : content !== null ? (
            <div style={s.textContent}>
              {renderHighlightedContent()}
            </div>
          ) : (
            <p style={s.loading}>Loading…</p>
          )}
        </div>

        {/* Highlights sidebar */}
        <div style={s.sidebar}>
          <p style={s.sidebarTitle}>Highlights</p>
          {highlights.length === 0 ? (
            <p style={s.sidebarEmpty}>Select text then click Highlight to save.</p>
          ) : (
            <ul style={s.highlightList}>
              {(isPdf ? pageHighlights : highlights).map((h) => (
                <li key={h.id} style={s.highlightItem}>
                  <div style={{ ...s.highlightBar, background: h.color }} />
                  <div style={s.highlightBody}>
                    <p style={s.highlightText}>"{h.selected_text}"</p>
                    {h.page_number && (
                      <p style={s.highlightPage}>Page {h.page_number}</p>
                    )}
                  </div>
                  <button style={s.deleteBtn} onClick={() => deleteHighlight(h.id)}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {isPdf && highlights.filter((h) => h.page_number !== currentPage).length > 0 && (
            <div style={s.otherHighlights}>
              <p style={s.sidebarLabel}>Other pages</p>
              {highlights
                .filter((h) => h.page_number !== currentPage)
                .map((h) => (
                  <button
                    key={h.id}
                    style={s.otherHighlightBtn}
                    onClick={() => goToPage(h.page_number!)}
                  >
                    <div style={{ ...s.highlightBar, background: h.color }} />
                    <span style={s.otherHighlightText}>p.{h.page_number} — "{h.selected_text.slice(0, 40)}…"</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column',
    background: '#fff', border: '1px solid #E0DDD5',
    borderRadius: '10px', overflow: 'hidden',
    height: 'calc(100vh - 140px)',
    minHeight: '500px',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', borderBottom: '1px solid #E0DDD5',
    background: '#FDFCF9', gap: '12px', flexWrap: 'wrap',
  },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  fileName: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#1A1A18' },
  pageNav: { display: 'flex', alignItems: 'center', gap: '6px' },
  pageBtn: {
    width: '28px', height: '28px', border: '1px solid #E0DDD5',
    borderRadius: '6px', background: '#fff', cursor: 'pointer',
    fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageInfo: { fontSize: '12px', color: '#888', minWidth: '60px', textAlign: 'center' },
  colorPicker: { display: 'flex', gap: '6px', alignItems: 'center' },
  colorDot: {
    width: '18px', height: '18px', borderRadius: '50%',
    border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
  },
  highlightBtn: {
    padding: '6px 12px', border: '1px solid #D5D2CA',
    borderRadius: '6px', background: '#fff', color: '#1A1A18',
    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
  },
  closeBtn: {
    padding: '6px 10px', border: '1px solid #E0DDD5',
    borderRadius: '6px', background: '#fff', color: '#888',
    cursor: 'pointer', fontSize: '12px',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  contentArea: {
    flex: 1, overflowY: 'auto', padding: '2rem',
    background: '#FDFCF9',
  },
  textContent: {
    fontSize: '15px', lineHeight: 1.85,
    color: '#1A1A18', fontFamily: "'Georgia', serif",
    maxWidth: '680px', margin: '0 auto',
    userSelect: 'text',
  },
  loading: { color: '#aaa', fontSize: '13px' },
  sidebar: {
    width: '260px', flexShrink: 0,
    borderLeft: '1px solid #E0DDD5',
    overflowY: 'auto', padding: '1rem',
    background: '#fff',
  },
  sidebarTitle: {
    margin: '0 0 12px', fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em', color: '#aaa',
  },
  sidebarLabel: {
    margin: '12px 0 6px', fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ccc',
  },
  sidebarEmpty: { fontSize: '12px', color: '#ccc', lineHeight: 1.6 },
  highlightList: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' },
  highlightItem: {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    padding: '8px', borderRadius: '6px',
    border: '1px solid #F0EDE8', background: '#FDFCF9',
  },
  highlightBar: { width: '4px', borderRadius: '2px', flexShrink: 0, alignSelf: 'stretch', minHeight: '20px' },
  highlightBody: { flex: 1, minWidth: 0 },
  highlightText: {
    margin: 0, fontSize: '12px', color: '#555',
    fontFamily: "'Georgia', serif", lineHeight: 1.5,
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
  },
  highlightPage: { margin: '4px 0 0', fontSize: '11px', color: '#aaa' },
  deleteBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#ccc', fontSize: '11px', flexShrink: 0, padding: '2px',
  },
  otherHighlights: { marginTop: '8px' },
  otherHighlightBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    width: '100%', background: 'none', border: 'none',
    cursor: 'pointer', padding: '6px 0', textAlign: 'left',
  },
  otherHighlightText: { fontSize: '11px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};