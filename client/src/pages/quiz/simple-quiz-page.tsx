import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Clock, HelpCircle, Star, CalendarClock, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function SimpleQuizPage() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // State for the quiz
  const [quizStarted, setQuizStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});

  // Fetch quiz data
  const { data: quiz, isLoading, isError } = useQuery({
    queryKey: [`/api/quizzes/${id}`],
    queryFn: async () => {
      try {
        console.log(`Fetching quiz with ID: ${id}`);
        const response = await fetch(`http://localhost:5000/api/quizzes/${id}`, {
          method: 'GET',
          headers: {
            "Accept": "application/json"
          },
          credentials: "include"
        });

        if (!response.ok) {
          console.error(`Failed to fetch quiz: ${response.status}`);
          throw new Error(`Failed to fetch quiz: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received quiz data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching quiz:", error);
        throw error;
      }
    },
    retry: false,
  });

  // Start quiz attempt
  const startQuizMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting quiz with ID:", id);

      // Create a new attempt
      const response = await apiRequest("POST", "/api/quiz-attempts", {
        quizId: parseInt(id),
        answers: {},
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to start quiz: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("Quiz attempt created:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Quiz attempt created:", data);
      setAttemptId(data.id);
      setQuizStarted(true);

      toast({
        title: "Quiz Started",
        description: "Good luck! Answer all questions and submit when you're done.",
      });
    },
    onError: (error: Error) => {
      console.error("Error starting quiz:", error);
      toast({
        title: "Failed to start quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle answer selection
  const handleAnswerSelect = (questionId: number, answer: { selectedOptionId: string }) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answer,
    });
  };

  // Start the quiz
  const handleStartQuiz = () => {
    console.log("handleStartQuiz called");
    startQuizMutation.mutate();
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

  // Quiz not found or error
  if (isError || !quiz) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Not Available</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  This quiz is not available. It may have been deleted, unpublished, or you don't have permission to view it.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => navigate("/quiz")}>Back to Quizzes</Button>
              </CardFooter>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // Quiz start page
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>{quiz.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{quiz.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      <span>Questions: {quiz.questions?.length || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Time Limit: {quiz.timeLimit ? `${quiz.timeLimit} minutes` : 'No limit'}</span>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-2" />
                      <span>Total Points: {quiz.totalPoints}</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarClock className="h-4 w-4 mr-2" />
                      <span>Passing Score: {quiz.passingScore}%</span>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
                    <p className="text-yellow-800">
                      <strong>Note:</strong> Once you start the quiz, you can only submit it once. Make sure you're ready before starting.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => navigate("/quiz")}>
                    Back to Quizzes
                  </Button>
                  <Button onClick={handleStartQuiz}>Start Quiz</Button>
                </CardFooter>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Quiz started - show the actual quiz questions
  // Make sure we have questions to display
  if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>No Questions Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>This quiz doesn't have any questions yet.</p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => navigate("/quiz")}>Back to Quizzes</Button>
                </CardFooter>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Get the current question
  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{quiz.title}</CardTitle>
                  <div className="text-sm text-neutral-500">
                    Question {currentQuestionIndex + 1} of {quiz.questions.length}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current question */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {currentQuestion.text}
                  </h3>
                  <RadioGroup
                    value={selectedAnswers[currentQuestion.id]?.selectedOptionId || ""}
                    onValueChange={(value) => {
                      handleAnswerSelect(currentQuestion.id, { selectedOptionId: value });
                    }}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 border p-3 rounded-md">
                        <RadioGroupItem value={String(index + 1)} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Question navigation */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {quiz.questions.map((_, index) => (
                    <Button
                      key={index}
                      variant={index === currentQuestionIndex ? "default" : selectedAnswers[quiz.questions[index].id] ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={selectedAnswers[quiz.questions[index].id] ? "border-primary" : ""}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="mr-2"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                    disabled={currentQuestionIndex === quiz.questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Progress Saved",
                        description: "Your quiz progress has been saved.",
                      });
                    }}
                    className="mr-2"
                  >
                    Save Progress
                  </Button>
                  <Button onClick={() => {
                    toast({
                      title: "Quiz Submitted",
                      description: "Your quiz has been submitted successfully.",
                    });
                    navigate("/quiz");
                  }}>
                    Submit Quiz
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
