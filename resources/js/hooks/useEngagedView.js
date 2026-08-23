import { useEffect } from 'react';

/**
 * Counts a content view only after a visitor has spent time on the page and
 * performed a real interaction. This keeps server-rendering crawlers and
 * prefetches out of engagement analytics.
 */
export default function useEngagedView(endpoint) {
  useEffect(() => {
    if (!endpoint || typeof window === 'undefined') return undefined;

    let interacted = false;
    let eligible = false;
    let sent = false;

    const send = () => {
      if (sent || !eligible || !interacted || document.visibilityState !== 'visible') return;
      sent = true;
      const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ source_page: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    };

    const interact = () => { interacted = true; send(); };
    const timer = window.setTimeout(() => { eligible = true; send(); }, 5000);
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, interact, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, interact));
    };
  }, [endpoint]);
}
