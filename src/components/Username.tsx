import React from 'react';
import { cn, getUsernameColorClass } from '@/lib/utils';

interface UsernameProps {
  // Accept any user-like object to stay compatible across different UserProfile types in the app
  user?: any | null;
  username?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function Username({ user, username, className, children }: UsernameProps) {
  // Determine display value and convert to lowercase
  const display = (username ?? user?.username ?? children ?? '').toString().toLowerCase();
  const colorClass = getUsernameColorClass(user);

  return <span className={cn(colorClass, className)}>{display}</span>;
}
