import { useState, useEffect } from 'react';
import { usePage, Deferred } from '@inertiajs/react';
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

export default function AdminIndex() {
  const { props } = usePage();
  const {
    products, categories = [], occasions, articles, guides, staticPages, looks, videos, settings = {}, bulkImports, analytics = {},
    productsCount = 0, featuredCount = 0, resortCount = 0, linkedCount = 0, recentProducts = [], pendingImportsCount = 0,
  } = props;

  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Every admin list is server-paginated now — pages only carry their own rows.
  // Features that need to see the *entire* product catalog (the cross-editor
  // product picker in Looks/Videos/Journal/Guides/Occasions, plus Products'
  // own slug-uniqueness + bulk-import matching) share this one lightweight
  // fetch instead of each view re-fetching its own copy.
  const productsLookup = useLookup('/admin/products/lookup');

  useEffect(() => {
    document.documentElement.dataset.palette = 'riviera';
    const loader = document.getElementById('site-loader');
    if (loader) { loader.classList.add('sl-done'); setTimeout(() => loader.remove(), 600); }
  }, []);

  const admToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

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
              <button key={n.key} className={'adm-nav' + (view === n.key ? ' active' : '')} onClick={() => setView(n.key)}>
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
              recentProducts={recentProducts} onGo={setView}
            />
          )}
          {view === 'analytics' && (
            <Deferred data="analytics" fallback={<AdmTabSkeleton />}>
              <AnalyticsView analytics={analytics} />
            </Deferred>
          )}
          {view === 'products' && (
            <Deferred data={['products', 'categories']} fallback={<AdmTabSkeleton />}>
              <ProductsView products={products} categories={categories} productsLookup={productsLookup} onToast={admToast} />
            </Deferred>
          )}
          {view === 'categories' && (
            <Deferred data="categories" fallback={<AdmTabSkeleton />}>
              <CategoriesView categories={categories} onToast={admToast} />
            </Deferred>
          )}
          {view === 'looks' && (
            <Deferred data="looks" fallback={<AdmTabSkeleton />}>
              <LooksView looks={looks} productsLookup={productsLookup} onToast={admToast} />
            </Deferred>
          )}
          {view === 'videos' && (
            <Deferred data="videos" fallback={<AdmTabSkeleton />}>
              <VideosAdminView videos={videos} productsLookup={productsLookup} onToast={admToast} />
            </Deferred>
          )}
          {view === 'journal' && (
            <Deferred data="articles" fallback={<AdmTabSkeleton />}>
              <JournalView articles={articles} productsLookup={productsLookup} onToast={admToast} />
            </Deferred>
          )}
          {view === 'guides' && (
            <Deferred data="guides" fallback={<AdmTabSkeleton />}>
              <GuidesAdminView guides={guides} productsLookup={productsLookup} onToast={admToast} />
            </Deferred>
          )}
          {view === 'static-pages' && (
            <Deferred data="staticPages" fallback={<AdmTabSkeleton />}>
              <StaticPagesAdminView staticPages={staticPages} onToast={admToast} />
            </Deferred>
          )}
          {view === 'occasions' && (
            <Deferred data={['occasions', 'categories']} fallback={<AdmTabSkeleton />}>
              <OccasionsAdminView occasions={occasions} categories={categories} productsLookup={productsLookup} onToast={admToast} />
            </Deferred>
          )}
          {view === 'bulk-imports' && (
            <Deferred data="bulkImports" fallback={<AdmTabSkeleton />}>
              <BulkImportsView batches={bulkImports} />
            </Deferred>
          )}
          {view === 'settings' && (
            <Deferred data="settings" fallback={<AdmTabSkeleton />}>
              <SettingsView settings={settings} onToast={admToast} />
            </Deferred>
          )}
        </main>
      </div>

      {toast && (
        <div className="adm-toast"><I.check /> {toast}</div>
      )}
    </div>
  );
}
