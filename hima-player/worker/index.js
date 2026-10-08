// Cloudflare Worker. Secret: wrangler secret put ANTHROPIC_API_KEY
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' }
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors })
    const { prompt, titles } = await req.json()
    if (typeof prompt !== 'string' || !Array.isArray(titles) || titles.length > 500) return new Response('bad req', { status: 400, headers: cors })
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5', max_tokens: 500,
        system: 'You order a playlist. Reply ONLY with a JSON array of track indices (0-based), best match first, only relevant tracks. No prose.',
        messages: [{ role: 'user', content: `Request: ${prompt.slice(0, 300)}\nTracks:\n${titles.map((t, i) => `${i}: ${String(t).slice(0, 100)}`).join('\n')}` }]
      })
    })
    if (!r.ok) return new Response('upstream ' + r.status, { status: 502, headers: cors })
    const text = (await r.json()).content?.[0]?.text ?? '[]'
    let order = []
    try { order = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]') } catch {}
    return new Response(JSON.stringify({ order }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }
}
