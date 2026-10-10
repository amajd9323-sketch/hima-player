export type TrackMeta = { id: string; title?: string; artist?: string; cover?: Blob; updatedAt: number }
const DB = 'hema-track-meta'
const STORE = 'tracks'
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(DB, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})
export async function allTrackMeta(): Promise<TrackMeta[]> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as TrackMeta[])
    req.onerror = () => reject(req.error)
  })
}
export async function saveTrackMeta(meta: TrackMeta): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...meta, updatedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
export async function deleteTrackMeta(id: string): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
