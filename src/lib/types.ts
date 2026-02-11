export interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
  createdAt: number;
}
