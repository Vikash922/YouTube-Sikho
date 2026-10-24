export type SupportedLanguage = 'en' | 'hi';

export const translations = {
  en: {
    // Tab Navigation
    tabHome: 'Home',
    tabCourses: 'Courses',
    tabLearning: 'Learning',
    tabLive: 'Live',
    tabProfile: 'Profile',

    // Profile & Settings
    myAccount: 'My Account',
    accountSubtitle: 'Manage your preferences and support',
    callSupport: 'Call Support',
    chatWhatsApp: 'Chat on WhatsApp',
    settings: 'Settings',
    settingsSubtitle: 'Preferences & Account Management',
    helpSupport: 'Help & Support Center',
    helpSupportSubtitle: 'We are here to help you 24/7',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    refundPolicy: 'Refund Policy',
    logOut: 'Log Out',
    confirmLogOut: 'Confirm Log Out',
    logOutDescription: 'Are you sure you want to sign out from your student session?',
    cancel: 'Cancel',

    // Sections
    themeAppearance: 'THEME & APPEARANCE',
    supportHelp: 'SUPPORT & HELP',
    aboutLegal: 'ABOUT & LEGAL',
    appLanguage: 'APP LANGUAGE',
    preferences: 'PREFERENCES',
    storageData: 'STORAGE & DATA',
    dangerZone: 'DANGER ZONE',
    deleteAccount: 'Delete My Account',
    deleteAccountWarning: 'This action is irreversible and permanently purges all course progress and records.',
    clearCache: 'Clear Cache',
    autoPlayNext: 'Auto-Play Next Lesson',
    temporaryCache: 'Temporary Cache',
    cacheCleared: 'Cache Cleared',

    // Course Details & Learning
    enrollNow: 'Enroll Now',
    resume: 'Resume Learning',
    paySecurely: 'Pay Securely',
    freePreview: 'FREE PREVIEW',
    courseSyllabus: 'Course Syllabus',
    studyMaterials: 'Study Materials',
    certificate: 'Certificate',
    lifetimeAccess: 'Lifetime Access',
    verifiedStudent: 'VERIFIED',
    newTicket: 'New Ticket',
    closeForm: 'Close Form',
    myTickets: 'My Support Tickets',
    faqs: 'Common FAQs',
    submitTicket: 'Submit Ticket',
    recentInquiries: 'Recent Inquiries',
    openTicket: 'Open a Support Ticket',

    // Player
    curriculum: 'Curriculum',
    overview: 'Overview',
    retryStream: 'Retry Stream',

    // Feedback
    success: 'Success',
    error: 'Error',
  },
  hi: {
    // Tab Navigation
    tabHome: 'होम',
    tabCourses: 'कोर्सेस',
    tabLearning: 'माई लर्निंग',
    tabLive: 'लाइव',
    tabProfile: 'प्रोफाइल',

    // Profile & Settings
    myAccount: 'मेरा खाता',
    accountSubtitle: 'अपनी प्राथमिकताएं और सहायता प्रबंधित करें',
    callSupport: 'कॉल सहायता',
    chatWhatsApp: 'व्हाट्सएप सहायता',
    settings: 'सेटिंग्स',
    settingsSubtitle: 'प्राथमिकताएं और खाता प्रबंधन',
    helpSupport: 'सहायता केंद्र',
    helpSupportSubtitle: 'हम आपकी 24/7 सहायता के लिए उपलब्ध हैं',
    privacyPolicy: 'गोपनीयता नीति',
    termsOfService: 'नियम एवं शर्तें',
    refundPolicy: 'रिफंड नीति',
    logOut: 'लॉग आउट',
    confirmLogOut: 'लॉग आउट की पुष्टि करें',
    logOutDescription: 'क्या आप निश्चित रूप से अपने छात्र खाते से लॉग आउट करना चाहते हैं?',
    cancel: 'रद्द करें',

    // Sections
    themeAppearance: 'थीम और लुक',
    supportHelp: 'सहायता एवं संपर्क',
    aboutLegal: 'विवरण एवं नीतियां',
    appLanguage: 'ऐप भाषा',
    preferences: 'प्राथमिकताएं',
    storageData: 'स्टोरेज एवं डेटा',
    dangerZone: 'खाता हटाएं',
    deleteAccount: 'मेरा खाता हमेशा के लिए हटाएं',
    deleteAccountWarning: 'यह क्रिया अपरिवर्तनीय है और सभी कोर्स प्रगति और रिकॉर्ड को हमेशा के लिए हटा देगी।',
    clearCache: 'कैश साफ़ करें',
    autoPlayNext: 'अगला पाठ अपने आप चलाएं',
    temporaryCache: 'अस्थायी कैश फ़ाइलें',
    cacheCleared: 'कैश साफ़ हो गया',

    // Course Details & Learning
    enrollNow: 'अभी जुड़ें',
    resume: 'पढ़ाई जारी रखें',
    paySecurely: 'सुरक्षित भुगतान करें',
    freePreview: 'फ्री प्रीव्यू',
    courseSyllabus: 'कोर्स सिलेबस',
    studyMaterials: 'स्टडी मटेरियल',
    certificate: 'सर्टिफिकेट',
    lifetimeAccess: 'लाइफटाइम एक्सेस',
    verifiedStudent: 'सत्यापित',
    newTicket: 'नया टिकट',
    closeForm: 'फॉर्म बंद करें',
    myTickets: 'मेरे सपोर्ट टिकट',
    faqs: 'अक्सर पूछे जाने वाले सवाल',
    submitTicket: 'टिकट भेजें',
    recentInquiries: 'हालिया प्रश्न',
    openTicket: 'नया सपोर्ट टिकट खोलें',

    // Player
    curriculum: 'सिलेबस',
    overview: 'विवरण',
    retryStream: 'पुनः प्रयास करें',

    // Feedback
    success: 'सफलता',
    error: 'त्रुटि',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
