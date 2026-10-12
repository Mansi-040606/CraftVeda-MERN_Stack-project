import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { artisanService } from '../../services/artisanService';
import { reviewService } from '../../services/reviewService';
import { errMsg } from '../../components/Toast';
import { inr } from '../../utils/format';
import StarRating from '../../components/review/StarRating';
import ReviewCard from '../../components/review/ReviewCard';

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
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-7xl mx-auto px-4 animate-pulse space-y-8">
          <div className="bg-amber-900 h-64 rounded-xl" />
          <div className="bg-white h-48 rounded-xl shadow-md" />
          <div className="bg-white h-64 rounded-xl shadow-md" />
        </div>
      </div>
    );
  }

  if (error || !artisan) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-3xl mx-auto px-4 bg-white rounded-xl shadow-md p-12 text-center">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-xl font-semibold text-amber-900 mt-4">
            {error?.includes('not found') ? 'Artisan not found' : 'Something went wrong'}
          </h2>
          <p className="text-amber-600 mt-2">{error || 'This artisan does not exist.'}</p>
          <Link
            to="/artisans"
            className="inline-block mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
          >
            Back to Artisans
          </Link>
        </div>
      </div>
    );
  }

  const location = [artisan.location?.city, artisan.location?.state].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-amber-50">
      {/* ----- hero ----- */}
      <div className="bg-amber-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {artisan.profileImage ? (
              <img
                src={artisan.profileImage}
                alt={artisan.businessName}
                className="w-32 h-32 rounded-full object-cover border-4 border-amber-700"
              />
            ) : (
              <div className="text-8xl">👩‍🎨</div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">{artisan.businessName}</h1>
              <p className="text-amber-200 mt-2">{location || 'India'}</p>
              <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                <StarRating value={artisan.rating || reviewSummary.averageRating || 0} size="text-lg" />
                <span className="text-amber-300">
                  {(artisan.rating || reviewSummary.averageRating || 0).toFixed(1)} ({artisan.reviewCount || reviewSummary.total} review{(artisan.reviewCount || reviewSummary.total) === 1 ? '' : 's'})
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                {(artisan.craftTypes || []).map((craft) => (
                  <span key={craft} className="bg-amber-800 px-3 py-1 rounded-full text-sm">
                    {craft}
                  </span>
                ))}
                {artisan.yearsOfExperience > 0 && (
                  <span className="bg-amber-800 px-3 py-1 rounded-full text-sm">
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
              <div className="bg-white rounded-xl shadow-md p-8 mb-8">
                <h2 className="text-xl font-bold text-amber-900 mb-4">Artisan Story</h2>
                {artisan.story ? (
                  <p className="text-amber-800 leading-relaxed">{artisan.story}</p>
                ) : (
                  <p className="text-amber-800 leading-relaxed">{artisan.description}</p>
                )}
              </div>
            )}

            {/* ----- products ----- */}
            <div className="bg-white rounded-xl shadow-md p-8 mb-8">
              <h2 className="text-xl font-bold text-amber-900 mb-6">
                Products by {artisan.businessName}
              </h2>
              {products.length === 0 ? (
                <p className="text-amber-600">No products listed yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className="border border-amber-200 rounded-lg p-4 hover:shadow-md transition group"
                    >
                      <div className="bg-amber-100 rounded-lg h-32 flex items-center justify-center overflow-hidden">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition"
                          />
                        ) : (
                          <span className="text-5xl">🏺</span>
                        )}
                      </div>
                      <h3 className="font-medium text-amber-900 mt-3">{product.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-amber-700 font-semibold">{inr(product.price)}</p>
                        <StarRating value={product.averageRating || 0} size="text-sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ----- reviews ----- */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-xl font-bold text-amber-900 mb-6">Reviews</h2>
              {reviewSummary.total > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating value={reviewSummary.averageRating} size="text-xl" />
                  <span className="text-amber-800 font-medium">{reviewSummary.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-amber-600">({reviewSummary.total})</span>
                </div>
              )}
              {reviews.length === 0 ? (
                <p className="text-amber-600">No reviews yet.</p>
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
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h3 className="font-bold text-amber-900 mb-4">Artisan Information</h3>
              <div className="space-y-3 text-sm text-amber-800">
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
                      className="text-amber-700 underline"
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
                      className="text-amber-700 underline"
                    >
                      Visit
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* ----- awards ----- */}
            {artisan.awards?.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="font-bold text-amber-900 mb-4">Awards & Recognition</h3>
                <ul className="space-y-3 text-sm text-amber-800">
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
