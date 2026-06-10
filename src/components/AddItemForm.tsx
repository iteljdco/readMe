import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

type MaterialType = 'book' | 'module' | 'article' | 'other';
type MaterialStatus = 'want' | 'reading' | 'done';

export default function AddItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MaterialType>('book');
  const [status, setStatus] = useState<MaterialStatus>('want');
  const [notes, setNotes] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const getFilePath = (file: File) =>
    (file as any).webkitRelativePath || file.name;

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    setAttachedFiles((prev) => {
      const paths = new Set(prev.map(getFilePath));
      return [...prev, ...arr.filter((f) => !paths.has(getFilePath(f)))];
    });
  };

  const removeFile = (path: string) =>
    setAttachedFiles((prev) => prev.filter((f) => getFilePath(f) !== path));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadProgress(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert('You must be logged in.');
      setSaving(false);
      return;
    }

    // 1. Insert reading item
    const { data: inserted, error: insertError } = await supabase
      .from('reading_items')
      .insert([{
        title,
        type,
        status,
        notes: notes.trim() || null,
        link_url: linkUrl || null,
        user_id: user.id,
      }])
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Insert error:', insertError);
      alert(`Failed to save material: ${insertError?.message}`);
      setSaving(false);
      return;
    }

    const materialId = inserted.id;

    // 2. Upload files preserving folder structure
    let uploaded = 0;
    for (const file of attachedFiles) {
      const relativePath = getFilePath(file);
      const storagePath = `${user.id}/${materialId}/${relativePath}`;

      setUploadProgress(`Uploading ${uploaded + 1} of ${attachedFiles.length}: ${file.name}`);

      const { error: uploadError } = await supabase.storage
        .from('reading-materials')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.error(`Upload failed for ${relativePath}:`, uploadError.message);
        continue;
      }

      const { error: dbError } = await supabase
        .from('material_files')
        .insert([{
          material_id: materialId,
          user_id: user.id,
          file_name: relativePath,
          file_path: storagePath,
          file_size: file.size,
        }]);

      if (dbError) {
        console.error(`DB insert failed for ${relativePath}:`, dbError.message);
      } else {
        uploaded++;
      }
    }

    setSaving(false);
    setUploadProgress(null);
    setTitle(''); setType('book'); setStatus('want');
    setNotes(''); setLinkUrl(''); setAttachedFiles([]);
    onAdd();
  };

  const statusOptions: { value: MaterialStatus; label: string; bg: string; color: string }[] = [
    { value: 'want',    label: 'Want',    bg: '#FAEEDA', color: '#854F0B' },
    { value: 'reading', label: 'Reading', bg: '#E6F1FB', color: '#185FA5' },
    { value: 'done',    label: 'Done',    bg: '#EAF3DE', color: '#3B6D11' },
  ];

  const typeOptions: MaterialType[] = ['book', 'module', 'article', 'other'];

  // Group attached files by folder for display
  const grouped = attachedFiles.reduce<Record<string, File[]>>((acc, f) => {
    const rel = getFilePath(f);
    const parts = rel.split('/');
    const folder = parts.length > 1 ? parts[0] : '—';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(f);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      {/* Title */}
      <div style={s.field}>
        <label style={s.label}>Title</label>
        <input
          type="text"
          placeholder="e.g. Designing Data-Intensive Applications"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={s.input}
        />
      </div>

      {/* Type & Status */}
      <div style={s.row}>
        <div style={{ ...s.field, flex: 1 }}>
          <label style={s.label}>Type</label>
          <div style={s.pillGroup}>
            {typeOptions.map((t) => (
              <button key={t} type="button"
                style={{ ...s.pill, ...(type === t ? s.pillActive : {}) }}
                onClick={() => setType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ ...s.field, flex: 1 }}>
          <label style={s.label}>Status</label>
          <div style={s.pillGroup}>
            {statusOptions.map((opt) => (
              <button key={opt.value} type="button"
                style={{
                  ...s.pill,
                  ...(status === opt.value
                    ? { background: opt.bg, color: opt.color, borderColor: opt.color }
                    : {}),
                }}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={s.field}>
        <label style={s.label}>Notes</label>
        <textarea
          placeholder="Paste text, write notes, or jot down why you want to read this..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          style={s.textarea}
        />
      </div>

      {/* Link */}
      <div style={s.field}>
        <label style={s.label}>Link (optional)</label>
        <input
          type="url"
          placeholder="https://example.com/article"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          style={s.input}
        />
      </div>

      {/* Files & Folders */}
      <div style={s.field}>
        <label style={s.label}>Files & folders</label>
        <div
          style={s.dropZone}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <p style={s.dropText}>Drag & drop files here, or</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button type="button" style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              Choose files
            </button>
            <button type="button" style={s.uploadBtn} onClick={() => folderInputRef.current?.click()}>
              Choose folder
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Grouped file preview */}
        {attachedFiles.length > 0 && (
          <div style={s.filePreview}>
            {Object.entries(grouped).map(([folder, folderFiles]) => (
              <div key={folder}>
                {folder !== '—' && (
                  <div style={s.folderRow}>
                    <span>📁 {folder}</span>
                    <span style={s.folderCount}>{folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <ul style={s.fileList}>
                  {folderFiles.map((f) => {
                    const rel = getFilePath(f);
                    const displayName = folder !== '—' ? rel.split('/').slice(1).join('/') : f.name;
                    return (
                      <li key={rel} style={s.fileItem}>
                        <span style={s.fileIcon}>
                          {f.name.endsWith('.pdf') ? '📕' : '📄'}
                        </span>
                        <span style={s.fileName}>{displayName}</span>
                        <span style={s.fileSize}>{(f.size / 1024).toFixed(1)} KB</span>
                        <button
                          type="button"
                          style={s.removeBtn}
                          onClick={() => removeFile(rel)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div style={s.progressBar}>
          <p style={s.progressText}>{uploadProgress}</p>
        </div>
      )}

      {/* Actions */}
      <div style={s.actions}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={s.cancelBtn}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save material'}
        </button>
      </div>
    </form>
  );
}

const s: Record<string, React.CSSProperties> = {
  form: { display: 'grid', gap: '1.25rem' },
  field: { display: 'grid', gap: '6px' },
  row: { display: 'flex', gap: '1.25rem', flexWrap: 'wrap' },
  label: {
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#888', fontFamily: "'Arial', sans-serif",
  },
  input: {
    width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px',
    border: '1px solid #E0DDD5', borderRadius: '6px',
    fontSize: '14px', fontFamily: "'Georgia', serif",
    background: '#FDFCF9', color: '#1A1A18', outline: 'none',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px',
    border: '1px solid #E0DDD5', borderRadius: '6px',
    fontSize: '14px', fontFamily: "'Georgia', serif",
    background: '#FDFCF9', color: '#1A1A18',
    resize: 'vertical' as const, lineHeight: 1.65, outline: 'none',
  },
  pillGroup: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  pill: {
    padding: '5px 12px', border: '1px solid #D5D2CA',
    borderRadius: '20px', background: '#fff', color: '#888',
    cursor: 'pointer', fontSize: '12px', fontFamily: "'Arial', sans-serif",
  },
  pillActive: { background: '#1A1A18', color: '#fff', borderColor: '#1A1A18' },
  dropZone: {
    border: '1.5px dashed #D5D2CA', borderRadius: '8px',
    padding: '1.5rem 1rem', textAlign: 'center' as const, background: '#FDFCF9',
  },
  dropText: {
    margin: '0 0 10px', fontSize: '13px', color: '#aaa',
    fontFamily: "'Arial', sans-serif",
  },
  uploadBtn: {
    padding: '6px 14px', border: '1px solid #D5D2CA',
    borderRadius: '6px', background: '#fff', color: '#555',
    cursor: 'pointer', fontSize: '12px', fontFamily: "'Arial', sans-serif",
  },
  filePreview: {
    marginTop: '8px', display: 'grid', gap: '8px',
  },
  folderRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 10px', background: '#F4F3EE',
    borderRadius: '6px 6px 0 0', border: '1px solid #E0DDD5',
    borderBottom: 'none', fontSize: '12px', fontWeight: 700, color: '#555',
  },
  folderCount: {
    fontSize: '11px', color: '#aaa', fontWeight: 400,
  },
  fileList: {
    listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '2px',
  },
  fileItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 10px', background: '#FDFCF9',
    border: '1px solid #E0DDD5', borderTop: 'none',
  },
  fileIcon: { fontSize: '14px', flexShrink: 0 },
  fileName: {
    fontSize: '12px', color: '#555', fontFamily: "'Arial', sans-serif",
    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  fileSize: { fontSize: '11px', color: '#aaa' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#ccc', fontSize: '12px', flexShrink: 0,
  },
  progressBar: {
    padding: '10px 14px', background: '#F4F3EE',
    borderRadius: '6px', border: '1px solid #E0DDD5',
  },
  progressText: {
    margin: 0, fontSize: '12px', color: '#888',
    fontFamily: "'Arial', sans-serif",
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' },
  cancelBtn: {
    padding: '8px 16px', border: '1px solid #D5D2CA',
    borderRadius: '6px', background: '#fff', color: '#888',
    cursor: 'pointer', fontSize: '13px', fontFamily: "'Arial', sans-serif",
  },
  saveBtn: {
    padding: '8px 20px', border: 'none', borderRadius: '6px',
    background: '#1A1A18', color: '#fff', cursor: 'pointer',
    fontSize: '13px', fontWeight: 700, fontFamily: "'Arial', sans-serif",
  },
};