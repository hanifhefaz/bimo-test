import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import LogoImg from '@/assets/icon.png';
import BrandImg from '@/assets/brand.png';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Lock, User, Loader2, Sparkles, Calendar, Users, Globe, FileText, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES } from '@/lib/countries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
export function GoogleDriveDownloadButton() {
  const handleDownload = () => {
    const url = "https://docs.google.com/uc?export=download&id=1buasPl_V4HdTlYsGjxysfe2sURYqTn1b";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full flex justify-center mb-6">
      <Button
        onClick={handleDownload}
        variant="gradient"
        className="flex items-center justify-center gap-2 px-6 py-3"
      >
        <FileText className="w-4 h-4" />
        📱 Download APK
      </Button>
    </div>
  );
}
export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [identifier, setIdentifier] = useState(''); // email or username for login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(identifier, password, rememberMe);
      } else {
        // Validation
        // Username rules: 3-20 characters, no spaces, only letters, numbers, dot, underscore or hyphen
        const { isValidUsername, normalizeUsername } = await import('@/lib/utils');
        if (!isValidUsername(username)) {
          toast.error('Username invalid: 3-20 chars, must start with a letter, no spaces, use letters/numbers and . _ - only');
          setLoading(false);
          return;
        }
        // Normalize username to canonical form (case-insensitive uniqueness)
        const normalized = normalizeUsername(username);

        if (!fullName.trim()) {
          toast.error('Please enter your full name');
          setLoading(false);
          return;
        }
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          toast.error('Please enter a valid age (13+)');
          setLoading(false);
          return;
        }
        if (!gender) {
          toast.error('Please select your gender');
          setLoading(false);
          return;
        }
        if (!country) {
          toast.error('Please select your country');
          setLoading(false);
          return;
        }
        if (!agreeToTerms) {
          toast.error('You must agree to the Terms of Service');
          setLoading(false);
          return;
        }

        await signUp(identifier, password, username, {
          fullName,
          age: ageNum,
          gender,
          country
        }, normalized);

        // Navigate to verification page FIRST (before showing toast) to ensure smooth transition
        // pass along the email address for the verification page
        navigate('/verify-email', { state: { email: identifier } });

        // Show success toast after navigation is initiated
        toast.success('Account created! Please check your email to verify your account before logging in. 📧');

        // clear form
        setIdentifier('');
        setPassword('');
        setUsername('');
        setFullName('');
        setAge('');
        setGender('');
        setCountry('');
        setAgreeToTerms(false);
        setRememberMe(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">


      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <motion.img
            src={LogoImg}
            alt="Bimo"
            className="mx-auto h-20 mb-6"
            animate={{
              scale: [1.98, 1.8, 2],
              opacity: [1, 0.9, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut",
            }}
          />
{/*
          <motion.img
            src={BrandImg}
            alt="Bimo"
            className="mx-auto h-24 mb-3"
            animate={{ rotate: [0, 1, -1, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          /> */}

        </motion.div>

        {/* Form Card */}
        <motion.div
          className="glass rounded-2xl p-5 shadow-xl"
          layout
        >
          <div className="flex mb-5 bg-secondary/50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                !isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {/* Full Name */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-10"
                      required={!isLogin}
                    />
                  </div>

                  {/* Username */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      className="pl-10 h-10"
                      required={!isLogin}
                    />
                  </div>

                  {/* Age and Gender Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="pl-10 h-10"
                        min="13"
                        max="120"
                        required={!isLogin}
                      />
                    </div>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-10">
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Country */}
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-10">
                      <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-10 h-10"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me / Terms */}
            {isLogin ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" className="text-primary hover:underline">
                    Terms of Service
                  </a>
                </Label>
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="gradient"
              className="w-full"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="absolute bottom-4 text-xs text-muted-foreground">
        <GoogleDriveDownloadButton />
        &copy; {new Date().getFullYear()} Bimo. All rights reserved.
      </div>

    </div>
  );
}
