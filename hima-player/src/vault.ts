type VaultRecord = { id: string; salt: string; iv: string; metaIv: string; cipher: ArrayBuffer; metaCipher: ArrayBuffer; createdAt: number }
export type VaultItem = { id: string; name: string; type: string; size: number; createdAt: number }

const DB_NAME = 'hema-secure-vault'
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'id' })
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
const get = async (id: string) => {
  const db = await open()
  return new Promise<VaultRecord | undefined>((resolve, reject) => {
    const req = db.transaction('records', 'readonly').objectStore('records').get(id)
    req.onsuccess = () => resolve(req.result as VaultRecord | undefined)
    req.onerror = () => reject(req.error)
  })
}
const put = async (record: VaultRecord) => {
  const db = await open()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite')
    tx.objectStore('records').put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
const remove = async (id: string) => {
  const db = await open()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite')
    tx.objectStore('records').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
const listRecords = async () => {
  const db = await open()
  return new Promise<VaultRecord[]>((resolve, reject) => {
    const req = db.transaction('records', 'readonly').objectStore('records').getAll()
    req.onsuccess = () => resolve((req.result as VaultRecord[]).filter((x) => x.id !== '__verifier__'))
    req.onerror = () => reject(req.error)
  })
}
const bytesToB64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (n) => String.fromCharCode(n)).join(''))
const b64ToBytes = (str: string) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
const encrypt = (key: CryptoKey, bytes: ArrayBuffer) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes).then((cipher) => ({ iv: bytesToB64(iv), cipher }))
}
const decrypt = (key: CryptoKey, iv: string, cipher: ArrayBuffer) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(iv) }, key, cipher)
const keyFor = async (pin: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
const verifier = async (pin: string) => {
  if (!globalThis.crypto?.subtle) throw new Error('VAULT_CRYPTO_UNAVAILABLE')
  const old = await get('__verifier__')
  if (old) {
    try {
      const key = await keyFor(pin, b64ToBytes(old.salt))
      const test = decoder.decode(await decrypt(key, old.metaIv, old.metaCipher))
      if (test !== 'HEMA_VAULT_V1') throw new Error('VAULT_WRONG_PIN')
      return { key, salt: old.salt }
    } catch { throw new Error('VAULT_WRONG_PIN') }
  }
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const salt = bytesToB64(saltBytes)
  const key = await keyFor(pin, saltBytes)
  const proof = await encrypt(key, encoder.encode('HEMA_VAULT_V1').buffer)
  await put({ id: '__verifier__', salt, iv: '', metaIv: proof.iv, cipher: new ArrayBuffer(0), metaCipher: proof.cipher, createdAt: Date.now() })
  return { key, salt }
}

export async function unlockVault(pin: string): Promise<boolean> {
  if (pin.length < 6) throw new Error('VAULT_PIN_TOO_SHORT')
  await verifier(pin)
  return true
}
export async function saveVaultFile(file: File, pin: string): Promise<void> {
  if (file.size > 120 * 1024 * 1024) throw new Error('VAULT_FILE_TOO_LARGE')
  const { key, salt } = await verifier(pin)
  const data = await file.arrayBuffer()
  const meta = encoder.encode(JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', size: file.size }))
  const [sealedFile, sealedMeta] = await Promise.all([encrypt(key, data), encrypt(key, meta.buffer)])
  await put({ id: crypto.randomUUID(), salt, iv: sealedFile.iv, metaIv: sealedMeta.iv, cipher: sealedFile.cipher, metaCipher: sealedMeta.cipher, createdAt: Date.now() })
}
export async function listVaultFiles(pin: string): Promise<VaultItem[]> {
  const { key } = await verifier(pin)
  const rows = await listRecords()
  const out: VaultItem[] = []
  for (const row of rows) {
    try {
      const meta = JSON.parse(decoder.decode(await decrypt(key, row.metaIv, row.metaCipher))) as { name: string; type: string; size: number }
      out.push({ id: row.id, name: meta.name, type: meta.type, size: meta.size, createdAt: row.createdAt })
    } catch { throw new Error('VAULT_RECORD_INVALID') }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}
export async function restoreVaultFile(id: string, pin: string): Promise<File> {
  const row = await get(id)
  if (!row || id === '__verifier__') throw new Error('VAULT_ITEM_NOT_FOUND')
  const { key } = await verifier(pin)
  const [plain, metadata] = await Promise.all([decrypt(key, row.iv, row.cipher), decrypt(key, row.metaIv, row.metaCipher)])
  const meta = JSON.parse(decoder.decode(metadata)) as { name: string; type: string }
  return new File([plain], meta.name, { type: meta.type, lastModified: row.createdAt })
}
export async function deleteVaultFile(id: string): Promise<void> {
  if (id === '__verifier__') throw new Error('VAULT_INVALID_DELETE')
  await remove(id)
}
