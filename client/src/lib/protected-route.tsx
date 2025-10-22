import { useAuth } from "@/hooks/use-auth";
import { Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function ProtectedRoute({
  path,
  component: Component,
  role,
}: {
  path: string;
  component: () => React.JSX.Element;
  role?: string;
}) {
  const { user, isLoading, isSessionActive, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);

  // Verify session is active when component mounts
  useEffect(() => {
    const checkSession = async () => {
      if (user) {
        setIsCheckingSession(true);
        try {
          const active = await isSessionActive();
          setSessionValid(active);
          
          if (!active) {
            toast({
              title: "Session expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error checking session:", error);
          setSessionValid(false);
        } finally {
          setIsCheckingSession(false);
        }
      }
    };
    
    checkSession();
    
    // Periodically check session for long-lived routes
    const interval = setInterval(async () => {
      if (user) {
        try {
          const active = await isSessionActive();
          if (!active && sessionValid) {
            setSessionValid(false);
            toast({
              title: "Session expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
          } else if (active && !sessionValid) {
            // Session is now valid again
            setSessionValid(true);
            refreshUserData(); // Make sure we have latest user data
          }
        } catch (error) {
          console.error("Error in periodic session check:", error);
        }
      }
    }, 5 * 60 * 1000); // every 5 minutes
    
    return () => clearInterval(interval);
  }, [user, isSessionActive, toast, sessionValid, refreshUserData]);

  // Show loading state when initially loading or checking session
  if (isLoading || isCheckingSession) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            {isLoading ? "Loading..." : "Verifying your session..."}
          </p>
        </div>
      </Route>
    );
  }

  // Redirect to login if no user or invalid session
  if (!user || !sessionValid) {
    return <Redirect to="/auth" />;
  }

  // If a specific role is required, check if the user has that role
  if (role && user.role !== role) {
    // Always allow admin to access any role-protected route
    if (user.role !== 'admin') {
      return <Redirect to={`/${user.role}`} />;
    }
  }

  return <Route path={path} component={Component} />;
}
