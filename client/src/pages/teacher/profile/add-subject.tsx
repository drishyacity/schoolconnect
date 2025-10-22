import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Book, Plus } from "lucide-react";

type Subject = {
  id: number;
  name: string;
  description: string | null;
};

// Form schema
const formSchema = z.object({
  subjectId: z.string().min(1, "Please select a subject")
});

type FormValues = z.infer<typeof formSchema>;

export default function AddSubject() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Fetch available subjects
  const { data: subjects, isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  
  // Type for teacher details
  type TeacherDetails = {
    id: number;
    subjects: any[];
    // Add other fields as needed
  };

  // Fetch teacher's current subjects to check count
  const { data: teacherDetails, isLoading: loadingTeacher } = useQuery<TeacherDetails>({
    queryKey: [`/api/users/${user?.id}/teacher-details`],
    enabled: !!user && user.role === "teacher",
  });
  
  const isLoading = loadingSubjects || loadingTeacher;
  const hasMaxSubjects = teacherDetails?.subjects?.length >= 3;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjectId: "",
    },
  });

  const addSubjectMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!user?.id) throw new Error("User not found");
      
      await apiRequest("POST", `/api/teachers/${user.id}/subjects`, {
        subjectId: parseInt(data.subjectId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/teacher-details`] });
      
      toast({
        title: "Subject added",
        description: "The subject has been successfully added to your teaching profile.",
        variant: "default",
      });
      
      // Go back to profile page
      setLocation("/teacher/profile");
    },
    onError: (error) => {
      toast({
        title: "Failed to add subject",
        description: error.message || "An error occurred while adding the subject.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    addSubjectMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Button variant="outline" size="icon" className="mr-3" onClick={() => setLocation("/teacher/profile")}>
              <ChevronLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add Teaching Subject</h1>
              <p className="text-neutral-600">Add a subject you can teach (maximum 3)</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 p-2 rounded-full">
                      <Book size={20} className="text-secondary" />
                    </div>
                    <div>
                      <CardTitle>New Teaching Subject</CardTitle>
                      <CardDescription>
                        Select a subject you are qualified to teach
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="text-center py-6">
                      <div className="animate-pulse text-neutral-400">Loading subjects...</div>
                    </div>
                  ) : hasMaxSubjects ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h3 className="text-amber-800 font-medium mb-1">Maximum subjects reached</h3>
                      <p className="text-amber-700 text-sm">
                        You can teach a maximum of 3 subjects. Please remove a subject before adding a new one.
                      </p>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="subjectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects?.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose a subject from the available options
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t border-neutral-200 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/teacher/profile")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={
                      addSubjectMutation.isPending || 
                      !form.formState.isDirty || 
                      isLoading || 
                      hasMaxSubjects
                    }
                  >
                    {addSubjectMutation.isPending ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">◌</span>
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Add Subject
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}