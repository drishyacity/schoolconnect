import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import ContentForm from "@/components/content/content-form";
import { Loader2 } from "lucide-react";

export default function ContentEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch content data
  const { data: content, isLoading: isContentLoading } = useQuery({
    queryKey: ["/api/contents", id],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/contents/${id}`);
        return response;
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch content",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!id,
  });

  // Fetch classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/classes");
      return response;
    },
  });

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subjects");
      return response;
    },
  });

  // Update content mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Updating content with data:", data);
      const response = await apiRequest("PATCH", `/api/contents/${id}`, data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Content updated",
        description: "The content has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      
      // Close the dialog by sending a message to the parent window
      if (window.parent) {
        window.parent.postMessage({ type: "CONTENT_UPDATED" }, "*");
      }
      
      // If this is not in an iframe, navigate back
      if (window.self === window.top) {
        const redirectPath = user?.role === "admin" ? "/admin/content" : "/teacher/content";
        navigate(redirectPath);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update content",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isContentLoading && content) {
      setIsLoading(false);
    }
  }, [isContentLoading, content]);

  const handleSubmit = async (formData: any) => {
    try {
      await updateMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Error updating content:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <ContentForm
        initialData={content}
        classes={classes}
        subjects={subjects}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        submitButtonText="Update Content"
      />
    </div>
  );
}
