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
import { Users } from 'lucide-react';

interface CreateFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<{ error: Error | null }>;
}

export function CreateFamilyDialog({ open, onOpenChange, onSubmit }: CreateFamilyDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a family name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await onSubmit(name.trim());
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to create family",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Family created!",
        description: "You can now invite members and share pets.",
      });
      setName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Create Family</DialogTitle>
          </div>
          <DialogDescription>
            Create a family group to share pets with others. Family members can view and manage shared pets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="family-name">Family Name</Label>
              <Input
                id="family-name"
                placeholder="e.g., The Smiths, Home Pets"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Family'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
