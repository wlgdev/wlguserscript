// deno-lint-ignore-file no-window
export class Cache<T> {
  data: { [key: string]: T };

  constructor(private readonly tag: string) {
    this.data = window.localStorage.getItem(tag)
      ? JSON.parse(window.localStorage.getItem(tag)!)
      : {};
  }

  getItem(key: string): T | undefined {
    return this.data[key];
  }
  setItem(key: string, value: T) {
    this.data[key] = value;
    window.localStorage.setItem(this.tag, JSON.stringify(this.data));
  }
}

export class CacheDB<T> {
  db: IDBDatabase | null = null;

  constructor(private readonly tag: string, private readonly table: string) {
    this.openDatabase();
  }

  private openDatabase(): void {
    const request = indexedDB.open(this.tag, 1);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase; // Type assertion
      this.db = db;
    };
    request.onerror = (event) => {
      console.error(
        "Error opening database:",
        (event.target as IDBOpenDBRequest).error,
      );
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(this.table)) {
        db.createObjectStore(this.table, {
          keyPath: "key",
        });
      }
    };
  }

  getItem(key: string): Promise<T | undefined> {
    console.log("getItem", key);
    return new Promise<T | undefined>((resolve, reject) => {
      if (!this.db) {
        return resolve(undefined);
      }

      const transaction = this.db.transaction([this.table], "readonly");
      const objectStore = transaction.objectStore(this.table);
      const request = objectStore.get(key);

      request.onsuccess = (event) => {
        const request = event.target as IDBRequest;
        const retrievedValue = request.result?.value;

        resolve(retrievedValue);
      };

      request.onerror = (event) => {
        const request = event.target as IDBRequest;
        console.error("Error retrieving item:", request.error);
        reject(request.error);
      };
    });
  }

  setItem(key: string, value: T): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        return resolve();
      }

      const transaction = this.db.transaction([this.table], "readwrite");
      const objectStore = transaction.objectStore(this.table);
      const request = objectStore.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        const request = event.target as IDBRequest;
        console.error("Error storing item:", request.error); // Log error
        reject(request.error);
      };
    });
  }
}
