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

## 7. Emergency Maintenance Mode

When performing major course overhauls or scheduled infrastructure maintenance:
1. Navigate to the **Settings** tab.
2. Under **Maintenance & Version Control**, toggle **Emergency Maintenance Mode** to **ON**.
3. Click **Save All Settings**.
4. All students currently using the mobile app are immediately displayed a friendly maintenance screen informing them that the platform is undergoing a brief upgrade.
5. When work is complete, toggle it **OFF** and save; all students return to normal browsing instantly.
