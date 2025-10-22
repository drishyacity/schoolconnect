import { createContext, ReactNode, useContext, useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type UserWithoutPassword = Omit<User, 'password'>;

type AuthContextType = {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionActive: () => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithoutPassword, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithoutPassword, Error, InsertUser>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const localQueryClient = useQueryClient();

  // Main user data query
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<UserWithoutPassword | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Function to check if session is active by making a request to the server
  const isSessionActive = useCallback(async (): Promise<boolean> => {
    try {
      console.log("Checking if session is active...");
      const response = await fetch("/api/user", {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        }
      });

      // Log the response status
      console.log("Session check response status:", response.status);

      return response.status === 200;
    } catch (error) {
      console.error("Session check error:", error);
      return false;
    }
  }, []);

  // Function to manually refresh user data
  const refreshUserData = useCallback(async (): Promise<void> => {
    console.log("Refreshing user data...");
    await refetch();
  }, [refetch]);

  // Enhanced login mutation with better error handling
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login for user:", credentials.username);
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      return userData;
    },
    onSuccess: (user: UserWithoutPassword) => {
      console.log("Login successful for user:", user.username);
      localQueryClient.setQueryData(["/api/user"], user);

      // Redirect based on user role
      if (user.role === 'admin') {
        setLocation("/admin");
      } else if (user.role === 'teacher') {
        setLocation("/teacher");
      } else if (user.role === 'student') {
        setLocation("/student");
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      console.log("Attempting to register new user:", userData.username);
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: UserWithoutPassword) => {
      console.log("Registration successful for user:", user.username);
      localQueryClient.setQueryData(["/api/user"], user);

      // Redirect based on user role
      if (user.role === 'admin') {
        setLocation("/admin");
      } else if (user.role === 'teacher') {
        setLocation("/teacher");
      } else if (user.role === 'student') {
        setLocation("/student");
      }

      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to log out user");
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      console.log("Logout successful");
      localQueryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");

      // Invalidate and refetch any authenticated queries
      localQueryClient.invalidateQueries();

      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      // Even if logout API fails, clear local user data
      localQueryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");

      toast({
        title: "Logout issue",
        description: "You were logged out, but there was a server error.",
        variant: "destructive",
      });
    },
  });

  // Check session activity periodically
  useEffect(() => {
    // Check session status every 5 minutes
    const interval = setInterval(async () => {
      const active = await isSessionActive();
      if (!active && user) {
        console.warn("Session expired, logging out...");
        localQueryClient.setQueryData(["/api/user"], null);
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setLocation("/auth");
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isSessionActive, user, localQueryClient, setLocation, toast]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        isSessionActive,
        refreshUserData,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
