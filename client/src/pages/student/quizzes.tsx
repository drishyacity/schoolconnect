import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { HelpCircle, Clock, Calendar, Award, ArrowRight, CheckCircle } from "lucide-react";
import { formatDateShort } from "@/lib/utils";

export default function StudentQuizzes() {
  const { user } = useAuth();

  // Fetch quizzes with attempt status
  const { data, isLoading } = useQuery({
    queryKey: [`/api/students/${user?.id}/quizzes-with-status`],
    queryFn: async () => {
      console.log(`Fetching quizzes with status for student ${user?.id}`);
      const res = await fetch(`http://localhost:5000/api/students/${user?.id}/quizzes-with-status`, {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch quizzes with status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Received quizzes with status:", data);

      // Filter out deleted quizzes and only show published/active quizzes
      const filteredData = data.filter((quiz: any) =>
        (quiz.status === "published" || quiz.status === "active") &&
        !quiz.deleted
      );

      console.log("Filtered quizzes with status:", filteredData);
      return filteredData;
    },
    enabled: !!user?.id,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />

      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Quizzes</h1>
            <p className="text-neutral-600">
              Take quizzes to test your knowledge and track your progress.
            </p>
          </div>

          {/* Quizzes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
              </div>
            ) : data?.length > 0 ? (
              data.map((quiz: any) => {
                const uploadDate = new Date(quiz.createdAt);
                const { month, day } = formatDateShort(uploadDate);

                // Debug the quiz object
                console.log(`Quiz ${quiz.id}:`, quiz);

                // Get attempt status from the API response
                const hasAttempted = quiz.attemptStatus === "in_progress" || quiz.attemptStatus === "completed";
                const isCompleted = quiz.attemptStatus === "completed";

                console.log(`Quiz ${quiz.id} attemptStatus:`, quiz.attemptStatus);

                return (
                  <Card key={quiz.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-primary/10 p-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 text-primary mr-2" />
                        <span className="font-medium">{quiz.subject?.name || "General"}</span>
                      </div>
                      <Badge variant={isCompleted ? "success" : "outline"}>
                        {isCompleted ? "Completed" : "Available"}
                      </Badge>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                        {quiz.description || "No description available"}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-4">
                        {quiz.timeLimit && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{quiz.timeLimit} min</span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Uploaded: {month} {day}</span>
                        </div>

                        {quiz.passingScore && (
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-1" />
                            <span>Pass: {quiz.passingScore}%</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-neutral-500">
                          {quiz.class?.name ? `Class ${quiz.class.name}` : "All Classes"}
                        </div>

                        {!quiz.quizId ? (
                          <div className="text-red-500 text-sm">
                            Quiz configuration issue. Please contact support.
                          </div>
                        ) : isCompleted ? (
                          <Link href={`/quiz/${quiz.quizId}?showResults=true&attemptId=${quiz.attemptId}&mode=results`}>
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              View Results
                            </Button>
                          </Link>
                        ) : hasAttempted ? (
                          <Link href={`/quiz/${quiz.quizId}?mode=continue`}>
                            <Button size="sm" variant="default">
                              Continue Quiz
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/quiz/${quiz.quizId}?mode=start`}>
                            <Button size="sm" variant="default">
                              Start Quiz
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                        {/* Debug info */}
                        <div className="hidden">
                          Content ID: {quiz.id},
                          Quiz ID: {quiz.quizId},
                          Attempt Status: {quiz.attemptStatus},
                          Attempted: {hasAttempted ? "Yes" : "No"},
                          Completed: {isCompleted ? "Yes" : "No"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <HelpCircle className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-1">No quizzes available</h3>
                <p className="text-neutral-500">Check back later for new quizzes</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
