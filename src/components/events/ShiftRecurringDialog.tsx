import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { format, differenceInDays, differenceInHours, addDays, addHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type PetEvent = Database['public']['Tables']['pet_events']['Row'];

interface ShiftRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: PetEvent;
  allSeriesEvents: PetEvent[];
  onSuccess: () => void;
}

export function ShiftRecurringDialog({ 
  open, 
  onOpenChange, 
  event, 
  allSeriesEvents,
  onSuccess 
}: ShiftRecurringDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const originalDate = new Date(event.event_date);
  const [newDate, setNewDate] = useState(format(originalDate, 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState(format(originalDate, 'HH:mm'));

  const newDateTime = new Date(`${newDate}T${newTime}`);
  const daysDiff = differenceInDays(newDateTime, originalDate);
  const hoursDiff = differenceInHours(newDateTime, originalDate) % 24;
  
  // Find future events including this one
  const futureEvents = allSeriesEvents.filter(
    e => new Date(e.event_date) >= originalDate
  );

  const handleShift = async () => {
    if (daysDiff === 0 && hoursDiff === 0) {
      onOpenChange(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update all future events by shifting them
      const updates = futureEvents.map(e => {
        const eventDate = new Date(e.event_date);
        let shiftedDate = addDays(eventDate, daysDiff);
        shiftedDate = addHours(shiftedDate, hoursDiff);
        
        return {
          id: e.id,
          event_date: shiftedDate.toISOString(),
        };
      });

      // Update each event
      for (const update of updates) {
        const { error } = await supabase
          .from('pet_events')
          .update({ event_date: update.event_date })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      toast({
        title: 'Dates shifted successfully',
        description: `${futureEvents.length} appointment${futureEvents.length > 1 ? 's' : ''} updated.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to shift dates.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatShiftPreview = () => {
    const parts: string[] = [];
    if (daysDiff !== 0) {
      parts.push(`${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''} ${daysDiff > 0 ? 'later' : 'earlier'}`);
    }
    if (hoursDiff !== 0) {
      parts.push(`${Math.abs(hoursDiff)} hour${Math.abs(hoursDiff) !== 1 ? 's' : ''} ${hoursDiff > 0 ? 'later' : 'earlier'}`);
    }
    return parts.length > 0 ? parts.join(' and ') : 'No change';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display">Shift Recurring Dates</DialogTitle>
              <DialogDescription>
                Change this date and shift all future appointments accordingly
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-1">Current date</p>
            <p className="font-medium">{format(originalDate, 'EEEE, MMMM d, yyyy')} at {format(originalDate, 'p')}</p>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_date">New Date</Label>
              <Input
                id="new_date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_time">New Time</Label>
              <Input
                id="new_time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <p className="text-sm font-medium text-info">Shift preview</p>
            <p className="text-sm text-foreground/80 mt-1">
              All {futureEvents.length} future appointment{futureEvents.length !== 1 ? 's' : ''} will be moved{' '}
              <strong>{formatShiftPreview()}</strong>
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShift} disabled={isLoading || (daysDiff === 0 && hoursDiff === 0)}>
            {isLoading ? 'Shifting...' : 'Shift All Dates'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
