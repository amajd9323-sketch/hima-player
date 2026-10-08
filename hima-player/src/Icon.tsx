const P: Record<string, string> = {
  play: 'M8 5v14l11-7z', pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  next: 'M6 18l8.5-6L6 6v12zM16 6h2v12h-2z', prev: 'M6 6h2v12H6zM9.5 12l8.5 6V6z',
  shuffle: 'M10.6 9.2L5.4 4 4 5.4l5.2 5.2 1.4-1.4zM14.5 4l2 2L4 18.5l1.4 1.4L18 7.4l2 2V4h-5.5zM14.8 13.4l-1.4 1.4 3.1 3.1-2 2H20v-5.5l-2 2-3.2-3z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  heart: 'M12 21l-1.5-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.2L12 21z',
  music: 'M12 3v10.6A4 4 0 1 0 14 17V7h4V3h-6z', video: 'M4 6h11a2 2 0 012 2v2l5-3v10l-5-3v2a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z',
  spark: 'M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z',
  search: 'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z',
  down: 'M7.4 8.6L12 13.2l4.6-4.6L18 10l-6 6-6-6 1.4-1.4z', close: 'M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
  timer: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8-6.4l1.4-1.4-1.5-1.5-1.4 1.4A8 8 0 1 0 20 14a8 8 0 0 0-1-6.4zM12 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z',
  eq: 'M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z', trash: 'M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  refresh: 'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.74 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  rew: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z', fwd: 'M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z',
}
export default function Icon({ n, s = 24 }: { n: keyof typeof P | string; s?: number }) {
  return <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor" aria-hidden><path d={P[n]} /></svg>
}
