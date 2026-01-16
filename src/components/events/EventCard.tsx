import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Stethoscope, Scissors, Pill, Calendar, Clock, MapPin } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type PetEvent = Database['public']['Tables']['pet_events']['Row'];

interface EventCardProps {
  event: PetEvent;
  onEdit: (event: PetEvent) => void;
  onDelete: (event: PetEvent) => void;
  onToggleComplete?: (event: PetEvent) => void;
  showPetName?: boolean;
  petName?: string;
}

const appointmentTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  vet_visit: { icon: <Stethoscope className="w-4 h-4" />, label: 'Vet Visit', color: 'bg-info/10 text-info border-info/20' },
  grooming: { icon: <Scissors className="w-4 h-4" />, label: 'Grooming', color: 'bg-pet-cat/10 text-pet-cat border-pet-cat/20' },
  medication: { icon: <Pill className="w-4 h-4" />, label: 'Medication', color: 'bg-warning/10 text-warning border-warning/20' },
  general: { icon: <Calendar className="w-4 h-4" />, label: 'General', color: 'bg-primary/10 text-primary border-primary/20' },
  other: { icon: <Clock className="w-4 h-4" />, label: 'Other', color: 'bg-muted text-muted-foreground border-border' },
};

export function EventCard({ event, onEdit, onDelete, onToggleComplete, showPetName, petName }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const config = appointmentTypeConfig[event.event_type] || appointmentTypeConfig.other;
  const displayLabel = event.event_type === 'other' && event.custom_type ? event.custom_type : config.label;
  const isCompleted = event.reminder_completed;
  const isPastEvent = isPast(eventDate) && !isToday(eventDate);
  const isTodayEvent = isToday(eventDate);

  return (
    <Card className={`transition-all ${isCompleted ? 'opacity-60' : ''} ${isTodayEvent ? 'ring-2 ring-primary/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {event.is_reminder && onToggleComplete && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => onToggleComplete(event)}
              className="mt-1"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={config.color}>
                    {config.icon}
                    <span className="ml-1">{displayLabel}</span>
                  </Badge>
                  {isTodayEvent && (
                    <Badge className="bg-primary text-primary-foreground">Today</Badge>
                  )}
                  {isPastEvent && !isCompleted && event.is_reminder && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </div>
                
                <h4 className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
                  {event.title}
                </h4>
                
                {showPetName && petName && (
                  <p className="text-sm text-muted-foreground">For {petName}</p>
                )}
                
                <p className="text-sm text-muted-foreground mt-1">
                  {format(eventDate, 'PPP')} at {format(eventDate, 'p')}
                </p>

                {event.location && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
                
                {event.description && (
                  <p className="text-sm mt-2 text-foreground/80">{event.description}</p>
                )}
                
                {event.photo_url && (
                  <div className="mt-3">
                    <img
                      src={event.photo_url}
                      alt="Appointment photo"
                      className="rounded-lg max-h-32 object-cover"
                    />
                  </div>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(event)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(event)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
