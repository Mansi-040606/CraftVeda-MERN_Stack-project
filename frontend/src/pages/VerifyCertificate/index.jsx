import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading, ErrorState } from '../../components/admin/AdminShell';
import { errMsg } from '../../components/Toast';
import { certificateService } from '../../services/certificateService';
import { categoryLabel } from '../../constants/categories';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function VerifyCertificate() {
  const { certificateNumber } = useParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const check = useCallback(
    async (number) => {
      const clean = (number || '').trim();
      if (!clean) {
        setError('Enter a certificate number.');
        setResult(null);
        return;
      }

      setChecking(true);
      setError(null);
      setResult(null);
      try {
        const res = await certificateService.verify(clean);
        const verdict = {
          number: clean,
          valid: !!res.data.valid,
          message: res.data.message,
          certificate: null,
        };

        // The verify endpoint only returns the verdict; the certificate
        // endpoint adds product + artisan details when the record exists.
        if (res.data.success) {
          try {
            const detail = await certificateService.get(clean);
            verdict.certificate = detail.data.certificate || null;
          } catch {
            verdict.certificate = null;
          }
        }

        setResult(verdict);
      } catch (err) {
        setError(errMsg(err, 'Verification failed — please try again'));
      } finally {
        setChecking(false);
      }
    },
    []
  );

  useEffect(() => {
    if (certificateNumber) {
      setQuery(certificateNumber);
      check(certificateNumber);
    } else {
      setResult(null);
      setError(null);
    }
  }, [certificateNumber, check]);

  const submit = (e) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      setError('Enter a certificate number.');
      return;
    }
    if (clean === certificateNumber) {
      check(clean);
    } else {
      navigate(`/verify/${encodeURIComponent(clean)}`);
    }
  };

  const certificate = result?.certificate;

  return (
    <div className="min-h-screen bg-amber-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-3">Verify a Certificate</h1>
          <p className="text-amber-700">
            Enter the certificate number from your CraftVeda authenticity certificate to confirm it is genuine.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl shadow-md p-6 mb-8">
          <label htmlFor="certificate-number" className="text-sm text-amber-800 font-medium mb-2 block">
            Certificate number
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="certificate-number"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. CV-SEED-0001"
              className="flex-1 border border-amber-300 rounded-lg px-4 py-3 font-mono text-amber-900"
            />
            <button
              type="submit"
              disabled={checking}
              className="bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-800 transition disabled:opacity-50"
            >
              {checking ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        </form>

        {checking && <Loading />}
        {!checking && error && <ErrorState message={error} />}

        {!checking && !error && result && (
          <div
            className={`rounded-xl shadow-md overflow-hidden ${
              result.valid ? 'bg-white border-2 border-green-500' : 'bg-white border-2 border-red-400'
            }`}
          >
            <div className={`px-6 py-5 text-center ${result.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-5xl mb-2">{result.valid ? '✅' : '❌'}</div>
              <h2 className={`text-2xl font-bold ${result.valid ? 'text-green-700' : 'text-red-600'}`}>
                {result.valid ? 'Certificate is valid' : 'Certificate is not valid'}
              </h2>
              <p className="text-sm text-amber-700 mt-1">
                {result.message} · <span className="font-mono">{result.number}</span>
              </p>
            </div>

            {certificate && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="font-semibold text-amber-900 mb-1">Product</p>
                    {certificate.product ? (
                      <Link
                        to={`/product/${certificate.product._id}`}
                        className="text-amber-700 hover:text-amber-900 font-medium"
                      >
                        {certificate.product.name} →
                      </Link>
                    ) : (
                      <span className="text-amber-600">Unavailable</span>
                    )}
                    {certificate.product?.category && (
                      <p className="text-amber-600 mt-1">{categoryLabel(certificate.product.category)}</p>
                    )}
                    {certificate.product?.craftType && (
                      <p className="text-amber-600">{certificate.product.craftType}</p>
                    )}
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="font-semibold text-amber-900 mb-1">Artisan</p>
                    {certificate.artisan ? (
                      <Link
                        to={`/artisan/${certificate.artisan._id}`}
                        className="text-amber-700 hover:text-amber-900 font-medium"
                      >
                        {certificate.artisan.businessName} →
                      </Link>
                    ) : (
                      <span className="text-amber-600">Unavailable</span>
                    )}
                    {certificate.artisan?.story && (
                      <p className="text-amber-600 mt-1 line-clamp-3">{certificate.artisan.story}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="font-semibold text-amber-900 mb-1">Issued to</p>
                    <p className="text-amber-700">{certificate.buyer?.name || '—'}</p>
                    <p className="text-amber-600 mt-1">
                      Issued {formatDate(certificate.issuedAt || certificate.createdAt)}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="font-semibold text-amber-900 mb-1">Certificate number</p>
                    <p className="text-amber-700 font-mono break-all">{certificate.certificateNumber}</p>
                    <p className="text-amber-600 mt-1">
                      Status: {certificate.isValid ? 'Active' : 'Revoked'}
                    </p>
                  </div>
                </div>

                {certificate.craftDetails && (
                  <div className="bg-amber-50 rounded-lg p-4 text-sm">
                    <p className="font-semibold text-amber-900 mb-1">Craft details</p>
                    <p className="text-amber-700">
                      {[
                        certificate.craftDetails.craftType,
                        certificate.craftDetails.material,
                        certificate.craftDetails.technique,
                        certificate.craftDetails.origin,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Not recorded'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!certificate && !result.valid && (
              <div className="p-6">
                <p className="text-sm text-amber-700">
                  No certificate with this number exists in CraftVeda. Check the number and try again, or
                  contact support if you believe this is an error.
                </p>
              </div>
            )}
          </div>
        )}

        {!checking && !error && !result && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-amber-600">
            Enter a certificate number above to check its authenticity.
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyCertificate;
