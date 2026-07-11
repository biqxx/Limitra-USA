const I = {
  search: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
    </svg>
  ),
  heart: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...p}>
      <path d="M12 20.5 4.5 13a4.6 4.6 0 0 1 6.5-6.5l1 1 1-1A4.6 4.6 0 0 1 19.5 13Z" />
    </svg>
  ),
  user: (p) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}>
      <circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  star: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="m12 2 2.9 6 6.6.6-5 4.3 1.5 6.5L12 16.8 6 19.4l1.5-6.5-5-4.3 6.6-.6Z" />
    </svg>
  ),
  check: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  ),
  close: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  external: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 4h6v6M20 4 10 14M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  ),
  lock: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  trash: (p) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h10l1-13" />
    </svg>
  ),
  link: (p) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 15 15 9M10.5 6.5l1.8-1.8a4 4 0 0 1 5.7 5.7l-1.8 1.8M13.5 17.5l-1.8 1.8a4 4 0 0 1-5.7-5.7l1.8-1.8" />
    </svg>
  ),
  sparkle: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...p}>
      <path d="M12 3v4M12 17v4M5 12H1M23 12h-4M12 8.5 13.4 11 16 12l-2.6 1L12 15.5 10.6 13 8 12l2.6-1Z" />
    </svg>
  ),
  bookmark: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...p}>
      <path d="M6 4h12v16l-6-4-6 4Z" />
    </svg>
  ),
  shield: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...p}>
      <path d="M12 3 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6Z" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  facebook: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M14 9h3V6h-3c-2 0-3.5 1.5-3.5 3.5V11H8v3h2.5v7h3v-7H16l.5-3h-3V9.6c0-.4.3-.6.6-.6Z"/></svg>),
  x: (p) => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M17.5 3h3l-6.6 7.6L21.8 21h-5.9l-4.3-5.6L6.5 21h-3l7-8L2.7 3h6l3.9 5.2Zm-1 16h1.6L8 4.6H6.3Z"/></svg>),
  pinterest: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.2-1.9 0-2.7l1.2-4.9s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.2 1 .5 1.9 1.6 1.9 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.1-3.8a4.7 4.7 0 0 0-4.9 4.7c0 .9.3 1.5.7 2 .2.2.2.3.1.5l-.2.9c-.1.3-.3.4-.6.2-1.2-.5-1.7-1.9-1.7-3.4 0-2.5 2.1-5.5 6.3-5.5 3.4 0 5.6 2.4 5.6 5.1 0 3.5-1.9 6-4.8 6-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.7 1.7-1 2.3A9 9 0 1 0 12 3Z"/></svg>),
  whatsapp: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 16.4c-1.4 0-2.8-.4-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1 1 12 19.4Zm4.1-5.5c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6 6 0 0 1-3-2.6c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.7.3-.9.9-.9 2.1-.1 3.4a9.6 9.6 0 0 0 4 3.5c1.6.7 2.2.6 3 .5.5-.1 1.3-.6 1.5-1.1.2-.5.2-1 .1-1.1Z"/></svg>),
  mail: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>),
  instagram: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/></svg>),
  tiktok: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.17 1.39.72 2.73 1.62 3.76 1.04 1.06 2.46 1.67 3.88 1.82v3.85c-1.38-.06-2.75-.42-3.96-1.06-.52-.27-1-.59-1.47-.95-.01 2.92.01 5.84-.02 8.75-.07 1.37-.52 2.72-1.3 3.84a6.77 6.77 0 0 1-5.51 2.84 6.66 6.66 0 0 1-4.23-1.52 6.8 6.8 0 0 1-2.5-5.11c-.02-.46 0-.91.04-1.36.35-2.65 2.22-4.96 4.77-5.77.91-.28 1.87-.38 2.82-.32.01 1.39-.03 2.78-.04 4.18-.53-.15-1.1-.14-1.62.06a3.08 3.08 0 0 0-2.01 2.59c-.04.55.05 1.12.26 1.63a3.1 3.1 0 0 0 3.03 1.92 3.07 3.07 0 0 0 2.64-1.75c.19-.4.29-.85.3-1.3.01-4.33 0-8.65.02-12.97z"/></svg>),
  plus: (p) => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  edit: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/></svg>),
  grid: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>),
  box: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>),
  star2: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...p}><path d="m12 3 2.6 5.6L21 9.3l-4.5 4.2 1.2 6.2L12 16.8 6.3 19.7l1.2-6.2L3 9.3l6.4-.7Z"/></svg>),
  download: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/></svg>),
  upload: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20V9m0 0 4 4m-4-4-4 4M5 4h14"/></svg>),
  eye: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>),
  image: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>),
  back: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>),
  store: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...p}><path d="M4 9h16l-1-4H5L4 9Zm0 0v10h16V9M9 19v-5h6v5"/></svg>),
  chart: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20V10M11 20V4M18 20v-7"/></svg>),
  trendUp: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>),
  trendDown: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg>),
};

export default I;
