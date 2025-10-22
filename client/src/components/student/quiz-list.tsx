import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export function QuizList() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  // Get all quizzes for this student's classes
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["/api/contents", "quiz"],
    queryFn: async () => {
      const res = await fetch("/api/contents?type=quiz");
      if (!res.ok) throw new Error("Failed to fetch quizzes");

      const data = await res.json();

      // Get student's quiz attempts
      const attemptsRes = await fetch(`/api/students/${user?.id}/quiz-attempts`);
      if (attemptsRes.ok) {
        const attempts = await attemptsRes.json();

        // Merge attempts with quizzes
        return data.map((quiz: any) => {
          const attempt = attempts.find((a: any) => a.quizId === quiz.id);
          return {
            ...quiz,
            attempt,
          };
        });
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const getQuizStatus = (quiz: any) => {
    if (!quiz.attempt) return "pending";
    if (quiz.attempt?.completedAt) return "completed";
    return "in_progress";
  };

  const handleStartQuiz = (quizId: number) => {
    setLocation(`/quiz/${quizId}`);
  };

  const handleViewResults = (quiz: any) => {
    if (quiz.attempt && quiz.attempt.completedAt) {
      // Navigate to results view with the attempt ID
      setLocation(`/quiz/${quiz.id}?showResults=true&attemptId=${quiz.attempt.id}&mode=results`);
    } else {
      // If no completed attempt, start the quiz
      handleStartQuiz(quiz.id);
    }
  };

  if (isLoading) {
    return <div>Loading quizzes...</div>;
  }

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-4">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No quizzes available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are currently no quizzes assigned to you.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Quizzes</CardTitle>
          <CardDescription>
            View and take quizzes assigned to your classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz: any) => {
                const status = getQuizStatus(quiz);

                return (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell>{quiz.class?.name || "All Classes"}</TableCell>
                    <TableCell>
                      {quiz.dueDate ? (
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                          {formatDate(new Date(quiz.dueDate))}
                        </div>
                      ) : (
                        "No deadline"
                      )}
                    </TableCell>
                    <TableCell>
                      {status === "completed" ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                      ) : status === "in_progress" ? (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Started</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={status === "completed" ? "outline" : "default"}
                        size="sm"
                        onClick={() => status === "completed" ? handleViewResults(quiz) : handleStartQuiz(quiz.id)}
                      >
                        {status === "completed" ? "View Results" : "Start Quiz"}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}