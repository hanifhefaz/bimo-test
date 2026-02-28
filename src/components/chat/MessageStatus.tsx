import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export function MessageStatus({ status }: MessageStatusProps) {
  switch (status) {
    case 'sending':
      return (
        <span className="text-muted-foreground/50">
          <Check className="w-3 h-3" />
        </span>
      );
    case 'sent':
      return (
        <span className="text-muted-foreground">
          <Check className="w-3 h-3" />
        </span>
      );
    case 'delivered':
      return (
        <span className="text-muted-foreground">
          <CheckCheck className="w-3 h-3" />
        </span>
      );
    case 'read':
      return (
        <span className="text-primary">
          <CheckCheck className="w-3 h-3" />
        </span>
      );
    default:
      return null;
  }
}
