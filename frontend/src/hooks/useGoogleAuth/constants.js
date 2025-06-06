/**
 * Constants for Google Authentication
 */

import { BACKEND_URL } from '../common-constants';

// Re-export BACKEND_URL for backward compatibility
export { BACKEND_URL };

export const LOCAL_STORAGE_KEYS = {
  PROFILE: 'apsara_user_profile',
  AUTH_SKIPPED: 'google_auth_skipped'
}; 