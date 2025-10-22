import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QuizForm } from "@/components/quiz/quiz-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileText, Home, Loader2 } from "lucide-react";

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

export default function QuizEditPage() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch quiz data
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: [`/api/quizzes/${id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quizzes/${id}`);
      const data = await res.json();
      console.log("Fetched quiz data:", data);
      console.log("Due date from API:", data.dueDate);
      return data;
    },
    enabled: !!id,
  });

  // Fetch classes for dropdown
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/classes");
      return await res.json();
    },
  });

  // Fetch subjects for dropdown
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/subjects");
      return await res.json();
    },
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Form data:", data);

      // Create a clean update object with all fields
      const updateData = {
        title: data.title,
        description: data.description,
        classId: Number(data.classId), // Keep as is, server will handle conversion
        subjectId: Number(data.subjectId), // Keep as is, server will handle conversion
        status: data.status,
      };

      // Handle the due date separately to ensure proper format
      if (data.dueDate && data.dueDate.trim() !== "") {
        try {
          // Try to create a valid date object to ensure it's properly formatted
          const dateObj = new Date(data.dueDate);
          if (!isNaN(dateObj.getTime())) {
            // If valid, use the ISO string format which is more reliable
            updateData.dueDate = dateObj.toISOString();
            console.log("Due date formatted as ISO string:", updateData.dueDate);
          } else {
            // If not a valid date, use the original string
            updateData.dueDate = data.dueDate;
            console.log("Due date kept as original string:", data.dueDate);
          }
        } catch (error) {
          // If there's an error parsing, use the original string
          updateData.dueDate = data.dueDate;
          console.error("Error parsing due date:", error);
          console.log("Due date kept as original string:", data.dueDate);
        }
      } else {
        // Explicitly set to null if empty
        updateData.dueDate = null;
        console.log("Due date set to null");
      }

      console.log("Final update data:", updateData);

      // First update the content
      const contentRes = await apiRequest("PATCH", `/api/contents/${quiz.contentId}`, updateData);

      if (!contentRes.ok) {
        throw new Error("Failed to update quiz content");
      }

      // Log the data being sent to the server
      console.log("Sending quiz update data:", {
        timeLimit: Number(data.timeLimit),
        passingScore: Number(data.passingScore),
        dueDate: data.dueDate,
      });

      // Then update the quiz with questions
      const quizRes = await apiRequest("PATCH", `/api/quizzes/${id}`, {
        timeLimit: Number(data.timeLimit),
        passingScore: Number(data.passingScore),
        dueDate: data.dueDate,
        questions: data.questions, // Include questions data for updating
      });

      if (!quizRes.ok) {
        throw new Error("Failed to update quiz");
      }

      // Update questions
      // This would require additional API endpoints for updating questions
      // For now, we'll just return the updated quiz
      return await quizRes.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quiz updated successfully",
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });

      // Refetch the quiz data to show updated values
      queryClient.refetchQueries({ queryKey: [`/api/quizzes/${id}`] });

      // Don't redirect - stay on the page to see the updated values
      // setLocation("/admin/quizzes");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quiz",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    console.log("Form submission data:", data);
    console.log("Due date from form:", data.dueDate);

    // Format the data before submitting
    const formattedData = {
      ...data,
      // Ensure due date is properly formatted
      dueDate: data.dueDate && data.dueDate.trim() !== "" ? data.dueDate : null
    };

    console.log("Formatted submission data:", formattedData);

    // Validate the data before submitting
    if (formattedData.classId && formattedData.subjectId) {
      updateQuizMutation.mutate(formattedData);
    } else {
      toast({
        title: "Validation Error",
        description: "Please select a class and subject before submitting",
        variant: "destructive",
      });
    }
  };

  // Prepare form default values from quiz data
  const getDefaultValues = () => {
    if (!quiz) return null;

    // Format the due date for the datetime-local input if it exists
    let formattedDueDate = "";
    if (quiz.dueDate) {
      try {
        // Handle different date formats
        let date;
        if (typeof quiz.dueDate === 'string') {
          date = new Date(quiz.dueDate);
        } else if (quiz.dueDate instanceof Date) {
          date = quiz.dueDate;
        } else {
          console.warn("Unexpected due date format:", quiz.dueDate);
          date = new Date(quiz.dueDate);
        }

        // Check if date is valid
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DDTHH:MM for datetime-local input
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');

          formattedDueDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log("Formatted due date for form:", formattedDueDate);
        } else {
          console.warn("Invalid date:", quiz.dueDate);
        }
      } catch (error) {
        console.error("Error formatting date:", error);
      }
    }

    // Format questions to match the form structure
    const formattedQuestions = quiz.questions.map(q => {
      // Make sure options is an array of objects with isCorrect property
      const normalizedOptions = Array.isArray(q.options)
        ? q.options.map(opt => {
            if (typeof opt === 'string') {
              return { text: opt, isCorrect: false };
            }
            return opt;
          })
        : [];

      // Find the index of the correct option
      const correctIndex = normalizedOptions.findIndex((opt: any) => opt.isCorrect === true);

      // Log for debugging
      console.log("Question options:", normalizedOptions);
      console.log("Correct option index:", correctIndex);

      return {
        text: q.text,
        options: normalizedOptions.map((opt: any) => opt.text || opt),
        // Ensure we have a valid index, default to "0" if no correct option found
        correctAnswer: correctIndex >= 0 ? correctIndex.toString() : "0",
        points: q.points?.toString() || "1",
      };
    });

    // Log the quiz data for debugging
    console.log("Quiz data:", quiz);
    console.log("Class ID type:", typeof quiz.classId, "value:", quiz.classId);
    console.log("Subject ID type:", typeof quiz.subjectId, "value:", quiz.subjectId);
    console.log("Time limit:", typeof quiz.timeLimit, "value:", quiz.timeLimit);
    console.log("Passing score:", typeof quiz.passingScore, "value:", quiz.passingScore);

    // Ensure class and subject IDs are strings
    const classId = quiz.classId !== null && quiz.classId !== undefined
      ? quiz.classId.toString()
      : "";
    const subjectId = quiz.subjectId !== null && quiz.subjectId !== undefined
      ? quiz.subjectId.toString()
      : "";

    console.log("Formatted Class ID:", classId);
    console.log("Formatted Subject ID:", subjectId);

    return {
      title: quiz.title || "",
      description: quiz.description || "",
      classId: classId,
      subjectId: subjectId,
      timeLimit: quiz.timeLimit?.toString() || "30",
      passingScore: quiz.passingScore?.toString() || "60",
      totalPoints: quiz.totalPoints?.toString() || "0",
      status: quiz.status || "draft",
      dueDate: formattedDueDate,
      questions: formattedQuestions,
    };
  };

  const isLoading = isLoadingQuiz || isLoadingClasses || isLoadingSubjects;
  const defaultValues = getDefaultValues();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 space-y-6 p-6 md:p-8 md:ml-64">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/quizzes">
                Quizzes
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/quiz/edit/${id}`}>
                <FileText className="h-4 w-4 mr-1" />
                Edit Quiz
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight">Edit Quiz</h1>
        <p className="text-muted-foreground mb-6">
          Update quiz details and questions
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !quiz ? (
          <div className="text-center p-12">
            <p className="text-muted-foreground">Quiz not found</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quiz Details & Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {defaultValues && (
                <QuizForm
                  onSubmit={handleSubmit}
                  classes={classes}
                  subjects={subjects}
                  isPending={updateQuizMutation.isPending}
                  defaultValues={defaultValues}
                  isEditing={true}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
