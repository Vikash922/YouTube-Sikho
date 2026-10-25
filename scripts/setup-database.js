/**
 * CLEAN FIRST-RUN DATABASE SETUP SCRIPT
 * -------------------------------------------------------------
 * Sets up only required schemas, default appConfig, default home layout,
 * and leaves courses, students, orders, live classes completely clean.
 * Zero demo data or dummy courses.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { clientConfig } = require('./load-client-config');

const app = initializeApp(clientConfig.firebaseConfig);
const db = getFirestore(app);

async function setupDatabase() {
  console.log('🚀 Setting up clean production database for:', clientConfig.appName);

  // 1. Initialize App Configuration
  const appConfigRef = doc(db, 'appConfig', 'main');
  await setDoc(appConfigRef, {
    appName: clientConfig.appName || 'Course App',
    logoUrl: clientConfig.logoUrl || '',
    primaryColor: clientConfig.colors?.primary || '#4F46E5',
    secondaryColor: clientConfig.colors?.secondary || '#1E293B',
    accentColor: clientConfig.colors?.accent || '#F59E0B',
    supportPhone: clientConfig.supportPhone || '',
    supportWhatsApp: clientConfig.supportWhatsApp || '',
    privacyUrl: clientConfig.privacyUrl || 'https://example.com/privacy',
    termsUrl: clientConfig.termsUrl || 'https://example.com/terms',
    maintenanceMode: false,
    minAppVersion: '1.0.0',
    updatedAt: serverTimestamp(),
  });
  console.log('✅ /appConfig/main initialized.');

  // 2. Initialize Default Home Layout Sections (Without Fake Content)
  const homeSections = [
    { id: 'sec_live', type: 'live_stream', title: 'Live Now Streaming', order: 1, isVisible: true },
    { id: 'sec_streak', type: 'streak_banner', title: 'Daily Learning Streak', order: 2, isVisible: true },
    { id: 'sec_featured', type: 'featured_courses', title: 'Featured Masterclasses', order: 3, isVisible: true },
    { id: 'sec_popular', type: 'popular_courses', title: 'Popular Courses', order: 4, isVisible: true },
  ];

  for (const section of homeSections) {
    await setDoc(doc(db, 'homeSections', section.id), {
      ...section,
      updatedAt: serverTimestamp(),
    });
  }
  console.log('✅ Clean home sections initialized.');

  console.log('\n🎉 Clean setup complete! Firestore is now ready for production.');
  console.log('👉 Now create courses and categories directly in the Admin Panel.');
  process.exit(0);
}

setupDatabase().catch((err) => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
