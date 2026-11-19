import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from;

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

      // Come back to where the user was (e.g. /cart) instead of the dashboard.
      const redirectPath = from?.pathname
        ? `${from.pathname}${from.search || ''}`
        : getRedirectPath(user.role);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || (isLogin ? 'Invalid email or password' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-sm border border-ink/10 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🏺</span>
          <h1 className="text-2xl font-bold text-ink mt-2">CraftVeda</h1>
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
              <Link to="/auth/forgot" className="text-sm text-terracotta-dark hover:underline">
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

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 border-t border-ink/10"></div>
          <span className="text-ink-soft text-sm">or</span>
          <div className="flex-1 border-t border-ink/10"></div>
        </div>

        <button className="w-full border border-ink/15 py-3 rounded-sm hover:bg-parchment transition flex items-center justify-center gap-3" disabled>
          <span>G</span>
          <span className="text-ink-soft">Continue with Google</span>
        </button>

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