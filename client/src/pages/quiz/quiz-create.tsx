import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { QuizForm } from "@/components/quiz/quiz-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileText, Home } from "lucide-react";

interface Class {
  id: number;
  name: string;
  description: string;
  grade: string;
}

interface Subject {
  id: number;
  name: string;
  description: string;
}

export default function QuizCreatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch all classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/classes");
      const data = await response.json();
      return data as Class[];
    },
  });

  // Fetch all subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subjects");
      const data = await response.json();
      return data as Subject[];
    },
  });

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      classId: number;
      subjectId: number;
      timeLimit: number;
      passingPercentage: number;
      status: "draft" | "published";
      questions: {
        id: number;
        text: string;
        options: {
          id: number;
          text: string;
          isCorrect: boolean;
        }[];
        points: number;
      }[];
    }) => {
      const response = await apiRequest("POST", "/api/quizzes", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create quiz");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quiz created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setLocation("/teacher/content");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: {
    title: string;
    description: string;
    classId: number;
    subjectId: number;
    timeLimit: number;
    passingPercentage: number;
    status: "draft" | "published";
    questions: {
      id: number;
      text: string;
      options: {
        id: number;
        text: string;
        isCorrect: boolean;
      }[];
      points: number;
    }[];
  }) => {
    createQuizMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 space-y-6 p-6 md:p-8 md:ml-64">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/teacher">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/quiz/create">
                <FileText className="h-4 w-4 mr-1" />
                Create Quiz
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight">Create Quiz</h1>
        <p className="text-muted-foreground mb-6">
          Create a quiz for your students with multiple-choice questions
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Details & Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizForm
              onSubmit={handleSubmit}
              classes={classes}
              subjects={subjects}
              isPending={createQuizMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}