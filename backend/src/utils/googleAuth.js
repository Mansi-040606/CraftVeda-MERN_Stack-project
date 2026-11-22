import { OAuth2Client } from 'google-auth-library';
import ApiError from './ApiError.js';

// Test-only hook (mirrors CLOUDINARY_MOCK in images.js): with
// GOOGLE_TOKEN_MOCK=1 the credential is a base64url JSON payload instead of a
// real Google ID token, so the E2E suite never calls Google. Never set it
// outside tests.
const isMock = () => process.env.GOOGLE_TOKEN_MOCK === '1';

let client;
const getClient = () => {
  if (!client) client = new OAuth2Client();
  return client;
};

// Verifies a Google ID token and returns its payload.
// Throws 401 for anything that does not verify against GOOGLE_CLIENT_ID.
export const verifyGoogleCredential = async (credential) => {
  if (isMock()) {
    let payload;
    try {
      payload = JSON.parse(Buffer.from(String(credential), 'base64url').toString('utf8'));
    } catch {
      throw new ApiError(401, 'Invalid Google credential');
    }
    if (!payload || typeof payload !== 'object') {
      throw new ApiError(401, 'Invalid Google credential');
    }
    if (payload.aud && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new ApiError(401, 'Invalid Google credential');
    }
    return payload;
  }

  try {
    const ticket = await getClient().verifyIdToken({
      idToken: String(credential),
      audience: process.env.GOOGLE_CLIENT_ID
    });
    return ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google credential');
  }
};

export default verifyGoogleCredential;
