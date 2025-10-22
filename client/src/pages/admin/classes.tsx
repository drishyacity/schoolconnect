import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, RefreshCcw, Edit, Trash2, BookOpen } from "lucide-react";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// Form validation schemas
const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  description: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
  section: z.string().optional(),
});

const classSubjectSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z.string().min(1, "Teacher is required"),
});

type ClassFormValues = z.infer<typeof classSchema>;
type ClassSubjectFormValues = z.infer<typeof classSubjectSchema>;

interface ClassFormProps {
  isEditing?: boolean;
  defaultValues?: any;
  onSuccess?: () => void;
}

interface ClassSubjectFormProps {
  classId: number;
  onSuccess?: () => void;
}

function ClassForm({ isEditing = false, defaultValues, onSuccess }: ClassFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json();
    },
  });
  
  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/users", "teacher"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=teacher");
      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }
      return response.json();
    },
  });
  
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
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

  async function onSubmit(values: ClassFormValues) {
    setIsLoading(true);
    try {
      // Convert grade to number for API
      const formattedValues = {
        ...values,
        grade: parseInt(values.grade),
      };
      
      if (isEditing && defaultValues?.id) {
        await apiRequest("PATCH", `/api/classes/${defaultValues.id}`, formattedValues);
        toast({
          title: "Class updated",
          description: "The class has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/classes", formattedValues);
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
                defaultValue={field.value}
                value={field.value}
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

function ClassSubjectForm({ classId, onSuccess }: ClassSubjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  
  // Fetch class details with subjects
  const { data: classDetails, isLoading: isClassLoading } = useQuery({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      const response = await fetch(`/api/classes/${classId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch class details");
      }
      return response.json();
    },
  });
  
  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json();
    },
  });
  
  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/users", "teacher"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=teacher");
      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }
      return response.json();
    },
  });
  
  // Initialize form with empty values
  const form = useForm<ClassSubjectFormValues>({
    resolver: zodResolver(classSubjectSchema),
    defaultValues: {
      subjectId: "",
      teacherId: "",
    },
  });

  // Load class subjects when class details are available
  useEffect(() => {
    if (classDetails?.subjects) {
      setClassSubjects(classDetails.subjects);
    }
  }, [classDetails]);

  async function onSubmit(values: ClassSubjectFormValues) {
    setIsLoading(true);
    try {
      // Convert string IDs to numbers for API
      const formattedValues = {
        classId,
        subjectId: parseInt(values.subjectId),
        teacherId: parseInt(values.teacherId),
      };
      
      await apiRequest("POST", "/api/class-subjects", formattedValues);
      
      toast({
        title: "Subject added",
        description: "The subject has been added to this class successfully.",
      });
      
      // Reset form
      form.reset();
      
      // Refresh class subjects
      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId] });
      
      // Refresh classes list
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add subject to class. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveSubject(classSubjectId: number) {
    if (window.confirm("Are you sure you want to remove this subject from the class?")) {
      try {
        await apiRequest("DELETE", `/api/class-subjects/${classSubjectId}`);
        
        toast({
          title: "Subject removed",
          description: "The subject has been removed from this class successfully.",
        });
        
        // Refresh class subjects
        queryClient.invalidateQueries({ queryKey: ["/api/classes", classId] });
        
        // Refresh classes list
        queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove subject from class. Please try again.",
          variant: "destructive",
        });
      }
    }
  }

  if (isClassLoading) {
    return <div className="flex justify-center p-4"><p>Loading class details...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Current Subjects</h3>
        {classSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects assigned to this class yet.</p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSubjects.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.subject?.name || "Unknown Subject"}</TableCell>
                    <TableCell>{item.teacher?.name || "Not Assigned"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubject(item.id)}
                        title="Remove Subject"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Add Subject</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
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
            
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher: any) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Adding..." : "Add Subject to Class"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<any>(null);

  // Fetch classes
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["/api/classes", refreshKey],
    queryFn: async () => {
      const response = await fetch("/api/classes");
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      return response.json();
    },
  });

  // Filter classes based on search term
  const filteredClasses = classes.filter((classItem: any) => {
    return (
      classItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (`Grade ${classItem.grade}${classItem.section ? ' '+classItem.section : ''}`).toLowerCase().includes(searchTerm.toLowerCase()) 
    );
  });

  // Columns definition for the data table
  const columns = [
    {
      title: "Class Name",
      field: "name",
    },
    {
      title: "Grade",
      field: "grade",
      render: (_, classItem: any) => `Grade ${classItem.grade}`,
    },
    {
      title: "Section",
      field: "section",
      render: (_, classItem: any) => classItem.section || "-",
    },
    {
      title: "Subjects",
      field: "subjects",
      render: (_, classItem: any) => (
        <Badge variant="outline">{(classItem.subjects?.length || 0)} Subjects</Badge>
      ),
    },
    {
      title: "Students",
      field: "students",
      render: (_, classItem: any) => (
        <Badge variant="outline">{(classItem.students?.length || 0)} Students</Badge>
      ),
    },
    {
      title: "Actions",
      field: "actions",
      render: (_, classItem: any) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleSubjects(classItem)}
            title="Manage Subjects"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEdit(classItem)}
            title="Edit Class"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDelete(classItem)}
            title="Delete Class"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (classItem: any) => {
    setCurrentClass(classItem);
    setEditDialogOpen(true);
  };

  const handleDelete = async (classItem: any) => {
    if (window.confirm(`Are you sure you want to delete ${classItem.name}?`)) {
      try {
        await apiRequest("DELETE", `/api/classes/${classItem.id}`);
        toast({
          title: "Class deleted",
          description: `${classItem.name} has been deleted successfully.`,
        });
        // Refresh the classes list
        queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete class. It may have enrolled students or content.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubjects = (classItem: any) => {
    setCurrentClass(classItem);
    setSubjectsDialogOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setCurrentClass(null);
  };
  
  const handleSubjectsSuccess = () => {
    // You might want to perform additional actions here
    // For now, we just leave the dialog open to allow managing multiple subjects
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Classes Management</h1>
            <div className="flex items-center space-x-2">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                  </DialogHeader>
                  <ClassForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle>Classes</CardTitle>
              <CardDescription>
                Manage all classes in your institution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
                  <Input
                    placeholder="Search classes..."
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
                data={filteredClasses}
                isLoading={isLoading}
                emptyMessage="No classes found. Create your first class using the 'Add Class' button."
              />
            </CardContent>
          </Card>

          {/* Edit Class Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Class</DialogTitle>
              </DialogHeader>
              {currentClass && (
                <ClassForm 
                  isEditing={true}
                  defaultValues={currentClass} 
                  onSuccess={handleEditSuccess} 
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Manage Subjects Dialog */}
          <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {currentClass && `Manage Subjects for ${currentClass.name}`}
                </DialogTitle>
              </DialogHeader>
              {currentClass && (
                <ClassSubjectForm 
                  classId={currentClass.id} 
                  onSuccess={handleSubjectsSuccess} 
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}