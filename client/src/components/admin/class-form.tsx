import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClassSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Updated schema to match our new database model
const formSchema = insertClassSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  grade: z.string().min(1, "Grade is required").transform(val => parseInt(val)),
  section: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ClassForm({ isEditing = false, defaultValues, onSuccess }: { 
  isEditing?: boolean;
  defaultValues?: any; 
  onSuccess?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ? {
      ...defaultValues,
      grade: defaultValues.grade?.toString(),
    } : {
      name: "",
      description: "",
      grade: "",
      section: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      if (isEditing && defaultValues?.id) {
        await apiRequest("PATCH", `/api/classes/${defaultValues.id}`, values);
        toast({
          title: "Class updated",
          description: "The class has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/classes", values);
        toast({
          title: "Class created",
          description: "The class has been created successfully.",
        });
        form.reset();
      }
      
      // Invalidate classes query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing 
          ? "Failed to update class. Please try again." 
          : "Failed to create class. Please try again.",
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
              <FormLabel>Class Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Physics 101" {...field} />
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
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter description for this class" 
                  className="resize-none" 
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
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
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
          name="section"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Section (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. A, B, C, etc." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading 
            ? (isEditing ? "Updating..." : "Creating...") 
            : (isEditing ? "Update Class" : "Create Class")
          }
        </Button>
      </form>
    </Form>
  );
}