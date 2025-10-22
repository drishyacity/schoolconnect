import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus } from "lucide-react";

const quizFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  classId: z.string().min(1, "Please select a class"),
  subjectId: z.string().min(1, "Please select a subject"),
  timeLimit: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Time limit must be a positive number"
  }),
  totalPoints: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Total points must be a positive number"
  }),
  passingScore: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Passing score must be a non-negative number"
  }),
  // Allow any string format for uploadDate, including empty string
  dueDate: z.string().optional(), // Keeping the field name for compatibility
  questions: z.array(
    z.object({
      text: z.string().min(1, "Question text is required"), // Changed from questionText to text
      options: z.array(z.string().min(1, "Option text is required")).min(2, "At least 2 options are required"),
      correctAnswer: z.string().min(1, "Please select the correct answer"),
      points: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Points must be a positive number"
      }),
    })
  ).min(1, "At least one question is required"),
});

type QuizFormValues = z.infer<typeof quizFormSchema>;

type QuizFormProps = {
  onSubmit: (values: any) => void;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  isPending: boolean;
  defaultValues?: any;
  isEditing?: boolean;
};

export function QuizForm({ onSubmit, classes, subjects, isPending, defaultValues, isEditing = false }: QuizFormProps) {
  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      classId: "",
      subjectId: "",
      timeLimit: "30",
      totalPoints: "100",
      passingScore: "60",
      dueDate: "",
      questions: [
        {
          text: "", // Changed from questionText to text
          options: ["", "", "", ""],
          correctAnswer: "",
          points: "1",
        },
      ],
    },
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Calculate total points based on question points
  const calculateTotalPoints = () => {
    const questions = form.getValues().questions;
    if (!questions || questions.length === 0) return "0";

    const total = questions.reduce((sum, question) => {
      const points = parseInt(question.points) || 0;
      return sum + points;
    }, 0);

    return total.toString();
  };

  // Calculate total points when component mounts or when editing
  useEffect(() => {
    // Wait for form to be ready with values
    const timer = setTimeout(() => {
      form.setValue("totalPoints", calculateTotalPoints());
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Debug form values
  useEffect(() => {
    console.log("Form values:", form.getValues());
    console.log("Class ID:", form.getValues().classId);
    console.log("Subject ID:", form.getValues().subjectId);
  }, [form.watch("classId"), form.watch("subjectId")]);

  // Ensure correct answers are properly set when editing
  useEffect(() => {
    if (isEditing && defaultValues) {
      console.log("Setting up form for editing with default values:", defaultValues);

      // Make sure all questions have their correct answers properly set
      defaultValues.questions.forEach((question, qIndex) => {
        if (question.correctAnswer !== undefined) {
          console.log(`Question ${qIndex + 1} correct answer:`, question.correctAnswer);

          // Force a timeout to ensure the form is fully initialized
          setTimeout(() => {
            form.setValue(`questions.${qIndex}.correctAnswer`, question.correctAnswer);
            console.log(`Set correct answer for question ${qIndex + 1} to ${question.correctAnswer}`);
          }, 100);
        }
      });
    }
  }, [isEditing, defaultValues, form]);

  const handleAddQuestion = () => {
    const questions = form.getValues().questions;
    form.setValue("questions", [
      ...questions,
      {
        text: "", // Changed from questionText to text
        options: ["", "", "", ""],
        correctAnswer: "",
        points: "1",
      },
    ]);

    // Update total points
    form.setValue("totalPoints", calculateTotalPoints());

    setCurrentQuestionIndex(questions.length);
  };

  const handleAddOption = (questionIndex: number) => {
    const questions = form.getValues().questions;
    const options = questions[questionIndex].options;
    questions[questionIndex].options = [...options, ""];
    form.setValue("questions", questions);
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const questions = form.getValues().questions;
    questions[questionIndex].options.splice(optionIndex, 1);

    const correctAnswer = questions[questionIndex].correctAnswer;
    if (correctAnswer === optionIndex.toString()) {
      questions[questionIndex].correctAnswer = "";
    }

    form.setValue("questions", questions);
  };

  const handleRemoveQuestion = (questionIndex: number) => {
    const questions = form.getValues().questions;
    questions.splice(questionIndex, 1);
    form.setValue("questions", questions);

    // Update total points
    form.setValue("totalPoints", calculateTotalPoints());

    if (currentQuestionIndex >= questions.length) {
      setCurrentQuestionIndex(Math.max(0, questions.length - 1));
    }
  };

  const handleFormSubmit = (values: QuizFormValues) => {
    const formattedValues = {
      ...values,
      timeLimit: parseInt(values.timeLimit),
      totalPoints: parseInt(values.totalPoints),
      passingScore: parseInt(values.passingScore),
      classId: parseInt(values.classId),
      subjectId: parseInt(values.subjectId),
      questions: values.questions.map(q => ({
        ...q,
        points: parseInt(q.points),
      })),
    };

    onSubmit(formattedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
            <CardDescription>
              Enter the basic information about the quiz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter quiz title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter quiz description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      defaultValue=""
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((classItem) => (
                          <SelectItem
                            key={classItem.id}
                            value={classItem.id.toString()}
                          >
                            {classItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      defaultValue=""
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem
                            key={subject.id}
                            value={subject.id.toString()}
                          >
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log("Upload date changed:", value);

                          // Ensure the value is properly formatted
                          if (value) {
                            try {
                              // Validate that it's a proper date
                              const date = new Date(value);
                              if (!isNaN(date.getTime())) {
                                console.log("Valid date selected:", date.toISOString());
                              }
                            } catch (error) {
                              console.error("Error parsing date:", error);
                            }
                          }

                          // Pass the raw string value to the form
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log("Time limit changed:", value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        readOnly
                        className="bg-gray-100"
                        title="Total points are calculated automatically from question points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passing Score</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                Add questions for your quiz
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddQuestion}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                {form.watch("questions").map((_, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={currentQuestionIndex === index ? "default" : "outline"}
                    size="sm"
                    className="rounded-none first:rounded-l-md last:rounded-r-md"
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </div>

            {form.watch("questions").map((_, questionIndex) => (
              <div
                key={questionIndex}
                className={questionIndex === currentQuestionIndex ? "" : "hidden"}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    Question {questionIndex + 1}
                  </h3>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveQuestion(questionIndex)}
                    disabled={form.watch("questions").length <= 1}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`questions.${questionIndex}.text`} // Changed from questionText to text
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Text</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the question"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`questions.${questionIndex}.points`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Points for this question"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Update total points after a short delay
                              setTimeout(() => {
                                form.setValue("totalPoints", calculateTotalPoints());
                              }, 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>Options</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOption(questionIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>

                    {form.watch(`questions.${questionIndex}.options`).map(
                      (_, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <FormField
                            control={form.control}
                            name={`questions.${questionIndex}.correctAnswer`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <input
                                    type="radio"
                                    className="form-radio h-4 w-4 text-primary"
                                    checked={field.value === optionIndex.toString()}
                                    onChange={() => field.onChange(optionIndex.toString())}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`questions.${questionIndex}.options.${optionIndex}`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormControl>
                                  <Input
                                    placeholder={`Option ${optionIndex + 1}`}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOption(questionIndex, optionIndex)}
                            disabled={form.watch(`questions.${questionIndex}.options`).length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    )}

                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.correctAnswer`}
                      render={({ field }) => (
                        <FormMessage className="mt-1" />
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <Separator />
          <CardFooter className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing ? "Updating Quiz..." : "Creating Quiz..."
                : isEditing ? "Update Quiz" : "Create Quiz"
              }
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}