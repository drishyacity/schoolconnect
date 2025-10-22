import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, experienceLevelEnum } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

// Create schema with password optional for editing
const editUserSchema = insertUserSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["student", "teacher", "admin"]),
});

// Schema with required password for new users
const createUserSchema = insertUserSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "teacher", "admin"]),
});

type CreateFormValues = z.infer<typeof createUserSchema>;
type EditFormValues = z.infer<typeof editUserSchema>;
type FormProps = {
  isEditing?: boolean;
  defaultValues?: any;
  onSuccess?: () => void;
};

export function UserForm({ isEditing = false, defaultValues, onSuccess }: FormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Use the appropriate schema based on whether we're editing or creating
  const schema = isEditing ? editUserSchema : createUserSchema;
  // Use a type that can handle both cases
  type FormValues = EditFormValues;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "student",
      profileImage: "",
      bio: "",
      experienceLevel: null,
      
      // Student-specific fields
      admissionNo: "",
      admissionDate: null,
      grade: null,
      section: "",
      parentsMobile: "",
    },
  });
  
  // Track the selected role for conditional fields
  const [selectedRole, setSelectedRole] = useState<string>(defaultValues?.role || "student");

  // Update form values when defaultValues changes
  useEffect(() => {
    if (defaultValues) {
      // Exclude password for edit form
      const { password, ...values } = defaultValues;
      Object.entries(values).forEach(([key, value]) => {
        form.setValue(key as any, value);
      });
      
      // Update selected role for conditional fields
      if (defaultValues.role) {
        setSelectedRole(defaultValues.role);
      }
    }
  }, [defaultValues, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      if (isEditing) {
        // Edit mode - update existing user
        const { password, ...updateData } = values;
        const userId = defaultValues.id;
        
        // Only include password if provided
        const dataToSend = password ? values : updateData;
        
        await apiRequest("PATCH", `/api/users/${userId}`, dataToSend);
        toast({
          title: "User updated",
          description: `The user account has been updated successfully.`,
        });
      } else {
        // Create mode - register new user
        await apiRequest("POST", "/api/register", values);
        toast({
          title: "User created",
          description: `The ${values.role} account has been created successfully.`,
        });
        form.reset();
      }
      
      // Force refetch all user queries to ensure immediate list updates
      await queryClient.refetchQueries({ 
        queryKey: ["/api/users"],
        exact: false // This will refetch all queries that include "/api/users" in their key
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing 
          ? "Failed to update user. Please try again." 
          : "Failed to create user. The email or username may already exist.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Smith" {...field} />
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
                <Input placeholder="johnsmith" {...field} />
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
                <Input placeholder="john.smith@example.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isEditing ? "New Password (leave empty to keep current)" : "Password"}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder={isEditing ? "••••••••" : "Enter password"} 
                  type="password" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedRole(value);
                }}
                defaultValue={field.value}
                value={field.value}
              >
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

        {/* Student-specific fields */}
        {(selectedRole === 'student' || form.getValues('role') === 'student') && (
          <>
            <FormField
              control={form.control}
              name="admissionNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. ADM20230001" 
                      {...field} 
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Student's admission or registration number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="admissionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Select admission date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          // Convert to ISO string if a date is selected
                          field.onChange(date ? date.toISOString() : null);
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        fromYear={1990}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Date when the student was admitted to the school
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>Grade {i+1}</SelectItem>
                      ))}
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
                  <FormControl>
                    <Input 
                      placeholder="e.g. A, B, C" 
                      {...field} 
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parentsMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parents Mobile Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 9876543210" 
                      {...field} 
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Parents contact number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        {/* Teacher-specific fields */}
        {(selectedRole === 'teacher' || form.getValues('role') === 'teacher') && (
          <>
            <FormField
              control={form.control}
              name="profileImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Image URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/profile.jpg" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for the teacher's profile image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biography</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Teacher's biography and qualifications"
                      {...field}
                      value={field.value || ""}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of the teacher's background and expertise
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="6months+">6+ Months</SelectItem>
                      <SelectItem value="1year+">1+ Year</SelectItem>
                      <SelectItem value="2years+">2+ Years</SelectItem>
                      <SelectItem value="3years+">3+ Years</SelectItem>
                      <SelectItem value="5years+">5+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading 
            ? (isEditing ? "Updating..." : "Creating...") 
            : (isEditing ? "Update User" : "Create User")
          }
        </Button>
      </form>
    </Form>
  );
}