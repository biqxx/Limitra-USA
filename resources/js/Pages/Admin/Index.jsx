import { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import I from '../../Components/Icons';
import Seo from '../../Components/Seo';
import { AdmTabSkeleton, LogoutButton, useLookup } from '../../Components/Admin/AdminShared';
import Dashboard from '../../Components/Admin/Dashboard';
import AnalyticsView from '../../Components/Admin/AnalyticsView';
import ProductsView from '../../Components/Admin/ProductsView';
import CategoriesView from '../../Components/Admin/CategoriesView';
import LooksView from '../../Components/Admin/LooksView';
import VideosAdminView from '../../Components/Admin/VideosView';
import JournalView from '../../Components/Admin/JournalView';
import GuidesAdminView from '../../Components/Admin/GuidesView';
import StaticPagesAdminView from '../../Components/Admin/StaticPagesView';
import OccasionsAdminView from '../../Components/Admin/OccasionsView';
import SettingsView from '../../Components/Admin/SettingsView';
import BulkImportsView from '../../Components/Admin/BulkImportsView';

// Which Inertia prop each tab needs. These are lazy ("optional") props on the
// server (see AdminController::index) — nothing is fetched for them on first
// paint, and nothing auto-fetches them afterwards either. The first time the
// admin opens a tab, goTo() below requests exactly that prop via a partial
// reload; after that it's cached in page props and re-opening the tab is free.
// 'dashboard' and 'categories' aren't listed here because their data is eager
// (present on every page load) — they never need a fetch.
const VIEW_PROPS = {
  analytics: ['analytics'],
  products: ['products'],
  looks: ['looks'],
  videos: ['videos'],
  journal: ['articles'],
  guides: ['guides'],
  'static-pages': ['staticPages'],
  occasions: ['occasions'],
  'bulk-imports': ['bulkImports'],
  settings: ['settings'],
};

// Tabs whose editor needs the full cross-catalog product picker/lookup —
// fetched once, the first time any of these tabs is opened, then shared.
const NEEDS_PRODUCTS_LOOKUP = new Set(['products', 'looks', 'videos', 'journal', 'guides', 'occasions']);

export default function AdminIndex() {
  const { props } = usePage();
  const {
    products, categories = [], occasions, articles, guides, staticPages, looks, videos, settings, bulkImports, analytics,
    productsCount = 0, featuredCount = 0, resortCount = 0, linkedCount = 0, recentProducts = [], pendingImportsCount = 0,
  } = props;

  const [view, setView] = useState('dashboard');
  const [loadedViews, setLoadedViews] = useState(() => new Set());
  const [viewLoading, setViewLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [productsLookupNeeded, setProductsLookupNeeded] = useState(false);
  const productsLookup = useLookup(productsLookupNeeded ? '/admin/products/lookup' : null);

  useEffect(() => {
    document.documentElement.dataset.palette = 'riviera';
    const loader = document.getElementById('site-loader');
    if (loader) { loader.classList.add('sl-done'); setTimeout(() => loader.remove(), 600); }
  }, []);

  const admToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const goTo = (key) => {
    setView(key);
    if (NEEDS_PRODUCTS_LOOKUP.has(key)) setProductsLookupNeeded(true);
    const only = VIEW_PROPS[key];
    if (only && !loadedViews.has(key)) {
      setViewLoading(true);
      router.reload({
        only,
        preserveState: true,
        preserveScroll: true,
        onFinish: () => setViewLoading(false),
        onSuccess: () => setLoadedViews((s) => new Set(s).add(key)),
      });
    }
  };

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'analytics', label: 'Analytics', icon: 'chart' },
    { key: 'products', label: 'Products', icon: 'box', badge: productsCount },
    { key: 'categories', label: 'Categories', icon: 'sparkle' },
    { key: 'looks', label: 'Style the Look', icon: 'bookmark' },
    { key: 'videos', label: 'Videos', icon: 'image' },
    { key: 'journal', label: 'Journal', icon: 'link' },
    { key: 'guides', label: 'Guides', icon: 'box' },
    { key: 'static-pages', label: 'Site Pages', icon: 'grid' },
    { key: 'occasions', label: 'Occasions', icon: 'heart' },
    { key: 'bulk-imports', label: 'Bulk Uploads', icon: 'upload', badge: pendingImportsCount || null },
    { key: 'settings', label: 'Settings', icon: 'edit' },
  ];

  return (
    <div className="adm-body">
      <Seo title="Admin Dashboard" noIndex />
      <div className="adm-top">
        <span className="word">LIMITRA</span>
        <span className="tag">Admin</span>
        <span className="spacer"></span>
        <a href="/" target="_blank" rel="noopener"><I.store /> View storefront</a>
        <LogoutButton />
      </div>
      <div className="adm-shell">
        <aside className="adm-side">
          <div className="grp">Manage</div>
          {nav.map((n) => {
            const Icon = I[n.icon];
            return (
              <button key={n.key} className={'adm-nav' + (view === n.key ? ' active' : '')} onClick={() => goTo(n.key)}>
                <Icon /> {n.label}
                {n.badge != null && <span className="badge">{n.badge}</span>}
              </button>
            );
          })}
          <div className="side-foot">Data is stored in the database. Use standard backups to export.</div>
        </aside>

        <main className="adm-main">
          {view === 'dashboard' && (
            <Dashboard
              productsCount={productsCount} featuredCount={featuredCount} resortCount={resortCount} linkedCount={linkedCount}
              recentProducts={recentProducts} onGo={goTo}
            />
          )}
          {view === 'analytics' && (
            loadedViews.has('analytics') ? <AnalyticsView analytics={analytics} /> : <AdmTabSkeleton />
          )}
          {view === 'products' && (
            loadedViews.has('products')
              ? <ProductsView products={products} categories={categories} productsLookup={productsLookup} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'categories' && (
            <CategoriesView categories={categories} onToast={admToast} />
          )}
          {view === 'looks' && (
            loadedViews.has('looks')
              ? <LooksView looks={looks} productsLookup={productsLookup} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'videos' && (
            loadedViews.has('videos')
              ? <VideosAdminView videos={videos} productsLookup={productsLookup} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'journal' && (
            loadedViews.has('journal')
              ? <JournalView articles={articles} productsLookup={productsLookup} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'guides' && (
            loadedViews.has('guides')
              ? <GuidesAdminView guides={guides} productsLookup={productsLookup} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'static-pages' && (
            loadedViews.has('static-pages')
              ? <StaticPagesAdminView staticPages={staticPages} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'occasions' && (
            loadedViews.has('occasions')
              ? <OccasionsAdminView occasions={occasions} categories={categories} productsLookup={productsLookup} onToast={admToast} />
              : <AdmTabSkeleton />
          )}
          {view === 'bulk-imports' && (
            loadedViews.has('bulk-imports') ? <BulkImportsView batches={bulkImports} /> : <AdmTabSkeleton />
          )}
          {view === 'settings' && (
            loadedViews.has('settings') ? <SettingsView settings={settings} onToast={admToast} /> : <AdmTabSkeleton />
          )}
        </main>
      </div>

      {toast && (
        <div className="adm-toast"><I.check /> {toast}</div>
      )}
    </div>
  );
}
