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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, User } from 'lucide-react';
import type { FamilyWithMembers } from '@/hooks/useFamilies';
import type { Database } from '@/integrations/supabase/types';

type Pet = Database['public']['Tables']['pets']['Row'];

interface AssignPetFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: Pet | null;
  families: FamilyWithMembers[];
  onAssign: (petId: string, familyId: string | null) => Promise<{ error: Error | null }>;
  onSuccess?: () => void;
}

export function AssignPetFamilyDialog({ 
  open, 
  onOpenChange, 
  pet, 
  families, 
  onAssign,
  onSuccess 
}: AssignPetFamilyDialogProps) {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(pet?.family_id || null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!pet) return;
    
    setLoading(true);
    const { error } = await onAssign(pet.id, selectedFamily);
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to update pet",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pet updated!",
        description: selectedFamily 
          ? "Pet is now shared with the family." 
          : "Pet is now personal only.",
      });
      onSuccess?.();
      onOpenChange(false);
    }
  };

  if (!pet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Share {pet.name}</DialogTitle>
          </div>
          <DialogDescription>
            Choose which family should have access to {pet.name}, or keep it as a personal pet.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup 
            value={selectedFamily || 'personal'} 
            onValueChange={(v) => setSelectedFamily(v === 'personal' ? null : v)}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer flex-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Personal only</p>
                    <p className="text-xs text-muted-foreground">Only you can see this pet</p>
                  </div>
                </Label>
              </div>

              {families.map((family) => (
                <div 
                  key={family.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={family.id} id={family.id} />
                  <Label htmlFor={family.id} className="flex items-center gap-2 cursor-pointer flex-1">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">{family.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {family.member_count} member{family.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          {families.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              You're not in any families yet. Create or join a family first.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
