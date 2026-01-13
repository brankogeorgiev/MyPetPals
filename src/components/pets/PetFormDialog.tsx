import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Pet = Database['public']['Tables']['pets']['Row'];
type PetInsert = Database['public']['Tables']['pets']['Insert'];

interface PetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet?: Pet | null;
  onSuccess: () => void;
}

const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Guinea Pig', 'Reptile', 'Other'];

export function PetFormDialog({ open, onOpenChange, pet, onSuccess }: PetFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    pet_type: '',
    breed: '',
    age_years: '',
    age_months: '',
    notes: '',
  });

  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name,
        pet_type: pet.pet_type,
        breed: pet.breed || '',
        age_years: pet.age_years?.toString() || '',
        age_months: pet.age_months?.toString() || '',
        notes: pet.notes || '',
      });
      setPhotoPreview(pet.photo_url);
    } else {
      setFormData({
        name: '',
        pet_type: '',
        breed: '',
        age_years: '',
        age_months: '',
        notes: '',
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [pet, open]);

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
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
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
    
    if (!formData.name.trim() || !formData.pet_type) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide a name and pet type.',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      let photoUrl = pet?.photo_url || null;
      
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      } else if (!photoPreview && pet?.photo_url) {
        // Photo was removed
        photoUrl = null;
      }
      
      const petData: PetInsert = {
        user_id: user.id,
        name: formData.name.trim(),
        pet_type: formData.pet_type,
        breed: formData.breed.trim() || null,
        age_years: formData.age_years ? parseInt(formData.age_years) : null,
        age_months: formData.age_months ? parseInt(formData.age_months) : null,
        photo_url: photoUrl,
        notes: formData.notes.trim() || null,
      };
      
      if (pet) {
        const { error } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', pet.id);
        
        if (error) throw error;
        
        toast({
          title: 'Pet updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from('pets')
          .insert(petData);
        
        if (error) throw error;
        
        toast({
          title: 'Pet added',
          description: `${formData.name} has been added to your family!`,
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
            {pet ? 'Edit Pet' : 'Add New Pet'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                  <img src={photoPreview} alt="Pet preview" className="w-full h-full object-cover" />
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
              <p className="text-sm text-muted-foreground">
                Upload a photo of your pet
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Buddy"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pet_type">Type *</Label>
              <Select
                value={formData.pet_type}
                onValueChange={(value) => setFormData({ ...formData, pet_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {petTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Breed</Label>
            <Input
              id="breed"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              placeholder="Golden Retriever"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age_years">Age (Years)</Label>
              <Input
                id="age_years"
                type="number"
                min="0"
                max="50"
                value={formData.age_years}
                onChange={(e) => setFormData({ ...formData, age_years: e.target.value })}
                placeholder="3"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age_months">Months</Label>
              <Input
                id="age_months"
                type="number"
                min="0"
                max="11"
                value={formData.age_months}
                onChange={(e) => setFormData({ ...formData, age_months: e.target.value })}
                placeholder="6"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special notes about your pet..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : pet ? 'Save Changes' : 'Add Pet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
