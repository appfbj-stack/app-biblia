import { db } from './db';

const BIBLE_BOOKS = [
  // Velho Testamento
  { name: 'Gênesis', testament: 'VT', chapters: 50 },
  { name: 'Êxodo', testament: 'VT', chapters: 40 },
  { name: 'Levítico', testament: 'VT', chapters: 27 },
  { name: 'Números', testament: 'VT', chapters: 36 },
  { name: 'Deuteronômio', testament: 'VT', chapters: 34 },
  { name: 'Josué', testament: 'VT', chapters: 24 },
  { name: 'Juízes', testament: 'VT', chapters: 21 },
  { name: 'Rute', testament: 'VT', chapters: 4 },
  { name: '1 Samuel', testament: 'VT', chapters: 31 },
  { name: '2 Samuel', testament: 'VT', chapters: 24 },
  { name: '1 Reis', testament: 'VT', chapters: 22 },
  { name: '2 Reis', testament: 'VT', chapters: 25 },
  { name: '1 Crônicas', testament: 'VT', chapters: 29 },
  { name: '2 Crônicas', testament: 'VT', chapters: 36 },
  { name: 'Esdras', testament: 'VT', chapters: 10 },
  { name: 'Neemias', testament: 'VT', chapters: 13 },
  { name: 'Ester', testament: 'VT', chapters: 10 },
  { name: 'Jó', testament: 'VT', chapters: 42 },
  { name: 'Salmos', testament: 'VT', chapters: 150 },
  { name: 'Provérbios', testament: 'VT', chapters: 31 },
  { name: 'Eclesiastes', testament: 'VT', chapters: 12 },
  { name: 'Cânticos', testament: 'VT', chapters: 8 },
  { name: 'Isaías', testament: 'VT', chapters: 66 },
  { name: 'Jeremias', testament: 'VT', chapters: 52 },
  { name: 'Lamentações', testament: 'VT', chapters: 5 },
  { name: 'Ezequiel', testament: 'VT', chapters: 48 },
  { name: 'Daniel', testament: 'VT', chapters: 12 },
  { name: 'Oséias', testament: 'VT', chapters: 14 },
  { name: 'Joel', testament: 'VT', chapters: 3 },
  { name: 'Amós', testament: 'VT', chapters: 9 },
  { name: 'Obadias', testament: 'VT', chapters: 1 },
  { name: 'Jonas', testament: 'VT', chapters: 4 },
  { name: 'Miquéias', testament: 'VT', chapters: 7 },
  { name: 'Naum', testament: 'VT', chapters: 3 },
  { name: 'Habacuque', testament: 'VT', chapters: 3 },
  { name: 'Sofonias', testament: 'VT', chapters: 3 },
  { name: 'Ageu', testament: 'VT', chapters: 2 },
  { name: 'Zacarias', testament: 'VT', chapters: 14 },
  { name: 'Malaquias', testament: 'VT', chapters: 4 },
  // Novo Testamento
  { name: 'Mateus', testament: 'NT', chapters: 28 },
  { name: 'Marcos', testament: 'NT', chapters: 16 },
  { name: 'Lucas', testament: 'NT', chapters: 24 },
  { name: 'João', testament: 'NT', chapters: 21 },
  { name: 'Atos', testament: 'NT', chapters: 28 },
  { name: 'Romanos', testament: 'NT', chapters: 16 },
  { name: '1 Coríntios', testament: 'NT', chapters: 16 },
  { name: '2 Coríntios', testament: 'NT', chapters: 13 },
  { name: 'Gálatas', testament: 'NT', chapters: 6 },
  { name: 'Efésios', testament: 'NT', chapters: 6 },
  { name: 'Filipenses', testament: 'NT', chapters: 4 },
  { name: 'Colossenses', testament: 'NT', chapters: 4 },
  { name: '1 Tessalonicenses', testament: 'NT', chapters: 5 },
  { name: '2 Tessalonicenses', testament: 'NT', chapters: 3 },
  { name: '1 Timóteo', testament: 'NT', chapters: 6 },
  { name: '2 Timóteo', testament: 'NT', chapters: 4 },
  { name: 'Tito', testament: 'NT', chapters: 3 },
  { name: 'Filemom', testament: 'NT', chapters: 1 },
  { name: 'Hebreus', testament: 'NT', chapters: 13 },
  { name: 'Tiago', testament: 'NT', chapters: 5 },
  { name: '1 Pedro', testament: 'NT', chapters: 5 },
  { name: '2 Pedro', testament: 'NT', chapters: 3 },
  { name: '1 João', testament: 'NT', chapters: 5 },
  { name: '2 João', testament: 'NT', chapters: 1 },
  { name: '3 João', testament: 'NT', chapters: 1 },
  { name: 'Judas', testament: 'NT', chapters: 1 },
  { name: 'Apocalipse', testament: 'NT', chapters: 22 }
] as const;

export async function seedDatabase() {
  const booksCount = await db.books.count();
  if (booksCount < 66) {
    await db.books.clear();
    await db.books.bulkAdd([...BIBLE_BOOKS]);
  }

  const versesCount = await db.verses.count();
  if (versesCount < 31000) {
    try {
      window.dispatchEvent(new CustomEvent('seeding-status', { detail: { loading: true, message: 'Baixando a Bíblia...' } }));
      console.log("Downloading full Bible...");
      const res = await fetch('https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/pt_nvi.json');
      const bibleData = await res.json();
      
      const allVerses: any[] = [];
      
      for (let b = 0; b < bibleData.length; b++) {
        const bookName = BIBLE_BOOKS[b]?.name;
        if (!bookName) continue;

        const chapters = bibleData[b].chapters;
        
        for (let c = 0; c < chapters.length; c++) {
          const verses = chapters[c];
          
          for (let v = 0; v < verses.length; v++) {
            allVerses.push({
              book_name: bookName,
              chapter: c + 1,
              verse: v + 1,
              text: verses[v]
            });
          }
        }
      }
      
      window.dispatchEvent(new CustomEvent('seeding-status', { detail: { loading: true, message: 'Instalando os versículos...' } }));
      console.log(`Inserting ${allVerses.length} verses...`);
      
      // Clear old dummy verses
      await db.verses.clear();
      
      // Bulk add the verses in chunks to avoid locking
      const chunkSize = 5000;
      for (let i = 0; i < allVerses.length; i += chunkSize) {
        await db.verses.bulkAdd(allVerses.slice(i, i + chunkSize));
      }
      
      window.dispatchEvent(new CustomEvent('seeding-status', { detail: { loading: false } }));
      console.log("Bible seeded successfully!");
    } catch(e) {
      window.dispatchEvent(new CustomEvent('seeding-status', { detail: { loading: false, error: 'Falha ao baixar a Bíblia. Verifique sua conexão.' } }));
      console.error("Failed to seed verses", e);
    }
  }

  const chatsCount = await db.chats.count();
  if (chatsCount === 0) {
    // Add an initial chat
    const chatId = await db.chats.add({
      title: 'Boas-vindas',
      created_at: new Date().toISOString()
    });

    await db.chat_messages.add({
      chat_id: chatId,
      role: 'assistant',
      content: 'Graça e paz! Eu sou Hermes, seu assistente bíblico. Como posso te ajudar a mergulhar nas Escrituras hoje?',
      created_at: new Date().toISOString()
    });
  }
}
