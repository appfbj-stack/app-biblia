import { safeSessionStorage } from '../lib/storage';
import fakeIndexedDB, {
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRecord,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent
} from 'fake-indexeddb';

// Self-healing IndexedDB Polyfill for Sandboxed iframes / Blocked IndexedDB
let useFakeIDB = false;

if (typeof window !== 'undefined') {
  const forceFake = safeSessionStorage.getItem('hermes-use-fake-idb') === 'true';
  
  let storageBlocked = false;
  try {
    if (!window.localStorage) {
      storageBlocked = true;
    } else {
      const testKey = '__test_storage_blocked_detection__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
    }
  } catch (e) {
    storageBlocked = true;
  }

  let idbBlocked = false;
  try {
    if (!window.indexedDB) {
      idbBlocked = true;
    } else {
      // Test if we can open a dummy DB or if it throws a security error
      const testRequest = window.indexedDB.open('__test_idb_sandbox_support__', 1);
      if (!testRequest) {
        idbBlocked = true;
      }
    }
  } catch (e) {
    idbBlocked = true;
  }

  // We ONLY activate the in-memory IndexedDB fallback if standard IndexedDB is ACTUALLY blocked.
  // We do NOT block it just because we are inside an iframe (like the AI Studio preview iframe),
  // because modern browsers fully support standard IndexedDB in partitioned/same-domain iframes,
  // allowing persistent caching of the Bible dataset across sessions and refreshes.
  if (forceFake || storageBlocked || idbBlocked) {
    useFakeIDB = true;
  }

  if (useFakeIDB) {
    console.warn("Activating in-memory database fallback to prevent database-closed/security crashes.");
    const globalVar = window as any;
    
    const createPropertyDescriptor = (value: any) => ({
      value,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    Object.defineProperties(globalVar, {
      indexedDB: createPropertyDescriptor(fakeIndexedDB),
      IDBCursor: createPropertyDescriptor(IDBCursor),
      IDBCursorWithValue: createPropertyDescriptor(IDBCursorWithValue),
      IDBDatabase: createPropertyDescriptor(IDBDatabase),
      IDBFactory: createPropertyDescriptor(IDBFactory),
      IDBIndex: createPropertyDescriptor(IDBIndex),
      IDBKeyRange: createPropertyDescriptor(IDBKeyRange),
      IDBObjectStore: createPropertyDescriptor(IDBObjectStore),
      IDBOpenDBRequest: createPropertyDescriptor(IDBOpenDBRequest),
      IDBRecord: createPropertyDescriptor(IDBRecord),
      IDBRequest: createPropertyDescriptor(IDBRequest),
      IDBTransaction: createPropertyDescriptor(IDBTransaction),
      IDBVersionChangeEvent: createPropertyDescriptor(IDBVersionChangeEvent),
    });
  }
}

export { useFakeIDB };
