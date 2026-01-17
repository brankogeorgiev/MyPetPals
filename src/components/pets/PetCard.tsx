import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Calendar, Dog, Cat, Bird, Fish, Rabbit, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Pet = Database['public']['Tables']['pets']['Row'];

interface PetCardProps {
  pet: Pet;
  onEdit?: (pet: Pet) => void;
  onDelete?: (pet: Pet) => void;
  onClick?: (pet: Pet) => void;
  upcomingEvents?: number;
  onAssignFamily?: (pet: Pet) => void;
  isShared?: boolean;
}

const petTypeIcons: Record<string, React.ReactNode> = {
  dog: <Dog className="w-5 h-5" />,
  cat: <Cat className="w-5 h-5" />,
  bird: <Bird className="w-5 h-5" />,
  fish: <Fish className="w-5 h-5" />,
  rabbit: <Rabbit className="w-5 h-5" />,
};

const petTypeColors: Record<string, string> = {
  dog: 'bg-pet-dog/10 text-pet-dog border-pet-dog/20',
  cat: 'bg-pet-cat/10 text-pet-cat border-pet-cat/20',
  bird: 'bg-pet-bird/10 text-pet-bird border-pet-bird/20',
  fish: 'bg-pet-fish/10 text-pet-fish border-pet-fish/20',
  rabbit: 'bg-pet-other/10 text-pet-other border-pet-other/20',
  other: 'bg-pet-other/10 text-pet-other border-pet-other/20',
};

export function PetCard({ pet, onEdit, onDelete, onClick, upcomingEvents = 0, onAssignFamily, isShared }: PetCardProps) {
  const formatAge = () => {
    const years = pet.age_years || 0;
    const months = pet.age_months || 0;
    if (years === 0 && months === 0) return 'Age unknown';
    if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
    if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    return `${years}y ${months}m`;
  };

  const petType = pet.pet_type.toLowerCase();
  const icon = petTypeIcons[petType] || petTypeIcons.rabbit;
  const colorClass = petTypeColors[petType] || petTypeColors.other;

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-card hover:-translate-y-1 border-0 shadow-sm overflow-hidden"
      onClick={() => onClick?.(pet)}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {pet.photo_url ? (
          <img
            src={pet.photo_url}
            alt={pet.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`p-6 rounded-full ${colorClass}`}>
              {icon}
            </div>
          </div>
        )}
        
        {isShared && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur-sm">
              <Users className="w-3 h-3" />
              Shared
            </Badge>
          </div>
        )}
        
        {(onEdit || onDelete || onAssignFamily) && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(pet); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onAssignFamily && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignFamily(pet); }}>
                    <Users className="mr-2 h-4 w-4" />
                    Share with Family
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(pet); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-lg truncate">{pet.name}</h3>
            <p className="text-sm text-muted-foreground">
              {pet.breed || pet.pet_type} • {formatAge()}
            </p>
          </div>
          <Badge variant="outline" className={`shrink-0 ${colorClass}`}>
            {icon}
          </Badge>
        </div>
        
        {upcomingEvents > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-primary">
            <Calendar className="w-4 h-4" />
            <span>{upcomingEvents} upcoming</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
