export type ReadingStatus = 'want' | 'reading' | 'done';

export const readingStatusLabels: Record<ReadingStatus, string> = {
  want: 'Want',
  reading: 'Reading',
  done: 'Done',
};

export type ReadingItem = {
  id: string;
  title: string;
  type: string;
  status: ReadingStatus;
  notes: string | null;
  category_id: string | null;
};

export type Category = {
  id: string;
  name: string;
};
