import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { HelpCircle, Clock, Calendar, Award, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { formatDateShort, formatDate } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StudentQuizAttempts() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  // Fetch all quiz attempts for the student
  const { data: attempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: [`/api/students/${user?.id}/quiz-attempts`],
    queryFn: async () => {
      console.log(`Fetching attempts for student ${user?.id}`);
      const response = await fetch(`http://localhost:5000/api/students/${user?.id}/quiz-attempts`, {
        method: 'GET',
        headers: { "Accept": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch attempts: ${response.status}`);
      }

      const data = await response.json();
      console.log("Student attempts:", data);

      // Get all completed attempts
      const completedAttempts = data.filter(attempt => attempt.completedAt);

      console.log("Completed attempts:", completedAttempts);
      return completedAttempts;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  // Group attempts by quiz
  const attemptsByQuiz = attempts?.reduce((acc: any, attempt: any) => {
    if (!acc[attempt.quizId]) {
      acc[attempt.quizId] = [];
    }
    acc[attempt.quizId].push(attempt);
    return acc;
  }, {});

  // Fetch quiz details for each quiz
  const { data: quizzes, isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ["/api/quizzes"],
    queryFn: async () => {
      console.log("Fetching all quizzes");
      const response = await fetch(`http://localhost:5000/api/quizzes`, {
        method: 'GET',
        headers: { "Accept": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quizzes: ${response.status}`);
      }

      const data = await response.json();
      console.log("All quizzes:", data);
      return data;
    },
    enabled: !!attempts,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  // Loading state
  const isLoading = isLoadingAttempts || isLoadingQuizzes;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />

      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Quiz Attempts</h1>
            <p className="text-neutral-600">
              View your quiz attempts and results.
            </p>
          </div>

          {/* Attempts List */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
              </div>
            ) : attempts?.length > 0 ? (
              Object.entries(attemptsByQuiz).map(([quizId, quizAttempts]: [string, any[]]) => {
                // Find the quiz details
                const quiz = quizzes?.find((q: any) => q.id === parseInt(quizId));
                if (!quiz) {
                  console.error(`Quiz with ID ${quizId} not found in quizzes list`);
                  return null;
                }

                // Debug quiz IDs
                console.log(`Quiz ${quizId} details:`, {
                  quizId: quiz.id,
                  contentId: quiz.contentId,
                  title: quiz.title
                });

                // Sort attempts by date (newest first)
                const sortedAttempts = [...quizAttempts].sort((a, b) =>
                  new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                );

                // Get the latest attempt
                const latestAttempt = sortedAttempts[0];

                // Skip if there's no attempt data
                if (!latestAttempt) return null;

                const isCompleted = !!latestAttempt.completedAt;
                const score = latestAttempt.score || 0;
                const percentage = quiz.totalPoints > 0 ? (score / quiz.totalPoints) * 100 : 0;
                const isPassed = percentage >= (quiz.passingScore || 0);

                return (
                  <Card key={quizId} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <Badge variant={isCompleted ? (isPassed ? "success" : "destructive") : "outline"}>
                          {isCompleted ? (isPassed ? "Passed" : "Failed") : "In Progress"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {isCompleted && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">Score: {score} / {quiz.totalPoints}</span>
                            <span className="font-semibold">{Math.round(percentage)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Started: {formatDate(new Date(latestAttempt.startedAt))}</span>
                        </div>

                        {latestAttempt.completedAt && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Completed: {formatDate(new Date(latestAttempt.completedAt))}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Link href={`/quiz/${latestAttempt.quizId}${isCompleted ? `?showResults=true&attemptId=${latestAttempt.id}&mode=results` : '?mode=continue'}`}>
                          <Button size="sm">
                            {isCompleted ? "View Results" : "Continue Quiz"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                      {/* Debug info */}
                      <div className="hidden">
                        Quiz ID: {latestAttempt.quizId},
                        Attempt ID: {latestAttempt.id},
                        Completed: {isCompleted ? "Yes" : "No"}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-1">No quiz attempts yet</h3>
                <p className="text-neutral-500 mb-4">Take a quiz to see your results here</p>
                <Button onClick={() => navigate("/quiz")}>Go to Quizzes</Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
