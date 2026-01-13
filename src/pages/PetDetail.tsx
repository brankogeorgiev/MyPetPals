import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/EventCard';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { DeleteEventDialog } from '@/components/events/DeleteEventDialog';
import { PetFormDialog } from '@/components/pets/PetFormDialog';
import { DeletePetDialog } from '@/components/pets/DeletePetDialog';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, History, Dog, Cat, Bird, Fish, Rabbit } from 'lucide-react';
import { isPast, isToday } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Pet = Database['public']['Tables']['pets']['Row'];
type PetEvent = Database['public']['Tables']['pet_events']['Row'];

const petTypeIcons: Record<string, React.ReactNode> = {
  dog: <Dog className="w-8 h-8" />,
  cat: <Cat className="w-8 h-8" />,
  bird: <Bird className="w-8 h-8" />,
  fish: <Fish className="w-8 h-8" />,
  rabbit: <Rabbit className="w-8 h-8" />,
};

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<PetEvent | null>(null);
  
  const [showPetForm, setShowPetForm] = useState(false);
  const [showDeletePet, setShowDeletePet] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchPet = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error || !data) {
      navigate('/');
      return;
    }
    
    setPet(data);
  };

  const fetchEvents = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from('pet_events')
      .select('*')
      .eq('pet_id', id)
      .order('event_date', { ascending: false });
    
    setEvents(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPet(), fetchEvents()]);
      setLoading(false);
    };
    
    if (user && id) {
      loadData();
    }
  }, [user, id]);

  const handleToggleComplete = async (event: PetEvent) => {
    const { error } = await supabase
      .from('pet_events')
      .update({ reminder_completed: !event.reminder_completed })
      .eq('id', event.id);
    
    if (!error) {
      fetchEvents();
    }
  };

  const upcomingEvents = events.filter(e => 
    !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date))
  ).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  
  const pastEvents = events.filter(e => 
    isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date))
  );

  const formatAge = () => {
    if (!pet) return '';
    const years = pet.age_years || 0;
    const months = pet.age_months || 0;
    if (years === 0 && months === 0) return 'Age unknown';
    if (years === 0) return `${months} month${months !== 1 ? 's' : ''} old`;
    if (months === 0) return `${years} year${years !== 1 ? 's' : ''} old`;
    return `${years} years, ${months} months old`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!pet) return null;

  const petType = pet.pet_type.toLowerCase();
  const icon = petTypeIcons[petType] || petTypeIcons.rabbit;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to pets
        </Button>

        {/* Pet Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-secondary shrink-0">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {icon}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold">{pet.name}</h1>
                <p className="text-lg text-muted-foreground mt-1">
                  {pet.breed || pet.pet_type} • {formatAge()}
                </p>
                {pet.notes && (
                  <p className="mt-3 text-foreground/80">{pet.notes}</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setShowPetForm(true)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowDeletePet(true)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-4">
              <Badge variant="outline" className="text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                {upcomingEvents.length} upcoming
              </Badge>
              <Badge variant="outline" className="text-sm">
                <History className="w-4 h-4 mr-1" />
                {pastEvents.length} past events
              </Badge>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Events & Reminders</h2>
            <Button onClick={() => { setEditingEvent(null); setShowEventForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming" className="gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming ({upcomingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History ({pastEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-xl">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">No upcoming events</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule a vet visit, grooming, or medication reminder
                  </p>
                  <Button onClick={() => setShowEventForm(true)}>
                    Add First Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={(e) => { setEditingEvent(e); setShowEventForm(true); }}
                      onDelete={setDeletingEvent}
                      onToggleComplete={handleToggleComplete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {pastEvents.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-xl">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg">No past events yet</h3>
                  <p className="text-muted-foreground">
                    Past events and completed reminders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={(e) => { setEditingEvent(e); setShowEventForm(true); }}
                      onDelete={setDeletingEvent}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <EventFormDialog
        open={showEventForm}
        onOpenChange={setShowEventForm}
        event={editingEvent}
        petId={pet.id}
        onSuccess={fetchEvents}
      />

      <DeleteEventDialog
        open={!!deletingEvent}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
        event={deletingEvent}
        onSuccess={fetchEvents}
      />

      <PetFormDialog
        open={showPetForm}
        onOpenChange={setShowPetForm}
        pet={pet}
        onSuccess={fetchPet}
      />

      <DeletePetDialog
        open={showDeletePet}
        onOpenChange={setShowDeletePet}
        pet={pet}
        onSuccess={() => navigate('/')}
      />
    </div>
  );
}
