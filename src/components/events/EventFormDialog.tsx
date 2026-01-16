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
import { Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type PetEvent = Database['public']['Tables']['pet_events']['Row'];
type PetEventInsert = Database['public']['Tables']['pet_events']['Insert'];

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PetEvent | null;
  petId: string;
  onSuccess: () => void;
}

const appointmentTypes = [
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'medication', label: 'Medication' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

export function EventFormDialog({ open, onOpenChange, event, petId, onSuccess }: EventFormDialogProps) {
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
      });
      setPhotoPreview(event.photo_url);
    } else {
      const now = new Date();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.title.trim() || !formData.event_date || !formData.event_time) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide a title, date, and time.',
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
      
      const eventData: PetEventInsert = {
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
      };
      
      if (event) {
        const { error } = await supabase
          .from('pet_events')
          .update(eventData)
          .eq('id', event.id);
        
        if (error) throw error;
        
        toast({
          title: 'Appointment updated',
          description: 'The appointment has been updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('pet_events')
          .insert(eventData);
        
        if (error) throw error;
        
        toast({
          title: 'Appointment added',
          description: 'The appointment has been added successfully.',
        });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {event ? 'Edit Appointment' : 'Add Appointment'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
