import { grantError } from 'util/errors';

export interface Store<T> {
  add: (v: Omit<T, 'id'> | T) => Promise<number>;
  get: (id: number) => Promise<T | null>;
  getAllDesc: (
    query?: IDBValidKey | IDBKeyRange | null | undefined,
    count?: number | undefined,
  ) => Promise<T[]>;
  getAll: (
    query?: IDBValidKey | IDBKeyRange | null | undefined,
    count?: number | undefined,
  ) => Promise<T[]>;
  remove: (id: number) => Promise<void>;
  put: (v: T & { id: number }) => Promise<void>;
  patch: (v: Partial<T> & { id: number }) => Promise<void>;
  count: () => Promise<number>;
  index: (name: string) => {
    getAllDesc: (
      query?: IDBValidKey | IDBKeyRange | null | undefined,
      count?: number | undefined,
    ) => Promise<T[]>;
    getAll: (
      query?: IDBValidKey | IDBKeyRange | null | undefined,
      count?: number | undefined,
    ) => Promise<T[]>;
    get: (query?: IDBValidKey | IDBKeyRange | null | undefined) => Promise<T>;
  };
}

function error(ev: Event) {
  return grantError(
    (ev.target as unknown as { error?: unknown } | null)?.error,
  );
}

const rejectedTrasactions = new WeakMap<IDBTransaction, boolean>();
function toPromise<T>(req: IDBRequest<T>) {
  const tx = req.transaction!;
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = (ev) => {
      rejectedTrasactions.set(tx, true);
      reject(error(ev));
    };
  });
}

function cursorToPromise<T>(
  req: IDBRequest<IDBCursorWithValue | null>,
  limit?: number,
) {
  return new Promise<T[]>((resolve, reject) => {
    const ret: T[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        ret.push(cursor.value);
        if (limit !== undefined && ret.length >= limit) {
          resolve(ret);
        } else {
          cursor.continue();
        }
      } else {
        resolve(ret);
      }
    };
    req.onerror = (ev) => {
      rejectedTrasactions.set(req.transaction!, true);
      reject(error(ev));
    };
  });
}

function createStoreHelper<T extends { id: number }>(
  storeName: string,
  tx: IDBTransaction,
) {
  const s = tx.objectStore(storeName);
  return {
    add: async (v: Exclude<T, 'id'>) => {
      return toPromise(s.add(v));
    },
    getAllDesc: (
      query?: IDBValidKey | IDBKeyRange | null | undefined,
      count?: number | undefined,
    ) => {
      return cursorToPromise(s.openCursor(query, 'prev'), count);
    },
    getAll: (
      query?: IDBValidKey | IDBKeyRange | null | undefined,
      count?: number | undefined,
    ) => {
      return toPromise(s.getAll(query, count));
    },
    get: async (id: number) => {
      const ret = await toPromise(s.getAll(IDBKeyRange.only(id)));
      return ret[0] || null;
    },
    remove: (id: number) => {
      return toPromise(s.delete(id));
    },
    put: async (v: T) => {
      if (!v.id) return Promise.reject(new Error('id is required'));
      return toPromise(s.put(v));
    },
    patch: async (v: Partial<T> & { id: number }) => {
      if (!v.id) return Promise.reject(new Error('id is required'));
      const old = (await toPromise(s.getAll(IDBKeyRange.only(v.id))))[0];
      if (!old) return Promise.reject(new Error('not found'));
      for (const k in v)
        if (v[k as keyof T] !== undefined) old[k] = v[k as keyof T];
      return toPromise(s.put(old));
    },
    count: () => {
      return toPromise(s.count());
    },
    index: (name: string) => {
      const idx = s.index(name);
      return {
        getAll: (
          query?: IDBValidKey | IDBKeyRange | null | undefined,
          count?: number | undefined,
        ) => toPromise(idx.getAll(query, count)),
        get: async (query: IDBValidKey) => {
          return (await toPromise(idx.getAll(query)))?.[0] ?? null;
        },
        getAllDesc: (
          query?: IDBValidKey | IDBKeyRange | null | undefined,
          count?: number | undefined,
        ) => {
          return cursorToPromise(idx.openCursor(query, 'prev'), count);
        },
      };
    },
  } as Store<T>;
}

export async function transaction0<R, T extends string>(
  db: IDBDatabase,
  names: T[],
  fn: (stores: { [k in T]: Store<unknown> }) => Promise<R>,
) {
  return new Promise<R>((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    let e: Error | null = null;
    let ret: R | undefined;
    tx.onerror = (ev) => {
      if (e) reject(grantError(e));
      else
        reject(grantError((ev.target as unknown as { error: unknown }).error));
    };
    tx.onabort = tx.onerror;
    tx.oncomplete = () => {
      resolve(ret!);
    };
    const stores = {} as { [k in T]: Store<unknown> };
    for (const name of names) {
      stores[name] = createStoreHelper(name, tx) as Store<unknown>;
    }
    fn(stores as { [k in T]: Store<unknown> }).then(
      (ret2) => {
        if (rejectedTrasactions.get(tx)) return;
        ret = ret2;
      },
      (e2) => {
        if (rejectedTrasactions.get(tx)) return;
        e = e2;
        tx.abort();
      },
    );
  });
}

export function openIndexedDb(
  schema: ([string] | [string, (string[] | string)[]])[],
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('PrioriDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, indexes] of schema) {
        const s = db.createObjectStore(name, {
          keyPath: 'id',
          autoIncrement: true,
        });
        if (indexes) {
          for (const i of indexes) {
            if (i instanceof Array) {
              const indexName = i
                .map((part, j) =>
                  j ? part[0].toUpperCase() + part.substring(1) : part,
                )
                .join('');
              s.createIndex(indexName, i);
            } else {
              s.createIndex(i, i);
            }
          }
        }
      }
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = (event) => {
      reject(grantError((event.target as unknown as { error: unknown }).error));
    };
  });
}
