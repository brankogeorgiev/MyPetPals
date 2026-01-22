import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MapLocationPicker } from '@/components/ui/MapLocationPicker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Repeat } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears, isBefore, isEqual } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type PetEvent = Database['public']['Tables']['pet_events']['Row'];
type PetEventInsert = Database['public']['Tables']['pet_events']['Insert'];

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PetEvent | null;
  petId: string;
  onSuccess: () => void;
  isSeriesEdit?: boolean;
}

const appointmentTypes = [
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'medication', label: 'Medication' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

const recurrenceTypes = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const recurrenceIntervals = [
  { value: 1, label: 'Every' },
  { value: 2, label: 'Every 2' },
  { value: 3, label: 'Every 3' },
  { value: 4, label: 'Every 4' },
  { value: 6, label: 'Every 6' },
  { value: 12, label: 'Every 12' },
];

const getIntervalLabel = (type: string) => {
  switch (type) {
    case 'daily': return 'days';
    case 'weekly': return 'weeks';
    case 'monthly': return 'months';
    case 'yearly': return 'years';
    default: return '';
  }
};

export function EventFormDialog({ open, onOpenChange, event, petId, onSuccess, isSeriesEdit = false }: EventFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'vet_visit',
    custom_type: '',
    location: '',
    description: '',
    event_date: '',
    event_time: '',
    is_reminder: false,
    reminder_hours_before: 24,
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_end_date: '',
  });

  useEffect(() => {
    if (event) {
      const eventDate = new Date(event.event_date);
      setFormData({
        title: event.title,
        event_type: event.event_type,
        custom_type: event.custom_type || '',
        location: event.location || '',
        description: event.description || '',
        event_date: format(eventDate, 'yyyy-MM-dd'),
        event_time: format(eventDate, 'HH:mm'),
        is_reminder: event.is_reminder,
        reminder_hours_before: event.reminder_hours_before || 24,
        recurrence_type: event.recurrence_type || 'none',
        recurrence_interval: event.recurrence_interval || 1,
        recurrence_end_date: event.recurrence_end_date ? format(new Date(event.recurrence_end_date), 'yyyy-MM-dd') : '',
      });
      setPhotoPreview(event.photo_url);
    } else {
      const now = new Date();
      // Default end date to 1 year from now
      const defaultEndDate = addYears(now, 1);
      setFormData({
        title: '',
        event_type: 'vet_visit',
        custom_type: '',
        location: '',
        description: '',
        event_date: format(now, 'yyyy-MM-dd'),
        event_time: format(now, 'HH:mm'),
        is_reminder: false,
        reminder_hours_before: 24,
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_end_date: format(defaultEndDate, 'yyyy-MM-dd'),
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [event, open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/events/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('pet-photos')
      .upload(fileName, file);
    
    if (uploadError) {
      throw uploadError;
    }
    
    const { data } = supabase.storage.from('pet-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Helper function to get the next date based on recurrence type
  const getNextDate = (date: Date, type: string, interval: number): Date => {
    switch (type) {
      case 'daily':
        return addDays(date, interval);
      case 'weekly':
        return addWeeks(date, interval);
      case 'monthly':
        return addMonths(date, interval);
      case 'yearly':
        return addYears(date, interval);
      default:
        return date;
    }
  };

  // Generate all recurring event dates
  const generateRecurringDates = (startDate: Date, endDate: Date, type: string, interval: number): Date[] => {
    const dates: Date[] = [startDate];
    let currentDate = startDate;
    
    // Limit to prevent infinite loops (max 365 occurrences)
    const maxOccurrences = 365;
    let count = 0;
    
    while (count < maxOccurrences) {
      currentDate = getNextDate(currentDate, type, interval);
      if (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
        dates.push(currentDate);
        count++;
      } else {
        break;
      }
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // For series edit, we only require title
    if (!formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide a title.',
      });
      return;
    }

    // For non-series edits, require date and time
    if (!isSeriesEdit && (!formData.event_date || !formData.event_time)) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide a date and time.',
      });
      return;
    }

    // Validate recurrence end date (only for new events)
    if (!event && !isSeriesEdit && formData.recurrence_type !== 'none' && !formData.recurrence_end_date) {
      toast({
        variant: 'destructive',
        title: 'Missing end date',
        description: 'Please provide an end date for recurring events.',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      let photoUrl = event?.photo_url || null;
      
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      } else if (!photoPreview && event?.photo_url) {
        photoUrl = null;
      }
      
      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
      const recurrenceEndDate = formData.recurrence_end_date 
        ? new Date(`${formData.recurrence_end_date}T23:59:59`) 
        : null;
      
      const baseEventData: PetEventInsert = {
        pet_id: petId,
        user_id: user.id,
        title: formData.title.trim(),
        event_type: formData.event_type,
        custom_type: formData.event_type === 'other' ? formData.custom_type.trim() || null : null,
        location: formData.location.trim() || null,
        description: formData.description.trim() || null,
        event_date: eventDateTime.toISOString(),
        photo_url: photoUrl,
        is_reminder: formData.is_reminder,
        reminder_hours_before: formData.is_reminder ? formData.reminder_hours_before : null,
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_type !== 'none' ? formData.recurrence_interval : null,
        recurrence_end_date: recurrenceEndDate?.toISOString() || null,
      };
      
      if (event) {
        if (isSeriesEdit) {
          // Update all events in the series with shared properties
          const allEventIds = [event.id];
          const { data: childEvents } = await supabase
            .from('pet_events')
            .select('id')
            .eq('parent_event_id', event.id);
          
          if (childEvents) {
            allEventIds.push(...childEvents.map(e => e.id));
          }

          // Update shared properties across all series events (not dates)
          const { error } = await supabase
            .from('pet_events')
            .update({
              title: formData.title.trim(),
              event_type: formData.event_type,
              custom_type: formData.event_type === 'other' ? formData.custom_type.trim() || null : null,
              location: formData.location.trim() || null,
              description: formData.description.trim() || null,
              is_reminder: formData.is_reminder,
              reminder_hours_before: formData.is_reminder ? formData.reminder_hours_before : null,
              photo_url: photoUrl,
            })
            .in('id', allEventIds);

          if (error) throw error;

          toast({
            title: 'Series updated',
            description: `Updated ${allEventIds.length} appointments.`,
          });
        } else {
          // For single event updates
          const { error } = await supabase
            .from('pet_events')
            .update(baseEventData)
            .eq('id', event.id);
          
          if (error) throw error;
          
          toast({
            title: 'Appointment updated',
            description: 'The appointment has been updated successfully.',
          });
        }
      } else {
        // For new events with recurrence, create all instances
        if (formData.recurrence_type !== 'none' && recurrenceEndDate) {
          const recurringDates = generateRecurringDates(
            eventDateTime,
            recurrenceEndDate,
            formData.recurrence_type,
            formData.recurrence_interval
          );

          // Insert the first event (parent)
          const { data: parentEvent, error: parentError } = await supabase
            .from('pet_events')
            .insert(baseEventData)
            .select()
            .single();

          if (parentError) throw parentError;

          // Insert remaining recurring events with parent_event_id reference
          if (recurringDates.length > 1) {
            const childEvents = recurringDates.slice(1).map(date => ({
              ...baseEventData,
              event_date: date.toISOString(),
              parent_event_id: parentEvent.id,
            }));

            const { error: childError } = await supabase
              .from('pet_events')
              .insert(childEvents);

            if (childError) throw childError;
          }

          toast({
            title: 'Recurring appointments added',
            description: `Created ${recurringDates.length} appointments.`,
          });
        } else {
          // Single event
          const { error } = await supabase
            .from('pet_events')
            .insert(baseEventData);
          
          if (error) throw error;
          
          toast({
            title: 'Appointment added',
            description: 'The appointment has been added successfully.',
          });
        }
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isSeriesEdit ? 'Edit All Appointments in Series' : event ? 'Edit Appointment' : 'Add Appointment'}
          </DialogTitle>
          {isSeriesEdit && (
            <p className="text-sm text-muted-foreground">
              Changes will apply to all appointments in this recurring series.
            </p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Annual checkup"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Type</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.event_type === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom_type">Custom Type (optional)</Label>
              <Input
                id="custom_type"
                value={formData.custom_type}
                onChange={(e) => setFormData({ ...formData, custom_type: e.target.value })}
                placeholder="e.g., Training session"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <MapLocationPicker
              value={formData.location}
              onChange={(location) => setFormData({ ...formData, location })}
            />
          </div>

          {/* Date/Time - hide when editing series (dates are managed separately) */}
          {!isSeriesEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Date *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="event_time">Time *</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {/* Recurrence Section - hide when editing existing event or series */}
          {!event && !isSeriesEdit && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Repeat</Label>
              </div>
              
              <div className="space-y-2">
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recurrenceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type !== 'none' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.recurrence_interval.toString()}
                      onValueChange={(value) => setFormData({ ...formData, recurrence_interval: parseInt(value) })}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {recurrenceIntervals.map((interval) => (
                          <SelectItem key={interval.value} value={interval.value.toString()}>
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      {getIntervalLabel(formData.recurrence_type)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_end_date">End date *</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                      min={formData.event_date}
                      required={formData.recurrence_type !== 'none'}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_reminder" className="cursor-pointer">
                Set as reminder
              </Label>
              <Switch
                id="is_reminder"
                checked={formData.is_reminder}
                onCheckedChange={(checked) => setFormData({ ...formData, is_reminder: checked })}
              />
            </div>
            
            {formData.is_reminder && (
              <div className="space-y-2 pl-1">
                <Label htmlFor="reminder_hours_before">Remind me</Label>
                <Select
                  value={formData.reminder_hours_before.toString()}
                  onValueChange={(value) => setFormData({ ...formData, reminder_hours_before: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour before</SelectItem>
                    <SelectItem value="3">3 hours before</SelectItem>
                    <SelectItem value="6">6 hours before</SelectItem>
                    <SelectItem value="12">12 hours before</SelectItem>
                    <SelectItem value="24">1 day before</SelectItem>
                    <SelectItem value="48">2 days before</SelectItem>
                    <SelectItem value="72">3 days before</SelectItem>
                    <SelectItem value="168">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                  <img src={photoPreview} alt="Event preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : event ? 'Save Changes' : 'Add Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
