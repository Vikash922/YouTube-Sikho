# 📖 Course Creator & Admin Operator Manual

A day-to-day guide for the non-technical course creator and operations team to manage courses, students, live broadcasts, and revenue effortlessly.

---

## 1. Adding a Course & Uploading Lessons

1. Open the Admin Panel (`https://your-admin-url.web.app`) and navigate to the **Courses** tab.
2. Click **+ Add Course**.
3. Fill in basic details:
   - **Title**: E.g., *"YouTube Viral Masterclass 2026"*.
   - **Category**: Select the appropriate category (e.g. YouTube Growth).
   - **Price & Discount Price**: E.g., Regular ₹3,999, Offer ₹1,999.
   - **Instructor Name & Language**: E.g., *"Aman Dhattarwal"*, *"Hindi"*.
   - **Thumbnail URL**: Link to a 16:9 ratio course cover image.
4. Click **Create Course**.
5. Click **Manage Curriculum**:
   - Click **+ Add Section** (e.g., *Module 1: The First 30 Seconds*).
   - Under that section, click **+ Add Lesson**.
   - Select type: **Video** or **PDF Notes**.
   - Enter lesson title, video duration, and toggle **Free Preview** if you want this video unlocked for non-paying users as a free sample.
   - Paste your unlisted YouTube link. The video title and duration are validated and saved securely in private media.
6. Toggle **Publish** when ready. The course immediately appears on the mobile app.

---

## 2. Scheduling & Hosting a Live Class

1. Navigate to the **Live Classes** tab.
2. Click **+ Schedule Live Class**.
3. Enter:
   - **Title**: E.g., *"Weekly Doubt Clearing & Channel Reviews"*.
   - **Course**: Choose a specific course or select *"Free for all students"*.
   - **Date & Start Time**: E.g., Saturday at 7:00 PM.
   - **Stream Source**: **YouTube Live (Unlisted)**.
   - **Stream Link**: Enter your unlisted YouTube live stream URL.
   - **Live Chat**: Toggle ON to enable real-time student messaging.
4. **When Starting the Class**:
   - Open the Live Classes page and click the green **Go Live** button.
   - A push notification is automatically broadcast to all enrolled students.
   - The mobile app displays a pulsating red `LIVE NOW` badge.
5. **When Concluding the Class**:
   - Click **End Stream**. The class status changes to `Ended` and the replay recording is saved so students can re-watch it anytime.

---

## 3. Creating Quizzes & Tracking Performance

1. Navigate to the **Quizzes** tab.
2. Click **+ Create Quiz**.
3. Set the passing threshold (e.g. 70%), time limit (e.g. 15 minutes), and select the parent course.
4. Add multiple-choice questions:
   - Enter question text.
   - Add 4 options.
   - Select the radio button corresponding to the correct answer.
   - Optional: Add an explanation so students learn why an answer is right or wrong after submission.
5. Save the quiz.
6. When students complete the quiz on mobile, their scores and pass/fail statuses appear immediately in the **Quiz Results** roster.

---

## 4. Sending Push Notifications

1. Navigate to the **Notifications** tab.
2. Click **+ New Broadcast**.
3. Enter your **Title** (e.g. *"🔥 New Live Q&A Scheduled!"*) and **Message Body**.
4. Select target audience:
   - **All App Users** (for major announcements, discounts, app updates).
   - **Enrolled Students of a Specific Course** (for module unlocks, bonus classes).
5. Choose action when tapped:
   - Open Course
   - Open Live Stream
   - Open Notification Center
   - Open External Website URL
6. Click **Send Push Notification**. The alert is delivered instantly to all students' Android and iOS devices.

---

## 5. Handling Refunds & Access Revocation

1. Navigate to the **Orders** tab.
2. Find the student transaction by Order ID, Student Name, or Phone Number.
3. Click **Refund & Revoke Access**.
4. Enter the reason for the refund (e.g., *"Student requested within 7-day money-back guarantee"*).
5. Click **Confirm Refund**:
   - The refund is processed automatically through Razorpay back to the student's original payment method (UPI / Bank Account) within 5–7 business days.
   - The student's course access is **revoked in real-time**; the locked lesson padlock reappears on their mobile app immediately.

