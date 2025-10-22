import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, RefreshCcw, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

// Form validation schema
const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  description: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
  isEditing?: boolean;
  defaultValues?: SubjectFormValues & { id?: number };
  onSuccess?: () => void;
}

function SubjectForm({ isEditing = false, defaultValues, onSuccess }: SubjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: SubjectFormValues) {
    setIsLoading(true);
    try {
      if (isEditing && defaultValues?.id) {
        await apiRequest("PATCH", `/api/subjects/${defaultValues.id}`, values);
        toast({
          title: "Subject updated",
          description: "The subject has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/subjects", values);
        toast({
          title: "Subject created",
          description: "The subject has been created successfully.",
        });
        form.reset();
      }
      
      // Invalidate subjects query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing 
          ? "Failed to update subject. Please try again." 
          : "Failed to create subject. Please try again.",
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
              <FormLabel>Subject Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mathematics" {...field} />
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
                  placeholder="Enter description for this subject" 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading 
            ? (isEditing ? "Updating..." : "Creating...") 
            : (isEditing ? "Update Subject" : "Create Subject")
          }
        </Button>
      </form>
    </Form>
  );
}

export default function SubjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<any>(null);

  // Fetch subjects with class counts
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["/api/subjects", refreshKey],
    queryFn: async () => {
      const response = await fetch("/api/subjects?withClassCount=true");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json();
    },
  });

  // Filter subjects based on search term
  const filteredSubjects = subjects.filter((subject: any) => {
    return (
      subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Columns definition for the data table
  const columns = [
    {
      title: "Subject Name",
      field: "name",
    },
    {
      title: "Description",
      field: "description",
      className: "text-neutral-600",
      render: (value: string) => value || "No description",
    },
    {
      title: "Classes",
      field: "classCount",
      render: (value: number) => `${value} ${value === 1 ? 'Class' : 'Classes'}`,
    },
    {
      title: "Actions",
      field: "actions",
      render: (_, subject: any) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEdit(subject)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDelete(subject)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (subject: any) => {
    setCurrentSubject(subject);
    setEditDialogOpen(true);
  };

  const handleDelete = async (subject: any) => {
    if (window.confirm(`Are you sure you want to delete ${subject.name}?`)) {
      try {
        await apiRequest("DELETE", `/api/subjects/${subject.id}`);
        toast({
          title: "Subject deleted",
          description: `${subject.name} has been deleted successfully.`,
        });
        // Refresh the subjects list
        queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete subject. It may be in use by classes.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setCurrentSubject(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Subjects Management</h1>
            <div className="flex items-center space-x-2">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Subject</DialogTitle>
                  </DialogHeader>
                  <SubjectForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle>Subjects</CardTitle>
              <CardDescription>
                Manage all subjects in your institution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
                  <Input
                    placeholder="Search subjects..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              
              <DataTable
                columns={columns}
                data={filteredSubjects}
                isLoading={isLoading}
                emptyMessage="No subjects found. Create your first subject using the 'Add Subject' button."
              />
            </CardContent>
          </Card>

          {/* Edit Subject Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Subject</DialogTitle>
              </DialogHeader>
              {currentSubject && (
                <SubjectForm 
                  isEditing={true}
                  defaultValues={currentSubject} 
                  onSuccess={handleEditSuccess} 
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}