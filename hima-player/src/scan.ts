import { Capacitor, registerPlugin } from '@capacitor/core'
export type Item = { id: string; title: string; uri: string; video: boolean; duration: number; size: number; height: number; artist?: string; folder?: string }
const P = registerPlugin<{ scan(o: { offset: number; limit: number }): Promise<{ items: Item[] }>; keepAlive(o: { on: boolean; title?: string }): Promise<void>; brightness(o: { value: number }): Promise<void>; requestPip(): Promise<void>; updateWidget(o: { title: string; artist: string; playing: boolean }): Promise<void>; consumeWidgetCommand(): Promise<{ command?: string }>; consumeSharedUrl(): Promise<{ url?: string }>; resolveTikTokUrl(o: { url: string }): Promise<{ url?: string }>; downloadMedia(o: { url: string; title?: string }): Promise<{ downloadId: number; fileName: string }>; extractAudio(o: { uri: string; title: string }): Promise<{ fileName: string; uri?: string }> }>('MediaScan')
export const canScan = () => Capacitor.isNativePlatform()
export async function scan(offset = 0, limit = 80) {
  const r = await P.scan({ offset, limit })
  return r.items.map((x) => ({ ...x, url: Capacitor.convertFileSrc(x.uri) }))
}
export const keepAlive = async (on: boolean, title?: string) => { if (canScan()) try { await P.keepAlive({ on, title }) } catch { /* ignore */ } }
export const nativeBright = async (value: number) => { if (canScan()) try { await P.brightness({ value }) } catch { /* ignore */ } }

export const requestPip = async () => { if (!canScan()) throw new Error('PIP_NATIVE_ONLY'); await P.requestPip() }

export const updateWidget = async (title: string, artist: string, playing: boolean) => { if (canScan()) try { await P.updateWidget({ title, artist, playing }) } catch { /* widget may not be installed yet */ } }
export const consumeWidgetCommand = async () => { if (!canScan()) return ''; try { return (await P.consumeWidgetCommand()).command ?? '' } catch { return '' } }
export const consumeSharedUrl = async () => { if (!canScan()) return ''; try { return (await P.consumeSharedUrl()).url ?? '' } catch { return '' } }
export const resolveTikTokUrl = async (url: string) => { if (!canScan()) return url; try { return (await P.resolveTikTokUrl({ url })).url ?? url } catch { return url } }

export const downloadMedia = async (url: string, title?: string) => { if (!canScan()) throw new Error('DOWNLOAD_NATIVE_ONLY'); return await P.downloadMedia({ url, title }) }
export const extractAudio = async (uri: string, title: string) => { if (!canScan()) throw new Error('CONVERSION_NATIVE_ONLY'); return await P.extractAudio({ uri, title }) }
