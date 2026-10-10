import { Capacitor, registerPlugin } from '@capacitor/core'
export type Item = { id: string; title: string; uri: string; video: boolean; duration: number; size: number; height: number; artist?: string; folder?: string }
const P = registerPlugin<{ scan(): Promise<{ items: Item[] }>; keepAlive(o: { on: boolean; title?: string }): Promise<void>; brightness(o: { value: number }): Promise<void>; requestPip(): Promise<void> }>('MediaScan')
export const canScan = () => Capacitor.isNativePlatform()
export async function scan() {
  const r = await P.scan()
  return r.items.map((x) => ({ ...x, url: Capacitor.convertFileSrc(x.uri) }))
}
export const keepAlive = async (on: boolean, title?: string) => { if (canScan()) try { await P.keepAlive({ on, title }) } catch { /* ignore */ } }
export const nativeBright = async (value: number) => { if (canScan()) try { await P.brightness({ value }) } catch { /* ignore */ } }

export const requestPip = async () => { if (!canScan()) throw new Error('PIP_NATIVE_ONLY'); await P.requestPip() }
