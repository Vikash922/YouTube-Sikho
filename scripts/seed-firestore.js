/**
 * FIRESTORE DATABASE SEED SCRIPT
 * -------------------------------------------------------------
 * Populates Firestore with:
 *  - 3 Categories (YouTube Growth, Video Editing, Monetization)
 *  - 5 Courses (with nested Sections & Lessons subcollections)
 *  - 3 Banners (2 active, 1 inactive archive)
 *  - 6 Dynamic Home Sections (5 visible, 1 hidden beta section)
 *  - 1 App Config document (/appConfig/main)
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { clientConfig } = require('../src/config/client.config.js');

const app = initializeApp(clientConfig.firebaseConfig);
const db = getFirestore(app);

const SEED_DATA = {
  categories: [
    {
      id: 'youtube-growth',
      name: 'YouTube Growth',
      slug: 'youtube-growth',
      order: 1,
      icon: 'TrendingUp',
      description: 'Master algorithms, audience retention, and channel scale',
    },
    {
      id: 'video-editing',
      name: 'Video Editing',
      slug: 'video-editing',
      order: 2,
      icon: 'Video',
      description: 'CapCut, Premiere Pro, pacing and cinematic sound effects',
    },
    {
      id: 'monetization',
      name: 'Monetization & Sponsorships',
      slug: 'monetization',
      order: 3,
      icon: 'DollarSign',
      description: 'Brand deals, affiliate systems, and digital product sales',
    },
  ],

  courses: [
    {
      id: 'course_yt_starter',
      title: 'YouTube Starter Mastery 2026',
      description: 'Complete roadmap to launch, grow, and monetize your YouTube channel from zero to 100k subscribers.',
      category: 'youtube-growth',
      price: 1999,
      discountPrice: 499,
      language: 'Hindi',
      instructor: 'Sahil Verma',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80',
      isPublished: true,
      isNew: true,
      isFeatured: true,
      order: 1,
      totalLessons: 6,
      totalDuration: '3h 45m',
      sections: [
        {
          id: 'sec_1',
          title: 'Module 1: Channel Foundations',
          order: 1,
          lessons: [
            { id: 'les_1_1', title: 'Niche Selection & Market Research', type: 'video', videoId: 'sample_vid_01', duration: '18:24', order: 1, isFreePreview: true },
            { id: 'les_1_2', title: 'Channel Branding & Artwork', type: 'video', videoId: 'sample_vid_02', duration: '14:10', order: 2, isFreePreview: false },
            { id: 'les_1_3', title: 'Niche Checklist & Worksheet', type: 'pdf', videoId: 'https://example.com/worksheet.pdf', duration: '10m read', order: 3, isFreePreview: true },
          ],
        },
        {
          id: 'sec_2',
          title: 'Module 2: The YouTube Algorithm Demystified',
          order: 2,
          lessons: [
            { id: 'les_2_1', title: 'CTR & Clickable Thumbnails', type: 'video', videoId: 'sample_vid_03', duration: '25:40', order: 1, isFreePreview: false },
            { id: 'les_2_2', title: 'Audience Retention & Pacing', type: 'video', videoId: 'sample_vid_04', duration: '22:15', order: 2, isFreePreview: false },
            { id: 'les_2_3', title: 'Algorithm Retention Quiz', type: 'quiz', videoId: 'quiz_01', duration: '10 questions', order: 3, isFreePreview: false },
          ],
        },
      ],
    },
    {
      id: 'course_video_editing',
      title: 'Premiere Pro & CapCut Mobile Pro',
      description: 'Master high-retention video editing used by top creators. Transitions, sound design, and color grading.',
      category: 'video-editing',
      price: 2499,
      discountPrice: 699,
      language: 'Hindi',
      instructor: 'Rohan Sharma',
      thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      isPublished: true,
      isNew: false,
      isFeatured: true,
      order: 2,
      totalLessons: 4,
      totalDuration: '2h 30m',
      sections: [
        {
          id: 'sec_edit_1',
          title: 'Fast-Paced Editing Workflow',
          order: 1,
          lessons: [
            { id: 'les_edit_1', title: 'Timeline Shortcuts & Trimming', type: 'video', videoId: 'edit_vid_01', duration: '20:00', order: 1, isFreePreview: true },
            { id: 'les_edit_2', title: 'Sound Effects & Audio Leveling', type: 'video', videoId: 'edit_vid_02', duration: '18:30', order: 2, isFreePreview: false },
          ],
        },
        {
          id: 'sec_edit_2',
          title: 'Motion Graphics & B-Roll',
          order: 2,
          lessons: [
            { id: 'les_edit_3', title: 'Keyframing & Text Animations', type: 'video', videoId: 'edit_vid_03', duration: '28:15', order: 1, isFreePreview: false },
            { id: 'les_edit_4', title: 'Preset Pack & Asset Library', type: 'pdf', videoId: 'https://example.com/assets.zip', duration: '5m read', order: 2, isFreePreview: false },
          ],
        },
      ],
    },
    {
      id: 'course_faceless_ai',
      title: 'Faceless YouTube Channel Automation',
      description: 'Build profitable automated channels using AI scriptwriting, voiceovers, stock footage, and SEO tricks.',
      category: 'youtube-growth',
      price: 2999,
      discountPrice: 999,
      language: 'Hindi',
      instructor: 'Amit Patel',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      isPublished: true,
      isNew: true,
      isFeatured: false,
      order: 3,
      totalLessons: 3,
      totalDuration: '1h 50m',
      sections: [
        {
          id: 'sec_ai_1',
          title: 'AI Automation Blueprint',
          order: 1,
          lessons: [
            { id: 'les_ai_1', title: 'Choosing High-RPM Niches', type: 'video', videoId: 'ai_vid_01', duration: '16:00', order: 1, isFreePreview: true },
            { id: 'les_ai_2', title: 'AI Scripting with ChatGPT', type: 'video', videoId: 'ai_vid_02', duration: '24:10', order: 2, isFreePreview: false },
            { id: 'les_ai_3', title: 'AI Voice Generation & Editing', type: 'video', videoId: 'ai_vid_03', duration: '22:45', order: 3, isFreePreview: false },
          ],
        },
      ],
    },
    {
      id: 'course_monetization_playbook',
      title: 'Affiliate Marketing & Brand Deals Playbook',
      description: 'How to negotiate 5-figure sponsorship deals and create multiple passive income streams beyond AdSense.',
      category: 'monetization',
      price: 1499,
      discountPrice: 399,
      language: 'Hindi',
      instructor: 'Pooja Das',
      thumbnailUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&auto=format&fit=crop&q=80',
      isPublished: true,
      isNew: false,
      isFeatured: false,
      order: 4,
      totalLessons: 2,
      totalDuration: '1h 15m',
      sections: [
        {
          id: 'sec_mon_1',
          title: 'Sponsorship Outreach',
          order: 1,
          lessons: [
            { id: 'les_mon_1', title: 'Media Kit & Rate Card Creation', type: 'video', videoId: 'mon_vid_01', duration: '19:30', order: 1, isFreePreview: true },
            { id: 'les_mon_2', title: 'Cold Pitch Email Templates', type: 'pdf', videoId: 'https://example.com/pitch-templates.pdf', duration: '15m read', order: 2, isFreePreview: false },
          ],
        },
      ],
    },
    {
      id: 'course_draft_masterclass',
      title: 'Advanced Creator Masterclass (Draft Cohort)',
      description: 'Upcoming exclusive cohort course for elite creators with 50k+ subscribers.',
      category: 'youtube-growth',
      price: 4999,
      discountPrice: 1999,
      language: 'Hindi',
      instructor: 'Sahil Verma',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      isPublished: false,
      isNew: false,
      isFeatured: false,
      order: 5,
      totalLessons: 1,
      totalDuration: '45m',
      sections: [
        {
          id: 'sec_draft_1',
          title: 'VIP Orientation',
          order: 1,
          lessons: [
            { id: 'les_draft_1', title: 'Private VIP Briefing', type: 'video', videoId: 'draft_vid_01', duration: '45:00', order: 1, isFreePreview: false },
          ],
        },
      ],
    },
  ],

  banners: [
    {
      id: 'banner_1',
      title: 'Launch Offer - Flat 75% Off',
      imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1000&auto=format&fit=crop&q=80',
      actionType: 'course',
      actionValue: 'course_yt_starter',
      order: 1,
      active: true,
    },
    {
      id: 'banner_2',
      title: 'New Course: Faceless Channels',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      actionType: 'course',
      actionValue: 'course_faceless_ai',
      order: 2,
      active: true,
    },
    {
      id: 'banner_3',
      title: 'Archived Promo 2024',
      imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1000&auto=format&fit=crop&q=80',
      actionType: 'url',
      actionValue: 'https://youtubesikho.com',
      order: 3,
      active: false,
    },
  ],

  homeSections: [
    { id: 'sec_banner', type: 'banner', title: 'Top Banners', order: 1, isVisible: true },
    { id: 'sec_categories', type: 'categories', title: 'Explore Categories', order: 2, isVisible: true },
    { id: 'sec_featured', type: 'courses', title: 'Featured Masterclasses', order: 3, isVisible: true },
    { id: 'sec_continue', type: 'continue_watching', title: 'Resume Learning', order: 4, isVisible: true },
    { id: 'sec_new', type: 'courses', title: 'Newly Released Courses', order: 5, isVisible: true },
    { id: 'sec_secret', type: 'custom', title: 'Secret Beta Section', order: 6, isVisible: false },
  ],

  appConfig: {
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
  },
};

async function seedDatabase() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('                 SEEDING FIRESTORE DATABASE                     ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  try {
    // 1. Seed Categories
    console.log(`▶ Seeding ${SEED_DATA.categories.length} Categories...`);
    for (const cat of SEED_DATA.categories) {
      const { id, ...data } = cat;
      await setDoc(doc(db, 'categories', id), {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log(`  ✓ Category seeded: ${cat.name} (${id})`);
    }

    // 2. Seed Courses, Sections & Lessons
    console.log(`\n▶ Seeding ${SEED_DATA.courses.length} Courses with Sections & Lessons...`);
    for (const course of SEED_DATA.courses) {
      const { id, sections, ...courseData } = course;
      await setDoc(doc(db, 'courses', id), {
        ...courseData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log(`  ✓ Course: ${course.title} (${id})`);

      for (const section of sections) {
        const { id: secId, lessons, ...sectionData } = section;
        await setDoc(doc(db, 'courses', id, 'sections', secId), {
          ...sectionData,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        for (const lesson of lessons) {
          const { id: lesId, ...lessonData } = lesson;
          await setDoc(doc(db, 'courses', id, 'sections', secId, 'lessons', lesId), {
            ...lessonData,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
    }

    // 3. Seed Banners
    console.log(`\n▶ Seeding ${SEED_DATA.banners.length} Banners...`);
    for (const banner of SEED_DATA.banners) {
      const { id, ...data } = banner;
      await setDoc(doc(db, 'banners', id), {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log(`  ✓ Banner: ${banner.title} (active=${banner.active})`);
    }

    // 4. Seed Dynamic Home Sections
    console.log(`\n▶ Seeding ${SEED_DATA.homeSections.length} Dynamic Home Sections...`);
    for (const sec of SEED_DATA.homeSections) {
      const { id, ...data } = sec;
      await setDoc(doc(db, 'homeSections', id), {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log(`  ✓ Home Section: ${sec.title} (order=${sec.order}, isVisible=${sec.isVisible})`);
    }

    // 5. Seed App Config
    console.log('\n▶ Seeding App Configuration (/appConfig/main)...');
    await setDoc(doc(db, 'appConfig', 'main'), {
      ...SEED_DATA.appConfig,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('  ✓ /appConfig/main document populated.');

    console.log('\n═════════════════════════════════════════════════════════════════');
    console.log('🎉 FIRESTORE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed with error:', error);
    process.exit(1);
  }
}

seedDatabase();
