const DB_NAME = "sceless-cache";
const DB_VERSION = 1;

interface DBSchema {
  cache: {
    key: string;
    data: unknown;
    timestamp: number;
  };
}

type StoreName = keyof DBSchema;
class DB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: StoreName, mode: IDBTransactionMode) {
    const db = await this.open();
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async get<T>(storeName: StoreName, key: string): Promise<T | null> {
    try {
      const store = await this.getStore(storeName, "readonly");
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as { data: T } | undefined;
          resolve(result?.data ?? null);
        };
      });
    } catch (e) {
      return null;
    }
  }

  // Restored: getTimestamp
  async getTimestamp(storeName: StoreName, key: string): Promise<number | null> {
    try {
      const store = await this.getStore(storeName, "readonly");
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as { timestamp: number } | undefined;
          resolve(result?.timestamp ?? null);
        };
      });
    } catch (e) {
      return null;
    }
  }

  async set<T>(storeName: StoreName, key: string, data: T): Promise<void> {
    const store = await this.getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.put({ key, data, timestamp: Date.now() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    const store = await this.getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearFullDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn("Delete blocked by other tabs");
        resolve(); 
      };
    });
  }
}

export const db = new DB();