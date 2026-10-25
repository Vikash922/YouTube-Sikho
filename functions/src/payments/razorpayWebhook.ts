import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { getRazorpayWebhookSecret } from '../config';

export async function razorpayWebhookHandler(
  req: Request,
  res: Response,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  if (!signature) {
    res.status(400).send('Missing Razorpay signature header.');
    return;
  }

  // 1. Signature Verification with req.rawBody (Buffer)
  let webhookSecret = '';
  try {
    webhookSecret = getRazorpayWebhookSecret();
  } catch (err: any) {
    console.error('Webhook secret configuration error:', err.message);
    res.status(500).send('Webhook secret not configured.');
    return;
  }

  const rawBody: Buffer = (req as any).rawBody || Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    console.warn('Razorpay webhook HMAC mismatch: invalid signature.');
    res.status(401).send('Invalid webhook signature.');
    return;
  }

  // Parse body
  let eventPayload: any;
  try {
    eventPayload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    res.status(400).send('Invalid JSON payload.');
    return;
  }

  const eventId: string = eventPayload.id;
  const eventType: string = eventPayload.event;

  if (!eventId) {
    res.status(400).send('Missing event ID.');
    return;
  }

  // 2. Event Deduplication via processedEvents/{eventId}
  const eventRef = db.doc(`processedEvents/${eventId}`);
  const eventSnap = await eventRef.get();
  if (eventSnap.exists) {
    // Already processed, return 200 immediately
    res.status(200).json({ status: 'ok', deduplicated: true });
    return;
  }

  try {
    // 3. Handle Events
    if (eventType === 'payment.captured') {
      const payment = eventPayload.payload?.payment?.entity;
      if (!payment) {
        res.status(400).send('Missing payment entity.');
        return;
      }

      const razorpayOrderId = payment.order_id;
      if (!razorpayOrderId) {
        // Direct payment without Razorpay order, ignore
        await eventRef.set({ eventId, eventType, ignored: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.status(200).json({ status: 'ok', ignored: true });
        return;
      }

      // Look up the order in OUR orders collection by orderId or razorpayOrderId
      let orderRef = db.doc(`orders/${razorpayOrderId}`);
      let orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        // Query by razorpayOrderId field
        const querySnap = await db
          .collection('orders')
          .where('razorpayOrderId', '==', razorpayOrderId)
          .limit(1)
          .get();

        if (querySnap.empty) {
          console.warn(`Webhook received for unknown order: ${razorpayOrderId}`);
          await eventRef.set({ eventId, eventType, unknownOrder: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
          res.status(200).json({ status: 'ok', message: 'Order not found in platform database.' });
          return;
        }

        orderDoc = querySnap.docs[0];
        orderRef = orderDoc.ref;
      }

      const orderData = orderDoc.data() || {};

      // Trust uid/courseId/amountPaise from OUR order document, NEVER from webhook payload
      const uid = orderData.uid;
      const courseId = orderData.courseId;
      const orderId = orderDoc.id;
      const expectedAmountPaise = Number(orderData.amountPaise !== undefined ? orderData.amountPaise : (orderData.amount ? orderData.amount * 100 : 0));

      if (payment.amount !== expectedAmountPaise) {
        console.error(`Webhook payment amount mismatch for order ${orderId}: expected ${expectedAmountPaise}, got ${payment.amount}`);
        res.status(400).send('Payment amount mismatch.');
        return;
      }

      const enrollmentId = `${uid}_${courseId}`;
      const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);

      // Transactionally fulfill order, grant enrollment, increment coupon and record event deduplication
      await db.runTransaction(async (transaction) => {
        const currentOrderDoc = await transaction.get(orderRef);
        const currentOrder = currentOrderDoc.data() || {};
        const currentEnrollmentDoc = await transaction.get(enrollmentRef);

        let couponRef: admin.firestore.DocumentReference | null = null;
        if (currentOrder.couponCode) {
          couponRef = db.doc(`coupons/${currentOrder.couponCode}`);
        }

        if (currentOrder.status !== 'paid') {
          transaction.update(orderRef, {
            status: 'paid',
            razorpayPaymentId: payment.id,
            paymentMethod: payment.method || 'online',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (couponRef) {
            transaction.update(couponRef, {
              usedCount: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        // Ensure enrollment is active
        if (!currentEnrollmentDoc.exists || currentEnrollmentDoc.data()?.status !== 'active') {
          transaction.set(
            enrollmentRef,
            {
              uid,
              courseId,
              orderId,
              razorpayPaymentId: payment.id,
              status: 'active',
              enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        // Mark event processed
        transaction.set(eventRef, {
          eventId,
          eventType,
          orderId,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

    } else if (eventType === 'payment.failed') {
      const payment = eventPayload.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      if (razorpayOrderId) {
        const orderRef = db.doc(`orders/${razorpayOrderId}`);
        const orderDoc = await orderRef.get();
        if (orderDoc.exists && orderDoc.data()?.status === 'created') {
          await orderRef.update({
            status: 'failed',
            failedReason: payment?.error_description || 'Payment failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
      await eventRef.set({ eventId, eventType, processedAt: admin.firestore.FieldValue.serverTimestamp() });

    } else if (eventType === 'refund.processed') {
      const refund = eventPayload.payload?.refund?.entity;
      const paymentId = refund?.payment_id;

      if (paymentId) {
        const querySnap = await db
          .collection('orders')
          .where('razorpayPaymentId', '==', paymentId)
          .limit(1)
          .get();

        if (!querySnap.empty) {
          const orderDoc = querySnap.docs[0];
          const orderData = orderDoc.data() || {};
          const orderRef = orderDoc.ref;
          const enrollmentId = `${orderData.uid}_${orderData.courseId}`;
          const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);

          await db.runTransaction(async (transaction) => {
            transaction.update(orderRef, {
              status: 'refunded',
              razorpayRefundId: refund.id,
              refundedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.set(
              enrollmentRef,
              {
                status: 'revoked',
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            transaction.set(eventRef, {
              eventId,
              eventType,
              orderId: orderDoc.id,
              processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
        } else {
          await eventRef.set({ eventId, eventType, orderNotFound: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
      } else {
        await eventRef.set({ eventId, eventType, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    } else {
      // Other unhandled event types
      await eventRef.set({ eventId, eventType, unhandled: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    res.status(200).json({ status: 'ok', eventId });
  } catch (err: any) {
    console.error('Error handling webhook event:', err);
    res.status(500).send(`Webhook error: ${err.message}`);
  }
}
