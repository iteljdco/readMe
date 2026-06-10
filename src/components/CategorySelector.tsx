import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Category, ReadingItem } from '../types';

export default function CategorySelector({ item, onUpdate }: { item: ReadingItem; onUpdate: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) console.error(error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { error } = await supabase
      .from('reading_items')
      .update({ category_id: e.target.value })
      .eq('id', item.id);
    if (error) alert(error.message);
    else onUpdate();
  };

  return (
    <select value={item.category_id || ''} onChange={handleChange}>
      <option value="">No Category</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
