const URL_ = import.meta.env.VITE_AI_URL as string | undefined

export async function aiOrder(prompt: string, titles: string[]): Promise<number[]> {
  if (!URL_) throw new Error('AI_URL_MISSING')
  if (!prompt.trim() || titles.length === 0) return []

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20000)
  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.trim().slice(0, 500), titles: titles.slice(0, 500) }),
      signal: controller.signal,
    })
    if (!r.ok) throw new Error('AI_HTTP_' + r.status)
    const data: unknown = await r.json()
    const raw = (data as { order?: unknown } | null)?.order
    if (!Array.isArray(raw)) throw new Error('AI_INVALID_RESPONSE')

    // Ignore malformed, duplicate, and out-of-range indexes from external AI services.
    const seen = new Set<number>()
    return raw.filter((n): n is number => {
      if (!Number.isInteger(n) || (n as number) < 0 || (n as number) >= titles.length || seen.has(n as number)) return false
      seen.add(n as number)
      return true
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('AI_TIMEOUT')
    throw e
  } finally {
    window.clearTimeout(timeout)
  }
}
