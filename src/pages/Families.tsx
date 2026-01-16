import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilies } from '@/hooks/useFamilies';
import { Header } from '@/components/layout/Header';
import { FamilyCard } from '@/components/families/FamilyCard';
import { CreateFamilyDialog } from '@/components/families/CreateFamilyDialog';
import { JoinFamilyDialog } from '@/components/families/JoinFamilyDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, UserPlus, Users } from 'lucide-react';

export default function Families() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { 
    families, 
    loading, 
    createFamily, 
    joinFamilyByCode, 
    leaveFamily, 
    deleteFamily,
    inviteByEmail 
  } = useFamilies();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              My Families
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your family groups and share pets with others
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowJoinDialog(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Join Family
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Family
            </Button>
          </div>
        </div>

        {/* Families List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : families.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">No families yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                Create a family to share pets with others, or join an existing family using an invite code.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowJoinDialog(true)} className="gap-2">
                  <UserPlus className="w-5 h-5" />
                  Join Family
                </Button>
                <Button onClick={() => setShowCreateDialog(true)} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Family
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {families.map((family) => (
              <FamilyCard
                key={family.id}
                family={family}
                onLeave={leaveFamily}
                onDelete={deleteFamily}
                onInviteEmail={inviteByEmail}
              />
            ))}
          </div>
        )}
      </main>

      <CreateFamilyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createFamily}
      />

      <JoinFamilyDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onSubmit={joinFamilyByCode}
      />
    </div>
  );
}
