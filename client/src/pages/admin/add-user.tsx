import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronLeft, Info, User } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";

// Extend the insertUserSchema for client-side validation
const formSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(6, {
      message: "Password must be at least 6 characters.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Infer the form values type from the schema
type FormValues = z.infer<typeof formSchema>;

export default function AddUserPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get role from URL params (defaults to student if not specified)
  const params = new URLSearchParams(window.location.search);
  const defaultRole = params.get("role") || "student";
  
  // Setup form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      role: defaultRole as "admin" | "teacher" | "student",
      profileImage: null,
      grade: null,
      section: null,
      experienceLevel: null,
      bio: null,
    },
  });
  
  // Handle form submission
  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userData } = values;
      
      // Convert grade to number if it exists
      const formattedData = {
        ...userData,
        // Parse grade as a number immediately when it comes from the Select component
        grade: userData.grade ? Number(userData.grade) : null,
      };
      
      // Submit to API
      await apiRequest("POST", "/api/register", formattedData);
      
      toast({
        title: "User created successfully",
        description: `${values.name} has been added as a ${values.role}.`,
      });
      
      // Invalidate users queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Redirect based on role
      if (values.role === 'student') {
        navigate("/admin/students");
      } else if (values.role === 'teacher') {
        navigate("/admin/teachers");
      } else {
        navigate("/admin/users");
      }
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message || "There was a problem creating the user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Get role-specific fields
  const showStudentFields = form.watch("role") === "student";
  const showTeacherFields = form.watch("role") === "teacher";
  
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            size="icon" 
            className="mr-3" 
            onClick={() => {
              const role = form.getValues("role");
              if (role === "student") {
                navigate("/admin/students");
              } else if (role === "teacher") {
                navigate("/admin/teachers");
              } else {
                navigate("/admin/users");
              }
            }}
          >
            <ChevronLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Add {form.watch("role") === "student" ? "Student" : 
                   form.watch("role") === "teacher" ? "Teacher" : "User"}
            </h1>
            <p className="text-neutral-600">Create a new user account</p>
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>
                        Enter the user's account details
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="unique_username" {...field} />
                          </FormControl>
                          <FormDescription>
                            Used for login. Must be unique.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Student-specific fields */}
              {showStudentFields && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 p-2 rounded-full">
                        <Info size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <CardTitle>Student Information</CardTitle>
                        <CardDescription>
                          Enter additional details specific to students
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                // Parse string value to number immediately
                                field.onChange(value ? Number(value) : null);
                              }}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">Grade 1</SelectItem>
                                <SelectItem value="2">Grade 2</SelectItem>
                                <SelectItem value="3">Grade 3</SelectItem>
                                <SelectItem value="4">Grade 4</SelectItem>
                                <SelectItem value="5">Grade 5</SelectItem>
                                <SelectItem value="6">Grade 6</SelectItem>
                                <SelectItem value="7">Grade 7</SelectItem>
                                <SelectItem value="8">Grade 8</SelectItem>
                                <SelectItem value="9">Grade 9</SelectItem>
                                <SelectItem value="10">Grade 10</SelectItem>
                                <SelectItem value="11">Grade 11</SelectItem>
                                <SelectItem value="12">Grade 12</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="A">Section A</SelectItem>
                                <SelectItem value="B">Section B</SelectItem>
                                <SelectItem value="C">Section C</SelectItem>
                                <SelectItem value="D">Section D</SelectItem>
                                <SelectItem value="E">Section E</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Teacher-specific fields */}
              {showTeacherFields && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 p-2 rounded-full">
                        <Info size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <CardTitle>Teacher Information</CardTitle>
                        <CardDescription>
                          Enter additional details for the teacher profile
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="experienceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Level</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select experience level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Entry Level (0-2 years)</SelectItem>
                              <SelectItem value="junior">Junior (2-5 years)</SelectItem>
                              <SelectItem value="mid">Mid-Level (5-8 years)</SelectItem>
                              <SelectItem value="senior">Senior (8-12 years)</SelectItem>
                              <SelectItem value="lead">Lead (12+ years)</SelectItem>
                              <SelectItem value="hod">Head of Department</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio / Introduction</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief introduction and professional background..." 
                              className="min-h-[120px]" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be displayed on the teacher's profile
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
              
              <CardFooter className="px-0 pt-3 pb-0 flex flex-col sm:flex-row gap-3 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const role = form.getValues("role");
                    if (role === "student") {
                      navigate("/admin/students");
                    } else if (role === "teacher") {
                      navigate("/admin/teachers");
                    } else {
                      navigate("/admin/users");
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">◌</span>
                      Creating...
                    </span>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}