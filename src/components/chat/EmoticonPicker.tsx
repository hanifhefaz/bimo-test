import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { EMOTICON_PACKS, EmoticonPack } from '@/lib/firebaseOperations';

interface EmoticonPickerProps {
  ownedPacks: string[];
  onSelectEmoticon: (emoticon: string) => void;
}

export function EmoticonPicker({ ownedPacks, onSelectEmoticon }: EmoticonPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  // Filter to only show owned packs
  const availablePacks = EMOTICON_PACKS.filter(pack => ownedPacks.includes(pack.id));

  if (availablePacks.length === 0) {
    return null; // Don't show the button if user has no emoticon packs
  }

  const handleEmoticonClick = (emoticon: string) => {
    onSelectEmoticon(emoticon);
    setOpen(false);
  };

  const currentPack = selectedPack 
    ? availablePacks.find(p => p.id === selectedPack) 
    : availablePacks[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0">
          <Smile className="w-5 h-5 text-primary" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 glass border-white/10 p-3"
        align="start"
      >
        <div className="space-y-3">
          {/* Pack selector tabs */}
          {availablePacks.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {availablePacks.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPack(pack.id)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    (selectedPack || availablePacks[0].id) === pack.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  {pack.emoticons[0]} {pack.name.replace(' Pack', '')}
                </button>
              ))}
            </div>
          )}

          {/* Emoticons grid */}
          {currentPack && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{currentPack.name}</p>
              <ScrollArea className="h-32">
                <div className="grid grid-cols-5 gap-1">
                  {currentPack.emoticons.map((emoticon, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleEmoticonClick(emoticon)}
                      className="w-10 h-10 text-xl flex items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      {emoticon}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-2 border-t border-white/10 text-center">
            Buy more packs in the Store!
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
