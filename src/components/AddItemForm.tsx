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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    setAttachedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name: string) =>
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert('You must be logged in.');
      setSaving(false);
      return;
    }

    // 1. Insert the reading item
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
      alert(insertError?.message ?? 'Failed to save material.');
      setSaving(false);
      return;
    }

    const materialId = inserted.id;

    // 2. Upload each file to Storage and record in material_files
    for (const file of attachedFiles) {
      const filePath = `${user.id}/${materialId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('reading-materials')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(`Failed to upload ${file.name}:`, uploadError.message);
        continue;
      }

      await supabase.from('material_files').insert([{
        material_id: materialId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      }]);
    }

    setSaving(false);
    setTitle(''); setType('book'); setStatus('want');
    setNotes(''); setLinkUrl(''); setAttachedFiles([]);
    onAdd();
  };

  const statusOptions: { value: MaterialStatus; label: string; bg: string; color: string }[] = [
    { value: 'want',    label: 'Want',    bg: '#FFF3E0', color: '#E65100' },
    { value: 'reading', label: 'Reading', bg: '#E0F7FF', color: '#0077BE' },
    { value: 'done',    label: 'Done',    bg: '#C8E6C9', color: '#2E7D32' },
  ];

  const typeOptions: MaterialType[] = ['book', 'module', 'article', 'other'];

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
          rows={5}
          style={s.textarea}
        />
      </div>

      {/* Link */}
      <div style={s.field}>
        <label style={s.label}>Link (optional)</label>
        <input
          type="url"
          placeholder="https://example.com/book.pdf"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          style={s.input}
        />
      </div>

      {/* Files & Folders */}
      <div style={s.field}>
        <label style={s.label}>Files & folders</label>
        <div style={s.dropZone} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <p style={s.dropText}>Drag & drop files here, or</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              Choose files
            </button>
            <button type="button" style={s.uploadBtn} onClick={() => folderInputRef.current?.click()}>
              Choose folder
            </button>
          </div>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)} />
          <input ref={folderInputRef} type="file" multiple
            // @ts-ignore
            webkitdirectory="true"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {attachedFiles.length > 0 && (
          <ul style={s.fileList}>
            {attachedFiles.map((f) => (
              <li key={f.name} style={s.fileItem}>
                <span style={s.fileName}>📄 {f.name}</span>
                <span style={s.fileSize}>{(f.size / 1024).toFixed(1)} KB</span>
                <button type="button" style={s.removeBtn} onClick={() => removeFile(f.name)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div style={s.actions}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={s.cancelBtn}>Cancel</button>
        )}
        <button type="submit" disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
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
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#0077BE',
    fontFamily: "'Arial', sans-serif",
  },
  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '10px 12px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Georgia', serif",
    background: '#F0F9FF',
    color: '#0C3A66',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '10px 12px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Georgia', serif",
    background: '#F0F9FF',
    color: '#0C3A66',
    resize: 'vertical' as const,
    lineHeight: 1.65,
    outline: 'none',
  },
  pillGroup: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  pill: {
    padding: '5px 12px',
    border: '1px solid #B3E5FC',
    borderRadius: '20px',
    background: '#fff',
    color: '#0099FF',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'Arial', sans-serif",
    fontWeight: 500,
  },
  pillActive: {
    background: '#0077BE',
    color: '#fff',
    borderColor: '#0077BE',
  },
  dropZone: {
    border: '1.5px dashed #B3E5FC',
    borderRadius: '8px',
    padding: '1.5rem 1rem',
    textAlign: 'center' as const,
    background: '#F0F9FF',
  },
  dropText: {
    margin: '0 0 10px',
    fontSize: '13px',
    color: '#0099FF',
    fontFamily: "'Arial', sans-serif",
  },
  uploadBtn: {
    padding: '6px 14px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    background: '#fff',
    color: '#0077BE',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'Arial', sans-serif",
    fontWeight: 500,
  },
  fileList: {
    listStyle: 'none',
    margin: '8px 0 0',
    padding: 0,
    display: 'grid',
    gap: '4px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    background: '#E0F7FF',
    borderRadius: '6px',
    border: '1px solid #B3E5FC',
  },
  fileName: {
    fontSize: '12px',
    color: '#0077BE',
    fontFamily: "'Arial', sans-serif",
    flex: 1,
    fontWeight: 500,
  },
  fileSize: {
    fontSize: '11px',
    color: '#0099FF',
    fontFamily: "'Arial', sans-serif",
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#FF6B6B',
    fontSize: '12px',
    fontWeight: 600,
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' },
  cancelBtn: {
    padding: '8px 16px',
    border: '1px solid #B3E5FC',
    borderRadius: '6px',
    background: '#fff',
    color: '#0077BE',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Arial', sans-serif",
    fontWeight: 500,
  },
  saveBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '6px',
    background: '#0077BE',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'Arial', sans-serif",
    transition: 'background 0.2s',
  },
};