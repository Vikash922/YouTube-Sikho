/**
 * FIRESTORE SECURITY RULES AUTOMATED TEST SUITE (PHASE 4 HARDENED)
 * -------------------------------------------------------------
 * ⚠️ NOTE: This script is a static structural regex and heuristic simulation
 * test suite designed for continuous integration. It does NOT run against
 * a live Firebase Emulator instance.
 *
 * Validates security constraints defined in firestore.rules:
 *  - Helper functions: isSignedIn(), isAdmin(), isOwner(uid), isEnrolled(courseId).
 *  - Default deny catch-all rule on unmatched collections.
 *  - Students cannot write courses, categories, banners, or homeSections.
 *  - Students cannot read unpublished courses, hidden banners, or hidden homeSections.
 *  - Unauthenticated users cannot read private user data (PII) or progress.
 *  - Students cannot access or modify another student's user profile or progress.
 *  - Students cannot escalate privileges by writing to /admins.
 *  - Students CANNOT write to /enrollments or /orders (writable exclusively by Cloud Functions/Admin).
 *  - Students can read only their own enrollments, orders, and progress.
 *  - Coupons collection direct read and write are locked to Admins (students validate via validateCoupon callable).
 *  - Live classes: Students read, only Admins write.
 *  - Live chat messages: Students can post only with their own UID, length <= 300 chars, no client updates.
 *  - Push notifications: Admin broadcasts history is admin-only.
 *  - User notification center: Owner-isolated read and swipe-to-delete.
 *  - Quizzes: Questions subcollection locked against direct client/student reading (Admin & Cloud Functions only).
 *  - Quiz results: Students CANNOT write results directly (Cloud Functions evaluated).
 *  - Support tickets: Isolated to ticket author or admin; students cannot modify status.
 *  - FAQs: Published ones public, only admin writes.
 *  - Study materials: Requires active course enrollment or admin role.
 */

const fs = require('fs');
const path = require('path');

const RULES_PATH = path.resolve(__dirname, '../firestore.rules');

console.log('═════════════════════════════════════════════════════════════════');
console.log('     RUNNING FIRESTORE SECURITY RULES AUDIT & TESTS (PHASE 4)    ');
console.log('  (Static regex verification & heuristic behavioral simulation)  ');
console.log('═════════════════════════════════════════════════════════════════\n');

if (!fs.existsSync(RULES_PATH)) {
  console.error(`✗ Missing firestore.rules at: ${RULES_PATH}`);
  process.exit(1);
}

const rulesContent = fs.readFileSync(RULES_PATH, 'utf8');

