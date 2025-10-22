import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Clock, HelpCircle, Star, CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function FixedQuizPage() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State for the quiz
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch quiz data
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: [`/api/quizzes/${id}`],
    queryFn: async () => {
      console.log(`Fetching quiz with ID: ${id}`);
      const response = await fetch(`http://localhost:5000/api/quizzes/${id}`, {
        method: 'GET',
        headers: { "Accept": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quiz: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received quiz data:", data);
      return data;
    },
    retry: false,
  });

  // Fetch previous attempts for this specific quiz only
  const { data: previousAttempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: [`/api/students/${user?.id}/quiz-attempts`, id],
    queryFn: async () => {
      console.log(`Fetching attempts for student ${user?.id} and quiz ${id}`);

      // Get attempts for this specific quiz only
      const response = await fetch(`http://localhost:5000/api/students/${user?.id}/quiz-attempts?quizId=${id}`, {
        method: 'GET',
        headers: { "Accept": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        return []; // Return empty array if no attempts found
      }

      const data = await response.json();
      console.log("Previous attempts for this quiz:", data);

      // Filter to make sure we only get attempts for this specific quiz
      const filteredAttempts = data.filter(attempt =>
        attempt.quizId === parseInt(id) || attempt.contentId === parseInt(id)
      );

      console.log("Filtered attempts for this quiz:", filteredAttempts);
      return filteredAttempts;
    },
    enabled: !!user?.id,
  });

  // Check if there's a completed attempt
  const completedAttempt = previousAttempts?.find(attempt => attempt.completedAt !== null);
  const hasCompletedQuiz = !!completedAttempt;

  console.log("Quiz ID:", id);
  console.log("Previous attempts:", previousAttempts);
  console.log("Completed attempt:", completedAttempt);
  console.log("Has completed quiz:", hasCompletedQuiz);

  // Fetch the completed attempt details if available
  const { data: attemptDetails } = useQuery({
    queryKey: [`/api/quiz-attempts/${completedAttempt?.id}`],
    queryFn: async () => {
      console.log(`Fetching details for completed attempt ${completedAttempt?.id}`);
      const response = await fetch(`http://localhost:5000/api/quiz-attempts/${completedAttempt?.id}`, {
        method: 'GET',
        headers: { "Accept": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      console.log("Completed attempt details:", data);

      // Make sure the attempt has answers and is for this quiz
      if (!data.answers || Object.keys(data.answers).length === 0) {
        console.log("No answers found in attempt, returning null");
        return null;
      }

      // Make sure this attempt is for this quiz
      if (data.quizId !== parseInt(id) && data.contentId !== parseInt(id)) {
        console.log("Attempt is not for this quiz, returning null");
        return null;
      }

      return data;
    },
    enabled: !!completedAttempt?.id,
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

      // Add back button handler
      setupBackButtonHandler(data.id);

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

  // Submit quiz
  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("No active quiz attempt");

      console.log(`Submitting quiz attempt ${attemptId} with answers:`, selectedAnswers);

      const response = await apiRequest("PUT", `/api/quiz-attempts/${attemptId}`, {
        answers: selectedAnswers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit quiz: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("Quiz submitted successfully:", data);
      return data;
    },
    onSuccess: (data) => {
      setQuizCompleted(true);

      // Remove back button handler
      window.onpopstate = null;
      window.onbeforeunload = null;

      toast({
        title: "Quiz Submitted",
        description: `Your score: ${data.score} out of ${quiz?.totalPoints}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/student"] });
    },
    onError: (error: Error) => {
      console.error("Error submitting quiz:", error);
      toast({
        title: "Failed to submit quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save progress
  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("No active quiz attempt");

      console.log(`Saving progress for quiz attempt ${attemptId} with answers:`, selectedAnswers);

      const response = await apiRequest("PATCH", `/api/quiz-attempts/${attemptId}/save-progress`, {
        answers: selectedAnswers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save progress: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("Progress saved successfully:", data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Progress Saved",
        description: "Your quiz progress has been saved. You can continue now or resume later, but you can only submit once.",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error("Error saving progress:", error);
      toast({
        title: "Failed to save progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle answer selection
  const handleAnswerSelect = (value: string) => {
    const currentQuestion = quiz.questions[currentQuestionIndex];
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion.id]: { selectedOptionId: value },
    });
  };

  // Get the selected answer for the current question
  const getSelectedAnswerForCurrentQuestion = () => {
    if (!quiz?.questions) return "";
    const currentQuestion = quiz.questions[currentQuestionIndex];
    return selectedAnswers[currentQuestion.id]?.selectedOptionId || "";
  };

  // Navigation functions
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle save progress
  const handleSaveProgress = () => {
    saveProgressMutation.mutate();
  };

  // Handle submit quiz
  const handleSubmitQuiz = () => {
    if (window.confirm("Are you sure you want to submit this quiz? You cannot change your answers after submission.")) {
      submitQuizMutation.mutate();
    }
  };

  // Setup back button handler
  const setupBackButtonHandler = (attemptId: number) => {
    console.log("Setting up back button handler for attempt ID:", attemptId);

    // Add a handler for when the user tries to navigate away
    window.onpopstate = (e) => {
      console.log("Back button pressed");

      // Show a confirmation dialog
      if (window.confirm("Are you sure you want to leave? Your quiz will be automatically submitted with your current answers. You cannot attempt this quiz again.")) {
        // If confirmed, auto-submit the quiz
        submitQuizWithCurrentAnswers(attemptId);
      } else {
        // If not confirmed, stay on the page
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    // Also add a handler for page refresh/close
    window.onbeforeunload = (e) => {
      console.log("Page unload detected");

      // Chrome requires returnValue to be set
      e.returnValue = "Are you sure you want to leave? Your quiz will be automatically submitted with your current answers. You cannot attempt this quiz again.";

      // This message might not be displayed in modern browsers for security reasons,
      // but the confirmation dialog will still appear
      return e.returnValue;
    };

    // Push a new state to the history stack so we can catch the back button
    window.history.pushState(null, '', window.location.pathname);
    console.log("Pushed state to history stack");
  };

  // Submit quiz with current answers
  const submitQuizWithCurrentAnswers = (attemptId: number) => {
    console.log("Auto-submitting quiz on back button for attempt ID:", attemptId);

    // First, get the current attempt to get any saved answers
    fetch(`http://localhost:5000/api/quiz-attempts/${attemptId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    })
    .then(response => response.json())
    .then(attemptData => {
      console.log("Retrieved current attempt data:", attemptData);

      // Merge saved answers with current answers
      const savedAnswers = attemptData.answers || {};
      const mergedAnswers = { ...savedAnswers, ...selectedAnswers };

      console.log("Merged answers for submission:", mergedAnswers);

      // Submit the quiz with merged answers
      return fetch(`http://localhost:5000/api/quiz-attempts/${attemptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          answers: mergedAnswers,
          autoSubmit: true,
          completed: true
        })
      });
    })
    .then(response => {
      if (response && response.ok) {
        console.log("Quiz auto-submitted on back button successfully");

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/students/${user?.id}/quiz-attempts`] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/student"] });
        queryClient.invalidateQueries({ queryKey: ["/api/contents"] });

        // Navigate to the student dashboard
        window.location.href = "/student";
      } else {
        console.error("Failed to auto-submit quiz:", response?.status);
      }
    })
    .catch(error => {
      console.error("Error auto-submitting quiz:", error);
    });
  };

  // Start the quiz
  const handleStartQuiz = () => {
    console.log("handleStartQuiz called");
    startQuizMutation.mutate();
  };

  // When the quiz is started, set up the back button handler
  useEffect(() => {
    if (quizStarted && attemptId) {
      console.log("Quiz started, setting up back button handler for attempt ID:", attemptId);
      setupBackButtonHandler(attemptId);
    }
  }, [quizStarted, attemptId]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  const isLoading = isLoadingQuiz || isLoadingAttempts;
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
  if (!quiz) {
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

  // Quiz start page or completed quiz view
  if (!quizStarted) {
    // If the user has already completed this quiz, show the completed quiz view
    if (hasCompletedQuiz && completedAttempt && completedAttempt.answers) {
      return (
        <div className="min-h-screen bg-neutral-50">
          <Sidebar />
          <div className="md:ml-64 flex flex-col min-h-screen">
            <main className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Quiz Results: {quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Your Score</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span>{completedAttempt.score} out of {quiz.totalPoints} points</span>
                        <span className="text-lg font-semibold">
                          {Math.round((completedAttempt.score / quiz.totalPoints) * 100)}%
                        </span>
                      </div>
                      <Progress value={(completedAttempt.score / quiz.totalPoints) * 100} className="h-2" />
                    </div>

                    {/* Show questions with user's answers and correct answers */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Your Answers</h3>
                      {quiz.questions.map((question, index) => {
                        // Get the user's answer for this question
                        const userAnswer = completedAttempt.answers?.[question.id];
                        const userSelectedOptionId = userAnswer?.selectedOptionId;

                        // Find the correct option
                        // First, find the index of the correct option in the array (0-based)
                        const correctOptionIndex = question.options.findIndex(opt =>
                          opt.isCorrect === true ||
                          opt.isCorrect === 'true' ||
                          opt.isCorrect === 1 ||
                          opt.isCorrect === '1'
                        );

                        // Convert to 1-based index to match the client-side IDs
                        const correctOptionId = correctOptionIndex !== -1 ? String(correctOptionIndex + 1) : null;
                        const correctOption = question.options[correctOptionIndex];

                        // Check if the user's answer is correct
                        const isCorrect = userSelectedOptionId === correctOptionId;

                        return (
                          <div key={question.id} className="border rounded-lg p-4">
                            <div className="flex justify-between mb-2">
                              <h4 className="font-medium">Question {index + 1}</h4>
                              <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                            <p className="mb-4">{question.text}</p>
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => {
                                // The option ID is the 1-based index
                                const optionId = String(optIndex + 1);
                                const isUserSelected = optionId === userSelectedOptionId;
                                const isCorrectOption = optionId === correctOptionId;

                                let className = "p-2 rounded border";
                                if (isUserSelected && isCorrectOption) {
                                  className += " bg-green-100 border-green-500";
                                } else if (isUserSelected && !isCorrectOption) {
                                  className += " bg-red-100 border-red-500";
                                } else if (!isUserSelected && isCorrectOption) {
                                  className += " bg-green-50 border-green-300";
                                }

                                return (
                                  <div key={optionId} className={className}>
                                    <div className="flex items-center">
                                      {isUserSelected && (
                                        <CheckCircle2 className={`h-4 w-4 mr-2 ${isCorrectOption ? 'text-green-600' : 'text-red-600'}`} />
                                      )}
                                      {!isUserSelected && isCorrectOption && (
                                        <Circle className="h-4 w-4 mr-2 text-green-600" />
                                      )}
                                      {!isUserSelected && !isCorrectOption && (
                                        <Circle className="h-4 w-4 mr-2 text-neutral-400" />
                                      )}
                                      <span>{option.text}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
                  </CardFooter>
                </Card>
              </div>
            </main>
          </div>
        </div>
      );
    }

    // Quiz start page
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

  // Quiz completed view
  if (quizCompleted && submitQuizMutation.data) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Completed: {quiz.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Your Score</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span>{submitQuizMutation.data.score} out of {quiz.totalPoints} points</span>
                      <span className="text-lg font-semibold">
                        {Math.round((submitQuizMutation.data.score / quiz.totalPoints) * 100)}%
                      </span>
                    </div>
                    <Progress value={(submitQuizMutation.data.score / quiz.totalPoints) * 100} className="h-2" />
                  </div>

                  {/* Show questions with user's answers and correct answers */}
                  <div className="space-y-4 mt-6">
                    <h3 className="font-semibold">Your Answers</h3>
                    {quiz.questions.map((question, index) => {
                      // Get the user's answer for this question
                      const userAnswer = submitQuizMutation.data?.answers?.[question.id];
                      const userSelectedOptionId = userAnswer?.selectedOptionId;

                      // Find the correct option
                      // First, find the index of the correct option in the array (0-based)
                      const correctOptionIndex = question.options.findIndex(opt =>
                        opt.isCorrect === true ||
                        opt.isCorrect === 'true' ||
                        opt.isCorrect === 1 ||
                        opt.isCorrect === '1'
                      );

                      // Convert to 1-based index to match the client-side IDs
                      const correctOptionId = correctOptionIndex !== -1 ? String(correctOptionIndex + 1) : null;
                      const correctOption = question.options[correctOptionIndex];

                      // Check if the user's answer is correct
                      const isCorrect = userSelectedOptionId === correctOptionId;

                      return (
                        <div key={question.id} className="border rounded-lg p-4">
                          <div className="flex justify-between mb-2">
                            <h4 className="font-medium">Question {index + 1}</h4>
                            <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <p className="mb-4">{question.text}</p>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => {
                              // The option ID is the 1-based index
                              const optionId = String(optIndex + 1);
                              const isUserSelected = optionId === userSelectedOptionId;
                              const isCorrectOption = optionId === correctOptionId;

                              let className = "p-2 rounded border";
                              if (isUserSelected && isCorrectOption) {
                                className += " bg-green-100 border-green-500";
                              } else if (isUserSelected && !isCorrectOption) {
                                className += " bg-red-100 border-red-500";
                              } else if (!isUserSelected && isCorrectOption) {
                                className += " bg-green-50 border-green-300";
                              }

                              return (
                                <div key={optionId} className={className}>
                                  <div className="flex items-center">
                                    {isUserSelected && (
                                      <CheckCircle2 className={`h-4 w-4 mr-2 ${isCorrectOption ? 'text-green-600' : 'text-red-600'}`} />
                                    )}
                                    {!isUserSelected && isCorrectOption && (
                                      <Circle className="h-4 w-4 mr-2 text-green-600" />
                                    )}
                                    {!isUserSelected && !isCorrectOption && (
                                      <Circle className="h-4 w-4 mr-2 text-neutral-400" />
                                    )}
                                    <span>{option.text}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
                </CardFooter>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Active quiz page
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
                {quiz.timeLimit && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-neutral-500 mb-1">
                      <span>Time Remaining</span>
                      <span>{formatTime(timeRemaining || 0)}</span>
                    </div>
                    <Progress value={((quiz.timeLimit * 60 - (timeRemaining || 0)) / (quiz.timeLimit * 60)) * 100} />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current question */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {quiz.questions[currentQuestionIndex].text}
                  </h3>
                  <RadioGroup
                    value={getSelectedAnswerForCurrentQuestion()}
                    onValueChange={(value) => handleAnswerSelect(value)}
                    className="space-y-3"
                  >
                    {quiz.questions[currentQuestionIndex].options.map((option, index) => (
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
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="mr-2"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === quiz.questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={handleSaveProgress}
                    className="mr-2"
                  >
                    Save Progress
                  </Button>
                  <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}