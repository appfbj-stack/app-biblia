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
  title: string;
  content: string;
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

// Database declaration
const db = new Dexie('HermesBible') as Dexie & {
  books: EntityTable<BibleBook, 'id'>;
  verses: EntityTable<BibleVerse, 'id'>;
  notes: EntityTable<Note, 'id'>;
  chats: EntityTable<Chat, 'id'>;
  chat_messages: EntityTable<ChatMessage, 'id'>;
};

// Schema setup
db.version(1).stores({
  books: '++id, name, testament',
  verses: '++id, book_name, [book_name+chapter], [book_name+chapter+verse]',
  notes: '++id, title, created_at',
  chats: '++id, title, created_at',
  chat_messages: '++id, chat_id, role, created_at'
});

export { db };