---

## 6. Manual Student Course Enrollment

To grant complimentary access to a VIP student, reviewer, or scholarship winner:
1. Navigate to the **Students** tab.
2. Search for the student by phone or name.
3. Click **Grant Course Access**.
4. Select the course and click **Grant Access**. The course unlocks instantly on the student's phone without requiring payment.

---

## 7. Reviewing Audit Logs (Security & Compliance)

1. Navigate to the **Audit Log** tab (`/activity-log`).
2. Inspect chronological records of:
   - Admin promotions / demotions (`grant_admin_claim`, `revoke_admin_claim`).
   - Manual course enrollments and access revocations (`enroll_grant`, `enroll_revoke`).
   - Payment refunds and transaction clawbacks (`payment_refund`).
   - Deletions of courses, quizzes, and live classes.
   - Account deletion events and requests.
3. Filter by action or search by student UID or course ID for compliance verification.

---

## 9. Dynamic Home Screen Management

The mobile app home screen order and layout is completely controlled by the Admin **Home Manager** (`/home-manager`):
1. **Promotional Banners**:
   - Add new banners with a 16:9 banner image.
   - Choose action target: specific course, category, external URL, or none.
   - Reorder banners using the Up/Down buttons or delete inactive banners.
2. **Dynamic Section Ordering**:
   - Canonical section types supported:
     - `Featured Highlights` (`banners`)
     - `Live Now Streaming` (`liveNow`)
     - `Continue Learning` (`continueWatching`)
     - `Explore Categories` (`categories`)
     - `New Releases` (`newCourses`)
     - `Featured Masterclasses` (`featured`)
     - `Popular Courses` (`popular`)
     - `Daily Learning Streak` (`streak`)
   - Click **Up / Down** arrows to change section position on mobile.
   - Click the **Eye / EyeOff** icon to show or hide a section.
   - The interactive **Phone Mockup Preview** reflects your layout in real-time.
   - Click **Reset Default Home** at any time to restore the recommended standard layout.

---

## 10. Support Desk, Live Threads & Knowledge Base

1. **Student Support Tickets** (`/support`):
   - Review incoming inquiries filtered by status (`Open`, `In Progress`, `Resolved`).
   - Click any ticket row to open the **Live Thread Modal**.
   - Read the student's initial query and conversation history.
   - Type your official response in the reply bar and send.
   - Change ticket status to `Resolved` once resolved; the student sees the updated status immediately.
2. **In-App FAQ Management**:
   - Switch to the **FAQ Accordion** tab.
   - Click **+ Add New FAQ** to create a question, answer, and category.
   - Toggle **Publish / Hidden** to control instant visibility on the mobile app.

---

## 11. Student Access, Blocking & Review Moderation

1. **Suspending Disruptive Students** (`/students`):
   - Search student by name, email, phone, or UID.
   - Click **Block**: The account is flagged `isBlocked: true` and all active authentication sessions are revoked immediately.
   - Click **Unblock** to restore access.
2. **Review Moderation**:
   - Switch to the **Course Reviews** tab.
   - Inspect ratings and student feedback.
   - Click the **Eye / EyeOff** icon to hide abusive or spam reviews from public course listings.
   - Click the **Trash** icon to permanently delete a review.

---

## 12. Multi-Role Team Permissions (RBAC)

The admin panel enforces three distinct permission levels:
- **Owner**: Full platform access. Can manage other administrators, update payment gateway keys, issue payment refunds, and change client branding.
- **Editor**: Can create and edit courses, study materials, quizzes, push notifications, coupons, and manage home screen sections. Cannot manage other admins or modify payment settings.
- **Support**: Dedicated customer care tier. Can reply to support tickets, publish FAQs, view student details, and read orders. Cannot modify courses or issue refunds.

