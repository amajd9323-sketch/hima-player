export type Rec = { id: string; title: string; video: boolean; fav?: boolean; at: number; blob: Blob }
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('hema', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('f', { keyPath: 'id' })
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
})
const run = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  return new Promise<T>((res, rej) => { const r = fn(db.transaction('f', mode).objectStore('f')); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}
export const all = () => run<Rec[]>('readonly', (s) => s.getAll())
export const put = (x: Rec) => run('readwrite', (s) => s.put(x))
export const del = (id: string) => run('readwrite', (s) => s.delete(id))
