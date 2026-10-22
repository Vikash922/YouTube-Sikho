# 🛡 Backup & Disaster Recovery Guide

Procedures to safeguard your student records, transaction history, course content, and recover seamlessly in any emergency.

---

## 1. Automated & Manual Firestore Backups

Cloud Firestore provides managed export capabilities directly to Google Cloud Storage (GCS).

### Manual One-Click Export via Google Cloud CLI:
Run this command from your terminal to back up the entire production database:

```bash
gcloud firestore export gs://<your-backup-bucket-name>/backups/$(date +%Y-%m-%d) \
  --project=sikho-77341
```

### Automated Daily Backups via Cloud Scheduler:
1. Open Google Cloud Console $\rightarrow$ **Cloud Scheduler**.
2. Create a daily job running at `02:00 AM UTC`:
   - Frequency: `0 2 * * *`
   - Target: HTTP POST
   - URL: `https://firestore.googleapis.com/v1/projects/sikho-77341/databases/(default):exportDocuments`
   - Payload:
     ```json
     {
       "outputUriPrefix": "gs://sikho-77341-backups"
     }
     ```

---

## 2. Restoring Firestore from Backup

In case of accidental deletion or data corruption, restore from a timestamped backup:

```bash
gcloud firestore import gs://<your-backup-bucket-name>/backups/YYYY-MM-DD/ \
  --project=sikho-77341
```

To restore only specific collections (e.g. only `courses` and `enrollments`):

```bash
gcloud firestore import gs://<your-backup-bucket-name>/backups/YYYY-MM-DD/ \
  --collection-ids='courses','enrollments','orders' \
  --project=sikho-77341
```

---

## 3. One-Click Student & Revenue CSV Export

To export your student contact lists, enrollment rosters, and order receipts to standard Excel / CSV spreadsheets:

### Export Script: `scripts/export-data.js`
Run:
```bash
node scripts/export-data.js
```

This exports 3 clean CSV files to `./exports/`:
- `students_export_YYYY-MM-DD.csv`: Name, Phone, Email, Total Courses Enrolled, Date Joined.
- `orders_export_YYYY-MM-DD.csv`: Order ID, Student Name, Phone, Amount (INR), Status, Date.
- `enrollments_export_YYYY-MM-DD.csv`: Student UID, Course ID, Enrollment Status, Unlock Date.

---

## 4. Disaster Recovery: Firebase Project Compromise / Suspension

If your Firebase project is ever suspended or compromised, follow these 3 emergency steps to restore service on a fresh Firebase project in **under 30 minutes**:

1. **Create a Clean Firebase Project**:
   - Create project `sikho-new-recovery` on Firebase Console.
   - Enable Phone Authentication, Firestore, and Storage.
2. **Switch Client Config**:
   - In `clients/youtube-sikho/client.config.ts`, paste the new project's `firebaseConfig`.
   - Run `npm run client:use youtube-sikho`.
3. **Deploy & Import Data**:
   - Deploy backend: `npm run deploy:backend`.
   - Restore database: `gcloud firestore import gs://sikho-77341-backups/latest/ --project=sikho-new-recovery`.
   - Deploy Admin: `npm run deploy:admin`.
   - Re-publish app update or inform existing mobile users (active mobile sessions automatically reconnect to the new Firestore endpoint).
