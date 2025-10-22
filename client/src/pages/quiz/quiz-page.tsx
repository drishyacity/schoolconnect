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

export default function QuizPage() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const showResults = urlParams.get('showResults') === 'true';
  const urlAttemptId = urlParams.get('attemptId');
  const specificAttemptId = urlAttemptId ? parseInt(urlAttemptId) : null;
  const mode = urlParams.get('mode'); // Can be 'start', 'continue', or 'results'

  // State for the quiz
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(mode === 'continue');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [directlyShowResults, setDirectlyShowResults] = useState(showResults || mode === 'results');

  // Check if the user has already attempted this quiz
  const { data: previousAttempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: [`/api/students/${user?.id}/quiz-attempts`],
    queryFn: async () => {
      try {
        console.log(`Checking previous attempts for quiz ${id} by student ${user?.id}`);
        const response = await fetch(`http://localhost:5000/api/students/${user?.id}/quiz-attempts`, {
          method: 'GET',
          headers: {
            "Accept": "application/json"
          },
          credentials: "include"
        });

        if (!response.ok) {
          console.error(`Failed to fetch previous attempts: ${response.status}`);
          return [];
        }

        const data = await response.json();
        console.log("Previous attempts:", data);

        // Filter attempts for this quiz
        const attemptsForThisQuiz = data.filter(attempt => {
          // Check if this attempt is for the current quiz
          // The quiz ID in the attempt might be the actual quiz ID, not the content ID
          return attempt.quizId === parseInt(id) || attempt.contentId === parseInt(id);
        });

        console.log(`Found ${attemptsForThisQuiz.length} previous attempts for this quiz:`, attemptsForThisQuiz);
        return attemptsForThisQuiz;
      } catch (error) {
        console.error("Error fetching previous attempts:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch quiz data
  const { data: quiz, isLoading: isLoadingQuiz, isError } = useQuery({
    queryKey: [`/api/quizzes/${id}`],
    queryFn: async () => {
      try {
        console.log(`Fetching quiz with ID: ${id}`);
        console.log(`URL parameters:`, window.location.search);
        console.log(`User:`, user);

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

        // Debug: Log the structure of the quiz data
        console.log("Quiz structure check:", {
          hasQuestions: Array.isArray(data.questions),
          questionsLength: Array.isArray(data.questions) ? data.questions.length : 0,
          firstQuestion: Array.isArray(data.questions) && data.questions.length > 0 ? data.questions[0] : null,
          title: data.title,
          description: data.description,
          timeLimit: data.timeLimit,
          status: data.status
        });

        // Check if the quiz is deleted or not published
        if (data.deleted || (user?.role === "student" && data.status !== "published" && data.status !== "active")) {
          console.error("Quiz is deleted or not published");
          throw new Error("Quiz not available");
        }

        // If the quiz doesn't have questions, fetch them separately
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          console.log("Quiz has no questions, fetching them separately");

          try {
            const questionsResponse = await fetch(`http://localhost:5000/api/quizzes/${id}/questions`, {
              method: 'GET',
              headers: {
                "Accept": "application/json"
              },
              credentials: "include"
            });

            if (questionsResponse.ok) {
              const questionsData = await questionsResponse.json();
              console.log(`Fetched ${questionsData.length} questions separately:`, questionsData);

              // Add the questions to the quiz data
              data.questions = questionsData;
            } else {
              console.error("Failed to fetch questions separately");
            }
          } catch (questionsError) {
            console.error("Error fetching questions separately:", questionsError);
          }
        }

        return data;
      } catch (error) {
        console.error("Error fetching quiz:", error);
        throw error;
      }
    },
    retry: false,
  });

  // Combine loading states
  const isLoading = isLoadingQuiz || isLoadingAttempts;

  // Debug logs
  console.log("Component rendering with states:", {
    quizStarted,
    quizCompleted,
    isLoading,
    attemptId,
    hasCompletedQuiz,
    "quiz?.questions?.length": quiz?.questions?.length
  });

  // Check if there's a completed attempt
  // If a specific attempt ID was provided in the URL, use that one
  const completedAttempt = specificAttemptId
    ? previousAttempts?.find(attempt => attempt.id === specificAttemptId && attempt.completedAt !== null)
    : previousAttempts?.find(attempt => attempt.completedAt !== null);

  // Also check localStorage to see if the quiz was submitted (including by auto-submit on navigation)
  // Use a try-catch to handle potential localStorage errors
  let isSubmittedInLocalStorage = false;
  try {
    isSubmittedInLocalStorage = localStorage.getItem(`quiz_${id}_submitted`) === 'true';
  } catch (error) {
    console.error("Error accessing localStorage:", error);
  }

  const hasCompletedQuiz = !!completedAttempt || isSubmittedInLocalStorage;

  // If we're directly showing results but don't have a completed attempt, update the state
  useEffect(() => {
    if (directlyShowResults && !completedAttempt && !isLoadingAttempts) {
      console.log("Showing results was requested but no completed attempt found");
      setDirectlyShowResults(false);
    }
  }, [directlyShowResults, completedAttempt, isLoadingAttempts]);

  // Fetch the completed attempt details if available
  const { data: attemptDetails, isLoading: isLoadingAttemptDetails } = useQuery({
    queryKey: [`/api/quiz-attempts/${completedAttempt?.id}`],
    queryFn: async () => {
      try {
        console.log(`Fetching details for completed attempt ${completedAttempt?.id}`);
        const response = await fetch(`http://localhost:5000/api/quiz-attempts/${completedAttempt?.id}`, {
          method: 'GET',
          headers: {
            "Accept": "application/json"
          },
          credentials: "include"
        });

        if (!response.ok) {
          console.error(`Failed to fetch attempt details: ${response.status}`);
          return null;
        }

        const data = await response.json();
        console.log("Completed attempt details:", data);
        return data;
      } catch (error) {
        console.error("Error fetching attempt details:", error);
        return null;
      }
    },
    enabled: !!completedAttempt?.id,
  });

  // Redirect non-students to the view page
  useEffect(() => {
    if (user && user.role !== "student") {
      navigate(`/quiz/view/${id}`);
    }
  }, [user, id, navigate]);

  // Start quiz attempt
  const startQuizMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting quiz with ID:", id);
      console.log("Quiz data:", quiz);

      // Check if there are any existing attempts for this quiz
      if (previousAttempts && previousAttempts.length > 0) {
        console.log("Found previous attempts:", previousAttempts);

        // Check if there's an incomplete attempt
        const incompleteAttempt = previousAttempts.find(attempt => attempt.completedAt === null);

        if (incompleteAttempt) {
          console.log("Found incomplete attempt:", incompleteAttempt);
          // Return the existing incomplete attempt instead of creating a new one
          return incompleteAttempt;
        }

        // If there's a completed attempt, don't allow starting a new one
        const completedAttempt = previousAttempts.find(attempt => attempt.completedAt !== null);
        if (completedAttempt) {
          console.log("Found completed attempt:", completedAttempt);
          throw new Error("You have already completed this quiz. You cannot attempt it again.");
        }
      }

      // Create a new attempt if no existing attempts were found
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
      console.log("Quiz attempt created or resumed:", data);
      console.log("Setting attemptId to:", data.id);
      setAttemptId(data.id);
      console.log("Setting quizStarted to true");
      setQuizStarted(true);
      console.log("quizStarted should now be true");

      // If there are saved answers, load them
      if (data.answers && Object.keys(data.answers).length > 0) {
        console.log("Loading saved answers:", data.answers);
        setSelectedAnswers(data.answers);

        toast({
          title: "Quiz Resumed",
          description: "Your previous progress has been loaded. Continue where you left off.",
        });
      } else {
        // Set the timer if there's a time limit
        if (quiz?.timeLimit) {
          setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
        }

        toast({
          title: "Quiz Started",
          description: "Good luck! Answer all questions and submit when you're done.",
        });
      }
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

  // Submit quiz attempt
  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) {
        console.error("No attempt ID found");
        throw new Error("No attempt ID found");
      }

      console.log("Submitting quiz attempt:", attemptId);
      console.log("Selected answers:", selectedAnswers);

      // Make sure we have at least one answer
      if (Object.keys(selectedAnswers).length === 0) {
        throw new Error("Please answer at least one question before submitting.");
      }

      // Format the answers for submission - make sure each answer has the correct format
      const formattedAnswers = {};

      Object.entries(selectedAnswers).forEach(([questionId, answer]) => {
        let selectedOptionId;

        if (typeof answer === 'object' && answer !== null) {
          if ('selectedOptionId' in answer) {
            selectedOptionId = answer.selectedOptionId;
          } else {
            // Try to find any property that might be the selected option ID
            const values = Object.values(answer).filter(v => v !== null && v !== undefined);
            if (values.length > 0) {
              selectedOptionId = values[0];
            }
          }
        } else if (typeof answer === 'string' || typeof answer === 'number') {
          selectedOptionId = answer;
        }

        if (selectedOptionId) {
          formattedAnswers[questionId] = { selectedOptionId: selectedOptionId.toString() };
        }
      });

      console.log("Formatted answers for submission:", formattedAnswers);

      // Show loading toast
      toast({
        title: "Submitting Quiz",
        description: "Please wait while we grade your quiz...",
      });

      const response = await apiRequest("PUT", `/api/quiz-attempts/${attemptId}`, {
        quizId: parseInt(id),
        answers: formattedAnswers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error submitting quiz:", errorData);
        throw new Error(`Failed to submit quiz: ${response.status} ${errorData.message || ''}`);
      }

      const data = await response.json();
      console.log("Quiz submission result:", data);

      // Make sure the score is available
      if (data.score === undefined || data.totalPossibleScore === undefined) {
        console.error("Score information missing from response:", data);
        throw new Error("Score information missing from server response");
      }

      return data;
    },
    onSuccess: (data) => {
      setQuizCompleted(true);

      // Clear the navigation warning
      window.onbeforeunload = null;

      // Store in localStorage that this quiz has been submitted
      try {
        localStorage.setItem(`quiz_${id}_submitted`, 'true');
      } catch (error) {
        console.error("Error setting localStorage:", error);
      }

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

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeRemaining === null || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          submitQuizMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining, quizCompleted, submitQuizMutation]);

  // Format time
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: number, answer: { selectedOptionId: string }) => {
    console.log(`Saving answer for question ${questionId}:`, answer);

    // Create a new answers object to ensure state update
    const newAnswers = {
      ...selectedAnswers,
      [questionId]: answer,
    };

    // Log the updated answers for debugging
    console.log("Updated answers:", newAnswers);

    // Update the state
    setSelectedAnswers(newAnswers);
  };

  // Navigation between questions
  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min((quiz?.questions?.length || 1) - 1, prev + 1));
  };

  // Start the quiz
  const handleStartQuiz = () => {
    console.log("handleStartQuiz called");
    startQuizMutation.mutate();
    console.log("startQuizMutation.mutate() called");

    // Simplified handler for when the user tries to navigate away
    window.onbeforeunload = (e) => {
      // Cancel the event
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';

      // This message might not be displayed in modern browsers for security reasons,
      // but the confirmation dialog will still appear
      return "Are you sure you want to leave? Your quiz progress will be lost.";
    };
  };

  // Auto-start the quiz if mode is 'start'
  useEffect(() => {
    if (mode === 'start' && !quizStarted && !isLoading && quiz && !hasCompletedQuiz) {
      console.log("Auto-starting quiz because mode is 'start'");
      handleStartQuiz();
    }
  }, [mode, quizStarted, isLoading, quiz, hasCompletedQuiz]);

  // Submit the quiz
  const handleSubmitQuiz = () => {
    if (Object.keys(selectedAnswers).length === 0) {
      toast({
        title: "Cannot Submit",
        description: "Please answer at least one question before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    if (window.confirm("Are you sure you want to submit this quiz? Once submitted, you cannot attempt it again.")) {
      submitQuizMutation.mutate();
    }
  };

  // Save progress without submitting
  const handleSaveProgress = async () => {
    try {
      if (!attemptId) {
        toast({
          title: "Cannot Save Progress",
          description: "Quiz attempt not started properly. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log("Saving progress for quiz attempt:", attemptId);
      console.log("Current answers:", selectedAnswers);

      // Make sure we have at least one answer
      if (Object.keys(selectedAnswers).length === 0) {
        toast({
          title: "No Answers Selected",
          description: "Please answer at least one question before saving progress.",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "Saving Progress",
        description: "Please wait while we save your progress...",
      });

      // Format the answers for saving - make sure each answer has the correct format
      const formattedAnswers = {};

      Object.entries(selectedAnswers).forEach(([questionId, answer]) => {
        let selectedOptionId;

        if (typeof answer === 'object' && answer !== null) {
          if ('selectedOptionId' in answer) {
            selectedOptionId = answer.selectedOptionId;
          } else {
            // Try to find any property that might be the selected option ID
            const values = Object.values(answer).filter(v => v !== null && v !== undefined);
            if (values.length > 0) {
              selectedOptionId = values[0];
            }
          }
        } else if (typeof answer === 'string' || typeof answer === 'number') {
          selectedOptionId = answer;
        }

        if (selectedOptionId) {
          formattedAnswers[questionId] = { selectedOptionId: selectedOptionId.toString() };
        }
      });

      console.log("Formatted answers for saving:", formattedAnswers);

      // Save progress without completing the quiz
      const response = await apiRequest("PATCH", `/api/quiz-attempts/${attemptId}/save-progress`, {
        quizId: parseInt(id),
        answers: formattedAnswers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save progress: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("Save progress response:", data);

      toast({
        title: "Progress Saved",
        description: "Your quiz progress has been saved. You can continue now or resume later, but you can only submit once.",
        duration: 5000,
      });

      // Don't navigate away or show popup - just save and continue
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Failed to Save Progress",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
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
    console.error("Quiz not found or error occurred. ID:", id);
    console.error("isError:", isError);

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
                <p className="mt-4 text-sm text-neutral-500">
                  Quiz ID: {id}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Note: Make sure you're using the quiz ID, not the content ID.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => navigate("/student/quizzes")}>Back to Quizzes</Button>
              </CardFooter>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // Results page
  if (quizCompleted) {
    console.log("Quiz completed, showing results. Data:", submitQuizMutation.data);

    // Make sure we have all the required data
    const result = submitQuizMutation.data || {};
    const score = result.score !== undefined ? result.score : 0;
    const totalPossibleScore = result.totalPossibleScore !== undefined ? result.totalPossibleScore : quiz.totalPoints || 1;
    const percentage = result.percentage !== undefined ? result.percentage : (totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0);
    const isPassing = percentage >= (quiz.passingScore || 70);

    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Quiz Completed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center p-4 rounded-full mb-4 ${isPassing ? 'bg-secondary-light/20 text-secondary' : 'bg-destructive/20 text-destructive'}`}>
                      <Star className="h-12 w-12" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{score} / {totalPossibleScore}</h2>
                    <p className="text-xl text-neutral-600">
                      {isPassing ? 'Congratulations! You passed the quiz.' : 'You did not reach the passing score.'}
                    </p>
                  </div>

                  <div className="bg-neutral-100 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Quiz Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-neutral-500">Total Questions</p>
                        <p className="font-medium">{quiz.questions.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Time Taken</p>
                        <p className="font-medium">
                          {quiz.timeLimit ? `${quiz.timeLimit - Math.floor((timeRemaining || 0) / 60)} minutes` : 'No time limit'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Score</p>
                        <p className="font-medium">{Math.round(percentage)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Result</p>
                        <p className={`font-medium ${isPassing ? 'text-secondary' : 'text-destructive'}`}>
                          {isPassing ? 'Pass' : 'Fail'}
                        </p>
                      </div>
                    </div>
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
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => navigate("/student/quizzes")}>Back to Quizzes</Button>
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
  if (!quizStarted) {
    // If the user has already completed this quiz or we should directly show results, show the completed quiz view
    if ((hasCompletedQuiz && completedAttempt) || (directlyShowResults && completedAttempt)) {
      // Show loading state while fetching attempt details
      if (isLoadingAttemptDetails || isLoadingAttempts) {
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

      // Calculate score and percentage
      const score = completedAttempt.score || 0;
      const totalPossibleScore = quiz.totalPoints || quiz.questions?.length || 0;
      const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;
      const isPassing = percentage >= (quiz.passingScore || 70);

      return (
        <div className="min-h-screen bg-neutral-50">
          <Sidebar />
          <div className="md:ml-64 flex flex-col min-h-screen">
            <main className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Quiz Already Completed</CardTitle>
                    <p className="text-neutral-600">You have already completed this quiz. Here are your results:</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center p-4 rounded-full mb-4 ${isPassing ? 'bg-secondary-light/20 text-secondary' : 'bg-destructive/20 text-destructive'}`}>
                        <Star className="h-12 w-12" />
                      </div>
                      <h2 className="text-3xl font-bold mb-2">{score} / {totalPossibleScore}</h2>
                      <p className="text-xl text-neutral-600">
                        {isPassing ? 'Congratulations! You passed the quiz.' : 'You did not reach the passing score.'}
                      </p>
                    </div>

                    <div className="bg-neutral-100 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Quiz Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-neutral-500">Total Questions</p>
                          <p className="font-medium">{quiz.questions.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">Completion Date</p>
                          <p className="font-medium">
                            {formatDate(new Date(completedAttempt.completedAt))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">Score</p>
                          <p className="font-medium">{Math.round(percentage)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">Result</p>
                          <p className={`font-medium ${isPassing ? 'text-secondary' : 'text-destructive'}`}>
                            {isPassing ? 'Pass' : 'Fail'}
                          </p>
                        </div>
                      </div>
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
                  <CardFooter className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => navigate("/student/quizzes")}>Back to Quizzes</Button>
                    <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
                  </CardFooter>
                </Card>
              </div>
            </main>
          </div>
        </div>
      );
    }

    // If the user hasn't completed the quiz yet, show the start page
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{quiz.title}</CardTitle>
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
                        <p className="text-sm text-neutral-500">Upload Date</p>
                        <p className="font-medium">
                          {formatDate(new Date(quiz.createdAt))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-100 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Instructions</h3>
                    <ul className="list-disc list-inside space-y-1 text-neutral-600">
                      <li>Once you start the quiz, the timer will begin.</li>
                      <li>You must complete the quiz in one session.</li>
                      <li>Each question may have only one correct answer.</li>
                      <li>You can navigate between questions using the buttons or question numbers.</li>
                      <li>Click "Submit Quiz" when you're finished.</li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Button onClick={handleStartQuiz} disabled={startQuizMutation.isPending}>
                    {startQuizMutation.isPending ? 'Starting...' : 'Start Quiz'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Active quiz page
  // Temporarily removed back button handler for debugging

  // Add safety checks for missing data
  if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    console.error("No questions found for this quiz");
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  There was an error loading the quiz questions. Please try again later or contact support.
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

  // Get the current question with a fallback
  const currentQuestion = quiz.questions[currentQuestionIndex] || {
    id: 0,
    text: "Error loading question",
    options: [
      { id: 1, text: "Option A", isCorrect: true },
      { id: 2, text: "Option B", isCorrect: false },
      { id: 3, text: "Option C", isCorrect: false },
      { id: 4, text: "Option D", isCorrect: false }
    ],
    points: 1,
    order: 0
  };

  // Calculate progress
  const questionProgress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
              <div className="flex flex-wrap items-center text-neutral-600">
                <div className="flex items-center mr-6 mb-2">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  <span>{quiz.questions.length} Questions</span>
                </div>
                <div className="flex items-center mr-6 mb-2">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{quiz.timeLimit ? `${quiz.timeLimit} Minutes` : 'No time limit'}</span>
                </div>
                <div className="flex items-center mr-6 mb-2">
                  <Star className="h-4 w-4 mr-1" />
                  <span>{quiz.totalPoints} Points</span>
                </div>
                <div className="flex items-center mb-2">
                  <CalendarClock className="h-4 w-4 mr-1" />
                  <span>Uploaded: {formatDate(new Date(quiz.createdAt))}</span>
                </div>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader className="border-b border-neutral-200 p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold mr-3">
                    {currentQuestionIndex + 1}
                  </span>
                  <h3 className="font-semibold">Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
                </div>
                {timeRemaining !== null && (
                  <div className="text-sm text-neutral-600 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span id="quiz-timer">{formatTime(timeRemaining)}</span> remaining
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <p className="text-lg mb-4">{currentQuestion.text}</p>
                </div>

                <RadioGroup
                  value={selectedAnswers[currentQuestion.id]?.selectedOptionId || ""}
                  onValueChange={(value) => {
                    console.log(`Selected option: ${value} for question ${currentQuestion.id}`);
                    handleAnswerSelect(currentQuestion.id, { selectedOptionId: value });
                  }}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option.id.toString()}
                        id={`option-${currentQuestion.id}-${option.id}`}
                      />
                      <Label
                        htmlFor={`option-${currentQuestion.id}-${option.id}`}
                        className="cursor-pointer flex-1 border border-neutral-200 rounded-lg p-3 hover:bg-neutral-50"
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              <div className="p-4">
                <Progress value={questionProgress} className="h-1" />
              </div>
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
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <Button onClick={handleNextQuestion}>
                    Next Question
                  </Button>
                ) : (
                  <Button variant="default" onClick={handleSubmitQuiz} disabled={submitQuizMutation.isPending}>
                    {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                )}
              </CardFooter>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleSaveProgress}
                disabled={submitQuizMutation.isPending}
              >
                {submitQuizMutation.isPending ? 'Please wait...' : 'Save Progress'}
              </Button>
              <Button
                className="bg-accent hover:bg-accent-dark text-white"
                onClick={handleSubmitQuiz}
                disabled={submitQuizMutation.isPending}
              >
                {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
