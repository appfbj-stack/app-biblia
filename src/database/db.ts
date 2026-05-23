import Dexie, { type EntityTable } from 'dexie';

export interface BibleBook {
  id?: number;
  name: string;
  testament: 'VT' | 'NT';
  chapters: number;
}

export interface BibleVerse {
  id?: number;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Note {
  id?: number;
  title?: string;
  content: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id?: number;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id?: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ReadChapter {
  id?: number;
  book_name: string;
  chapter: number;
}

export interface ReadVerse {
  id?: number;
  book_name: string;
  chapter: number;
  verse: number;
}

export interface ReadingHistory {
  id?: number;
  book_name: string;
  chapter: number;
  timestamp: number;
}

export interface HighlightedVerse {
  id?: number;
  book_name: string;
  chapter: number;
  verse: number;
  color: string; // e.g., 'yellow', 'green', 'blue', 'red', 'purple'
  created_at: string;
}

// Database declaration
const db = new Dexie('HermesBible') as Dexie & {
  books: EntityTable<BibleBook, 'id'>;
  verses: EntityTable<BibleVerse, 'id'>;
  notes: EntityTable<Note, 'id'>;
  chats: EntityTable<Chat, 'id'>;
  chat_messages: EntityTable<ChatMessage, 'id'>;
  read_chapters: EntityTable<ReadChapter, 'id'>;
  read_verses: EntityTable<ReadVerse, 'id'>;
  reading_history: EntityTable<ReadingHistory, 'id'>;
  highlighted_verses: EntityTable<HighlightedVerse, 'id'>;
};

// Schema setup
db.version(1).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at'
});

db.version(2).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at',
  read_chapters: '++id, [book_name+chapter]',
  read_verses: '++id, [book_name+chapter], [book_name+chapter+verse]'
});

db.version(3).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at',
  read_chapters: '++id, [book_name+chapter]',
  read_verses: '++id, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at, [book_name+chapter+verse]'
});

db.version(4).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at',
  read_chapters: '++id, [book_name+chapter]',
  read_verses: '++id, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at, [book_name+chapter], [book_name+chapter+verse]'
});

db.version(5).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at',
  read_chapters: '++id, [book_name+chapter]',
  read_verses: '++id, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at, updated_at, [book_name+chapter], [book_name+chapter+verse]'
});

db.version(6).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at',
  read_chapters: '++id, [book_name+chapter]',
  read_verses: '++id, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at, updated_at, [book_name+chapter], [book_name+chapter+verse]',
  reading_history: '++id, [book_name+chapter], timestamp'
});

db.version(7).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at',
  read_chapters: '++id, [book_name+chapter]',
  read_verses: '++id, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at, updated_at, [book_name+chapter], [book_name+chapter+verse]',
  reading_history: '++id, [book_name+chapter], timestamp',
  highlighted_verses: '++id, [book_name+chapter], [book_name+chapter+verse]'
});

export { db };
