import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/product/ProductCard';
import ProductImage from '../../components/product/ProductImage';
import SectionHeading from '../../components/layout/SectionHeading';
import StarRating from '../../components/review/StarRating';
import { Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';
import { errMsg } from '../../components/Toast';
import { productService } from '../../services/productService';
import { artisanService } from '../../services/artisanService';
import { workshopService } from '../../services/workshopService';
import { craftStoryService } from '../../services/craftStoryService';
import { inr } from '../../utils/format';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const upcomingSlot = (workshop) => {
  const slots = (workshop.schedule || [])
    .filter((s) => s.date && new Date(s.date).getTime() > Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return slots[0] || null;
};

const CATEGORIES = [
  { name: 'Textiles', emoji: '🧵', desc: 'Handwoven fabrics & garments' },
  { name: 'Pottery', emoji: '🏺', desc: 'Terracotta & ceramic artistry' },
  { name: 'Jewelry', emoji: '💎', desc: 'Traditional metal & beadwork' },
  { name: 'Woodwork', emoji: '🪵', desc: 'Carved furniture & decor' },
  { name: 'Metalwork', emoji: '⚱️', desc: 'Brass & bronze craftsmanship' },
  { name: 'Painting', emoji: '🎨', desc: 'Miniature & folk art' },
  { name: 'Embroidery', emoji: '🪡', desc: 'Intricate thread work' },
  { name: 'Sculpture', emoji: '🗿', desc: 'Stone & wood carvings' },
];

// Offsets that give the hero collage a gallery-wall rhythm.
const COLLAGE = [
  { height: 'h-44 md:h-56', emoji: '🏺' },
  { height: 'h-40 md:h-48', emoji: '🧵', offset: 'md:pt-12' },
  { height: 'h-40 md:h-48', emoji: '🎨' },
  { height: 'h-44 md:h-56', emoji: '💎', offset: 'md:-mt-4' },
];

const emptySection = { items: [], error: null };

function Home() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [products, setProducts] = useState(emptySection);
  const [artisans, setArtisans] = useState(emptySection);
  const [workshops, setWorkshops] = useState(emptySection);
  const [stories, setStories] = useState(emptySection);
  // Counts that came back from the database; a stat is only rendered when its
  // request actually succeeded (never a hard-coded number).
  const [stats, setStats] = useState({ products: null, artisans: null, workshops: null });

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);

    const [p, a, w, s] = await Promise.allSettled([
      productService.getAll({ limit: 8, sort: '-createdAt' }),
      artisanService.getAll({ limit: 3, sort: '-rating' }),
      workshopService.getAll({ limit: 6 }),
      craftStoryService.getAll({ limit: 3 }),
    ]);

    if ([p, a, w, s].every((r) => r.status === 'rejected')) {
      setPageError(errMsg(p.reason, 'Failed to load the homepage'));
      setLoading(false);
      return;
    }

    setProducts(
      p.status === 'fulfilled'
        ? { items: p.value.data.products || [], error: null }
        : { items: [], error: errMsg(p.reason, 'Failed to load products') }
    );
    setArtisans(
      a.status === 'fulfilled'
        ? { items: a.value.data.artisans || [], error: null }
        : { items: [], error: errMsg(a.reason, 'Failed to load artisans') }
    );
    setStories(
      s.status === 'fulfilled'
        ? { items: s.value.data.stories || [], error: null }
        : { items: [], error: errMsg(s.reason, 'Failed to load stories') }
    );

    if (w.status === 'fulfilled') {
      const list = w.value.data.workshops || [];
      // Newest schedule first for dated workshops; undated ones follow.
      list.sort((x, y) => {
        const sx = upcomingSlot(x)?.date;
        const sy = upcomingSlot(y)?.date;
        if (sx && sy) return new Date(sx) - new Date(sy);
        if (sx) return -1;
        if (sy) return 1;
        return new Date(y.createdAt || 0) - new Date(x.createdAt || 0);
      });
      setWorkshops({ items: list, error: null });
      setStats({
        products: p.status === 'fulfilled' ? p.value.data.total ?? null : null,
        artisans: a.status === 'fulfilled' ? a.value.data.total ?? null : null,
        workshops: w.value.data.total ?? null,
      });
    } else {
      setWorkshops({ items: [], error: errMsg(w.reason, 'Failed to load workshops') });
      setStats({
        products: p.status === 'fulfilled' ? p.value.data.total ?? null : null,
        artisans: a.status === 'fulfilled' ? a.value.data.total ?? null : null,
        workshops: null,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    { key: 'artisans', value: stats.artisans, label: 'Verified artisans', to: '/artisans' },
    { key: 'products', value: stats.products, label: 'Handmade products', to: '/products' },
    { key: 'workshops', value: stats.workshops, label: 'Live workshops', to: '/workshops' },
  ].filter((stat) => stat.value !== null && stat.value !== undefined);

  const viewAll = (to) => (
    <Link
      to={to}
      className="hidden border-b border-terracotta pb-0.5 text-sm font-semibold text-terracotta-dark transition hover:border-ink hover:text-ink sm:block"
    >
      View all →
    </Link>
  );

  const collageColumns = [
    [COLLAGE[0], COLLAGE[2]],
    [COLLAGE[1], COLLAGE[3]],
  ];

  return (
    <div>
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden border-b border-ink/10 bg-parchment py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="flex-1 text-center md:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-saffron-dark">
                Handmade in India
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] text-ink md:text-5xl">
                Preserving heritage,
                <br />
                <span className="italic text-terracotta-dark">one craft at a time</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-soft md:mx-0">
                Discover authentic handmade products from India&apos;s finest traditional artisans.
                Every purchase supports local communities and preserves centuries-old craftsmanship.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
                <Link
                  to="/products"
                  className="rounded-sm bg-terracotta px-8 py-3.5 font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                >
                  Explore Products
                </Link>
                <Link
                  to="/artisans"
                  className="rounded-sm border-2 border-ink/25 px-8 py-3.5 font-semibold text-ink transition hover:border-terracotta hover:text-terracotta-dark"
                >
                  Meet Artisans
                </Link>
              </div>
            </div>

            {/* collage of real product photos, with emoji tiles as fallback */}
            <div className="flex flex-1 justify-center">
              <div className="grid w-full max-w-md grid-cols-2 gap-4">
                {collageColumns.map((column, ci) => (
                  <div key={ci} className={`space-y-4 ${ci === 1 ? 'md:pt-4' : ''}`}>
                    {column.map((tile, i) => {
                      const product = products.items[ci * 2 + i];
                      const src = product?.images?.[0];
                      return (
                        <div
                          key={tile.emoji}
                          className={`relative overflow-hidden rounded-sm border border-ink/10 bg-linen ${tile.height} ${tile.offset || ''}`}
                        >
                          {src ? (
                            <ProductImage
                              src={src}
                              alt={product.name}
                              frame="h-full w-full"
                              w={480}
                              h={600}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-5xl">
                              {tile.emoji}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1.5 bg-terracotta lg:block" aria-hidden="true" />
      </section>

      {pageError && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <ErrorState message={pageError} />
            <div className="mt-4 text-center">
              <button onClick={load} className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white">
                Retry
              </button>
            </div>
          </div>
        </section>
      )}

      {!pageError && loading && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <Loading />
          </div>
        </section>
      )}

      {!pageError && !loading && statCards.length > 0 && (
        <section className="border-b border-ink/10 bg-white py-10">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 text-center sm:grid-cols-3">
            {statCards.map((stat) => (
              <Link key={stat.key} to={stat.to} className="group">
                <p className="font-display text-3xl font-semibold text-ink transition group-hover:text-terracotta-dark">
                  {stat.value.toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-sm uppercase tracking-[0.14em] text-ink-faint">{stat.label}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!pageError && !loading && (
        <>
          {/* ---------- fresh from the workshop ---------- */}
          <section className="bg-white py-16">
            <div className="mx-auto max-w-7xl px-4">
              <SectionHeading
                eyebrow="New arrivals"
                title="Fresh from the Workshop"
                subtitle="The latest handmade pieces added by our artisans"
                action={viewAll('/products')}
              />

              {products.error && <ErrorState message={products.error} />}
              {!products.error && products.items.length === 0 && (
                <EmptyState message="No products yet — check back soon." />
              )}
              {!products.error && products.items.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {products.items.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ---------- categories ---------- */}
          <section className="border-y border-ink/10 bg-cream py-16">
            <div className="mx-auto max-w-7xl px-4">
              <SectionHeading
                eyebrow="Browse"
                title="Shop by Category"
                subtitle="Explore our curated collection of traditional crafts"
                center
              />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/products?category=${cat.name.toLowerCase()}`}
                    className="group rounded-sm border border-ink/10 bg-white p-6 text-center transition hover:border-terracotta/40 hover:shadow-[0_18px_40px_-30px_rgba(43,26,18,0.6)]"
                  >
                    <div className="mb-3 text-4xl transition group-hover:-translate-y-1">{cat.emoji}</div>
                    <h3 className="font-heading text-lg font-semibold text-ink">{cat.name}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{cat.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- featured artisans ---------- */}
          <section className="bg-white py-16">
            <div className="mx-auto max-w-7xl px-4">
              <SectionHeading
                eyebrow="The makers"
                title="Featured Artisans"
                subtitle="Meet the master craftspeople behind our products"
                action={viewAll('/artisans')}
              />

              {artisans.error && <ErrorState message={artisans.error} />}
              {!artisans.error && artisans.items.length === 0 && (
                <EmptyState message="No verified artisans yet." />
              )}
              {!artisans.error && artisans.items.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {artisans.items.map((artisan) => (
                    <Link
                      key={artisan._id}
                      to={`/artisan/${artisan._id}`}
                      className="group overflow-hidden rounded-sm border border-ink/10 bg-white transition hover:shadow-[0_22px_45px_-30px_rgba(43,26,18,0.6)]"
                    >
                      <div className="relative h-32 bg-linen">
                        <ProductImage
                          src={artisan.coverImage}
                          alt=""
                          frame="h-full w-full"
                          w={800}
                          h={320}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-ink/50 to-transparent" />
                        <div className="absolute -bottom-6 left-5 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-linen">
                          <ProductImage
                            src={artisan.profileImage}
                            alt={artisan.businessName}
                            frame="h-full w-full"
                            w={160}
                            h={160}
                          />
                        </div>
                      </div>
                      <div className="p-5 pt-9">
                        <h3 className="font-heading text-lg font-semibold text-ink transition group-hover:text-terracotta-dark">
                          {artisan.businessName}
                        </h3>
                        <p className="mt-0.5 text-sm text-ink-soft">
                          {[artisan.location?.city, artisan.location?.state].filter(Boolean).join(', ') || 'India'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <StarRating value={artisan.rating || 0} size="text-sm" />
                          <span className="text-sm text-ink-faint">
                            {artisan.reviewCount ? `(${artisan.reviewCount})` : ''}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-saffron-dark">
                          {(artisan.craftTypes || []).join(', ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ---------- workshops ---------- */}
          <section className="border-y border-ink/10 bg-cream py-16">
            <div className="mx-auto max-w-7xl px-4">
              <SectionHeading
                eyebrow="Learn"
                title="Workshops"
                subtitle="Learn traditional crafts directly from master artisans"
                action={viewAll('/workshops')}
              />

              {workshops.error && <ErrorState message={workshops.error} />}
              {!workshops.error && workshops.items.length === 0 && (
                <EmptyState message="No workshops listed right now." />
              )}
              {!workshops.error && workshops.items.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {workshops.items.slice(0, 3).map((workshop) => {
                    const slot = upcomingSlot(workshop);
                    return (
                      <div
                        key={workshop._id}
                        className="flex flex-col overflow-hidden rounded-sm border border-ink/10 bg-white transition hover:shadow-[0_22px_45px_-30px_rgba(43,26,18,0.6)]"
                      >
                        <ProductImage
                          src={workshop.images?.[0]}
                          alt={workshop.title}
                          frame="h-40 w-full"
                          w={640}
                          h={360}
                        />
                        <div className="flex flex-1 flex-col p-5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron-dark">
                            {workshop.craftType}
                          </span>
                          <h3 className="mt-1 font-heading text-lg font-semibold text-ink">
                            {workshop.title}
                          </h3>
                          <p className="mt-1 text-sm italic text-ink-soft">
                            by {workshop.artisan?.businessName || 'Artisan'}
                          </p>
                          <p className="mt-2 text-sm text-ink-soft">
                            📅 {slot ? formatDate(slot.date) : 'Schedule to be announced'}
                          </p>
                          <div className="mt-auto flex items-center justify-between pt-4">
                            <span className="font-display text-xl font-semibold text-ink">
                              {inr(workshop.price)}
                            </span>
                            <Link
                              to={`/workshop/${workshop._id}`}
                              className="text-sm font-semibold text-terracotta-dark transition hover:text-ink"
                            >
                              Details →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ---------- donate ---------- */}
          <section className="bg-indigo py-16 text-cream">
            <div className="mx-auto max-w-7xl px-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-saffron">
                Support the craft
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                Preserve Heritage, Make a Difference
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-cream/75">
                Your donations help traditional artisans sustain their craft and pass it on to
                future generations.
              </p>
              <Link
                to="/donate"
                className="mt-8 inline-block rounded-sm bg-saffron px-8 py-3.5 font-semibold text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
              >
                Donate Now
              </Link>
            </div>
          </section>

          {/* ---------- stories ---------- */}
          <section className="bg-white py-16">
            <div className="mx-auto max-w-7xl px-4">
              <SectionHeading
                eyebrow="From the archive"
                title="Heritage Stories"
                subtitle="Explore the rich history behind India's crafts"
                action={viewAll('/stories')}
              />

              {stories.error && <ErrorState message={stories.error} />}
              {!stories.error && stories.items.length === 0 && (
                <EmptyState message="No stories published yet." />
              )}
              {!stories.error && stories.items.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {stories.items.map((story) => (
                    <article
                      key={story._id}
                      className="overflow-hidden rounded-sm border border-ink/10 bg-parchment transition hover:shadow-[0_22px_45px_-30px_rgba(43,26,18,0.6)]"
                    >
                      <div className="flex h-40 items-center justify-center bg-linen text-5xl">📜</div>
                      <div className="p-6">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron-dark">
                          {story.category}
                        </span>
                        <h3 className="mt-2 font-heading text-lg font-semibold text-ink">
                          {story.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                          {story.excerpt || story.content}
                        </p>
                        <Link
                          to={`/stories/${story.slug}`}
                          className="mt-4 inline-block border-b border-terracotta pb-0.5 text-sm font-semibold text-terracotta-dark transition hover:border-ink hover:text-ink"
                        >
                          Read More →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;
