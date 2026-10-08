import { Capacitor, registerPlugin } from '@capacitor/core'
export type Item = { id: string; title: string; uri: string; video: boolean; duration: number; size: number; height: number; artist?: string }
const P = registerPlugin<{ scan(): Promise<{ items: Item[] }> }>('MediaScan')
export const canScan = () => Capacitor.isNativePlatform()
export async function scan() {
  const r = await P.scan()
  return r.items.map((x) => ({ ...x, url: Capacitor.convertFileSrc(x.uri) }))
}
