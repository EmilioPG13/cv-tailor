// Shared settings cache — imported by both tailor.js and admin.js
export const settingsCache = { data: null, expiry: 0 };

export function invalidateSettingsCache() {
  settingsCache.expiry = 0;
}
