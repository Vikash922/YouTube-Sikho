/**
 * CLIENT CONFIGURATION SCHEMA & VALIDATOR
 * -------------------------------------------------------------
 * Enforces strict typing, required fields, and rejects placeholder
 * values (fake numbers, example domains, unconfigured keys).
 */

export interface ClientConfig {
  appName: string;
  shortName: string;
  tagline: string;
  slug: string;
  packageName: string;
  bundleIdentifier: string;
  scheme?: string;
  version: string;
  logoUrl: string;
  splashUrl?: string;
  faviconUrl?: string;

  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    success: string;
  };

  supportPhone?: string;
  supportWhatsApp?: string;
  supportEmail: string;

  companyLegalName: string;
  websiteUrl?: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  refundPolicyUrl: string;
  dataDeletionUrl: string;

  razorpayKeyId?: string;
  bunnyLibraryId?: string;
  bunnyCdnHostname?: string;

  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };

  features: {
    liveClassesEnabled: boolean;
    quizzesEnabled: boolean;
    certificateEnabled: boolean;
    communityChatEnabled: boolean;
    offlineDownloadEnabled: boolean;
    referralEnabled: boolean;
    reviewsEnabled: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const REJECTED_PLACEHOLDERS = [
  '9876543210',
  '+919876543210',
  '+91 98765 43210',
  'example.com',
  'your-domain.com',
  'test.com',
  'todo',
  'fixme',
  'changeme',
  'placeholder',
  'rzp_test_yt_sikho_',
];

/**
 * Validates client configuration object and rejects placeholder/empty values.
 */
export function validateClientConfig(config: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  function checkPlaceholder(field: string, value: any, isError = true) {
    if (!value || typeof value !== 'string') return;
    const lower = value.toLowerCase().replace(/\s+/g, '');
    for (const ph of REJECTED_PLACEHOLDERS) {
      if (lower.includes(ph.replace(/\s+/g, ''))) {
        const msg = `Field '${field}' contains rejected placeholder value: "${value}".`;
        if (isError) errors.push(msg);
        else warnings.push(msg);
        break;
      }
    }
  }

  // 1. App Identity
  if (!config?.appName?.trim()) errors.push("Field 'appName' is required.");
  checkPlaceholder('appName', config?.appName);

  if (!config?.slug?.trim() || !/^[a-z0-9-]+$/.test(config.slug)) {
    errors.push("Field 'slug' must contain only lowercase alphanumeric characters and hyphens.");
  }

  if (!config?.packageName?.trim() || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(config.packageName)) {
    errors.push("Field 'packageName' must be a valid Android package name (e.g. com.company.app).");
  }

  if (!config?.bundleIdentifier?.trim() || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(config.bundleIdentifier)) {
    errors.push("Field 'bundleIdentifier' must be a valid iOS bundle identifier (e.g. com.company.app).");
  }

  // 2. Legal & Support
  if (!config?.companyLegalName?.trim()) errors.push("Field 'companyLegalName' is required.");
  checkPlaceholder('companyLegalName', config?.companyLegalName);

  if (!config?.supportEmail?.trim() || !config.supportEmail.includes('@')) {
    errors.push("Field 'supportEmail' must be a valid email address.");
  }
  checkPlaceholder('supportEmail', config?.supportEmail);

  if (config?.supportPhone) {
    checkPlaceholder('supportPhone', config.supportPhone);
  }
  if (config?.supportWhatsApp) {
    checkPlaceholder('supportWhatsApp', config.supportWhatsApp);
  }

  // 3. Compliance URLs
  for (const urlField of ['privacyPolicyUrl', 'termsUrl', 'refundPolicyUrl', 'dataDeletionUrl']) {
    const val = config?.[urlField];
    if (!val || typeof val !== 'string' || !val.startsWith('http')) {
      errors.push(`Field '${urlField}' must be a valid absolute URL starting with http:// or https://.`);
    }
    checkPlaceholder(urlField, val);
  }

  // 4. Color Palette
  const requiredColors = ['primary', 'background', 'surface', 'text', 'border', 'error', 'success'];
  for (const c of requiredColors) {
    const hex = config?.colors?.[c];
    if (!hex || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex)) {
      errors.push(`Field 'colors.${c}' must be a valid hex color code.`);
    }
  }

  // 5. Firebase Configuration
  const fb = config?.firebaseConfig;
  if (!fb) {
    errors.push("Object 'firebaseConfig' is required.");
  } else {
    for (const fbField of ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']) {
      if (!fb[fbField] || typeof fb[fbField] !== 'string' || !fb[fbField].trim()) {
        errors.push(`Field 'firebaseConfig.${fbField}' is required.`);
      }
      checkPlaceholder(`firebaseConfig.${fbField}`, fb[fbField]);
    }
  }

  // 6. Assets & Placeholders
  if (!config?.logoUrl) {
    warnings.push("Field 'logoUrl' is missing; using default asset.");
  } else if (config.logoUrl.includes('unsplash.com')) {
    warnings.push("Field 'logoUrl' uses stock Unsplash image; replace with client's official asset.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
