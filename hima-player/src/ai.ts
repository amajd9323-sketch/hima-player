const URL_ = import.meta.env.VITE_AI_URL as string | undefined
export async function aiOrder(prompt: string, titles: string[]): Promise<number[]> {
  if (!URL_) throw new Error('AI_URL_MISSING')
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, titles }) })
  if (!r.ok) throw new Error('AI_HTTP_' + r.status)
  return ((await r.json()).order as number[]) ?? []
}
