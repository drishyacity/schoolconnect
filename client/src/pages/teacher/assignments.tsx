import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, CheckCircle, XCircle, Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TeacherAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    dueDate: ""
  });

  // Fetch teacher's assigned classes
  const { data: assignedClasses, isLoading: isLoadingClasses } = useQuery({
    queryKey: [`/api/teachers/${user?.id}/assigned-classes`],
    queryFn: async () => {
      const response = await fetch(`/api/teachers/${user?.id}/assigned-classes`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch assigned classes");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch assignments for selected class
  const { data: assignments, isLoading: isLoadingAssignments, refetch } = useQuery({
    queryKey: [`/api/classes/${selectedClass}/assignments`],
    queryFn: async () => {
      const response = await fetch(`/api/classes/${selectedClass}/assignments`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
    enabled: !!selectedClass,
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(assignmentData)
      });
      if (!response.ok) throw new Error("Failed to create assignment");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Created",
        description: "Assignment has been created successfully.",
      });
      setIsAddingAssignment(false);
      setNewAssignment({ title: "", description: "", dueDate: "" });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, ...data }: any) => {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update assignment");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Updated",
        description: "Assignment status has been updated successfully.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAssignment = () => {
    if (!selectedClass || !newAssignment.title) return;

    // Get all students in the class
    const students = getUniqueStudents();
    
    // Create assignment for each student
    const assignmentPromises = students.map(student => 
      createAssignmentMutation.mutateAsync({
        classId: parseInt(selectedClass),
        studentId: student.student_id,
        assignmentTitle: newAssignment.title,
        assignmentDescription: newAssignment.description,
        dueDate: newAssignment.dueDate || null,
        isCompleted: false,
        submissionDate: null,
        remarks: ""
      })
    );

    Promise.all(assignmentPromises);
  };

  const handleUpdateAssignment = (assignmentId: number, isCompleted: boolean, remarks: string) => {
    updateAssignmentMutation.mutate({
      assignmentId,
      isCompleted,
      submissionDate: isCompleted ? new Date().toISOString() : null,
      remarks
    });
  };

  const getUniqueStudents = () => {
    if (!assignments) return [];
    
    const studentMap = new Map();
    assignments.forEach((assignment: any) => {
      if (!studentMap.has(assignment.student_id)) {
        studentMap.set(assignment.student_id, {
          student_id: assignment.student_id,
          student_name: assignment.student_name,
          roll_number: assignment.roll_number
        });
      }
    });
    
    return Array.from(studentMap.values());
  };

  const getStudentAssignments = (studentId: number) => {
    if (!assignments) return [];
    return assignments.filter((assignment: any) => 
      assignment.student_id === studentId && assignment.assignment_id
    );
  };

  const getAssignmentStats = () => {
    if (!assignments) return { total: 0, completed: 0, pending: 0 };
    
    const assignmentsWithId = assignments.filter((a: any) => a.assignment_id);
    const completed = assignmentsWithId.filter((a: any) => a.is_completed).length;
    const total = assignmentsWithId.length;
    const pending = total - completed;
    
    return { total, completed, pending };
  };

  const stats = getAssignmentStats();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Assignment Management</h1>
            <p className="text-neutral-600">
              Create and track homework assignments for your assigned classes.
            </p>
          </div>

          {/* Class Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Class Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Select Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedClasses?.map((classItem: any) => (
                        <SelectItem key={classItem.id} value={classItem.id.toString()}>
                          {classItem.name} - Grade {classItem.grade} {classItem.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClass && (
                  <Dialog open={isAddingAssignment} onOpenChange={setIsAddingAssignment}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Assignment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Assignment Title</label>
                          <Input
                            value={newAssignment.title}
                            onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter assignment title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Description</label>
                          <Textarea
                            value={newAssignment.description}
                            onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter assignment description"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Due Date (optional)</label>
                          <Input
                            type="date"
                            value={newAssignment.dueDate}
                            onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddingAssignment(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateAssignment}
                            disabled={!newAssignment.title || createAssignmentMutation.isPending}
                          >
                            {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Stats */}
          {selectedClass && assignments && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm text-neutral-500">Total Assignments</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm text-neutral-500">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <XCircle className="h-8 w-8 text-orange-500 mr-3" />
                    <div>
                      <p className="text-sm text-neutral-500">Pending</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Assignment List */}
          {selectedClass && assignments && (
            <Card>
              <CardHeader>
                <CardTitle>Student Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {getUniqueStudents().map((student: any) => {
                    const studentAssignments = getStudentAssignments(student.student_id);
                    return (
                      <div key={student.student_id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">{student.student_name}</h3>
                            <p className="text-sm text-neutral-500">Roll No: {student.roll_number}</p>
                          </div>
                          <Badge variant="outline">
                            {studentAssignments.filter((a: any) => a.is_completed).length} / {studentAssignments.length} completed
                          </Badge>
                        </div>
                        
                        {studentAssignments.length > 0 ? (
                          <div className="space-y-3">
                            {studentAssignments.map((assignment: any) => (
                              <AssignmentItem
                                key={assignment.assignment_id}
                                assignment={assignment}
                                onUpdate={handleUpdateAssignment}
                                isUpdating={updateAssignmentMutation.isPending}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-500">No assignments yet</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Class Selected */}
          {!selectedClass && (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-1">Select a Class</h3>
                <p className="text-neutral-500">Choose a class from the dropdown above to manage assignments.</p>
              </CardContent>
            </Card>
          )}

          {/* No Assigned Classes */}
          {assignedClasses?.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-1">No Classes Assigned</h3>
                <p className="text-neutral-500">You are not assigned as a class teacher for any classes yet.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function AssignmentItem({ assignment, onUpdate, isUpdating }: any) {
  const [isCompleted, setIsCompleted] = useState(assignment.is_completed);
  const [remarks, setRemarks] = useState(assignment.remarks || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(assignment.assignment_id, isCompleted, remarks);
    setIsEditing(false);
  };

  return (
    <div className="bg-neutral-50 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{assignment.assignment_title}</h4>
          {assignment.assignment_description && (
            <p className="text-xs text-neutral-600 mt-1">{assignment.assignment_description}</p>
          )}
          {assignment.due_date && (
            <p className="text-xs text-neutral-500 mt-1">
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isCompleted ? "default" : "secondary"}>
            {isCompleted ? "Completed" : "Pending"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {isEditing && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={setIsCompleted}
            />
            <label className="text-sm">Mark as completed</label>
          </div>
          <Textarea
            placeholder="Add remarks..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
