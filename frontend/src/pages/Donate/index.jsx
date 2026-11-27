import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { donationService } from '../../services/donationService';
import { runRazorpayPayment } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../constants/categories';
import { inr } from '../../utils/format';

const PRESETS = [100, 250, 500, 1000, 2500];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Donate() {
  const { isAuthenticated, user } = useAuth();

  const [impact, setImpact] = useState({ loading: true, error: null, totalAmount: null, total: 0, donations: [] });

  const [amount, setAmount] = useState(500);
  const [amountError, setAmountError] = useState(null);
  const [craftType, setCraftType] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [payOnline, setPayOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const loadImpact = useCallback(async () => {
    setImpact((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await donationService.getAll({ page: 1, limit: 6 });
      setImpact({
        loading: false,
        error: null,
        totalAmount: res.data.totalAmount ?? null,
        total: res.data.total ?? 0,
        donations: res.data.donations || [],
      });
    } catch (err) {
      setImpact((prev) => ({ ...prev, loading: false, error: errMsg(err, 'Failed to load donation totals') }));
    }
  }, []);

  useEffect(() => {
    loadImpact();
  }, [loadImpact]);

  const chooseAmount = (value) => {
    setAmount(value);
    setAmountError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      setAmountError('Enter an amount of at least ₹1.');
      toast.error('Enter an amount of at least ₹1.');
      return;
    }
    if (!isAuthenticated) {
      toast.error('Sign in to record a donation.');
      return;
    }

    setAmountError(null);
    setSubmitting(true);
    try {
      const payload = { amount: value, isAnonymous };
      if (craftType) payload.craftType = craftType;
      if (message.trim()) payload.message = message.trim();

      const res = await donationService.create(payload);
      const created = res.data.donation;
      let status = created?.paymentStatus || 'pending';

      if (payOnline && created?._id) {
        try {
          const verified = await runRazorpayPayment({
            referenceType: 'donation',
            referenceId: created._id,
            description: 'CraftVeda Heritage Preservation Donation',
            user,
          });
          status = verified.donation?.paymentStatus || 'completed';
          toast.success('Thank you — your donation payment was completed!');
        } catch (payErr) {
          const raw = errMsg(payErr, 'Payment could not be completed');
          if (/razorpay is not configured/i.test(raw)) {
            toast.error('Online payments are not configured on this server; your pledge was saved as pending.');
          } else {
            toast.error(`${raw} Your pledge was saved as pending.`);
          }
        }
      } else {
        toast.success('Thank you — your donation pledge has been recorded.');
      }

      setReceipt({
        amount: created?.amount ?? value,
        craftType: created?.craftType || craftType || null,
        id: created?._id,
        status,
      });
      setMessage('');
      loadImpact();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to record your donation'));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setReceipt(null);
    setAmount(500);
    setCraftType('');
    setMessage('');
    setIsAnonymous(false);
    setAmountError(null);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Preserve Heritage</h1>
          <p className="text-cream/75 text-lg">
            Your donation helps traditional artisans sustain their craft and pass it to future generations
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-sm border border-ink/10 p-8">
            <h2 className="text-xl font-bold text-ink mb-2">Make a Donation</h2>

            {receipt ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🙏</div>
                <h3 className="text-2xl font-bold text-ink mb-2">Thank you!</h3>
                <p className="text-terracotta-dark mb-1">
                  Your donation of <strong>{inr(receipt.amount)}</strong> has been{' '}
                  {receipt.status === 'completed' ? 'completed' : 'recorded as pending'}
                  {receipt.craftType ? ` for ${receipt.craftType} crafts` : ''}.
                </p>
                <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
                  {receipt.status === 'completed'
                    ? 'Your contribution is now reflected in the live impact total.'
                    : 'Pending pledges appear in the public impact feed once payment is completed or verified by an admin.'}
                </p>
                <button
                  onClick={reset}
                  className="bg-terracotta text-white px-6 py-3 rounded-sm hover:bg-terracotta-dark transition font-semibold"
                >
                  Make another donation
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                {!isAuthenticated ? (
                  <div className="mb-6 bg-cream border border-ink/10 rounded-sm p-4 text-sm text-ink-soft">
                    Donations are recorded against your CraftVeda account.{' '}
                    <Link to="/auth" className="font-semibold underline text-terracotta-dark">
                      Sign in
                    </Link>{' '}
                    to donate.
                  </div>
                ) : (
                  <div className="mb-6 bg-cream border border-ink/10 rounded-sm p-4 text-sm text-ink-soft">
                    Recording this donation as <strong>{user?.name}</strong>.
                  </div>
                )}

                <div className="mb-6">
                  <label className="text-sm text-ink-soft font-medium mb-2 block">Select Amount</label>
                  <div className="flex flex-wrap gap-3">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => chooseAmount(preset)}
                        className={`px-4 py-2 rounded-sm border-2 transition ${
                          Number(amount) === preset
                            ? 'border-terracotta bg-parchment text-ink'
                            : 'border-ink/10 text-terracotta-dark hover:border-terracotta'
                        }`}
                      >
                        {inr(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="donation-amount" className="text-sm text-ink-soft font-medium mb-2 block">
                    Custom Amount
                  </label>
                  <input
                    id="donation-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => chooseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full border rounded-sm px-4 py-3 text-lg ${
                      amountError ? 'border-red-400' : 'border-ink/15'
                    }`}
                    placeholder="Enter amount"
                  />
                  {amountError && <p className="text-sm text-red-600 mt-1">{amountError}</p>}
                </div>

                <div className="mb-6">
                  <label htmlFor="donation-craft" className="text-sm text-ink-soft font-medium mb-2 block">
                    Craft Type (Optional)
                  </label>
                  <select
                    id="donation-craft"
                    value={craftType}
                    onChange={(e) => setCraftType(e.target.value)}
                    className="w-full border border-ink/15 rounded-sm px-4 py-3"
                  >
                    <option value="">Support all crafts</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label htmlFor="donation-message" className="text-sm text-ink-soft font-medium mb-2 block">
                    Message (Optional)
                  </label>
                  <textarea
                    id="donation-message"
                    className="w-full border border-ink/15 rounded-sm px-4 py-3"
                    rows="3"
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave a message of support..."
                  />
                  <p className="text-xs text-ink-soft mt-1">{message.length}/500</p>
                </div>

                <label className="flex items-center gap-2 mb-4 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-terracotta"
                  />
                  Show my name as “Anonymous”
                </label>

                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayOnline(true)}
                    className={`p-3 rounded-sm border-2 text-left text-sm transition ${
                      payOnline ? 'border-terracotta bg-parchment text-ink' : 'border-ink/10 text-ink-soft'
                    }`}
                  >
                    <p className="font-semibold">Pay Online (Razorpay)</p>
                    <p className="text-xs text-ink-soft">Card, UPI, Net Banking, Wallet</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayOnline(false)}
                    className={`p-3 rounded-sm border-2 text-left text-sm transition ${
                      !payOnline ? 'border-terracotta bg-parchment text-ink' : 'border-ink/10 text-ink-soft'
                    }`}
                  >
                    <p className="font-semibold">Record Pledge Only</p>
                    <p className="text-xs text-ink-soft">Complete payment later / offline</p>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isAuthenticated}
                  className="w-full bg-terracotta text-white py-4 rounded-sm hover:bg-terracotta-dark transition font-semibold text-lg disabled:opacity-50"
                >
                  {submitting
                    ? 'Processing…'
                    : payOnline
                      ? `Donate & Pay ${inr(Number(amount) || 0)}`
                      : `Record Pledge of ${inr(Number(amount) || 0)}`}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-sm border border-ink/10 p-6">
            <h3 className="font-bold text-ink mb-4">Donation impact</h3>
            {impact.loading && <Loading />}
            {!impact.loading && impact.error && (
              <div>
                <ErrorState message={impact.error} />
                <button
                  onClick={loadImpact}
                  className="w-full mt-3 px-4 py-2 bg-terracotta text-white rounded-sm text-sm"
                >
                  Retry
                </button>
              </div>
            )}
            {!impact.loading && !impact.error && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-ink">
                    {impact.totalAmount === null ? '—' : inr(impact.totalAmount)}
                  </p>
                  <p className="text-sm text-ink-soft">Raised so far</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink">{impact.total}</p>
                  <p className="text-sm text-ink-soft">Donations</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-sm border border-ink/10 p-6">
            <h3 className="font-bold text-ink mb-4">Recent donations</h3>
            {impact.loading && <Loading />}
            {!impact.loading && impact.error && <ErrorState message={impact.error} />}
            {!impact.loading && !impact.error && impact.donations.length === 0 && (
              <EmptyState message="No completed donations yet." />
            )}
            {!impact.loading && !impact.error && impact.donations.length > 0 && (
              <ul className="space-y-4">
                {impact.donations.map((donation) => (
                  <li key={donation._id} className="border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink text-sm">
                        {donation.isAnonymous ? 'Anonymous' : donation.donor?.name || 'A supporter'}
                      </span>
                      <span className="font-bold text-ink-soft text-sm">{inr(donation.amount)}</span>
                    </div>
                    <p className="text-xs text-ink-soft mt-1">
                      {donation.craftType ? `${donation.craftType} · ` : ''}
                      {formatDate(donation.createdAt)}
                    </p>
                    {donation.message && (
                      <p className="text-sm text-terracotta-dark mt-1 italic">“{donation.message}”</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Donate;
