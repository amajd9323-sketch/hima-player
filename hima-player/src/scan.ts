import { Capacitor, registerPlugin } from '@capacitor/core'
export type Item = { id: string; title: string; uri: string; video: boolean; duration: number; size: number; height: number; artist?: string; album?: string; albumId?: string; folder?: string }
const P = registerPlugin<{ scan(o: { offset: number; limit: number }): Promise<{ items: Item[] }>; keepAlive(o: { on: boolean; title?: string }): Promise<void>; brightness(o: { value: number }): Promise<void>; requestPip(): Promise<void>; updateWidget(o: { title: string; artist: string; playing: boolean }): Promise<void>; consumeWidgetCommand(): Promise<{ command?: string }>; consumeSharedUrl(): Promise<{ url?: string }>; resolveTikTokUrl(o: { url: string }): Promise<{ url?: string }>; downloadMedia(o: { url: string; title?: string }): Promise<{ downloadId: number; fileName: string }>; extractAudio(o: { uri: string; title: string; startMs?: number; endMs?: number }): Promise<{ fileName: string; uri?: string }>; getVideoThumbnail(o: { uri: string }): Promise<{ dataUrl: string }>; getGenres(): Promise<{ items: { id: string; genre: string }[] }>; discoverCastDevices(): Promise<{ devices: { id: string; name: string }[] }>; castMedia(o: { deviceId: string; uri: string; title: string; video: boolean }): Promise<{ url?: string }>; stopCast(o: { deviceId: string }): Promise<{ stopped: boolean }>; setHeadphonePause(o: { enabled: boolean }): Promise<void>; addListener(eventName: 'audioNoisy', listenerFunc: (event: { reason?: string }) => void): Promise<{ remove: () => Promise<void> }> }>('MediaScan')
export const canScan = () => Capacitor.isNativePlatform()
export async function scan(offset = 0, limit = 80) {
  const r = await P.scan({ offset, limit })
  return r.items.map((x) => ({ ...x, url: Capacitor.convertFileSrc(x.uri) }))
}
export const keepAlive = async (on: boolean, title?: string) => { if (canScan()) try { await P.keepAlive({ on, title }) } catch { /* ignore */ } }
export const nativeBright = async (value: number) => { if (canScan()) try { await P.brightness({ value }) } catch { /* ignore */ } }
export const setHeadphonePause = async (enabled: boolean) => { if (canScan()) await P.setHeadphonePause({ enabled }) }
export const addAudioNoisyListener = async (listener: () => void) => { if (!canScan()) return null; return await P.addListener('audioNoisy', () => listener()) }

export const requestPip = async () => { if (!canScan()) throw new Error('PIP_NATIVE_ONLY'); await P.requestPip() }

export const updateWidget = async (title: string, artist: string, playing: boolean) => { if (canScan()) try { await P.updateWidget({ title, artist, playing }) } catch { /* widget may not be installed yet */ } }
export const consumeWidgetCommand = async () => { if (!canScan()) return ''; try { return (await P.consumeWidgetCommand()).command ?? '' } catch { return '' } }
export const consumeSharedUrl = async () => { if (!canScan()) return ''; try { return (await P.consumeSharedUrl()).url ?? '' } catch { return '' } }
export const resolveTikTokUrl = async (url: string) => { if (!canScan()) return url; try { return (await P.resolveTikTokUrl({ url })).url ?? url } catch { return url } }

export const downloadMedia = async (url: string, title?: string) => { if (!canScan()) throw new Error('DOWNLOAD_NATIVE_ONLY'); return await P.downloadMedia({ url, title }) }
export const extractAudio = async (uri: string, title: string, startMs = 0, endMs = 0) => { if (!canScan()) throw new Error('CONVERSION_NATIVE_ONLY'); return await P.extractAudio({ uri, title, startMs, endMs }) }
const videoThumbCache = new Map<string, string>()
export const getVideoThumbnail = async (uri: string) => {
  const cached = videoThumbCache.get(uri)
  if (cached) return cached
  const { dataUrl } = await P.getVideoThumbnail({ uri })
  if (dataUrl) { videoThumbCache.set(uri, dataUrl); while (videoThumbCache.size > 50) { const first = videoThumbCache.keys().next().value; if (!first) break; videoThumbCache.delete(first) } }
  return dataUrl ?? ''
}
export const getGenres = async () => { if (!canScan()) return []; return (await P.getGenres()).items ?? [] }
export const discoverCastDevices = async () => { if (!canScan()) return []; return (await P.discoverCastDevices()).devices ?? [] }
export const castMedia = async (deviceId: string, uri: string, title: string, video: boolean) => { if (!canScan()) throw new Error('CAST_NATIVE_ONLY'); return await P.castMedia({ deviceId, uri, title, video }) }
export const stopCast = async (deviceId: string) => { if (!canScan()) throw new Error('CAST_NATIVE_ONLY'); return await P.stopCast({ deviceId }) }
