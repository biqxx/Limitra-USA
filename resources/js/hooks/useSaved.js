import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage } from '@inertiajs/react';

const SAVED_KEY = 'limitra.saved.v1';
const SAVED_CHANGED_EVENT = 'limitra:saved-changed';

function loadLocal() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')); }
  catch (e) { return new Set(); }
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

export default function useSaved() {
  const { props } = usePage();
  const user = props.auth?.user || null;
  const [saved, setSaved] = useState(loadLocal);
  const mergedRef = useRef(false);

  // Multiple components can have their own hook instance (for example the AI chat
  // and the page header). Keep those instances synchronized immediately in the
  // same tab; the browser's native storage event only fires in other tabs.
  useEffect(() => {
    const sync = (event) => {
      if (Array.isArray(event.detail?.ids)) setSaved(new Set(event.detail.ids));
    };
    window.addEventListener(SAVED_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SAVED_CHANGED_EVENT, sync);
  }, []);

  const announce = (ids) => {
    window.dispatchEvent(new CustomEvent(SAVED_CHANGED_EVENT, { detail: { ids: [...ids] } }));
  };

  // Guest: mirror to localStorage exactly as every page did before.
  useEffect(() => {
    if (user) return;
    localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
  }, [saved, user]);

  // On login: merge any local guest IDs into the account once, then adopt server state.
  useEffect(() => {
    if (!user || mergedRef.current) return;
    mergedRef.current = true;

    const localIds = [...loadLocal()];
    const csrf = getCsrfToken();

    const request = localIds.length
      ? fetch('/api/favorites/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
          body: JSON.stringify({ product_ids: localIds }),
        })
      : fetch('/api/favorites');

    request
      .then((r) => r.json())
      .then((data) => {
        const ids = data.productIds || [];
        setSaved(new Set(ids));
        announce(ids);
        localStorage.removeItem(SAVED_KEY);
      })
      .catch(() => {});
  }, [user]);

  const toggle = useCallback((id) => {
    setSaved((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      announce(n);
      return n;
    });
    if (!user) return;
    fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      body: JSON.stringify({ product_id: id }),
    }).catch(() => {});
  }, [user]);

  return { saved, toggle };
}
