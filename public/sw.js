// Service Worker de desenvolvimento para o Hermes Bíblico (PWA)
const CACHE_NAME = 'hermes-bible-dev-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manipulador de fetch mínimo obrigatório para que o Chrome ative a instalabilidade
self.addEventListener('fetch', (event) => {
  // Apenas passa adiante todas as requisições em desenvolvimento
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  event.respondWith(fetch(event.request));
});