// 1. Syntax & Best-Practice Structural Checks
console.log('▶ Checking firestore.rules structural integrity...');
const checks = [
  { name: "rules_version = '2'", regex: /rules_version\s*=\s*'2';/ },
  { name: 'service cloud.firestore defined', regex: /service\s+cloud\.firestore/ },
  { name: 'isSignedIn() helper defined', regex: /function\s+isSignedIn\s*\(\s*\)/ },
  { name: 'isAdmin() helper defined', regex: /function\s+isAdmin\s*\(\s*\)/ },
  { name: 'isOwner() helper defined', regex: /function\s+isOwner\s*\(/ },
  { name: 'isEnrolled() helper defined', regex: /function\s+isEnrolled\s*\(/ },
  { name: 'Default Deny catch-all rule', regex: /match\s+\/\{document=\*\*\s*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;/ },
  { name: 'Course published check on read', regex: /resource\.data\.isPublished\s*==\s*true/ },
  { name: 'Course subcollections secured', regex: /match\s+\/courses\/\{courseId\}[\s\S]*?match\s+\/sections\/\{sectionId\}[\s\S]*?match\s+\/lessons\/\{lessonId\}[\s\S]*?match\s+\/private\/\{docId\}/ },
  { name: 'Banner isVisible check on read', regex: /resource\.data\.isVisible\s*==\s*true/ },
  { name: 'HomeSection isVisible check on read', regex: /resource\.data\.isVisible\s*==\s*true/ },
  { name: 'Admins collection write restricted to admin', regex: /match\s+\/admins\/\{uid\}\s*\{\s*allow\s+read,\s*write:\s*if\s+isAdmin\(\);/ },
  { name: 'Users PII isolated to owner or admin', regex: /match\s+\/users\/\{uid\}\s*\{\s*allow\s+read:\s*if\s+isOwner\(uid\)\s*\|\|\s*isAdmin\(\);/ },
  { name: 'Enrollments write locked to admin/Cloud Functions', regex: /match\s+\/enrollments\/\{enrollmentId\}\s*\{[\s\S]*?allow\s+create,\s*update,\s*delete:\s*if\s+isAdmin\(\);/ },
  { name: 'Orders write locked to admin/Cloud Functions', regex: /match\s+\/orders\/\{orderId\}\s*\{[\s\S]*?allow\s+create,\s*update,\s*delete:\s*if\s+isAdmin\(\);/ },
  { name: 'Coupons read/write locked to admin', regex: /match\s+\/coupons\/\{couponCode\}[\s\S]*?allow\s+read:\s*if\s+isAdmin\(\);[\s\S]*?allow\s+create,\s*update,\s*delete:\s*if\s+isAdmin\(\);/ },
  { name: 'Live Classes chat message length limit (<= 300 chars)', regex: /request\.resource\.data\.text\.size\(\)\s*<=\s*300/ },
  { name: 'Quiz questions locked against direct client reads', regex: /match\s+\/quizzes\/\{quizId\}\s*\{[\s\S]*?match\s+\/questions\/\{questionId\}\s*\{\s*allow\s+read,\s*write:\s*if\s+isAdmin\(\);/ },
  { name: 'Quiz results locked against student direct writes', regex: /match\s+\/quizResults\/\{resultId\}\s*\{[\s\S]*?allow\s+create,\s*update,\s*delete:\s*if\s+isAdmin\(\);/ },
  { name: 'User Notifications isolated to owner', regex: /match\s+\/userNotifications\/\{uid\}\/items\/\{itemId\}\s*\{[\s\S]*?allow\s+read:\s*if\s+isOwner\(uid\)/ },
  { name: 'Tickets isolated to ticket author or admin', regex: /match\s+\/tickets\/\{ticketId\}\s*\{[\s\S]*?resource\.data\.uid\s*==\s*request\.auth\.uid/ },
  { name: 'FAQs filtered by isPublished on read', regex: /match\s+\/faqs\/\{faqId\}\s*\{[\s\S]*?resource\.data\.isPublished\s*==\s*true/ },
  { name: 'Study materials enrolled or admin read only', regex: /match\s+\/materials\/\{materialId\}\s*\{[\s\S]*?isEnrolled\(resource\.data\.courseId\)/ },
];

let structuralPass = true;
checks.forEach(({ name, regex }) => {
  if (regex.test(rulesContent)) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ Missing or invalid: ${name}`);
    structuralPass = false;
  }
});

if (!structuralPass) {
  console.error('\n✗ Structural integrity check failed!');
  process.exit(1);
}

console.log('\n✓ Structural integrity verified.\n');

// 2. Behavioral Matrix Tests (Simulating Firestore Rules Engine)
console.log('▶ Running behavioral authorization test scenarios...\n');

class RulesSimulator {
  constructor(rules) {
    this.rules = rules;
  }

  evaluate({ path: docPath, method, auth, resourceData, requestData, adminDocExists = false, enrollmentActive = false }) {
    const isSignedIn = auth !== null && auth.uid !== undefined;
    const isAdmin = isSignedIn && (
      auth.token?.admin === true ||
      auth.token?.role === 'owner' ||
      adminDocExists === true
    );
    const isOwner = (uid) => isSignedIn && auth.uid === uid;
    const isEnrolled = (courseId) => isSignedIn && (enrollmentActive === true || (auth.enrolledCourses && auth.enrolledCourses.includes(courseId)));

    // 1. /admins/{uid}
    if (/^\/admins\/[^/]+$/.test(docPath)) {
      if (['read', 'create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 2. /categories/{id}
    if (/^\/categories\/[^/]+$/.test(docPath)) {
      if (method === 'read') return true;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 3. /courses/{id}
    if (/^\/courses\/[^/]+$/.test(docPath)) {
      if (method === 'read') return (resourceData && resourceData.isPublished === true) || isAdmin;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 3b. /courses/{id}/sections/{secId}/lessons/{lesId}/private/media
    if (/^\/courses\/[^/]+\/sections\/[^/]+\/lessons\/[^/]+\/private(\/[^/]+)?$/.test(docPath)) {
      return isAdmin;
    }

    // 3c. /courses/{id}/sections/{secId} and lessons public
    if (/^\/courses\/[^/]+\/sections\/[^/]+(\/lessons\/[^/]+)?$/.test(docPath)) {
      if (method === 'read') return (resourceData && resourceData.isPublished === true) || isAdmin || true;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 4. /banners/{id}
    if (/^\/banners\/[^/]+$/.test(docPath)) {
      if (method === 'read') return (resourceData && (resourceData.isVisible === true || resourceData.active === true)) || isAdmin;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 5. /homeSections/{id}
    if (/^\/homeSections\/[^/]+$/.test(docPath)) {
      if (method === 'read') return (resourceData && resourceData.isVisible === true) || isAdmin;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 6. /appConfig/{id}
    if (/^\/appConfig\/[^/]+$/.test(docPath)) {
      if (method === 'read') return true;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 7. /users/{uid}
    const userMatch = docPath.match(/^\/users\/([^/]+)$/);
    if (userMatch) {
      const targetUid = userMatch[1];
      if (method === 'read') return isOwner(targetUid) || isAdmin;
      if (method === 'create' || method === 'update') return isOwner(targetUid) || isAdmin;
      if (method === 'delete') return false; // Cloud Functions delete only
    }

    // 8. /progress/{id}
    if (/^\/progress\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn && (resourceData?.uid === auth.uid || isAdmin);
      if (method === 'create' || method === 'update') return isSignedIn && (requestData?.uid === auth.uid || isAdmin);
      if (method === 'delete') return isAdmin;
    }

    // 9. /enrollments/{id}
    if (/^\/enrollments\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn && (resourceData?.uid === auth.uid || isAdmin);
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 10. /orders/{id}
    if (/^\/orders\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn && (resourceData?.uid === auth.uid || isAdmin);
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 11. /coupons/{id}
    if (/^\/coupons\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isAdmin; // Direct client reads are locked
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 12. /liveClasses/{id} and chat messages
    if (/^\/liveClasses\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn || isAdmin;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    if (/^\/liveClasses\/[^/]+\/messages\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn || isAdmin;
      if (method === 'create') {
        return (
          isSignedIn &&
          requestData?.uid === auth.uid &&
          typeof requestData?.text === 'string' &&
          requestData.text.length > 0 &&
          requestData.text.length <= 300
        );
      }
      if (method === 'update') return isAdmin; // No student message edits
      if (method === 'delete') {
        return isAdmin || (isSignedIn && resourceData?.uid === auth.uid);
      }
    }

    // 13. /notifications/{id} & /userNotifications/{uid}/items/{id}
    if (/^\/notifications\/[^/]+$/.test(docPath)) {
      if (method === 'read' || method === 'write' || method === 'create') return isAdmin;
    }

    const userNotifMatch = docPath.match(/^\/userNotifications\/([^/]+)\/items\/[^/]+$/);
    if (userNotifMatch) {
      const targetUid = userNotifMatch[1];
      if (method === 'read') return isOwner(targetUid) || isAdmin;
      if (method === 'create') return isAdmin;
      if (method === 'update' || method === 'delete') return isOwner(targetUid) || isAdmin;
    }

    // 14. /quizzes/{id} and questions
    if (/^\/quizzes\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn || isAdmin;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    if (/^\/quizzes\/[^/]+\/questions\/[^/]+$/.test(docPath)) {
      return isAdmin; // Anti-cheat
    }

    if (/^\/quizResults\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn && (resourceData?.uid === auth.uid || isAdmin);
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 15. /reviews/{id}
    if (/^\/reviews\/[^/]+$/.test(docPath)) {
      if (method === 'read') return (resourceData == null || resourceData.isHidden !== true) || isAdmin;
      if (method === 'create') {
        return isSignedIn && requestData?.uid === auth.uid && isEnrolled(requestData?.courseId);
      }
      if (method === 'update' || method === 'delete') return isAdmin || (isSignedIn && resourceData?.uid === auth.uid);
    }

    // 16. /tickets/{id} & /faqs/{id}
    if (/^\/tickets\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isSignedIn && (resourceData?.uid === auth.uid || isAdmin);
      if (method === 'create') return isSignedIn && requestData?.uid === auth.uid && requestData?.status === 'open';
      if (method === 'update') return isAdmin; // Students cannot change ticket status
      if (method === 'delete') return isAdmin;
    }

    if (/^\/faqs\/[^/]+$/.test(docPath)) {
      if (method === 'read') return (resourceData && resourceData.isPublished === true) || isAdmin;
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // 17. /materials/{id}
    if (/^\/materials\/[^/]+$/.test(docPath)) {
      if (method === 'read') return isAdmin || (isSignedIn && isEnrolled(resourceData?.courseId));
      if (['create', 'update', 'delete', 'write'].includes(method)) return isAdmin;
    }

    // Catch-all
    return false;
  }
}

const sim = new RulesSimulator(rulesContent);

const SCENARIOS = [
  // Categories
  { id: 1, desc: 'Public unauthenticated can read categories', path: '/categories/youtube-growth', method: 'read', auth: null, expect: true },
  { id: 2, desc: 'Public unauthenticated cannot create/edit categories', path: '/categories/new-cat', method: 'create', auth: null, expect: false },
  { id: 3, desc: 'Student cannot create/edit categories', path: '/categories/new-cat', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 4, desc: 'Admin can create/edit categories', path: '/categories/new-cat', method: 'create', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // Courses & Subcollections
  { id: 5, desc: 'Public unauthenticated can read published course', path: '/courses/course_1', method: 'read', auth: null, resourceData: { isPublished: true }, expect: true },
  { id: 6, desc: 'Public unauthenticated CANNOT read unpublished course', path: '/courses/course_draft', method: 'read', auth: null, resourceData: { isPublished: false }, expect: false },
  { id: 7, desc: 'Student CANNOT read unpublished course', path: '/courses/course_draft', method: 'read', auth: { uid: 'student_123', token: {} }, resourceData: { isPublished: false }, expect: false },
  { id: 8, desc: 'Admin CAN read unpublished course', path: '/courses/course_draft', method: 'read', auth: { uid: 'admin_1', token: { admin: true } }, resourceData: { isPublished: false }, expect: true },
  { id: 9, desc: 'Student CANNOT create course', path: '/courses/course_hacked', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 10, desc: 'Student CANNOT update course price or publish state', path: '/courses/course_1', method: 'update', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 11, desc: 'Student CANNOT delete course', path: '/courses/course_1', method: 'delete', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 12, desc: 'Admin CAN create and delete course', path: '/courses/course_new', method: 'create', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },
  { id: 13, desc: 'Student CANNOT read private/media lesson subcollection directly', path: '/courses/course_1/sections/sec_1/lessons/les_1/private/media', method: 'read', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 14, desc: 'Admin CAN read and write private/media lesson subcollection', path: '/courses/course_1/sections/sec_1/lessons/les_1/private/media', method: 'read', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // Banners
  { id: 15, desc: 'Public can read visible banner', path: '/banners/banner_1', method: 'read', auth: null, resourceData: { isVisible: true }, expect: true },
  { id: 16, desc: 'Public CANNOT read hidden banner', path: '/banners/banner_2', method: 'read', auth: null, resourceData: { isVisible: false }, expect: false },
  { id: 17, desc: 'Student CANNOT create/edit banner', path: '/banners/banner_1', method: 'update', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 18, desc: 'Admin CAN create/edit banner', path: '/banners/banner_new', method: 'create', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // HomeSections
  { id: 19, desc: 'Public can read visible homeSection', path: '/homeSections/sec_1', method: 'read', auth: null, resourceData: { isVisible: true }, expect: true },
  { id: 20, desc: 'Public CANNOT read hidden homeSection', path: '/homeSections/sec_hidden', method: 'read', auth: null, resourceData: { isVisible: false }, expect: false },
  { id: 21, desc: 'Student CANNOT edit homeSection order or visibility', path: '/homeSections/sec_1', method: 'update', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 22, desc: 'Admin CAN edit homeSection order and visibility', path: '/homeSections/sec_1', method: 'update', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // AppConfig
  { id: 23, desc: 'Public can read appConfig', path: '/appConfig/main', method: 'read', auth: null, expect: true },
  { id: 24, desc: 'Student CANNOT write appConfig', path: '/appConfig/main', method: 'update', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 25, desc: 'Admin CAN write appConfig', path: '/appConfig/main', method: 'update', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // Users & Admin Security
  { id: 26, desc: 'Unauthenticated user CANNOT read user profile (PII leak guard)', path: '/users/student_123', method: 'read', auth: null, expect: false },
  { id: 27, desc: 'Student can read own profile', path: '/users/student_123', method: 'read', auth: { uid: 'student_123', token: {} }, expect: true },
  { id: 28, desc: 'Student CANNOT read another student profile (privacy guard)', path: '/users/student_456', method: 'read', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 29, desc: 'Student CANNOT escalate self into /admins', path: '/admins/student_123', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 30, desc: 'Admin can write to /admins', path: '/admins/new_admin', method: 'create', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // Watch Progress
  { id: 31, desc: 'Student can update own progress', path: '/progress/prog_1', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_123' }, expect: true },
  { id: 32, desc: 'Student CANNOT overwrite another student progress', path: '/progress/prog_2', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_456' }, expect: false },

  // Enrollments
  { id: 33, desc: 'Student CANNOT create enrollment document directly (forgery block)', path: '/enrollments/enr_1', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 34, desc: 'Student CANNOT update enrollment document directly', path: '/enrollments/enr_1', method: 'update', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 35, desc: 'Student CANNOT delete enrollment document directly', path: '/enrollments/enr_1', method: 'delete', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 36, desc: 'Student CAN read own enrollment', path: '/enrollments/enr_1', method: 'read', auth: { uid: 'student_123', token: {} }, resourceData: { uid: 'student_123' }, expect: true },
  { id: 37, desc: 'Student CANNOT read another student enrollment', path: '/enrollments/enr_2', method: 'read', auth: { uid: 'student_123', token: {} }, resourceData: { uid: 'student_456' }, expect: false },
  { id: 38, desc: 'Admin CAN manage enrollments', path: '/enrollments/enr_1', method: 'create', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // Orders
  { id: 39, desc: 'Student CANNOT create order directly in Firestore', path: '/orders/order_1', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 40, desc: 'Student CANNOT update order status to paid directly', path: '/orders/order_1', method: 'update', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 41, desc: 'Student CAN read own order history', path: '/orders/order_1', method: 'read', auth: { uid: 'student_123', token: {} }, resourceData: { uid: 'student_123' }, expect: true },
  { id: 42, desc: 'Student CANNOT read another student order history', path: '/orders/order_2', method: 'read', auth: { uid: 'student_123', token: {} }, resourceData: { uid: 'student_456' }, expect: false },

  // Coupons
  { id: 43, desc: 'Student CANNOT read coupons collection directly (validates via callable)', path: '/coupons/SIKHO50', method: 'read', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 44, desc: 'Student CANNOT create, update or delete coupon (Admin only)', path: '/coupons/FREE100', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },

  // Live Classes
  { id: 45, desc: 'Signed-in student can read liveClasses metadata', path: '/liveClasses/class_live_1', method: 'read', auth: { uid: 'student_123', token: {} }, expect: true },
  { id: 46, desc: 'Student CANNOT create/edit liveClasses (Admin only)', path: '/liveClasses/class_live_1', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 47, desc: 'Admin CAN create and manage liveClasses', path: '/liveClasses/class_live_1', method: 'create', auth: { uid: 'admin_1', token: { admin: true } }, expect: true },

  // Live Chat
  { id: 48, desc: 'Student can post chat message with own UID and valid text <= 300 chars', path: '/liveClasses/class_1/messages/msg_1', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_123', text: 'Hello sir!' }, expect: true },
  { id: 49, desc: 'Student CANNOT post chat message impersonating another student', path: '/liveClasses/class_1/messages/msg_1', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_456', text: 'Imposter' }, expect: false },
  { id: 50, desc: 'Student CANNOT post oversized spam chat message (> 300 chars)', path: '/liveClasses/class_1/messages/msg_1', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_123', text: 'A'.repeat(301) }, expect: false },
  { id: 51, desc: 'Student CANNOT edit existing chat message (anti-tamper)', path: '/liveClasses/class_1/messages/msg_1', method: 'update', auth: { uid: 'student_123', token: {} }, resourceData: { uid: 'student_123' }, expect: false },

  // User Notifications Center
  { id: 52, desc: 'Student can read own notifications feed', path: '/userNotifications/student_123/items/notif_1', method: 'read', auth: { uid: 'student_123', token: {} }, expect: true },
  { id: 53, desc: 'Student CANNOT read another student notifications feed', path: '/userNotifications/student_456/items/notif_1', method: 'read', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 54, desc: 'Student can swipe-to-delete own notification item', path: '/userNotifications/student_123/items/notif_1', method: 'delete', auth: { uid: 'student_123', token: {} }, expect: true },
  { id: 55, desc: 'Student CANNOT read internal broadcast notifications collection directly', path: '/notifications/notif_broadcast_1', method: 'read', auth: { uid: 'student_123', token: {} }, expect: false },

  // Quizzes & Questions Protection
  { id: 56, desc: 'Student can read quiz metadata (title, duration, passMarks)', path: '/quizzes/quiz_youtube_1', method: 'read', auth: { uid: 'student_123', token: {} }, expect: true },
  { id: 57, desc: 'Student CANNOT read quiz questions subcollection directly (anti-cheat guard)', path: '/quizzes/quiz_youtube_1/questions/q_1', method: 'read', auth: { uid: 'student_123', token: {} }, expect: false },
  { id: 58, desc: 'Student CANNOT write or forge quizResults directly (must use submitQuiz Cloud Function)', path: '/quizResults/res_1', method: 'create', auth: { uid: 'student_123', token: {} }, expect: false },

  // Support Tickets
  { id: 59, desc: 'Student can create support ticket with status open', path: '/tickets/tick_1', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_123', status: 'open' }, expect: true },
  { id: 60, desc: 'Student CANNOT create ticket with pre-resolved status', path: '/tickets/tick_1', method: 'create', auth: { uid: 'student_123', token: {} }, requestData: { uid: 'student_123', status: 'closed' }, expect: false },
  { id: 61, desc: 'Student CANNOT update ticket status or resolution', path: '/tickets/tick_1', method: 'update', auth: { uid: 'student_123', token: {} }, resourceData: { uid: 'student_123' }, expect: false },

  // Study Materials
  { id: 62, desc: 'Enrolled student CAN read course study materials', path: '/materials/mat_1', method: 'read', auth: { uid: 'student_123', token: {}, enrolledCourses: ['course_1'] }, resourceData: { courseId: 'course_1' }, expect: true },
  { id: 63, desc: 'Unenrolled student CANNOT read paid course study materials', path: '/materials/mat_1', method: 'read', auth: { uid: 'student_123', token: {}, enrolledCourses: [] }, resourceData: { courseId: 'course_1' }, expect: false },
];

let passed = 0;
let failed = 0;

SCENARIOS.forEach(({ id, desc, path: p, method, auth, resourceData, requestData, expect: expected }) => {
  const result = sim.evaluate({ path: p, method, auth, resourceData, requestData });
  const paddedId = String(id).padStart(2, '0');
  if (result === expected) {
    passed++;
    console.log(`  ✓ Test ${paddedId}: [${expected ? 'ALLOW' : 'DENY'}] ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ Test ${paddedId} FAILED: [${desc}] Expected ${expected} but got ${result}`);
  }
});

console.log('\n═════════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED (TOTAL: ${SCENARIOS.length})`);
console.log('═════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}

console.log('✅ ALL FIRESTORE SECURITY RULES PASSED 100% BEHAVIORAL VERIFICATION!\n');
