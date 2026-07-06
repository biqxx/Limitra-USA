import './bootstrap';
import '../css/app.css';
import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

// When an authenticated admin's session expires, mutating requests come back as
// a 419 (CSRF/session mismatch) non-Inertia response. Rather than showing the
// default error modal, bounce the user to the login screen so they're cleanly
// logged out. Scoped to /admin so a stale token on a public form (e.g. the
// newsletter signup) never yanks a visitor to the login page.
router.on('invalid', (event) => {
    const status = event.detail?.response?.status;
    if (status === 419 && window.location.pathname.startsWith('/admin')) {
        event.preventDefault();
        window.location.href = '/admin/login';
    }
});

createInertiaApp({
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#cf8a32' },
});
