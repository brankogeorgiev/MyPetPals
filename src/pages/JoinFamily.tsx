import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilies } from '@/hooks/useFamilies';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function JoinFamily() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const codeFromQuery = searchParams.get('code');
  const inviteCode = code || codeFromQuery;
  
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { joinFamilyByCode } = useFamilies();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/join/${inviteCode}`);
      return;
    }
  }, [user, authLoading, navigate, inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode || !user) return;
    
    setStatus('loading');
    const { data, error } = await joinFamilyByCode(inviteCode);
    
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      toast({
        title: "Failed to join family",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStatus('success');
      setFamilyName(data?.name || 'Family');
      toast({
        title: "Joined family!",
        description: `You're now a member of ${data?.name || 'the family'}.`,
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Join Family</CardTitle>
            <CardDescription>
              You've been invited to join a family group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === 'idle' && (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
                  <code className="text-2xl font-mono font-bold tracking-widest">
                    {inviteCode}
                  </code>
                </div>
                <Button onClick={handleJoin} className="w-full" size="lg">
                  Join Family
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => navigate('/families')}
                >
                  Cancel
                </Button>
              </>
            )}

            {status === 'loading' && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Joining family...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Welcome!</h3>
                <p className="text-muted-foreground mb-6">
                  You've joined <strong>{familyName}</strong>. You can now see shared pets and appointments.
                </p>
                <Button onClick={() => navigate('/families')} className="w-full">
                  View My Families
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-4">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to Join</h3>
                <p className="text-muted-foreground mb-6">{errorMessage}</p>
                <div className="space-y-2">
                  <Button onClick={handleJoin} variant="outline" className="w-full">
                    Try Again
                  </Button>
                  <Button onClick={() => navigate('/families')} className="w-full">
                    Go to Families
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
