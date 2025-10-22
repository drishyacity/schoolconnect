import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Define schemas for form validation
const optionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Option text is required"),
  isCorrect: z.boolean().default(false),
});

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(3, "Question text is required"),
  options: z.array(optionSchema)
    .min(2, "At least two options are required")
    .refine(options => options.some(option => option.isCorrect), {
      message: "At least one option must be marked as correct",
    }),
  points: z.coerce.number().int().min(1).default(1),
});

const quizSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  classId: z.coerce.number(),
  subjectId: z.coerce.number(),
  timeLimit: z.coerce.number().int().min(1).default(30),
  passingPercentage: z.coerce.number().int().min(1).max(100).default(60),
  status: z.enum(["draft", "published"]).default("draft"),
  questions: z.array(questionSchema)
    .min(1, "At least one question is required"),
});

type QuizFormValues = z.infer<typeof quizSchema>;

export function QuizCreationForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  
  // Keep track of the currently selected question ID for more reliable editing
  const [currentQuestionId, setCurrentQuestionId] = useState("");

  // Fetch all classes
  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
  });

  // Get all subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Generate a unique ID for elements
  const generateId = () => Math.random().toString(36).substring(2, 10);
  
  // Helper function to find the index by ID
  const getQuestionIndexById = (id: string) => {
    const questions = form.getValues().questions || [];
    const index = questions.findIndex(q => q.id === id);
    return index >= 0 ? index : currentQuestionIdx;
  };

  // Form setup
  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      classId: undefined,
      subjectId: undefined,
      timeLimit: 30,
      passingPercentage: 60,
      status: "draft",
      questions: [
        {
          id: generateId(),
          text: "",
          points: 1,
          options: [
            { id: generateId(), text: "", isCorrect: false },
            { id: generateId(), text: "", isCorrect: false },
            { id: generateId(), text: "", isCorrect: false },
            { id: generateId(), text: "", isCorrect: false },
          ],
        },
      ],
    },
  });

  // Initialize the current question ID with the first question's ID
  useEffect(() => {
    if (form.getValues().questions?.length > 0) {
      const firstQuestion = form.getValues().questions[0];
      setCurrentQuestionId(firstQuestion.id);
    }
  }, []);

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion, move: moveQuestion } = 
    useFieldArray({
      control: form.control,
      name: "questions",
    });

  // Add a new option to a question
  const addOption = (questionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`);
    form.setValue(`questions.${questionIndex}.options`, [
      ...currentOptions,
      { id: generateId(), text: "", isCorrect: false },
    ]);
  };

  // Remove an option from a question
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`);
    if (currentOptions.length <= 2) {
      toast({
        title: "Cannot remove option",
        description: "A question must have at least two options",
        variant: "destructive",
      });
      return;
    }
    
    const newOptions = [...currentOptions];
    newOptions.splice(optionIndex, 1);
    form.setValue(`questions.${questionIndex}.options`, newOptions);
  };

  // Set an option as correct (radio button behavior)
  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const options = form.getValues(`questions.${questionIndex}.options`);
    const updatedOptions = options.map((option, idx) => ({
      ...option,
      isCorrect: idx === optionIndex,
    }));
    form.setValue(`questions.${questionIndex}.options`, updatedOptions);
  };

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async (data: QuizFormValues) => {
      const res = await apiRequest("POST", "/api/quizzes", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Quiz created",
        description: "Your quiz has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setLocation("/teacher/content");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating quiz",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: QuizFormValues) => {
    createQuizMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="details">Quiz Details</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Quiz Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
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
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
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
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject: any) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
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

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter quiz description"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Limit (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Time allowed for the quiz
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passingPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passing Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Required to pass (%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="draft" id="draft" />
                            <Label htmlFor="draft">Draft</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="published" id="published" />
                            <Label htmlFor="published">Published</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Published quizzes will be visible to students
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setActiveTab("questions")}
              >
                Continue to Questions
              </Button>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Questions ({questionFields.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newQuestionId = generateId();
                  appendQuestion({
                    id: newQuestionId,
                    text: "",
                    points: 1,
                    options: [
                      { id: generateId(), text: "", isCorrect: false },
                      { id: generateId(), text: "", isCorrect: false },
                      { id: generateId(), text: "", isCorrect: false },
                      { id: generateId(), text: "", isCorrect: false },
                    ],
                  });
                  // Set the current question ID and index
                  setTimeout(() => {
                    const newIndex = questionFields.length;
                    setCurrentQuestionIdx(newIndex);
                    setCurrentQuestionId(newQuestionId);
                  }, 0);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Question List Sidebar */}
              <div className="space-y-2 md:col-span-1">
                <div className="font-medium mb-2">Question List</div>
                {questionFields.map((question, index) => (
                  <Card 
                    key={question.id}
                    className={`cursor-pointer ${currentQuestionId === question.id ? 'border-primary' : ''}`}
                    onClick={() => {
                      setCurrentQuestionId(question.id);
                    }}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-medium">Q{index + 1}:</span>{" "}
                        {form.watch(`questions.${index}.text`) || "New Question"}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (index > 0) {
                              // We're moving this question up, so we want to keep tracking it
                              // Store the current question ID
                              const questionId = question.id;
                              
                              // Move the question
                              moveQuestion(index, index - 1);
                              
                              // The current question ID stays the same since we're following the same question
                              // but update currentQuestionIdx for backward compatibility
                              setCurrentQuestionIdx(index - 1);
                            }
                          }}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (index < questionFields.length - 1) {
                              // We're moving this question down, so we want to keep tracking it
                              // Store the current question ID
                              const questionId = question.id;
                              
                              // Move the question
                              moveQuestion(index, index + 1);
                              
                              // The current question ID stays the same since we're following the same question
                              // but update currentQuestionIdx for backward compatibility
                              setCurrentQuestionIdx(index + 1);
                            }
                          }}
                          disabled={index === questionFields.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (questionFields.length > 1) {
                              // Determine if we're deleting the currently selected question
                              const isDeletingCurrentQuestion = currentQuestionId === question.id;
                              
                              // If deleting the current question, find the next question to select
                              let nextQuestionId: string | undefined;
                              
                              if (isDeletingCurrentQuestion) {
                                const questions = form.getValues().questions;
                                
                                // Try to select the previous question if available
                                if (index > 0) {
                                  nextQuestionId = questions[index - 1]?.id;
                                } 
                                // Otherwise select the next question if available
                                else if (index < questions.length - 1) {
                                  nextQuestionId = questions[index + 1]?.id;
                                }
                                // No other questions available, we'll handle this after deletion
                              }
                              
                              // Remove the question
                              removeQuestion(index);
                              
                              // Update the selected question if we were viewing the deleted one
                              if (isDeletingCurrentQuestion) {
                                // If we found a new question to select, do it now
                                if (nextQuestionId) {
                                  setCurrentQuestionId(nextQuestionId);
                                  const newIdx = getQuestionIndexById(nextQuestionId);
                                  setCurrentQuestionIdx(newIdx);
                                } 
                                // If there are no other questions, the form will add a default one
                                else {
                                  // We use setTimeout to ensure the fields have been updated
                                  setTimeout(() => {
                                    const remainingQuestions = form.getValues().questions;
                                    if (remainingQuestions.length > 0) {
                                      setCurrentQuestionId(remainingQuestions[0].id);
                                      setCurrentQuestionIdx(0);
                                    }
                                  }, 0);
                                }
                              }
                            } else {
                              toast({
                                title: "Cannot remove question",
                                description: "You need at least one question",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={questionFields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Question Editor */}
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Question {currentQuestionIdx + 1}</CardTitle>
                  <CardDescription>
                    Create a multiple-choice question
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name={`questions.${getQuestionIndexById(currentQuestionId)}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Text</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your question here"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`questions.${getQuestionIndexById(currentQuestionId)}.points`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            {...field}
                            className="w-24"
                          />
                        </FormControl>
                        <FormDescription>
                          Points awarded for correct answer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <FormLabel>Answer Options</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(getQuestionIndexById(currentQuestionId))}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {form.watch(`questions.${getQuestionIndexById(currentQuestionId)}.options`)?.map((option, optionIdx) => (
                        <div key={option.id} className="flex items-start space-x-3">
                          <div className="pt-3">
                            <input
                              type="radio"
                              checked={option.isCorrect}
                              onChange={() => setCorrectOption(getQuestionIndexById(currentQuestionId), optionIdx)}
                              className="h-4 w-4"
                            />
                          </div>
                          <div className="flex-grow">
                            <FormField
                              control={form.control}
                              name={`questions.${getQuestionIndexById(currentQuestionId)}.options.${optionIdx}.text`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder={`Option ${optionIdx + 1}`}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(getQuestionIndexById(currentQuestionId), optionIdx)}
                            className="mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("details")}
              >
                Back to Details
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("preview")}
              >
                Preview Quiz
              </Button>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{form.watch("title") || "Quiz Title"}</CardTitle>
                <CardDescription>
                  {form.watch("description") || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Time Limit:</span>
                    <span className="font-medium">{form.watch("timeLimit")} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passing Score:</span>
                    <span className="font-medium">{form.watch("passingPercentage")}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium capitalize">{form.watch("status")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <span className="font-medium">{questionFields.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Questions Preview</h3>
              
              {questionFields.map((question, qIndex) => (
                <Card key={question.id} className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Question {qIndex + 1}</span>
                      <span className="text-sm font-normal">
                        {form.watch(`questions.${qIndex}.points`)} point{form.watch(`questions.${qIndex}.points`) !== 1 ? 's' : ''}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-lg">{form.watch(`questions.${qIndex}.text`)}</p>
                    
                    <div className="space-y-3 mt-4">
                      {form.watch(`questions.${qIndex}.options`).map((option, oIndex) => (
                        <div 
                          key={option.id} 
                          className={`flex items-center p-3 rounded-md border ${option.isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                        >
                          <div className="mr-3">
                            {option.isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center">
                                {String.fromCharCode(65 + oIndex)}
                              </div>
                            )}
                          </div>
                          <p>{option.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("questions")}
              >
                Back to Questions
              </Button>
              <Button
                type="submit"
                disabled={createQuizMutation.isPending}
              >
                {createQuizMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Quiz
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}