/**
 * FIRESTORE BOOTSTRAP SCRIPT
 * -------------------------------------------------------------
 * Initializes platform configuration defaults for a new client:
 *  - 1 Platform Config document (/appConfig/main)
 *  - Default empty Home Section structure (/homeSections)
 *
 * Does NOT inject fake courses, fake banners, or placeholder accounts.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { clientConfig } = require('./load-client-config');

const app = initializeApp(clientConfig.firebaseConfig);
const db = getFirestore(app);

const DEFAULT_HOME_SECTIONS = [
  { id: 'sec_banner', type: 'banner', title: 'Top Banners', order: 1, isVisible: true },
  { id: 'sec_categories', type: 'categories', title: 'Categories', order: 2, isVisible: true },
  { id: 'sec_featured', type: 'courses', title: 'Featured Courses', order: 3, isVisible: true },
  { id: 'sec_continue', type: 'continue_watching', title: 'Continue Learning', order: 4, isVisible: true },
  { id: 'sec_new', type: 'courses', title: 'New Releases', order: 5, isVisible: true },
];

async function bootstrapFirestore() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('            INITIALIZING FIRESTORE BOOTSTRAP CONFIG              ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  try {
    // 1. Initialize /appConfig/main
    console.log('▶ Writing platform configuration: /appConfig/main...');
    await setDoc(
      doc(db, 'appConfig', 'main'),
      {
        appName: clientConfig.appName,
        logoUrl: clientConfig.logoUrl,
        primaryColor: clientConfig.colors.primary,
        supportPhone: clientConfig.supportPhone,
        supportWhatsApp: clientConfig.supportWhatsApp,
        supportEmail: clientConfig.supportEmail,
        maintenanceMode: false,
        minVersion: clientConfig.version,
        privacyPolicyUrl: clientConfig.privacyPolicyUrl,
        termsUrl: clientConfig.termsUrl,
        refundPolicyUrl: clientConfig.refundPolicyUrl,
        dataDeletionUrl: clientConfig.dataDeletionUrl,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('  ✓ /appConfig/main initialized.');

    // 2. Initialize default Home Sections
    console.log('\n▶ Initializing Home Sections layout structure...');
    for (const section of DEFAULT_HOME_SECTIONS) {
      const { id, ...data } = section;
      await setDoc(
        doc(db, 'homeSections', id),
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`  ✓ Home Section registered: ${section.title} (${id})`);
    }

    console.log('\n═════════════════════════════════════════════════════════════════');
    console.log('🎉 FIRESTORE BOOTSTRAP COMPLETED SUCCESSFULLY!');
    console.log('═════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ Bootstrap initialization failed:', error);
    process.exit(1);
  }
}

bootstrapFirestore();
