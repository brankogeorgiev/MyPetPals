import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Users, 
  Copy, 
  Check, 
  PawPrint,
  UserPlus,
  LogOut,
  Trash2,
  Mail,
  Link
} from 'lucide-react';
import { PetCard } from '@/components/pets/PetCard';
import { InviteMemberDialog } from '@/components/families/InviteMemberDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Database } from '@/integrations/supabase/types';

type Family = Database['public']['Tables']['families']['Row'];
type Pet = Database['public']['Tables']['pets']['Row'];

interface FamilyMember {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isCreator = family?.created_by === user?.id;

  const fetchFamily = async () => {
    if (!id) return;

    setLoading(true);

    // Fetch family details
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (familyError || !familyData) {
      toast({
        title: "Family not found",
        description: "This family doesn't exist or you don't have access.",
        variant: "destructive",
      });
      navigate('/families');
      return;
    }

    setFamily(familyData);

    // Fetch members with profiles using RPC function (bypasses RLS issues)
    const { data: membersData } = await supabase
      .rpc('get_family_members', { _family_id: id });

    setMembers(
      (membersData || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        joined_at: m.joined_at,
        profile: {
          full_name: m.full_name,
          avatar_url: m.avatar_url,
        },
      }))
    );

    // Fetch pets assigned to this family
    const { data: petsData } = await supabase
      .from('pets')
      .select('*')
      .eq('family_id', id)
      .order('name', { ascending: true });

    setPets(petsData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFamily();
  }, [id]);

  const copyInviteCode = async () => {
    if (!family?.invite_code) return;
    await navigator.clipboard.writeText(family.invite_code);
    setCopied(true);
    toast({ title: "Copied!", description: "Invite code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    if (!family?.invite_code) return;
    const link = `${window.location.origin}/join/${family.invite_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share this link to invite others" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveFamily = async () => {
    if (!user || !id) return;

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Failed to leave",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Left family", description: "You have left this family." });
      navigate('/families');
    }
  };

  const handleDeleteFamily = async () => {
    if (!id) return;

    const { error } = await supabase
      .from('families')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Family deleted", description: "The family has been deleted." });
      navigate('/families');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!family) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button and header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/families')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{family.name}</h1>
            <p className="text-muted-foreground text-sm">
              {members.length} member{members.length !== 1 ? 's' : ''} · {pets.length} pet{pets.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Invite Code Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg tracking-widest text-center">
                {family.invite_code}
              </div>
              <Button variant="outline" size="icon" onClick={copyInviteCode}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code or link with others so they can join your family.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyInviteLink}>
                <Link className="w-4 h-4 mr-2" />
                Copy Invite Link
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Invite by Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Family Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar>
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {member.profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  {member.user_id === family.created_by && (
                    <Badge variant="secondary">Creator</Badge>
                  )}
                  {member.user_id === user?.id && (
                    <Badge variant="outline">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pets Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary" />
              Shared Pets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No pets shared with this family yet.</p>
                <p className="text-sm mt-1">
                  Assign pets to this family from the home page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pets.map((pet) => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    isShared
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isCreator && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => setLeaveDialogOpen(true)}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Family
              </Button>
            )}
            {isCreator && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Family
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Invite Dialog */}
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        familyId={id!}
        onInvited={() => {
          toast({ title: "Invitation sent!", description: "They'll receive an email invitation." });
        }}
      />

      {/* Leave Confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Family?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer have access to pets shared with this family. You can rejoin using the invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveFamily} className="bg-destructive text-destructive-foreground">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the family and remove all members. Pets will remain but won't be shared anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFamily} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
