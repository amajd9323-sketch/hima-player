/** Separate IndexedDB so Yara's voice notes and photos never mix with the music library store. */
export type YaraBlob = { id: string; kind: 'voice' | 'photo' | 'bg'; at: number; blob: Blob; dur?: number }

const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('hema-yara', 1)
  r.onupgradeneeded = () => { r.result.createObjectStore('blobs', { keyPath: 'id' }) }
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})

const run = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  try {
    return await new Promise<T>((res, rej) => {
      const req = fn(db.transaction('blobs', mode).objectStore('blobs'))
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
  } finally { db.close() }
}

export const putBlob = (x: YaraBlob) => run('readwrite', (s) => s.put(x))
export const delBlob = (id: string) => run('readwrite', (s) => s.delete(id))
export const getBlob = (id: string) => run<YaraBlob | undefined>('readonly', (s) => s.get(id))
export const allBlobs = async (kind: YaraBlob['kind']) => (await run<YaraBlob[]>('readonly', (s) => s.getAll())).filter((x) => x.kind === kind)

/** Downscale a photo so a few memories do not fill the phone storage. */
export const shrinkImage = async (file: Blob, max = 1400): Promise<Blob> => {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k))
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()
    const out = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85))
    return out ?? file
  } catch { return file }
}

/** Share a file with the native sheet; fall back to a download when sharing files is unsupported. */
export const shareOrSave = async (blob: Blob, name: string, text: string): Promise<'shared' | 'saved' | 'cancelled'> => {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' })
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return 'shared' }
  } catch (e) { if ((e as DOMException)?.name === 'AbortError') return 'cancelled' }
  const a = document.createElement('a'); const u = URL.createObjectURL(blob)
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  window.setTimeout(() => URL.revokeObjectURL(u), 5000)
  return 'saved'
}
