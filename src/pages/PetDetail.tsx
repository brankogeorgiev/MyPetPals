import { useState, useEffect, useMemo } from 'react';
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
import { RecurringSeriesCard } from '@/components/events/RecurringSeriesCard';
import { RecurringSeriesDialog } from '@/components/events/RecurringSeriesDialog';
import { ShiftRecurringDialog } from '@/components/events/ShiftRecurringDialog';
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
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<PetEvent | null>(null);
  
  // Recurring series state
  const [selectedSeries, setSelectedSeries] = useState<{ parent: PetEvent; children: PetEvent[] } | null>(null);
  const [shiftingEvent, setShiftingEvent] = useState<{ event: PetEvent; allEvents: PetEvent[] } | null>(null);
  
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

  // Group events: separate recurring series from standalone events
  const { groupedUpcoming, groupedPast, standaloneUpcoming, standalonePast } = useMemo(() => {
    const now = new Date();
    
    // Find parent events (those that have children referencing them OR have recurrence_type set)
    const parentEventIds = new Set<string>();
    const childToParentMap = new Map<string, string>();
    
    events.forEach(e => {
      if (e.parent_event_id) {
        parentEventIds.add(e.parent_event_id);
        childToParentMap.set(e.id, e.parent_event_id);
      }
    });
    
    // Also include events that set recurrence but might not have children yet
    events.forEach(e => {
      if (e.recurrence_type && e.recurrence_type !== 'none' && !e.parent_event_id) {
        parentEventIds.add(e.id);
      }
    });
    
    // Group children by parent
    const seriesMap = new Map<string, { parent: PetEvent; children: PetEvent[] }>();
    
    events.forEach(e => {
      if (parentEventIds.has(e.id) && !e.parent_event_id) {
        // This is a parent event
        if (!seriesMap.has(e.id)) {
          seriesMap.set(e.id, { parent: e, children: [] });
        } else {
          seriesMap.get(e.id)!.parent = e;
        }
      } else if (e.parent_event_id && parentEventIds.has(e.parent_event_id)) {
        // This is a child event
        if (!seriesMap.has(e.parent_event_id)) {
          // Parent might not be found yet, create placeholder
          seriesMap.set(e.parent_event_id, { parent: null as any, children: [e] });
        } else {
          seriesMap.get(e.parent_event_id)!.children.push(e);
        }
      }
    });
    
    // Filter valid series (must have parent)
    const validSeries = Array.from(seriesMap.values()).filter(s => s.parent);
    
    // Check if series has any upcoming events
    const upcomingSeries: typeof validSeries = [];
    const pastSeries: typeof validSeries = [];
    
    validSeries.forEach(series => {
      const allSeriesEvents = [series.parent, ...series.children];
      const hasUpcoming = allSeriesEvents.some(e => 
        !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date))
      );
      
      if (hasUpcoming) {
        upcomingSeries.push(series);
      } else {
        pastSeries.push(series);
      }
    });
    
    // Get standalone events (not part of any series)
    const seriesEventIds = new Set<string>();
    validSeries.forEach(series => {
      seriesEventIds.add(series.parent.id);
      series.children.forEach(c => seriesEventIds.add(c.id));
    });
    
    const standaloneEvents = events.filter(e => !seriesEventIds.has(e.id));
    
    const standaloneUpcomingList = standaloneEvents.filter(e => 
      !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date))
    ).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    
    const standalonePastList = standaloneEvents.filter(e => 
      isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date))
    ).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    
    return {
      groupedUpcoming: upcomingSeries,
      groupedPast: pastSeries,
      standaloneUpcoming: standaloneUpcomingList,
      standalonePast: standalonePastList,
    };
  }, [events]);

  // Calculate total counts for tabs
  const upcomingCount = groupedUpcoming.length + standaloneUpcoming.length;
  const pastCount = groupedPast.length + standalonePast.length;

  // Combined list for display with Show More
  const upcomingDisplayItems = useMemo(() => {
    const items: Array<{ type: 'series' | 'standalone'; data: any }> = [];
    
    // Add series items first
    groupedUpcoming.forEach(series => {
      items.push({ type: 'series', data: series });
    });
    
    // Add standalone items
    standaloneUpcoming.forEach(event => {
      items.push({ type: 'standalone', data: event });
    });
    
    return items;
  }, [groupedUpcoming, standaloneUpcoming]);

  const pastDisplayItems = useMemo(() => {
    const items: Array<{ type: 'series' | 'standalone'; data: any }> = [];
    
    groupedPast.forEach(series => {
      items.push({ type: 'series', data: series });
    });
    
    standalonePast.forEach(event => {
      items.push({ type: 'standalone', data: event });
    });
    
    return items;
  }, [groupedPast, standalonePast]);

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
                {upcomingCount} upcoming
              </Badge>
              <Badge variant="outline" className="text-sm">
                <History className="w-4 h-4 mr-1" />
                {pastCount} past
              </Badge>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Appointments & Reminders</h2>
            <Button onClick={() => { setEditingEvent(null); setShowEventForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Appointment
            </Button>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming" className="gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming ({upcomingCount})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History ({pastCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
              {upcomingDisplayItems.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-xl">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">No upcoming appointments</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule a vet visit, grooming, or medication reminder
                  </p>
                  <Button onClick={() => setShowEventForm(true)}>
                    Add First Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllUpcoming ? upcomingDisplayItems : upcomingDisplayItems.slice(0, 3)).map((item, index) => (
                    item.type === 'series' ? (
                      <RecurringSeriesCard
                        key={`series-${item.data.parent.id}`}
                        parentEvent={item.data.parent}
                        childEvents={item.data.children}
                        onClick={() => setSelectedSeries(item.data)}
                      />
                    ) : (
                      <EventCard
                        key={item.data.id}
                        event={item.data}
                        onEdit={(e) => { setEditingEvent(e); setShowEventForm(true); }}
                        onDelete={setDeletingEvent}
                        onToggleComplete={handleToggleComplete}
                      />
                    )
                  ))}
                  {upcomingDisplayItems.length > 3 && !showAllUpcoming && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setShowAllUpcoming(true)}
                    >
                      Show {upcomingDisplayItems.length - 3} More
                    </Button>
                  )}
                  {showAllUpcoming && upcomingDisplayItems.length > 3 && (
                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setShowAllUpcoming(false)}
                    >
                      Show Less
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {pastDisplayItems.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-xl">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg">No past appointments yet</h3>
                  <p className="text-muted-foreground">
                    Past appointments and completed reminders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastDisplayItems.map((item) => (
                    item.type === 'series' ? (
                      <RecurringSeriesCard
                        key={`series-${item.data.parent.id}`}
                        parentEvent={item.data.parent}
                        childEvents={item.data.children}
                        onClick={() => setSelectedSeries(item.data)}
                      />
                    ) : (
                      <EventCard
                        key={item.data.id}
                        event={item.data}
                        onEdit={(e) => { setEditingEvent(e); setShowEventForm(true); }}
                        onDelete={setDeletingEvent}
                      />
                    )
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

      {selectedSeries && (
        <RecurringSeriesDialog
          open={!!selectedSeries}
          onOpenChange={(open) => !open && setSelectedSeries(null)}
          parentEvent={selectedSeries.parent}
          childEvents={selectedSeries.children}
          onEdit={(e) => { setEditingEvent(e); setShowEventForm(true); }}
          onDelete={setDeletingEvent}
          onSuccess={() => {
            fetchEvents();
          }}
          onShiftDates={(event) => {
            setShiftingEvent({
              event,
              allEvents: [selectedSeries.parent, ...selectedSeries.children]
            });
          }}
        />
      )}

      {shiftingEvent && (
        <ShiftRecurringDialog
          open={!!shiftingEvent}
          onOpenChange={(open) => {
            if (!open) setShiftingEvent(null);
          }}
          event={shiftingEvent.event}
          allSeriesEvents={shiftingEvent.allEvents}
          onSuccess={() => {
            fetchEvents();
            setSelectedSeries(null);
          }}
        />
      )}

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
