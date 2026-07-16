import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import HeroCarousel from '../Components/HeroCarousel';
import { TrustStrip } from '../Components/Layout';
import { ProductRow, CategoryGrid, QuickView, SavedDrawer, OccasionsSection } from '../Components/ProductCard';
import { EditorialSection } from '../Components/EditorialSection';
import { VideoSection } from '../Components/VideoSection';
import useSaved from '../hooks/useSaved';

export default function Home() {
  const { props } = usePage();
  const { categories, featuredProducts, resortProducts, occasions, articles, videos, settings = {}, catalogCount = 0 } = props;

  const { saved, toggle } = useSaved();
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.palette = "riviera";
  }, []);

  const savedProducts = [...(featuredProducts || []), ...(resortProducts || [])].filter((p, i, a) => saved.has(p.id) && a.findIndex(x => x.id === p.id) === i);

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title="Curated Product Discovery"
        description={settings?.hero_subtitle || 'Discover editor-vetted fashion, beauty, home & lifestyle picks from trusted retailers, updated weekly.'}
        image={(featuredProducts || [])[0]?.image}
      />
      <div
        className="announce"
        dangerouslySetInnerHTML={{ __html: settings.announce_text || 'Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong>' }}
      />

      <HeroCarousel
        slides={(() => { try { return JSON.parse(settings.hero_slides || '[]'); } catch(e) { return []; } })()}
        settings={settings}
      />

      <TrustStrip />

      <CategoryGrid categories={categories} />

      <ProductRow
        id="featured"
        eyebrow={settings.featured_eyebrow || "Editor's Edit"}
        title={settings.featured_title || 'Featured Collection'}
        sub={settings.featured_sub || 'Hand-picked icons our editors are reaching for right now.'}
        items={featuredProducts || []}
        savedSet={saved}
        onToggle={toggle}
        onQuick={setQuick}
        dealCta="Buy Now"
      />

      <EditorialSection articles={articles} />

      <VideoSection videos={videos} />

      <ProductRow
        id="resort"
        eyebrow={settings.resort_eyebrow || 'Sun-soaked'}
        title={settings.resort_title || 'Resort Picks'}
        sub={settings.resort_sub || 'Everything you need for golden-hour escapes and poolside ease.'}
        items={resortProducts || []}
        savedSet={saved}
        onToggle={toggle}
        onQuick={setQuick}
        dealCta="Buy Now"
      />

      <OccasionsSection occasions={occasions} catalogCount={catalogCount} />

      <QuickView
        product={quick}
        saved={quick ? saved.has(quick.id) : false}
        onToggle={toggle}
        onClose={() => setQuick(null)}
        dealCta="Buy Now"
      />
      <SavedDrawer
        open={drawerOpen}
        products={savedProducts}
        onClose={() => setDrawerOpen(false)}
        onToggle={toggle}
        onQuick={(p) => { setDrawerOpen(false); setQuick(p); }}
      />
    </Layout>
  );
}
