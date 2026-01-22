import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Repeat, Stethoscope, Scissors, Pill, Calendar, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type PetEvent = Database['public']['Tables']['pet_events']['Row'];

interface RecurringSeriesCardProps {
  parentEvent: PetEvent;
  childEvents: PetEvent[];
  onClick: () => void;
}

const appointmentTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  vet_visit: { icon: <Stethoscope className="w-4 h-4" />, label: 'Vet Visit', color: 'bg-info/10 text-info border-info/20' },
  grooming: { icon: <Scissors className="w-4 h-4" />, label: 'Grooming', color: 'bg-pet-cat/10 text-pet-cat border-pet-cat/20' },
  medication: { icon: <Pill className="w-4 h-4" />, label: 'Medication', color: 'bg-warning/10 text-warning border-warning/20' },
  general: { icon: <Calendar className="w-4 h-4" />, label: 'General', color: 'bg-primary/10 text-primary border-primary/20' },
  other: { icon: <Clock className="w-4 h-4" />, label: 'Other', color: 'bg-muted text-muted-foreground border-border' },
};

const recurrenceLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function RecurringSeriesCard({ parentEvent, childEvents, onClick }: RecurringSeriesCardProps) {
  const config = appointmentTypeConfig[parentEvent.event_type] || appointmentTypeConfig.other;
  const displayLabel = parentEvent.event_type === 'other' && parentEvent.custom_type ? parentEvent.custom_type : config.label;
  
  const allEvents = [parentEvent, ...childEvents].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  
  const upcomingCount = allEvents.filter(e => new Date(e.event_date) >= new Date()).length;
  const completedCount = allEvents.filter(e => e.reminder_completed).length;
  
  const nextEvent = allEvents.find(e => new Date(e.event_date) >= new Date() && !e.reminder_completed);
  
  const recurrenceLabel = recurrenceLabels[parentEvent.recurrence_type || ''] || 'Recurring';
  const intervalText = parentEvent.recurrence_interval && parentEvent.recurrence_interval > 1 
    ? `Every ${parentEvent.recurrence_interval} ${parentEvent.recurrence_type?.replace('ly', 's')}` 
    : recurrenceLabel;

  return (
    <Card 
      className="transition-all hover:shadow-md cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Repeat className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={config.color}>
                    {config.icon}
                    <span className="ml-1">{displayLabel}</span>
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Repeat className="w-3 h-3" />
                    {intervalText}
                  </Badge>
                </div>
                
                <h4 className="font-medium">{parentEvent.title}</h4>
                
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span>{allEvents.length} appointments</span>
                  {upcomingCount > 0 && (
                    <span className="text-primary">{upcomingCount} upcoming</span>
                  )}
                  {completedCount > 0 && (
                    <span className="text-muted-foreground">{completedCount} completed</span>
                  )}
                </div>
                
                {nextEvent && (
                  <p className="text-sm text-foreground/80 mt-1">
                    Next: {format(new Date(nextEvent.event_date), 'PPP')} at {format(new Date(nextEvent.event_date), 'p')}
                  </p>
                )}
              </div>
              
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
