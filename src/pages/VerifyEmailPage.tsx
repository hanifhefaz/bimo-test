import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) || {};
  const initialEmail = state.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email to resend the verification link');
      return;
    }
    if (!password.trim()) {
      toast.error('Please enter your password to securely resend the verification email');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user.emailVerified) {
        toast.success('Email already verified. You can sign in now.');
      } else {
        await sendEmailVerification(cred.user);
        toast.success('Verification email resent — check your inbox and spam folder.');
      }
      await signOut(auth);
      setPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to resend verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 max-w-md text-center">
        <Mail className="mx-auto w-12 h-12 text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Confirm your email</h1>
        <p className="mb-4">We've sent a verification link to <strong>{initialEmail || 'your email'}</strong>. Please check your inbox <strong>and</strong> your spam folder.</p>
        <p className="mb-6">If you didn't receive the email, you can resend it below. For security, you'll need to enter your password so we can securely resend the verification.</p>

        <div className="space-y-3 mb-4">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" value={password} type="password" onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>Back to login</Button>
            <Button variant="gradient" onClick={handleResend} disabled={loading}>
              {loading ? 'Sending...' : 'Resend verification email'}
            </Button>
          </div>
        </div>

        <p className="text-body text-muted-foreground">If you still can't find the email, check your spam/junk folder or contact support.</p>
      </div>
    </div>
  );
}

