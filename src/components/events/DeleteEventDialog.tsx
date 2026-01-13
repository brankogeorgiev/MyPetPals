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

type PetEvent = Database['public']['Tables']['pet_events']['Row'];

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: PetEvent | null;
  onSuccess: () => void;
}

export function DeleteEventDialog({ open, onOpenChange, event, onSuccess }: DeleteEventDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!event) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('pet_events')
        .delete()
        .eq('id', event.id);
      
      if (error) throw error;
      
      toast({
        title: 'Event deleted',
        description: 'The event has been removed.',
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete event. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete event?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{event?.title}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
