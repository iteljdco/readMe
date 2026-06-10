import StatusSelector from './StatusSelector';
import CategorySelector from './CategorySelector';
import { readingStatusLabels, type ReadingItem, type ReadingStatus } from '../types';

export default function ReadingList({
  items,
  onUpdate,
  statusFilter,
}: {
  items: ReadingItem[];
  onUpdate: () => void;
  statusFilter?: ReadingStatus;
}) {
  const grouped: Record<ReadingStatus, ReadingItem[]> = {
    want: items.filter((i) => i.status === 'want'),
    reading: items.filter((i) => i.status === 'reading'),
    done: items.filter((i) => i.status === 'done'),
  };
  const visibleGroups: Array<[ReadingStatus, ReadingItem[]]> = statusFilter
    ? [[statusFilter, grouped[statusFilter]]]
    : (Object.entries(grouped) as Array<[ReadingStatus, ReadingItem[]]>);

  return (
    <div style={styles.grid}>
      {visibleGroups.map(([status, list]) => (
        <section key={status} style={styles.column}>
          <h2 style={styles.heading}>{readingStatusLabels[status as ReadingStatus]}</h2>
          <ul style={styles.list}>
            {list.length === 0 ? (
              <li style={styles.empty}>No materials</li>
            ) : (
              list.map((item) => (
                <li key={item.id} style={styles.item}>
                  <span style={styles.title}>{item.title}</span>
                  <div style={styles.controls}>
                    <StatusSelector item={item} onUpdate={onUpdate} />
                    <CategorySelector item={item} onUpdate={onUpdate} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  },
  column: {
    border: '1px solid #d9deea',
    borderRadius: '8px',
    padding: '1rem',
    background: '#ffffff',
  },
  heading: {
    margin: '0 0 0.75rem',
    fontSize: '1.1rem',
  },
  list: {
    display: 'grid',
    gap: '0.75rem',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  item: {
    display: 'grid',
    gap: '0.5rem',
    padding: '0.75rem',
    border: '1px solid #edf0f5',
    borderRadius: '6px',
    background: '#f8fafc',
  },
  title: {
    fontWeight: 700,
  },
  controls: {
    display: 'grid',
    gap: '0.5rem',
  },
  empty: {
    color: '#6b7280',
  },
};
