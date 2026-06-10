import { supabase } from '../lib/supabaseClient';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../types';

export default function StatusSelector({ item, onUpdate }: { item: ReadingItem; onUpdate: () => void }) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { error } = await supabase
      .from('reading_items')
      .update({ status: e.target.value as ReadingStatus })
      .eq('id', item.id);
    if (error) alert(error.message);
    else onUpdate();
  };

  return (
    <select value={item.status} onChange={handleChange}>
      {Object.entries(readingStatusLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
