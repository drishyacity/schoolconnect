import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

type Question = {
  id: number;
  text: string;
  options: {
    id: number;
    text: string;
  }[];
  points: number;
};

type Quiz = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  totalPoints: number;
  passingScore: number;
  dueDate: string;
  questions: Question[];
};

type QuizAttemptProps = {
  quizId: number;
};

export function QuizAttempt({ quizId }: QuizAttemptProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch quiz details
  const { data: quiz, isLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quizzes/${quizId}`);
      return await res.json();
    },
  });

  // Start quiz attempt mutation
  const startAttemptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quizzes/${quizId}/attempt`);
      return await res.json();
    },
    onSuccess: (data) => {
      setTimeLeft(data.timeLeft);
      toast({
        title: "Quiz started",
        description: "Your quiz attempt has begun. Good luck!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting quiz",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Submit quiz attempt mutation
  const submitAttemptMutation = useMutation({
    mutationFn: async (answers: Record<number, number>) => {
      const res = await apiRequest("POST", `/api/quizzes/${quizId}/submit`, {
        answers,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      toast({
        title: "Quiz submitted",
        description: `Your score: ${data.score}/${data.totalPoints}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting quiz",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Start the quiz when component mounts
  useEffect(() => {
    if (quiz && !isSubmitted) {
      startAttemptMutation.mutate();
    }
  }, [quiz]);

  // Handle timer
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            submitAttemptMutation.mutate(answers);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isSubmitted]);

  const handleAnswer = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = () => {
    submitAttemptMutation.mutate(answers);
  };

  const handleNext = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  if (isLoading) {
    return <div>Loading quiz...</div>;
  }

  if (!quiz) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Quiz not found</AlertDescription>
      </Alert>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{quiz.title}</CardTitle>
              <CardDescription>{quiz.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-6" />
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </h3>
              <p className="text-muted-foreground">
                {quiz.questions[currentQuestion].text}
              </p>
            </div>

            <RadioGroup
              value={answers[quiz.questions[currentQuestion].id]?.toString()}
              onValueChange={(value) =>
                handleAnswer(
                  quiz.questions[currentQuestion].id,
                  parseInt(value)
                )
              }
              className="space-y-3"
            >
              {quiz.questions[currentQuestion].options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-2 rounded-md border p-4"
                >
                  <RadioGroupItem
                    value={option.id.toString()}
                    id={`option-${option.id}`}
                  />
                  <Label
                    htmlFor={`option-${option.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          {currentQuestion === quiz.questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitted}>
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 