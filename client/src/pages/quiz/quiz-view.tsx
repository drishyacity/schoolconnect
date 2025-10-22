import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Clock, HelpCircle, Star, CalendarClock, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function QuizViewPage() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch quiz data
  const { data: quiz, isLoading } = useQuery({
    queryKey: [`/api/quizzes/${id}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/quizzes/${id}`);
      const data = await response.json();
      console.log("Fetched quiz data:", data);

      // Make sure questions have options array
      if (data && data.questions) {
        data.questions = data.questions.map((q: any) => {
          if (!q.options || !Array.isArray(q.options)) {
            console.log("Question without options array:", q);
            // Try to parse options if they're stored as a string
            if (typeof q.options === 'string') {
              try {
                q.options = JSON.parse(q.options);
                console.log("Parsed options from string:", q.options);
              } catch (e) {
                console.error("Failed to parse options string:", e);
                q.options = [];
              }
            } else {
              q.options = [];
            }
          }
          return q;
        });
      }

      return data;
    },
    retry: false,
  });

  // Navigation between questions
  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min((quiz?.questions?.length || 1) - 1, prev + 1));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  // Quiz not found or has no questions
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {!quiz ? "Quiz Not Found" : "Quiz Has No Questions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  {!quiz
                    ? "The quiz you're looking for doesn't exist or you don't have permission to view it."
                    : "This quiz doesn't have any questions yet. Please add questions before previewing."}
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => navigate(user?.role === "admin" ? "/admin/quizzes" : "/teacher/content-management")}>
                  Back to Dashboard
                </Button>
                {quiz && (
                  <Button
                    className="ml-2"
                    onClick={() => navigate(`/quiz/edit/${quiz.id}`)}
                  >
                    Edit Quiz
                  </Button>
                )}
              </CardFooter>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // Get status badge for quiz
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Draft</Badge>;

    switch (status.toLowerCase()) {
      case 'published':
        return <Badge className="bg-green-600">Published</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  console.log("Current question:", currentQuestion);
  console.log("Question options:", currentQuestion?.options);

  const questionProgress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="outline"
                size="sm"
                className="mr-4"
                onClick={() => navigate(user?.role === "admin" ? "/admin/quizzes" : "/teacher/content")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Quiz Preview</h1>
              <div className="ml-auto">
                {getStatusBadge(quiz.status)}
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{quiz.title}</CardTitle>
                {quiz.description && (
                  <p className="mt-2 text-neutral-600">{quiz.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="text-sm text-neutral-500">Total Questions</p>
                      <p className="font-medium">{quiz.questions.length}</p>
                    </div>
                  </div>

                  <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="text-sm text-neutral-500">Time Limit</p>
                      <p className="font-medium">{quiz.timeLimit ? `${quiz.timeLimit} Minutes` : 'No time limit'}</p>
                    </div>
                  </div>

                  <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                    <Star className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="text-sm text-neutral-500">Total Points</p>
                      <p className="font-medium">{quiz.totalPoints}</p>
                    </div>
                  </div>

                  <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                    <CalendarClock className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="text-sm text-neutral-500">Due Date</p>
                      <p className="font-medium">
                        {quiz.dueDate ? formatDate(new Date(quiz.dueDate)) : 'No due date'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader className="border-b border-neutral-200 p-4">
                <div className="flex items-center">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold mr-3">
                    {currentQuestionIndex + 1}
                  </span>
                  <h3 className="font-semibold">Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <p className="text-lg mb-4">{currentQuestion.text}</p>
                </div>

                <div className="space-y-3">
                  {/* Create dummy options if none exist */}
                  {currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
                    // Real options
                    currentQuestion.options.map((option: any, index: number) => (
                      <div key={index} className={`border rounded-lg p-3 ${option.isCorrect ? 'border-green-500 bg-green-50' : 'border-neutral-200'}`}>
                        <div className="flex items-center">
                          <div className={`h-4 w-4 rounded-full mr-3 flex items-center justify-center ${option.isCorrect ? 'bg-green-500 text-white' : 'border border-neutral-300'}`}>
                            {option.isCorrect && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span>{option.text}</span>
                          {option.isCorrect && (
                            <Badge className="ml-auto bg-green-500">Correct Answer</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Dummy options for preview
                    <>
                      <div className="border rounded-lg p-3 border-green-500 bg-green-50">
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full mr-3 flex items-center justify-center bg-green-500 text-white">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                          <span>Option A (Sample)</span>
                          <Badge className="ml-auto bg-green-500">Correct Answer</Badge>
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 border-neutral-200">
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full mr-3 flex items-center justify-center border border-neutral-300"></div>
                          <span>Option B (Sample)</span>
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 border-neutral-200">
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full mr-3 flex items-center justify-center border border-neutral-300"></div>
                          <span>Option C (Sample)</span>
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 border-neutral-200">
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full mr-3 flex items-center justify-center border border-neutral-300"></div>
                          <span>Option D (Sample)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-neutral-200 p-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous Question
                </Button>
                <div className="flex items-center space-x-2">
                  {quiz.questions.length <= 10 ? (
                    quiz.questions.map((_, index) => (
                      <Button
                        key={index}
                        variant={currentQuestionIndex === index ? "default" : "outline"}
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                      </Button>
                    ))
                  ) : (
                    <>
                      {Array.from({ length: Math.min(3, quiz.questions.length) }).map((_, index) => (
                        <Button
                          key={index}
                          variant={currentQuestionIndex === index ? "default" : "outline"}
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => setCurrentQuestionIndex(index)}
                        >
                          {index + 1}
                        </Button>
                      ))}
                      {quiz.questions.length > 3 && currentQuestionIndex >= 3 && currentQuestionIndex < quiz.questions.length - 1 && (
                        <span className="text-neutral-500">...</span>
                      )}
                      {quiz.questions.length > 3 && (
                        <Button
                          variant={currentQuestionIndex === quiz.questions.length - 1 ? "default" : "outline"}
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => setCurrentQuestionIndex(quiz.questions.length - 1)}
                        >
                          {quiz.questions.length}
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <Button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === quiz.questions.length - 1}
                >
                  Next Question
                </Button>
              </CardFooter>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => navigate(user?.role === "admin" ? "/admin/quizzes" : "/teacher/content")}
              >
                Back to Content
              </Button>
              <Button
                onClick={() => navigate(`/quiz/edit/${quiz.id}`)}
              >
                Edit Quiz
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
