import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { toast, errMsg } from '../../components/Toast';
import UploadButton from '../../components/common/UploadButton';

const emptyAddress = {
  street: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

function Profile() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: emptyAddress,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        pincode: user.address?.pincode || '',
        country: user.address?.country || 'India',
      },
    });
  }, [user]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setAddressField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.address.pincode.trim() && !/^\d{6}$/.test(form.address.pincode.trim())) {
      toast.error('PIN code must be 6 digits');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: {
          street: form.address.street.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          pincode: form.address.pincode.trim(),
          country: form.address.country.trim() || 'India',
        },
      });
      if (res.data.user) {
        updateUser(res.data.user);
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatar = async (file) => {
    setUploadingAvatar(true);
    try {
      const res = await authService.uploadAvatar(file);
      if (res.data.user?.avatar) {
        updateUser({ avatar: res.data.user.avatar });
      }
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(errMsg(err, 'Could not upload photo'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) {
      toast.error('Enter your current password');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password updated');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(errMsg(err, 'Failed to change password'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">My Profile</h1>
            <p className="text-sm text-ink-soft mt-1">
              Manage your contact details, default shipping address, and account password.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-parchment text-terracotta-dark">
            {user?.role}
          </span>
        </div>

        {/* Avatar & Account Header */}
        <div className="bg-white rounded-sm border border-ink/10 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-linen text-xl font-bold text-ink-soft">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                (user?.name || '?').charAt(0).toUpperCase()
              )}
            </span>
            <div>
              <p className="font-semibold text-ink text-lg">{user?.name}</p>
              <p className="text-sm text-ink-soft">{user?.email}</p>
            </div>
          </div>
          <UploadButton
            label={uploadingAvatar ? 'Uploading…' : 'Change photo'}
            busy={uploadingAvatar}
            onFile={handleAvatar}
            className="bg-parchment text-ink hover:bg-linen"
          />
        </div>

        {/* Profile & Shipping Address Form */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-sm border border-ink/10 p-6 space-y-5">
          <h2 className="text-lg font-bold text-ink">Personal Details &amp; Default Address</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-ink-soft">
              Full Name *
              <input
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-sm text-ink-soft">
              Phone Number
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="border-t border-ink/10 pt-4 space-y-4">
            <p className="text-sm font-medium text-ink">Default Shipping Address</p>
            <label className="block text-sm text-ink-soft">
              Street Address
              <input
                value={form.address.street}
                onChange={(e) => setAddressField('street', e.target.value)}
                placeholder="House no., street, landmark"
                className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-ink-soft">
                City
                <input
                  value={form.address.city}
                  onChange={(e) => setAddressField('city', e.target.value)}
                  className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="text-sm text-ink-soft">
                State
                <input
                  value={form.address.state}
                  onChange={(e) => setAddressField('state', e.target.value)}
                  className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="text-sm text-ink-soft">
                PIN Code
                <input
                  value={form.address.pincode}
                  onChange={(e) => setAddressField('pincode', e.target.value)}
                  placeholder="6 digits"
                  maxLength={6}
                  className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="text-sm text-ink-soft">
                Country
                <input
                  value={form.address.country}
                  onChange={(e) => setAddressField('country', e.target.value)}
                  className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-terracotta text-white px-6 py-2.5 rounded-sm text-sm font-semibold hover:bg-terracotta-dark transition disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordSubmit} className="bg-white rounded-sm border border-ink/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">Change Password</h2>
            <Link to="/forgot-password" className="text-xs text-terracotta-dark hover:underline">
              Signed in with Google or forgot password?
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-ink-soft">
              Current Password
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-sm text-ink-soft">
              New Password
              <input
                type="password"
                minLength={6}
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-sm text-ink-soft">
              Confirm New Password
              <input
                type="password"
                minLength={6}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="mt-1 w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="bg-ink text-white px-6 py-2.5 rounded-sm text-sm font-semibold hover:bg-terracotta-dark transition disabled:opacity-50"
            >
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;
