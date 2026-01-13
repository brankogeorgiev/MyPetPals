import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Database } from '@/integrations/supabase/types';

type Pet = Database['public']['Tables']['pets']['Row'];

interface DeletePetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: Pet | null;
  onSuccess: () => void;
}

export function DeletePetDialog({ open, onOpenChange, pet, onSuccess }: DeletePetDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!pet) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', pet.id);
      
      if (error) throw error;
      
      toast({
        title: 'Pet removed',
        description: `${pet.name} has been removed from your family.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete pet. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {pet?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove {pet?.name} and all associated events from your account. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? 'Removing...' : 'Remove Pet'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
