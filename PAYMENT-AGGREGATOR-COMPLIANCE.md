# Payment Aggregator & Financial Compliance Architecture

This document outlines regulatory adherence, architectural segregation, and compliance requirements regarding payment processing in accordance with Reserve Bank of India (RBI) guidelines for Payment Aggregators (PAs) and Payment Gateways (PGs).

---

## 1. Architectural Segregation of Course App vs. Gateway

In Part 10, the direct-UPI payment gateway engine (`gateway/`) has been separated from the LMS core codebase and extracted to its own repository branch (`gateway-standalone`).

### Rationale:
1. **Scope Minimization**: The Course Platform (LMS) is purely application software facilitating educational course delivery. It does not touch merchant banking settlements, hold customer funds, or operate an escrow account.
2. **Regulatory Clarity**: Under RBI regulations, operating a payment aggregation service requires authorization under the Payment and Settlement Systems Act, 2007 (PSS Act). White-label educational applications must utilize licensed payment aggregators (e.g., Razorpay, Cashfree, PayU) or direct merchant-to-merchant UPI rails without pooling funds in unregulated intermediate wallets.
3. **Audit Isolation**: Separating the gateway repository ensures external security auditors can independently assess PCI-DSS and PA/PG guidelines without mixing mobile app client code with gateway daemon services.

---

## 2. Core Compliance Guarantees

| Requirement | Regulatory Reference | Implementation in Course Platform | Status |
|:---|:---|:---|:---:|
| **Zero Card Data Storage** | RBI PA/PG Guidelines §7.1 | The platform never receives, transmits, or stores customer credit/debit card numbers, CVVs, or expiration dates. All payment forms are hosted within licensed aggregator SDKs (Razorpay Standard Checkout). | **PASS** |
| **Direct Settlement** | RBI PA/PG Master Directions §8 | Payments flow directly from the student's bank account to the merchant's verified bank account via Razorpay/UPI. The course app has no escrow or intermediate pooling wallet. | **PASS** |
| **Cryptographic Tamper-Proofing** | RBI Cyber Security Framework | Webhook callbacks and client verification use HMAC-SHA256 signatures with secret keys managed in Cloud Secret Manager and constant-time string comparisons. | **PASS** |
| **Grievance Redressal & Refunds** | RBI Consumer Protection Directives | The app exposes a dedicated Support & Help Ticket system (`/support`), transparent Refund Policy documentation (`/legal/refund`), and admin-triggered automated refunds (`refundPayment` callable) returning funds directly to the source payment method within 5–7 banking days. | **PASS** |
| **Audit Trails & Records** | PMLA & IT Act Requirements | Order records (`/orders/{orderId}`) maintain complete transaction histories with server timestamps, student UID, course ID, currency, and gateway transaction IDs. When a user requests account deletion, accounting records retain financial integrity with anonymized personal identifiers. | **PASS** |

---

## 3. Recommended Production Gateway Stack

For white-label clients deploying to production:
1. **Primary Gateway**: Licensed Indian Payment Aggregator (Razorpay, Cashfree, or PhonePe PG).
2. **Webhook Verification**: Strictly enforce webhook HMAC signatures using Google Cloud Secret Manager.
3. **App Check**: Enforce Firebase App Check with Play Integrity on all order creation calls.
