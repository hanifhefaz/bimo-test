import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { redeemVoucher } from '@/lib/vouchers';
import { useAuth } from '@/contexts/AuthContext';

export default function VoucherRedeem() {
  const { userProfile, refreshProfile } = useAuth();
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!userProfile) { toast.error('Login to redeem'); return; }
    if (!code.trim()) { toast.error('Enter a voucher code'); return; }

    setLoading(true);
    try {
      const res = await redeemVoucher(userProfile.uid, userProfile.username, code.trim());
      if (res.success) {
        toast.success(res.message);
        setCode('');
        // Refresh profile so credits update in UI
        setTimeout(() => refreshProfile(), 250);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Redeem failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <h4 className="font-semibold mb-2">Redeem Voucher</h4>
      <p className="text-xs text-muted-foreground mb-2">Enter your 14-digit voucher code to add credits to your account.</p>
      <div className="flex gap-2">
        <input className="rounded px-2 py-1 bg-background border flex-1 font-mono" placeholder="Enter voucher code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button size="sm" onClick={handleRedeem} disabled={loading}>{loading ? 'Redeeming...' : 'Redeem'}</Button>
      </div>
    </div>
  );
}
