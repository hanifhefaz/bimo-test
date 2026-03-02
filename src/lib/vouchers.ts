import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  runTransaction,
  serverTimestamp,
  limit,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { txParticipants } from './firebaseOperations';

export interface Voucher {
  id?: string;
  hashed: string;
  amount: number;
  createdBy: string;
  createdAt: number;
  redeemed?: boolean;
  redeemedBy?: string;
  redeemedByUsername?: string;
  redeemedAt?: any;
}

// Compute SHA-256 hex of an input string (browser SubtleCrypto)
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random 14-digit numeric voucher code
function generate14DigitCode(): string {
  // Use crypto.getRandomValues to create a 64-bit random value then mod 1e14
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  // Build BigInt
  let n = 0n;
  for (let i = 0; i < arr.length; i++) {
    n = (n << 8n) + BigInt(arr[i]);
  }
  const mod = 10n ** 14n;
  const val = n % mod;
  const s = val.toString();
  return s.padStart(14, '0');
}

// Admin: generate N vouchers for a given amount and return the plaintext codes for printing
export async function generateVouchers(adminId: string, amount: number, quantity: number, price: number = 0): Promise<{ codes: string[]; batchId: string }> {
  if (!adminId) throw new Error('Admin id required');
  if (quantity < 1 || quantity > 1000) throw new Error('Quantity must be between 1 and 1000');

  const codes: string[] = [];
  const wb = writeBatch(db);
  const vouchersRef = collection(db, 'vouchers');
  const now = Date.now();
  const batchId = `batch_${now}_${Math.floor(Math.random() * 1e6)}`;
  const batchDocRef = doc(collection(db, 'voucherBatches'), batchId);

  // Record batch metadata (in same write batch)
  wb.set(batchDocRef, {
    batchId,
    amount,
    price: price || 0,
    quantity,
    createdBy: adminId,
    createdAt: now
  });

  const generatedHashes = new Set<string>();
  for (let i = 0; i < quantity; i++) {
    let plain = generate14DigitCode();
    let hashed = await sha256Hex(plain);
    while (generatedHashes.has(hashed)) {
      plain = generate14DigitCode();
      hashed = await sha256Hex(plain);
    }
    generatedHashes.add(hashed);

    const docRef = doc(vouchersRef, hashed);

    wb.set(docRef, {
      hashed,
      amount,
      price: price || 0,
      batchId,
      createdBy: adminId,
      createdAt: now,
      redeemed: false
    });

    codes.push(plain);
  }

  await wb.commit();
  return { codes, batchId };
}

// User: redeem a plaintext voucher code
export async function redeemVoucher(userId: string, username: string, codePlain: string): Promise<{ success: boolean; message: string; credits?: number }> {
  const trimmed = (codePlain || '').trim();
  if (!trimmed) return { success: false, message: 'Please enter a voucher code' };

  const hashed = await sha256Hex(trimmed);

  // Prefer direct doc lookup by hash. Fallback query supports legacy docs with random IDs.
  let voucherDocRef = doc(db, 'vouchers', hashed);
  let voucherSnap = await getDoc(voucherDocRef);
  if (!voucherSnap.exists()) {
    const q = query(collection(db, 'vouchers'), where('hashed', '==', hashed), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: false, message: 'Invalid voucher code' };
    voucherDocRef = doc(db, 'vouchers', snapshot.docs[0].id);
    voucherSnap = snapshot.docs[0];
  }

  const voucherData = voucherSnap.data() as Voucher;

  if (voucherData.redeemed) return { success: false, message: 'This voucher has already been used' };

  // Use transaction to mark redeemed and credit the user (atomic)
  try {
    await runTransaction(db, async (tx) => {
      const vSnap = await tx.get(voucherDocRef as any);
      if (!vSnap.exists()) throw new Error('Voucher not found');
      const v = vSnap.data() as Voucher;
      if (v.redeemed) throw new Error('Already redeemed');

      tx.update(voucherDocRef as any, {
        redeemed: true,
        redeemedBy: userId,
        redeemedByUsername: username,
        redeemedAt: serverTimestamp()
      });

      // Update user credits in the same transaction
      const userRef = doc(db, 'users', userId);
      tx.update(userRef as any, {
        credits: increment(v.amount)
      });

      // Create a transaction log inside transaction
      const txRef = doc(collection(db, 'transactions'));
      tx.set(txRef as any, {
        from: 'system',
        to: userId,
        participants: txParticipants('system', userId),
        toUsername: username,
        amount: v.amount,
        type: 'redeem',
        description: `Redeemed voucher`,
        timestamp: serverTimestamp()
      });
    });

    return { success: true, message: `Voucher redeemed: added ${voucherData.amount} credits`, credits: voucherData.amount };
  } catch (err: any) {
    console.warn('Voucher redeem error:', err);
    return { success: false, message: err?.message || 'Failed to redeem voucher' };
  }
}

