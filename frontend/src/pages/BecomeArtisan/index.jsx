import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { artisanApplicationService } from '../../services/artisanApplicationService';

const BecomeArtisan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existingApplication, setExistingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    craftTypes: '',
    skills: '',
    yearsOfExperience: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    portfolio: ''
  });

  useEffect(() => {
    checkExistingApplication();
  }, []);

  const checkExistingApplication = async () => {
    try {
      const response = await artisanApplicationService.getMyApplication();
      if (response.data.success) {
        setExistingApplication(response.data.application);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Error checking application:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        craftTypes: formData.craftTypes.split(',').map(c => c.trim()).filter(Boolean),
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        }
      };

      const response = await artisanApplicationService.submitApplication(data);
      if (response.data.success) {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-900 text-lg">Loading...</div>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-amber-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="text-center mb-6">
              <span className="text-5xl">🏺</span>
              <h1 className="text-2xl font-bold text-amber-900 mt-4">Artisan Application</h1>
            </div>

            <div className="bg-amber-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-amber-900 mb-2">Your Application Status</h3>
              <p className="text-lg">
                Status: <span className={`font-bold ${
                  existingApplication.status === 'PENDING' ? 'text-yellow-600' :
                  existingApplication.status === 'APPROVED' ? 'text-green-600' :
                  'text-red-600'
                }`}>{existingApplication.status}</span>
              </p>
              {existingApplication.adminNotes && (
                <p className="mt-2 text-amber-800">Notes: {existingApplication.adminNotes}</p>
              )}
            </div>

            <button
              onClick={() => navigate('/customer/dashboard')}
              className="w-full bg-amber-700 text-white py-3 rounded-lg hover:bg-amber-800 transition font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-center mb-8">
            <span className="text-5xl">🏺</span>
            <h1 className="text-2xl font-bold text-amber-900 mt-4">Become an Artisan</h1>
            <p className="text-amber-700 mt-2">Share your craft with the world</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-amber-800 font-medium">Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                placeholder="Your craft business name"
              />
            </div>

            <div>
              <label className="text-sm text-amber-800 font-medium">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                placeholder="Tell us about your craft and business"
              />
            </div>

            <div>
              <label className="text-sm text-amber-800 font-medium">Craft Types * (comma-separated)</label>
              <input
                type="text"
                name="craftTypes"
                value={formData.craftTypes}
                onChange={handleChange}
                required
                className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                placeholder="e.g., Pottery, Handloom, Woodwork"
              />
            </div>

            <div>
              <label className="text-sm text-amber-800 font-medium">Skills (comma-separated)</label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                placeholder="e.g., Wheel throwing, Natural dyes"
              />
            </div>

            <div>
              <label className="text-sm text-amber-800 font-medium">Years of Experience *</label>
              <input
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                required
                min="0"
                className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                placeholder="How many years have you been crafting?"
              />
            </div>

            <div className="border-t border-amber-200 pt-6">
              <h3 className="font-semibold text-amber-900 mb-4">Location</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-amber-800 font-medium">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-amber-800 font-medium">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-amber-800 font-medium">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-amber-800 font-medium">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-amber-800 font-medium">Portfolio URL</label>
              <input
                type="url"
                name="portfolio"
                value={formData.portfolio}
                onChange={handleChange}
                className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1"
                placeholder="Link to your website or social media"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-700 text-white py-3 rounded-lg hover:bg-amber-800 transition font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BecomeArtisan;