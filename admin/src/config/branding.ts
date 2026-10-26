/**
 * CLIENT BRANDING CONFIGURATION (Single Source of Truth)
 * -------------------------------------------------------------
 * Eliminates all hardcoded client strings and colors.
 * Values are populated from VITE_* variables generated per client.
 */

const env = (import.meta as any).env || {};

export const brandConfig = {
  appName: env.VITE_APP_TITLE || 'Course Academy',
  shortName: env.VITE_SHORT_NAME || env.VITE_APP_TITLE || 'Academy',
  tagline: env.VITE_TAGLINE || 'Master In-Demand Skills with Industry Mentors',
  logoUrl: env.VITE_LOGO_URL || '',
  primaryColor: env.VITE_PRIMARY_COLOR || '#4F46E5',
  supportEmail: env.VITE_SUPPORT_EMAIL || 'support@example.com',
  supportPhone: env.VITE_SUPPORT_PHONE || '+91 99999 99999',
  companyLegalName: env.VITE_COMPANY_LEGAL_NAME || 'Course Academy Private Limited',
  privacyUrl: env.VITE_PRIVACY_URL || '/privacy',
  termsUrl: env.VITE_TERMS_URL || '/terms',
};
