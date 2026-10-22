export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'superadmin';
  name?: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  icon: string;
  description?: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz';
  videoId: string;
  duration?: string;
  order: number;
  isFreePreview: boolean;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPrice: number;
  language: string;
  instructor: string;
  thumbnailUrl: string;
  isPublished: boolean;
  isNew: boolean;
  isFeatured: boolean;
  order: number;
  totalLessons: number;
  totalDuration: string;
  sections?: Section[];
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  actionType: 'course' | 'category' | 'url';
  actionValue: string;
  order: number;
  active: boolean;
}

export interface HomeSection {
  id: string;
  type: 'banner' | 'categories' | 'courses' | 'continue_watching' | 'custom';
  title: string;
  order: number;
  isVisible: boolean;
}

export interface AppConfig {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  supportPhone: string;
  supportWhatsApp: string;
  supportEmail: string;
  maintenanceMode: boolean;
  minVersion: string;
  privacyPolicyUrl: string;
  termsUrl: string;
}

export interface Student {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  isBlocked: boolean;
  createdAt?: any;
}

export interface Order {
  id: string;
  orderId?: string;
  uid: string;
  courseId: string;
  courseTitle?: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'refunded' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  couponCode?: string;
  createdAt: any;
  paidAt?: any;
  refundedAt?: any;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses?: number;
  usedCount?: number;
  validUntil?: number;
  isActive: boolean;
  createdAt?: any;
}
