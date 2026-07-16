import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage } from '@inertiajs/react';

const SAVED_KEY = 'limitra.saved.v1';

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
        setSaved(new Set(data.productIds || []));
        localStorage.removeItem(SAVED_KEY);
      })
      .catch(() => {});
  }, [user]);

  const toggle = useCallback((id) => {
    if (!user) {
      setSaved((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
      return;
    }
    setSaved((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      body: JSON.stringify({ product_id: id }),
    }).catch(() => {});
  }, [user]);

  return { saved, toggle };
}
