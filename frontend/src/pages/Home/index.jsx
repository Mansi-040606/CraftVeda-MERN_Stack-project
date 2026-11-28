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
  {
    name: 'Textiles',
    mark: 'TX',
    desc: 'Handwoven fabrics & garments',
    image: '/images/craft-categories/textiles.jpg',
    photoTitle: 'India - Colours of India - Cotton threads becoming a lungi',
    photoCreator: 'mckaysavage',
    photoSource: 'https://www.flickr.com/photos/56796376@N00/2508141336',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    name: 'Pottery',
    mark: 'PT',
    desc: 'Terracotta & ceramic artistry',
    image: '/images/craft-categories/pottery.jpg',
    photoTitle: 'Goan Pottery 2',
    photoCreator: "Joel's Goa Pics",
    photoSource: 'https://www.flickr.com/photos/52243088@N00/11382440995',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  {
    name: 'Jewelry',
    mark: 'JW',
    desc: 'Traditional metal & beadwork',
    image: '/images/craft-categories/jewelry.jpg',
    photoTitle: 'Bargaining for Bangals',
    photoCreator: 'VinceHuang',
    photoSource: 'https://www.flickr.com/photos/43408627@N00/372863905',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    name: 'Woodwork',
    mark: 'WD',
    desc: 'Carved furniture & decor',
    image: '/images/craft-categories/woodwork.jpg',
    photoTitle: 'Indian Woodblocks',
    photoCreator: 'volitarian',
    photoSource: 'https://www.flickr.com/photos/68747803@N00/7913567484',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    name: 'Metalwork',
    mark: 'MT',
    desc: 'Brass & bronze craftsmanship',
    image: '/images/craft-categories/metalwork.jpg',
    photoTitle: 'Worksop in Thathera market of Jandiala Guru. 07',
    photoCreator: 'Harvinder Chandigarh',
    photoSource: 'https://commons.wikimedia.org/w/index.php?curid=154801415',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    name: 'Painting',
    mark: 'PN',
    desc: 'Miniature & folk art',
    image: '/images/craft-categories/painting.jpg',
    photoTitle: 'Madhubani painting, Bihar',
    photoCreator: 'jepoirrier',
    photoSource: 'https://www.flickr.com/photos/57519914@N00/5398953719',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  {
    name: 'Embroidery',
    mark: 'EM',
    desc: 'Intricate thread work',
    image: '/images/craft-categories/embroidery.jpg',
    photoTitle: 'Gorgeous hand embroidery from early 20th century Rajasthan',
    photoCreator: 'shankar s.',
    photoSource: 'https://www.flickr.com/photos/77742560@N06/44223430402',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    name: 'Sculpture',
    mark: 'SC',
    desc: 'Stone & wood carvings',
    image: '/images/craft-categories/sculpture.jpg',
    photoTitle: 'Belur, Chennakeshava Temple, beauty and mirror',
    photoCreator: 'Arian Zwegers',
    photoSource: 'https://www.flickr.com/photos/67769030@N07/9882265124',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
];

const WORKSHOP_PHOTOS = {
  default: {
    craft: 'Artisan at work',
    alt: 'Artisan working with traditional tools',
    image: '/images/workshops/artisan.jpg',
    title: 'crafts',
    creator: 'fredericknoronha',
    source: 'https://www.flickr.com/photos/17364099@N00/100421675',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  textiles: {
    craft: 'Hand block printing',
    alt: 'Artisan hand block printing fabric',
    image: '/images/workshops/block-printing.jpg',
    title: 'Traditional Bagh hand block print master craftsman-artisan-artist Mohammed Bilal Khatri, Madhya Pradesh, India',
    creator: 'Bsfs',
    source: 'https://commons.wikimedia.org/w/index.php?curid=53286376',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  pottery: {
    craft: 'Pottery wheel',
    alt: 'Potter shaping clay on a wheel',
    image: '/images/workshops/pottery-wheel.jpg',
    title: "Potter's Hands",
    creator: 'Walt Stoneburner',
    source: 'https://www.flickr.com/photos/8404611@N06/5745387762',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  woodwork: {
    craft: 'Sandalwood carving',
    alt: 'Detailed sandalwood carving',
    image: '/images/workshops/wood-carving.jpg',
    title: 'Sandalwood sitar work',
    creator: 'Rohitjangidartist',
    source: 'https://commons.wikimedia.org/w/index.php?curid=82280158',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
};

const STORY_PHOTOS = {
  default: WORKSHOP_PHOTOS.default,
  'sanganeri-block-printing': {
    ...WORKSHOP_PHOTOS.textiles,
    craft: 'Sanganeri block printing',
  },
  'blue-pottery-of-jaipur': {
    craft: 'Jaipur blue pottery',
    alt: 'Artisans displaying colorful Jaipur blue pottery',
    image: '/images/stories/blue-pottery.jpg',
    title: 'blue pottery',
    creator: 'chamko rani',
    source: 'https://www.flickr.com/photos/58739507@N00/1308983849',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'mysore-sandalwood-carving': {
    craft: 'Wood carving',
    alt: 'Artisan carving wood in a workshop',
    image: '/images/stories/sandalwood-carving.jpg',
    title: 'An old man carving wooden furniture in a workshop',
    creator: 'Ivan Radic',
    source: 'https://www.flickr.com/photos/26344495@N05/48630281498',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
};

// Offsets that give the hero collage a gallery-wall rhythm.
const COLLAGE = [
  { height: 'h-52 md:h-64', mark: '01' },
  { height: 'h-44 md:h-56', mark: '02', offset: 'md:mt-10' },
  { height: 'h-44 md:h-56', mark: '03' },
  { height: 'h-52 md:h-64', mark: '04', offset: 'md:-mt-4' },
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
      <section className="relative isolate overflow-hidden bg-[#18372a] py-14 text-cream md:py-20">
        <div className="home-hero-pattern absolute inset-0 -z-10 opacity-20" aria-hidden="true" />
        <div className="absolute -left-32 top-20 -z-10 h-80 w-80 rounded-full border border-saffron/20" aria-hidden="true" />
        <div className="absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full border border-cream/10" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-3 rounded-full border border-cream/15 bg-white/5 px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-saffron" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/85">
                  India&apos;s living craft heritage
                </p>
              </div>
              <h1
                className="mt-6 font-display text-5xl font-semibold leading-[1.02] md:text-6xl lg:text-[72px]"
                style={{ color: 'var(--color-cream)' }}
              >
                Carry a story.
                <br />
                <span className="italic text-saffron">Keep a tradition.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-cream/70 md:text-lg lg:mx-0">
                Shop extraordinary handmade objects, meet the hands behind them,
                and help centuries of Indian craftsmanship thrive.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  to="/products"
                  className="group inline-flex items-center justify-center gap-3 rounded-sm bg-saffron px-7 py-4 text-sm font-bold text-ink transition hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron"
                >
                  Explore Products
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                </Link>
                <Link
                  to="/artisans"
                  className="inline-flex items-center justify-center rounded-sm border border-cream/25 px-7 py-4 text-sm font-semibold text-cream transition hover:border-saffron hover:bg-white/5"
                >
                  Meet Artisans
                </Link>
              </div>
              {statCards.length > 0 && (
                <div className="mt-10 flex justify-center divide-x divide-cream/15 border-t border-cream/10 pt-6 lg:justify-start">
                  {statCards.map((stat) => (
                    <Link key={stat.key} to={stat.to} className="group px-5 first:pl-0">
                      <p className="font-display text-2xl font-semibold text-cream transition group-hover:text-saffron">
                        {stat.value.toLocaleString('en-IN')}+
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-cream/55">
                        {stat.label}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="absolute -bottom-5 -right-4 hidden h-24 w-24 border-b border-r border-saffron/50 md:block" aria-hidden="true" />
              <div className="absolute -left-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-saffron/40 bg-ink/80 p-2 shadow-xl md:flex" aria-hidden="true">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-saffron/70 text-center">
                  <span className="text-[9px] font-bold uppercase leading-4 tracking-[0.18em] text-saffron">
                    Made<br />by hand
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {collageColumns.map((column, ci) => (
                  <div key={ci} className={`space-y-3 md:space-y-4 ${ci === 1 ? 'md:pt-2' : ''}`}>
                    {column.map((tile, i) => {
                      const product = products.items[ci * 2 + i];
                      const src = product?.images?.[0];
                      return (
                        <div
                          key={tile.mark}
                          className={`relative overflow-hidden rounded-sm border border-cream/15 bg-linen shadow-[0_24px_60px_-28px_rgba(0,0,0,0.75)] ${tile.height} ${tile.offset || ''}`}
                        >
                          {src ? (
                            <ProductImage
                              src={src}
                              alt={product.name}
                              frame="h-full w-full"
                              presets={['card_360', 'card_640']}
                              sizes="(min-width: 768px) 224px, 45vw"
                              priority
                              imgClassName="home-collage-image"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-parchment">
                              <span className="font-display text-5xl italic text-terracotta/30">{tile.mark}</span>
                            </div>
                          )}
                          {src && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent p-3 pt-12">
                              <p className="truncate text-xs font-semibold text-white">{product.name}</p>
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
                  {products.items.map((product, index) => (
                    <ProductCard key={product._id} product={product} priority={index < 4} />
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
                    className="group relative min-h-52 overflow-hidden rounded-sm border border-ink/10 bg-ink shadow-[0_18px_40px_-34px_rgba(43,26,18,0.8)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_-30px_rgba(43,26,18,0.68)]"
                  >
                    <ProductImage
                      src={cat.image}
                      alt=""
                      frame="absolute inset-0 h-full w-full"
                      preset="card_640"
                      imgClassName="category-card-image"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent transition duration-500 group-hover:from-ink/95 group-hover:via-ink/35" />
                    <span className="absolute right-4 top-4 rounded-full border border-white/35 bg-ink/35 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white backdrop-blur-sm">
                      {cat.mark}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <span className="mb-3 block h-px w-8 bg-saffron transition-all duration-500 group-hover:w-14" />
                      <h3
                        className="font-heading text-xl font-semibold"
                        style={{ color: 'var(--color-cream)' }}
                      >
                        {cat.name}
                      </h3>
                      <p className="mt-1 max-w-[15rem] text-sm leading-relaxed text-cream/75">{cat.desc}</p>
                      <span className="mt-3 inline-block translate-y-2 text-xs font-bold uppercase tracking-[0.16em] text-saffron opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        Explore collection →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <details className="mt-5 text-xs text-ink-faint">
                <summary className="cursor-pointer font-semibold transition hover:text-ink">
                  Image credits & licenses
                </summary>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {CATEGORIES.map((cat) => (
                    <li key={cat.name}>
                      {cat.name}: “{cat.photoTitle}” by {cat.photoCreator} —{' '}
                      <a
                        href={cat.photoSource}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-terracotta-dark"
                      >
                        source
                      </a>
                      {' · '}
                      <a
                        href={cat.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-terracotta-dark"
                      >
                        {cat.license}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
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
                          preset="lightbox_1600"
                          imgClassName="transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-ink/50 to-transparent" />
                        <div className="absolute -bottom-6 left-5 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-linen">
                          <ProductImage
                            src={artisan.profileImage}
                            alt={artisan.businessName}
                            frame="h-full w-full"
                            preset="avatar_160"
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
                    const fallbackPhoto =
                      WORKSHOP_PHOTOS[workshop.craftType?.toLowerCase()] || WORKSHOP_PHOTOS.default;
                    const workshopImage = workshop.images?.[0] || fallbackPhoto.image;
                    return (
                      <div
                        key={workshop._id}
                        className="group flex flex-col overflow-hidden rounded-sm border border-ink/10 bg-white transition hover:-translate-y-1 hover:shadow-[0_22px_45px_-30px_rgba(43,26,18,0.6)]"
                      >
                        <ProductImage
                          src={workshopImage}
                          alt={workshop.images?.[0] ? workshop.title : fallbackPhoto.alt}
                          frame="h-52 w-full"
                          w={640}
                          h={360}
                          imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
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
              <h2 className="mt-2 font-display text-3xl font-semibold" style={{ color: 'var(--color-cream)' }}>
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
                  {stories.items.map((story) => {
                    const fallbackPhoto = STORY_PHOTOS[story.slug] || STORY_PHOTOS.default;
                    return (
                      <article
                        key={story._id}
                        className="group overflow-hidden rounded-sm border border-ink/10 bg-parchment transition hover:-translate-y-1 hover:shadow-[0_22px_45px_-30px_rgba(43,26,18,0.6)]"
                      >
                        <ProductImage
                          src={story.coverImage || fallbackPhoto.image}
                          alt={story.coverImage ? story.title : fallbackPhoto.alt}
                          frame="h-44 w-full"
                          preset="card_640"
                          imgClassName="transition-transform duration-700 group-hover:scale-[1.05]"
                        />
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
                    );
                  })}
                </div>
              )}
              <details className="mt-5 text-xs text-ink-faint">
                <summary className="cursor-pointer font-semibold transition hover:text-ink">
                  Workshop image credits & licenses
                </summary>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.values(WORKSHOP_PHOTOS).map((photo) => (
                    <li key={photo.craft}>
                      {photo.craft}: “{photo.title}” by {photo.creator} —{' '}
                      <a
                        href={photo.source}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-terracotta-dark"
                      >
                        source
                      </a>
                      {' · '}
                      <a
                        href={photo.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-terracotta-dark"
                      >
                        {photo.license}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
              <details className="mt-3 text-xs text-ink-faint">
                <summary className="cursor-pointer font-semibold transition hover:text-ink">
                  Story image credits & licenses
                </summary>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(STORY_PHOTOS)
                    .filter(([slug]) => slug !== 'default')
                    .map(([slug, photo]) => (
                      <li key={slug}>
                        {photo.craft}: “{photo.title}” by {photo.creator} —{' '}
                        <a
                          href={photo.source}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2 hover:text-terracotta-dark"
                        >
                          source
                        </a>
                        {' · '}
                        <a
                          href={photo.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2 hover:text-terracotta-dark"
                        >
                          {photo.license}
                        </a>
                      </li>
                    ))}
                </ul>
              </details>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;
