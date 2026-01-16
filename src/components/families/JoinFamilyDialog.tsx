import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface JoinFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => Promise<{ error: Error | null }>;
}

export function JoinFamilyDialog({ open, onOpenChange, onSubmit }: JoinFamilyDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Code required",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await onSubmit(code.trim());
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to join family",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Joined family!",
        description: "You now have access to shared pets.",
      });
      setCode('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-accent/10">
              <UserPlus className="w-5 h-5 text-accent" />
            </div>
            <DialogTitle>Join Family</DialogTitle>
          </div>
          <DialogDescription>
            Enter the invite code shared by a family member to join their family group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="e.g., ABC12345"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider text-center"
                maxLength={8}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join Family'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
