import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  MoreVertical, 
  Copy, 
  UserPlus, 
  LogOut, 
  Trash2,
  Check,
  Mail,
  Link
} from 'lucide-react';
import type { FamilyWithMembers } from '@/hooks/useFamilies';

interface FamilyCardProps {
  family: FamilyWithMembers;
  onLeave: (familyId: string) => Promise<{ error: Error | null }>;
  onDelete: (familyId: string) => Promise<{ error: Error | null }>;
  onInviteEmail: (familyId: string, email: string) => Promise<{ error: Error | null }>;
  onClick?: () => void;
}

export function FamilyCard({ family, onLeave, onDelete, onInviteEmail, onClick }: FamilyCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const isCreator = family.created_by === user?.id;

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(family.invite_code);
    setCopied(true);
    toast({
      title: "Code copied!",
      description: "Share this code with others to invite them.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join/${family.invite_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link to invite others to your family.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteEmail = async () => {
    if (!inviteEmail.trim()) return;
    
    setLoading(true);
    const { error } = await onInviteEmail(family.id, inviteEmail.trim());
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      setShowInviteDialog(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    const { error } = await onLeave(family.id);
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to leave family",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Left family",
        description: "You are no longer a member of this family.",
      });
      setShowLeaveDialog(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await onDelete(family.id);
    setLoading(false);

    if (error) {
      toast({
        title: "Failed to delete family",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Family deleted",
        description: "The family has been permanently deleted.",
      });
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{family.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {family.member_count} member{family.member_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyInviteCode(); }}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy Invite Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyInviteLink(); }}>
                  <Link className="w-4 h-4 mr-2" />
                  Copy Invite Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowInviteDialog(true); }}>
                  <Mail className="w-4 h-4 mr-2" />
                  Invite by Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isCreator && (
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setShowLeaveDialog(true); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Family
                  </DropdownMenuItem>
                )}
                {isCreator && (
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Family
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Member Avatars */}
          <div className="flex items-center mt-4 -space-x-2">
            {family.members.slice(0, 5).map((member) => (
              <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                <AvatarFallback className="text-xs bg-muted">
                  {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {family.member_count > 5 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                +{family.member_count - 5}
              </div>
            )}
          </div>

          {/* Invite Code Display */}
          <div className="mt-4 p-2 rounded-lg bg-muted/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Invite Code:</span>
            <code className="font-mono text-sm font-medium">{family.invite_code}</code>
          </div>
        </CardContent>
      </Card>

      {/* Invite Email Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite by Email</DialogTitle>
            <DialogDescription>
              Send an email invitation to join {family.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInviteEmail} disabled={loading}>
              {loading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Family?</DialogTitle>
            <DialogDescription>
              You will lose access to shared pets in "{family.name}". You can rejoin using an invite code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeave} disabled={loading}>
              {loading ? 'Leaving...' : 'Leave Family'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Family?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{family.name}" and remove all members. Shared pets will become personal pets of their original owners.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete Family'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
