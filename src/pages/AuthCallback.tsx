import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      if (import.meta.env.DEV) {
        console.log('[AuthCallback] Processing OAuth callback...');
      }
      
      // Check if we have a code in the URL (OAuth flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const code = hashParams.get('code');
      
      if (code) {
        if (import.meta.env.DEV) {
          console.log('[AuthCallback] Found OAuth code, exchanging for session...');
        }
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          if (import.meta.env.DEV) {
            console.error('[AuthCallback] Error exchanging code:', error);
          }
          navigate('/auth', { replace: true });
          return;
        }
        
        if (data.session) {
          if (import.meta.env.DEV) {
            console.log('[AuthCallback] Session established, redirecting to dashboard');
          }
          // Small delay to ensure AuthContext has updated
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 100);
          return;
        }
      }
      
      // Fallback: check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthCallback] Error getting session:', error);
        }
        navigate('/auth', { replace: true });
        return;
      }

      if (session) {
        if (import.meta.env.DEV) {
          console.log('[AuthCallback] Existing session found, redirecting to dashboard');
        }
        navigate('/dashboard', { replace: true });
      } else {
        if (import.meta.env.DEV) {
          console.log('[AuthCallback] No session found, redirecting to auth');
        }
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
