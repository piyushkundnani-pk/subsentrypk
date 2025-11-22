import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    const handleCallback = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[AuthCallback] Processing OAuth callback...');
        }
        
        // Check URL for OAuth parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const code = hashParams.get('code') || searchParams.get('code');
        
        if (code) {
          if (import.meta.env.DEV) {
            console.log('[AuthCallback] Found OAuth code, exchanging for session...');
          }
          
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (!mounted) return;
          
          if (error) {
            console.error('[AuthCallback] Error exchanging code:', error);
            navigate('/auth', { replace: true });
            return;
          }
          
          if (data.session) {
            if (import.meta.env.DEV) {
              console.log('[AuthCallback] Session established successfully');
            }
            
            // Wait for auth context to update
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if (!mounted) return;
            
            // Redirect to dashboard
            navigate('/dashboard', { replace: true });
            return;
          }
        }
        
        // Fallback: check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('[AuthCallback] Error getting session:', sessionError);
          navigate('/auth', { replace: true });
          return;
        }

        if (session) {
          if (import.meta.env.DEV) {
            console.log('[AuthCallback] Existing session found');
          }
          navigate('/dashboard', { replace: true });
        } else {
          if (import.meta.env.DEV) {
            console.log('[AuthCallback] No session found');
          }
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error);
        if (mounted) {
          navigate('/auth', { replace: true });
        }
      }
    };

    handleCallback();
    
    return () => {
      mounted = false;
    };
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
