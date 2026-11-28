import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { toast, errMsg } from '../../components/Toast';
import { LogoMark, Wordmark } from '../../components/common/Logo';

// Hidden entirely when the operator has not configured a Google Client ID.
const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from;

  // The Google button takes a pixel width — keep it inside the auth card on
  // every viewport (card padding 32px + page padding 16px per side).
  const googleBtnWidth = Math.min(
    360,
    Math.max(200, (typeof window !== 'undefined' ? window.innerWidth : 448) - 96)
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const getRedirectPath = (role) => {
    switch (role) {
      case 'CUSTOMER':
        return '/customer/dashboard';
      case 'ARTISAN':
        return '/artisan/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  const redirectAfterAuth = (user) => {
    // Come back to where the user was (e.g. /cart) instead of the dashboard.
    const redirectPath = from?.pathname
      ? `${from.pathname}${from.search || ''}`
      : getRedirectPath(user.role);
    navigate(redirectPath, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await login(formData.email, formData.password);
      } else {
        user = await register(formData.name, formData.email, formData.password);
      }
      redirectAfterAuth(user);
    } catch (err) {
      setError(err.response?.data?.message || (isLogin ? 'Invalid email or password' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  // Google returns an ID token; the backend verifies it and answers with the
  // same { token, user } shape as a normal login.
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      toast.error('Google sign-in failed. Please try again.');
      return;
    }
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(credentialResponse.credential);
      redirectAfterAuth(user);
    } catch (err) {
      const status = err.response?.status;
      const backendMessage = err.response?.data?.message;
      const message =
        status === 503
          ? 'Google sign-in is not configured yet.'
          : status === 403
            ? 'This account is blocked. Please contact support.'
            : status === 401 && backendMessage === 'Google account email is not verified'
              ? 'Your Google email is not verified. Verify it with Google, then try again.'
              : status === 401
                ? 'Google sign-in failed. Please try again.'
                : errMsg(err, 'Google sign-in failed. Please try again.');
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in was cancelled or failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-sm border border-ink/10 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <LogoMark className="mx-auto h-14 w-14" decorative />
          <Wordmark className="mt-2 text-2xl" />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-sm mb-6">
            {error}
          </div>
        )}

        <div className="flex mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-center font-medium transition ${
              isLogin ? 'text-ink border-b-2 border-terracotta' : 'text-ink-soft'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-center font-medium transition ${
              !isLogin ? 'text-ink border-b-2 border-terracotta' : 'text-ink-soft'
            }`}
          >
            Register
          </button>
        </div>

        {googleEnabled && (
          <div className="mb-6">
            {googleLoading ? (
              <div className="w-full border border-ink/15 rounded-sm py-3 text-center text-ink-soft text-sm bg-parchment">
                Completing Google sign-in…
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="continue_with"
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  width={googleBtnWidth}
                />
              </div>
            )}

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 border-t border-ink/10"></div>
              <span className="text-ink-soft text-sm">or</span>
              <div className="flex-1 border-t border-ink/10"></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm text-ink-soft font-medium">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
                className="w-full border border-ink/15 rounded-sm px-4 py-2 mt-1"
                placeholder="Enter your name"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-ink-soft font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-ink/15 rounded-sm px-4 py-2 mt-1"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="text-sm text-ink-soft font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full border border-ink/15 rounded-sm px-4 py-2 mt-1"
              placeholder="Enter your password"
            />
          </div>

          {isLogin && (
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-terracotta-dark hover:underline">
                Forgot Password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terracotta text-white py-3 rounded-sm hover:bg-terracotta-dark transition font-semibold disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-terracotta-dark font-medium hover:underline"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;