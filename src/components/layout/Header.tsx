import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PawPrint, LogOut, Users, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    if (name.includes('@')) {
      return name.charAt(0).toUpperCase();
    }
    return name
      .split(' ')
      .map((n: string) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-warm shadow-warm">
              <PawPrint className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">PetPal</span>
          </div>

          {/* Navigation */}
          <nav className="hidden sm:flex items-center gap-1">
            <Button 
              variant={location.pathname === '/' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
            <Button 
              variant={location.pathname === '/families' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => navigate('/families')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Families
            </Button>
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user?.user_metadata?.full_name && (
                  <p className="font-medium">{user.user_metadata.full_name}</p>
                )}
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            {/* Mobile navigation */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/families')}>
                <Users className="mr-2 h-4 w-4" />
                Families
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
