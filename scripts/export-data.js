/**
 * CSV DATA EXPORT UTILITY
 * -------------------------------------------------------------
 * Exports students, orders, and enrollments to CSV files in ./exports/
 */

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { clientConfig } = require('../src/config/client.config.js');

const app = initializeApp(clientConfig.firebaseConfig);
const db = getFirestore(app);

const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

function formatCsvRow(fields) {
  return fields.map((f) => `"${String(f || '').replace(/"/g, '""')}"`).join(',') + '\n';
}

async function exportData() {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  console.log(`📦 Exporting Firestore records for ${clientConfig.appName}...`);

  // 1. Export Students
  const usersSnap = await getDocs(collection(db, 'users'));
  const studentsCsvPath = path.join(EXPORTS_DIR, `students_export_${dateStr}.csv`);
  let studentsCsv = 'UID,Name,Phone,Email,IsBlocked,CreatedAt\n';
  usersSnap.forEach((d) => {
    const u = d.data();
    studentsCsv += formatCsvRow([d.id, u.name, u.phone, u.email, u.isBlocked ? 'YES' : 'NO', u.createdAt]);
  });
  fs.writeFileSync(studentsCsvPath, studentsCsv);
  console.log(`✅ Exported ${usersSnap.size} students -> ${studentsCsvPath}`);

  // 2. Export Orders
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const ordersCsvPath = path.join(EXPORTS_DIR, `orders_export_${dateStr}.csv`);
  let ordersCsv = 'OrderID,StudentID,CourseID,Amount,Currency,Status,PaymentID,Date\n';
  ordersSnap.forEach((d) => {
    const o = d.data();
    ordersCsv += formatCsvRow([d.id, o.uid, o.courseId, o.amount, o.currency || 'INR', o.status, o.razorpayPaymentId, o.createdAt]);
  });
  fs.writeFileSync(ordersCsvPath, ordersCsv);
  console.log(`✅ Exported ${ordersSnap.size} orders -> ${ordersCsvPath}`);

  // 3. Export Enrollments
  const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
  const enrollmentsCsvPath = path.join(EXPORTS_DIR, `enrollments_export_${dateStr}.csv`);
  let enrollmentsCsv = 'EnrollmentID,StudentID,CourseID,Status,EnrolledAt\n';
  enrollmentsSnap.forEach((d) => {
    const e = d.data();
    enrollmentsCsv += formatCsvRow([d.id, e.uid, e.courseId, e.status, e.enrolledAt]);
  });
  fs.writeFileSync(enrollmentsCsvPath, enrollmentsCsv);
  console.log(`✅ Exported ${enrollmentsSnap.size} enrollments -> ${enrollmentsCsvPath}`);

  console.log('\n🎉 CSV export completed successfully!');
  process.exit(0);
}

exportData().catch((err) => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
