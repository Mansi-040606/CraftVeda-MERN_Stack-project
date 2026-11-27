import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { artisanService } from '../../services/artisanService';
import { reviewService } from '../../services/reviewService';
import { errMsg } from '../../components/Toast';
import { inr } from '../../utils/format';
import StarRating from '../../components/review/StarRating';
import ReviewCard from '../../components/review/ReviewCard';
import ProductImage from '../../components/product/ProductImage';

function ArtisanProfile() {
  const { id } = useParams();

  const [artisan, setArtisan] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReviews = useCallback(async () => {
    try {
      const res = await reviewService.getArtisanReviews(id);
      setReviews(res.data.reviews);
      setReviewSummary({ averageRating: res.data.averageRating, total: res.data.total });
    } catch {
      // Reviews are secondary — profile still renders without them.
      setReviews([]);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      artisanService.getById(id),
      artisanService.getProducts(id),
    ])
      .then(([artisanRes, productsRes]) => {
        if (cancelled) return;
        setArtisan(artisanRes.data.artisan);
        setProducts(productsRes.data.products || []);
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err, 'Failed to load artisan'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    loadReviews();
    return () => { cancelled = true; };
  }, [id, loadReviews]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-7xl mx-auto px-4 animate-pulse space-y-8">
          <div className="bg-ink h-64 rounded-sm" />
          <div className="bg-white h-48 rounded-sm border border-ink/10" />
          <div className="bg-white h-64 rounded-sm border border-ink/10" />
        </div>
      </div>
    );
  }

  if (error || !artisan) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-3xl mx-auto px-4 bg-white rounded-sm border border-ink/10 p-12 text-center">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-xl font-semibold text-ink mt-4">
            {error?.includes('not found') ? 'Artisan not found' : 'Something went wrong'}
          </h2>
          <p className="text-ink-soft mt-2">{error || 'This artisan does not exist.'}</p>
          <Link
            to="/artisans"
            className="inline-block mt-4 bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition"
          >
            Back to Artisans
          </Link>
        </div>
      </div>
    );
  }

  const location = [artisan.location?.city, artisan.location?.state].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-cream">
      {/* ----- hero ----- */}
      <div className="relative overflow-hidden bg-ink text-white py-16">
        {artisan.coverImage && (
          <>
            <div className="absolute inset-0" aria-hidden="true">
              <ProductImage
                src={artisan.coverImage}
                alt=""
                frame="h-full w-full"
                preset="lightbox_1600"
              />
            </div>
            <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
          </>
        )}
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {artisan.profileImage ? (
              <ProductImage
                src={artisan.profileImage}
                alt={artisan.businessName}
                frame="w-32 h-32 rounded-full border-4 border-cream/40"
                preset="avatar_160"
              />
            ) : (
              <div className="text-8xl">👩‍🎨</div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">{artisan.businessName}</h1>
              <p className="text-cream/75 mt-2">{location || 'India'}</p>
              <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                <StarRating value={artisan.rating || reviewSummary.averageRating || 0} size="text-lg" />
                <span className="text-cream/75">
                  {(artisan.rating || reviewSummary.averageRating || 0).toFixed(1)} ({artisan.reviewCount || reviewSummary.total} review{(artisan.reviewCount || reviewSummary.total) === 1 ? '' : 's'})
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                {(artisan.craftTypes || []).map((craft) => (
                  <span key={craft} className="bg-cream/15 px-3 py-1 rounded-full text-sm">
                    {craft}
                  </span>
                ))}
                {artisan.yearsOfExperience > 0 && (
                  <span className="bg-cream/15 px-3 py-1 rounded-full text-sm">
                    {artisan.yearsOfExperience}+ Years Experience
                  </span>
                )}
                {artisan.isVerified && (
                  <span className="bg-green-600 px-3 py-1 rounded-full text-sm">✓ Verified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* ----- story ----- */}
            {(artisan.story || artisan.description) && (
              <div className="bg-white rounded-sm border border-ink/10 p-8 mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">Artisan Story</h2>
                {artisan.story ? (
                  <p className="text-ink-soft leading-relaxed">{artisan.story}</p>
                ) : (
                  <p className="text-ink-soft leading-relaxed">{artisan.description}</p>
                )}
              </div>
            )}

            {/* ----- products ----- */}
            <div className="bg-white rounded-sm border border-ink/10 p-8 mb-8">
              <h2 className="text-xl font-bold text-ink mb-6">
                Products by {artisan.businessName}
              </h2>
              {products.length === 0 ? (
                <p className="text-ink-soft">No products listed yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className="border border-ink/10 rounded-sm p-4 hover:border-terracotta/50 transition group"
                    >
                      <div className="bg-parchment rounded-sm h-32 flex items-center justify-center overflow-hidden">
                        {product.images?.[0] ? (
                          <ProductImage
                            src={product.images?.[0]}
                            alt={product.name}
                            frame="h-full w-full"
                            preset="thumb_140"
                            imgClassName="transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-5xl">🏺</span>
                        )}
                      </div>
                      <h3 className="font-medium text-ink mt-3">{product.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-terracotta-dark font-semibold">{inr(product.price)}</p>
                        <StarRating value={product.averageRating || 0} size="text-sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ----- reviews ----- */}
            <div className="bg-white rounded-sm border border-ink/10 p-8">
              <h2 className="text-xl font-bold text-ink mb-6">Reviews</h2>
              {reviewSummary.total > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating value={reviewSummary.averageRating} size="text-xl" />
                  <span className="text-ink-soft font-medium">{reviewSummary.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-ink-soft">({reviewSummary.total})</span>
                </div>
              )}
              {reviews.length === 0 ? (
                <p className="text-ink-soft">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            {/* ----- info ----- */}
            <div className="bg-white rounded-sm border border-ink/10 p-6 mb-8">
              <h3 className="font-bold text-ink mb-4">Artisan Information</h3>
              <div className="space-y-3 text-sm text-ink-soft">
                <p><strong>Location:</strong> {location || 'India'}</p>
                {artisan.yearsOfExperience > 0 && (
                  <p><strong>Experience:</strong> {artisan.yearsOfExperience} years</p>
                )}
                <p><strong>Crafts:</strong> {(artisan.craftTypes || []).join(', ') || '—'}</p>
                {artisan.socialLinks?.website && (
                  <p>
                    <strong>Website:</strong>{' '}
                    <a
                      href={artisan.socialLinks.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-terracotta-dark underline"
                    >
                      Visit
                    </a>
                  </p>
                )}
                {artisan.socialLinks?.instagram && (
                  <p>
                    <strong>Instagram:</strong>{' '}
                    <a
                      href={artisan.socialLinks.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="text-terracotta-dark underline"
                    >
                      Visit
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* ----- awards ----- */}
            {artisan.awards?.length > 0 && (
              <div className="bg-white rounded-sm border border-ink/10 p-6">
                <h3 className="font-bold text-ink mb-4">Awards & Recognition</h3>
                <ul className="space-y-3 text-sm text-ink-soft">
                  {artisan.awards.map((award, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span>🏆</span>
                      <span>
                        {award.title}
                        {award.year ? `, ${award.year}` : ''}
                        {award.description ? ` — ${award.description}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArtisanProfile;
