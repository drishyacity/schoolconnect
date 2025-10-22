import { useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, GraduationCap, Plus } from "lucide-react";

// Form schema
const currentYear = new Date().getFullYear();
const formSchema = z.object({
  qualification: z.string().min(2, "Qualification must be at least 2 characters"),
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  year: z.string()
    .refine(val => !val || (/^\d+$/.test(val) && parseInt(val) <= currentYear), {
      message: `Year must be a valid year up to ${currentYear}`,
    })
    .optional()
    .transform(val => val ? parseInt(val) : null),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddQualification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      qualification: "",
      institution: "",
      year: undefined,
    },
  });

  const addQualificationMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!user?.id) throw new Error("User not found");
      
      await apiRequest("POST", `/api/teachers/${user.id}/qualifications`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/teacher-details`] });
      
      toast({
        title: "Qualification added",
        description: "Your qualification has been successfully added to your profile.",
        variant: "default",
      });
      
      // Go back to profile page
      setLocation("/teacher/profile");
    },
    onError: (error) => {
      toast({
        title: "Failed to add qualification",
        description: error.message || "An error occurred while adding your qualification.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    addQualificationMutation.mutate(data);
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
              <h1 className="text-2xl font-bold">Add Qualification</h1>
              <p className="text-neutral-600">Add degree, certificate or training to your profile</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <GraduationCap size={20} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle>New Qualification</CardTitle>
                      <CardDescription>
                        Add your degree, certificate, or professional training
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Qualification Name */}
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qualification Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Bachelor of Education, Teaching Certificate" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the name of your degree, certificate, or qualification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Institution */}
                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. University of Education, Training Institute" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the name of the institution where you received this qualification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Year */}
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Obtained (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={`e.g. ${currentYear}`}
                            min="1950"
                            max={currentYear}
                            {...field}
                            value={field.value?.toString() || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the year when you received this qualification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    disabled={addQualificationMutation.isPending || !form.formState.isDirty}
                  >
                    {addQualificationMutation.isPending ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">◌</span>
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Add Qualification
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