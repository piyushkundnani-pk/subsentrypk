import { Bell, User, LogOut, Settings, Menu } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/subscriptions', label: 'Subscriptions' },
    { path: '/calendar', label: 'Calendar', disabled: true },
  ];

  const handleNavClick = (path: string, disabled: boolean) => {
    if (!disabled) {
      navigate(path);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/dashboard">
              <Logo />
            </Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.disabled ? '#' : item.path}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary'
                      : item.disabled
                      ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  {item.label}
                  {item.disabled && (
                    <span className="ml-1 text-xs text-muted-foreground">(Coming soon)</span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-6 mt-8">
                  <nav className="flex flex-col gap-4">
                    {navItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path, item.disabled || false)}
                        disabled={item.disabled}
                        className={`text-left text-base font-medium transition-colors py-2 px-4 rounded-lg ${
                          location.pathname === item.path
                            ? 'bg-primary text-primary-foreground'
                            : item.disabled
                            ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {item.label}
                        {item.disabled && (
                          <span className="block text-xs text-muted-foreground mt-1">Coming soon</span>
                        )}
                      </button>
                    ))}
                  </nav>
                  
                  <div className="border-t border-border pt-4 flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate('/reminders');
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Reminders
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate('/settings');
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="justify-start text-destructive hover:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/reminders')}
              className="rounded-full"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user?.user_metadata?.full_name || user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
