import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { PetCard } from '@/components/pets/PetCard';
import { PetFormDialog } from '@/components/pets/PetFormDialog';
import { DeletePetDialog } from '@/components/pets/DeletePetDialog';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, PawPrint, Calendar, Bell } from 'lucide-react';
import { isPast, isToday, isFuture } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Pet = Database['public']['Tables']['pets']['Row'];
type PetEvent = Database['public']['Tables']['pet_events']['Row'] & { pet_name?: string };

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<PetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchPets = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setPets(data || []);
  };

  const fetchUpcomingEvents = async () => {
    if (!user) return;
    
    const { data: events } = await supabase
      .from('pet_events')
      .select('*, pets(name)')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true });
    
    const upcoming = (events || [])
      .filter(e => !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date)))
      .map(e => ({
        ...e,
        pet_name: (e.pets as any)?.name,
      }))
      .slice(0, 5);
    
    setUpcomingEvents(upcoming);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPets(), fetchUpcomingEvents()]);
      setLoading(false);
    };
    
    if (user) {
      loadData();
    }
  }, [user]);

  const getUpcomingEventsForPet = (petId: string) => {
    return upcomingEvents.filter(e => e.pet_id === petId).length;
  };

  const handleToggleComplete = async (event: PetEvent) => {
    const { error } = await supabase
      .from('pet_events')
      .update({ reminder_completed: !event.reminder_completed })
      .eq('id', event.id);
    
    if (!error) {
      fetchUpcomingEvents();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your pets and keep track of their care
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {pets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <PawPrint className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pets.length}</p>
                  <p className="text-sm text-muted-foreground">Pet{pets.length !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm col-span-2 md:col-span-1">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Bell className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {upcomingEvents.filter(e => e.is_reminder && !e.reminder_completed).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Reminders</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Events
            </h2>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={() => navigate(`/pet/${event.pet_id}`)}
                  onDelete={() => navigate(`/pet/${event.pet_id}`)}
                  onToggleComplete={handleToggleComplete}
                  showPetName
                  petName={event.pet_name}
                />
              ))}
            </div>
          </section>
        )}

        {/* Pets Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary" />
              My Pets
            </h2>
            <Button onClick={() => { setEditingPet(null); setShowPetForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Pet
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : pets.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <PawPrint className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">No pets yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Add your first pet to start tracking their health, appointments, and reminders.
                </p>
                <Button onClick={() => setShowPetForm(true)} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Add Your First Pet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onEdit={(p) => { setEditingPet(p); setShowPetForm(true); }}
                  onDelete={setDeletingPet}
                  onClick={(p) => navigate(`/pet/${p.id}`)}
                  upcomingEvents={getUpcomingEventsForPet(pet.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <PetFormDialog
        open={showPetForm}
        onOpenChange={setShowPetForm}
        pet={editingPet}
        onSuccess={() => { fetchPets(); fetchUpcomingEvents(); }}
      />

      <DeletePetDialog
        open={!!deletingPet}
        onOpenChange={(open) => !open && setDeletingPet(null)}
        pet={deletingPet}
        onSuccess={() => { fetchPets(); fetchUpcomingEvents(); }}
      />
    </div>
  );
}
