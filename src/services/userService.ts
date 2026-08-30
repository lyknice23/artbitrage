import { 
  db, 
  auth, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  serverTimestamp 
} from '../lib/firebase';
import { UserProfile, SavedWalletItem, PaymentRecord, SubscriptionPlan } from '../types';

const USER_STORAGE_KEY = 'flashloan_arbitrage_current_user';
const PAYMENTS_STORAGE_KEY = 'flashloan_arbitrage_payments';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const THREE_HUNDRED_SIXTY_FIVE_DAYS_MS = 365 * 24 * 60 * 60 * 1000;

export const createDefaultUserProfile = (
  uid: string, 
  name: string = 'DeFi Arbitrageur', 
  email: string = 'trader@flashloan.eth',
  walletAddress: string = '0x71C28994361f36b12a8A4476a8d672De4259b84A'
): UserProfile => {
  const now = Date.now();
  return {
    id: uid,
    name: name || 'DeFi Arbitrageur',
    email: email || 'trader@flashloan.eth',
    walletAddress: walletAddress || '0x71C28994361f36b12a8A4476a8d672De4259b84A',
    role: 'trader',
    createdAt: now,
    trialEndsAt: now + SEVEN_DAYS_MS, // 1 week free
    subscriptionPlan: 'free_trial',
    subscriptionStatus: 'trialing',
    subscriptionExpiresAt: now + SEVEN_DAYS_MS,
    savedWallets: [
      {
        id: 'w1',
        address: walletAddress || '0x71C28994361f36b12a8A4476a8d672De4259b84A',
        label: 'Primary Bot Treasury (EVM)',
        network: 'Ethereum Mainnet',
        addedAt: now,
        isPrimary: true
      },
      {
        id: 'w2',
        address: '0x3F5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
        label: 'Secondary Arbitrage Multi-sig',
        network: 'Arbitrum One',
        addedAt: now - 86400000 * 2,
        isPrimary: false
      }
    ],
    totalProfitGeneratedUsd: 2845.5,
    arbitrageTradesExecuted: 14,
    lastLoginAt: now,
    isSyncedWithDb: false,
  };
};

/**
 * Fetch user profile from Firestore or LocalStorage fallback
 */
export const fetchUserProfile = async (uid: string): Promise<UserProfile> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      const profile = { ...data, isSyncedWithDb: true };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      return profile;
    }
  } catch (error) {
    console.warn('Firestore fetch user profile failed, falling back to local storage:', error);
  }

  // Fallback to localStorage
  const localData = localStorage.getItem(USER_STORAGE_KEY);
  if (localData) {
    try {
      const parsed = JSON.parse(localData) as UserProfile;
      return parsed;
    } catch {
      // Continue to default
    }
  }

  const defaultProfile = createDefaultUserProfile(uid);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultProfile));
  return defaultProfile;
};

/**
 * Save / update user profile in Firestore and LocalStorage
 */
export const saveUserProfileToDb = async (profile: UserProfile): Promise<boolean> => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  
  try {
    const userDocRef = doc(db, 'users', profile.id);
    await setDoc(userDocRef, {
      ...profile,
      updatedAt: Date.now(),
      lastLoginAt: Date.now(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore save user profile error:', error);
    return false;
  }
};

/**
 * Process a paywall subscription payment ($100/mo or $1000/yr)
 */
export const processSubscriptionPayment = async (
  profile: UserProfile,
  plan: 'monthly' | 'annual',
  paymentMethod: 'crypto_usdc' | 'crypto_usdt' | 'crypto_eth' | 'card_stripe',
  customTxHash?: string
): Promise<{ success: boolean; updatedProfile: UserProfile; paymentRecord: PaymentRecord; error?: string }> => {
  const amountUsd = plan === 'monthly' ? 100 : 1000;
  const durationMs = plan === 'monthly' ? THIRTY_DAYS_MS : THREE_HUNDRED_SIXTY_FIVE_DAYS_MS;
  const now = Date.now();
  const txHash = customTxHash || ('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));

  const periodStart = now;
  // If user already had remaining paid time, add to it, else start from now
  const baseExpiry = (profile.subscriptionStatus === 'active' && profile.subscriptionExpiresAt > now)
    ? profile.subscriptionExpiresAt
    : now;
  const periodEnd = baseExpiry + durationMs;

  const paymentRecord: PaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: profile.id,
    userEmail: profile.email,
    plan,
    amountUsd,
    paymentMethod,
    txHash,
    timestamp: now,
    status: 'COMPLETED',
    periodStart,
    periodEnd,
  };

  const updatedProfile: UserProfile = {
    ...profile,
    subscriptionPlan: plan,
    subscriptionStatus: 'active',
    subscriptionExpiresAt: periodEnd,
    role: 'pro',
  };

  // Save to DB
  await saveUserProfileToDb(updatedProfile);

  // Save payment to Firestore
  try {
    const paymentsCol = collection(db, 'payments');
    await addDoc(paymentsCol, paymentRecord);
  } catch (err) {
    console.warn('Could not record payment to Firestore:', err);
  }

  // Save payment to local cache
  try {
    const existingPays = JSON.parse(localStorage.getItem(PAYMENTS_STORAGE_KEY) || '[]');
    existingPays.unshift(paymentRecord);
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(existingPays));
  } catch {}

  return {
    success: true,
    updatedProfile,
    paymentRecord,
  };
};

/**
 * Check if the user is currently allowed to run arbitrage or needs paywall
 */
export const checkAccessStatus = (profile: UserProfile | null): {
  hasAccess: boolean;
  isTrial: boolean;
  isPaid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  formattedCountdown: string;
  statusLabel: string;
} => {
  if (!profile) {
    return {
      hasAccess: false,
      isTrial: false,
      isPaid: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedCountdown: 'Expired',
      statusLabel: 'No Account',
    };
  }

  const now = Date.now();

  // Check paid subscription first
  if (profile.subscriptionStatus === 'active' && profile.subscriptionExpiresAt > now) {
    const diffMs = profile.subscriptionExpiresAt - now;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return {
      hasAccess: true,
      isTrial: false,
      isPaid: true,
      isExpired: false,
      daysRemaining: days,
      hoursRemaining: hours,
      formattedCountdown: `${days}d ${hours}h left`,
      statusLabel: profile.subscriptionPlan === 'annual' ? 'Pro Annual Member' : 'Pro Monthly Member',
    };
  }

  // Check 7-day free trial
  if (profile.trialEndsAt > now) {
    const diffMs = profile.trialEndsAt - now;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    return {
      hasAccess: true,
      isTrial: true,
      isPaid: false,
      isExpired: false,
      daysRemaining: days,
      hoursRemaining: hours,
      formattedCountdown: `${days}d ${hours}h ${mins}m left`,
      statusLabel: '7-Day Free Trial',
    };
  }

  // Expired
  return {
    hasAccess: false,
    isTrial: false,
    isPaid: false,
    isExpired: true,
    daysRemaining: 0,
    hoursRemaining: 0,
    formattedCountdown: 'Trial Expired',
    statusLabel: 'Free Trial Expired',
  };
};
