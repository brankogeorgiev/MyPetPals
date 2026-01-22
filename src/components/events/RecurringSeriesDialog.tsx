import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Repeat, MoreHorizontal, Pencil, Trash2, Stethoscope, Scissors, Pill, Calendar, Clock, MapPin, CalendarClock } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type PetEvent = Database['public']['Tables']['pet_events']['Row'];

interface RecurringSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentEvent: PetEvent;
  childEvents: PetEvent[];
  onEdit: (event: PetEvent) => void;
  onDelete: (event: PetEvent) => void;
  onSuccess: () => void;
  onShiftDates: (event: PetEvent) => void;
}

const appointmentTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  vet_visit: { icon: <Stethoscope className="w-4 h-4" />, label: 'Vet Visit', color: 'bg-info/10 text-info border-info/20' },
  grooming: { icon: <Scissors className="w-4 h-4" />, label: 'Grooming', color: 'bg-pet-cat/10 text-pet-cat border-pet-cat/20' },
  medication: { icon: <Pill className="w-4 h-4" />, label: 'Medication', color: 'bg-warning/10 text-warning border-warning/20' },
  general: { icon: <Calendar className="w-4 h-4" />, label: 'General', color: 'bg-primary/10 text-primary border-primary/20' },
  other: { icon: <Clock className="w-4 h-4" />, label: 'Other', color: 'bg-muted text-muted-foreground border-border' },
};

export function RecurringSeriesDialog({ 
  open, 
  onOpenChange, 
  parentEvent, 
  childEvents,
  onEdit,
  onDelete,
  onSuccess,
  onShiftDates 
}: RecurringSeriesDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const config = appointmentTypeConfig[parentEvent.event_type] || appointmentTypeConfig.other;
  const displayLabel = parentEvent.event_type === 'other' && parentEvent.custom_type ? parentEvent.custom_type : config.label;
  
  const allEvents = [parentEvent, ...childEvents].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  
  const upcomingEvents = allEvents.filter(e => 
    !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date))
  );
  const pastEvents = allEvents.filter(e => 
    isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date))
  );

  const handleToggleComplete = async (event: PetEvent) => {
    setIsUpdating(event.id);
    const { error } = await supabase
      .from('pet_events')
      .update({ reminder_completed: !event.reminder_completed })
      .eq('id', event.id);
    
    if (!error) {
      onSuccess();
      toast({
        title: event.reminder_completed ? 'Marked as incomplete' : 'Marked as complete',
      });
    }
    setIsUpdating(null);
  };

  const EventItem = ({ event }: { event: PetEvent }) => {
    const eventDate = new Date(event.event_date);
    const isCompleted = event.reminder_completed;
    const isPastEvent = isPast(eventDate) && !isToday(eventDate);
    const isTodayEvent = isToday(eventDate);
    const isParent = event.id === parentEvent.id;

    return (
      <div className={`p-3 rounded-lg border transition-all ${isCompleted ? 'opacity-60 bg-muted/30' : 'bg-card'} ${isTodayEvent ? 'ring-2 ring-primary/20' : ''}`}>
        <div className="flex items-start gap-3">
          {event.is_reminder && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => handleToggleComplete(event)}
              disabled={isUpdating === event.id}
              className="mt-0.5"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isTodayEvent && (
                <Badge className="bg-primary text-primary-foreground text-xs">Today</Badge>
              )}
              {isPastEvent && !isCompleted && event.is_reminder && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
              {isParent && (
                <Badge variant="outline" className="text-xs">Parent</Badge>
              )}
            </div>
            
            <p className={`text-sm font-medium ${isCompleted ? 'line-through' : ''}`}>
              {format(eventDate, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(eventDate, 'p')}
            </p>
            
            {event.location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                onOpenChange(false);
                onEdit(event);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onOpenChange(false);
                onShiftDates(event);
              }}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Change Date & Shift All
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  onOpenChange(false);
                  onDelete(event);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display">{parentEvent.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={config.color}>
                  {config.icon}
                  <span className="ml-1">{displayLabel}</span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {allEvents.length} appointments
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {upcomingEvents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Upcoming ({upcomingEvents.length})
                </h3>
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <EventItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
            
            {pastEvents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Past ({pastEvents.length})
                </h3>
                <div className="space-y-2">
                  {pastEvents.map((event) => (
                    <EventItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
