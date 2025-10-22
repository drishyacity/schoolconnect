import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, School, UserCheck, UserX, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ClassTeachers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch all classes
  const { data: classes, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const response = await fetch("/api/classes", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  // Fetch all teachers
  const { data: teachers, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ["/api/users?role=teacher"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=teacher", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return response.json();
    },
  });

  // Fetch class teachers assignments
  const { data: classTeachers, isLoading: isLoadingAssignments, refetch } = useQuery({
    queryKey: ["/api/class-teachers"],
    queryFn: async () => {
      const response = await fetch("/api/class-teachers", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch class teachers");
      return response.json();
    },
  });

  // Assign teacher mutation
  const assignTeacherMutation = useMutation({
    mutationFn: async ({ classId, teacherId }: { classId: number; teacherId: number }) => {
      const response = await fetch(`/api/classes/${classId}/assign-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teacherId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign teacher");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Teacher Assigned",
        description: "Class teacher has been assigned successfully.",
      });
      setIsAssigning(false);
      setSelectedClass("");
      setSelectedTeacher("");
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign teacher. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove teacher mutation
  const removeTeacherMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await fetch(`/api/classes/${classId}/teacher`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to remove teacher");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Teacher Removed",
        description: "Class teacher has been removed successfully.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove teacher. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssignTeacher = () => {
    if (!selectedClass || !selectedTeacher) return;
    
    assignTeacherMutation.mutate({
      classId: parseInt(selectedClass),
      teacherId: parseInt(selectedTeacher)
    });
  };

  const handleRemoveTeacher = (classId: number) => {
    removeTeacherMutation.mutate(classId);
  };

  const getClassTeacher = (classId: number) => {
    return classTeachers?.find((ct: any) => ct.class_id === classId);
  };

  const getTeacherName = (teacherId: number) => {
    return teachers?.find((t: any) => t.id === teacherId)?.name || "Unknown Teacher";
  };

  const getUnassignedClasses = () => {
    if (!classes || !classTeachers) return [];
    return classes.filter((cls: any) => !getClassTeacher(cls.id));
  };

  const getAssignedClasses = () => {
    if (!classes || !classTeachers) return [];
    return classes.filter((cls: any) => getClassTeacher(cls.id));
  };

  const getAvailableTeachers = () => {
    if (!teachers || !classTeachers) return teachers || [];
    const assignedTeacherIds = classTeachers.map((ct: any) => ct.teacher_id);
    return teachers.filter((teacher: any) => !assignedTeacherIds.includes(teacher.id));
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Class Teacher Assignments</h1>
            <p className="text-neutral-600">
              Assign teachers as class teachers for different classes.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <School className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm text-neutral-500">Total Classes</p>
                    <p className="text-2xl font-bold">{classes?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm text-neutral-500">Assigned Classes</p>
                    <p className="text-2xl font-bold text-green-600">{getAssignedClasses().length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <UserX className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm text-neutral-500">Unassigned Classes</p>
                    <p className="text-2xl font-bold text-orange-600">{getUnassignedClasses().length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assign New Teacher */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assign Class Teacher</span>
                <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Teacher
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Class Teacher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Select Class</label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a class" />
                          </SelectTrigger>
                          <SelectContent>
                            {getUnassignedClasses().map((cls: any) => (
                              <SelectItem key={cls.id} value={cls.id.toString()}>
                                {cls.name} - Grade {cls.grade} {cls.section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Select Teacher</label>
                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTeachers().map((teacher: any) => (
                              <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                {teacher.name} ({teacher.teacher_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsAssigning(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAssignTeacher}
                          disabled={!selectedClass || !selectedTeacher || assignTeacherMutation.isPending}
                        >
                          {assignTeacherMutation.isPending ? "Assigning..." : "Assign Teacher"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Assigned Classes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Assigned Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {getAssignedClasses().length > 0 ? (
                <div className="space-y-4">
                  {getAssignedClasses().map((cls: any) => {
                    const classTeacher = getClassTeacher(cls.id);
                    return (
                      <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{cls.name}</h3>
                          <p className="text-sm text-neutral-500">
                            Grade {cls.grade} {cls.section} • {cls.students?.length || 0} students
                          </p>
                          <div className="flex items-center mt-2">
                            <Badge variant="default" className="mr-2">
                              Class Teacher: {getTeacherName(classTeacher?.teacher_id)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveTeacher(cls.id)}
                          disabled={removeTeacherMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-1">No Assigned Classes</h3>
                  <p className="text-neutral-500">No classes have been assigned to teachers yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unassigned Classes */}
          {getUnassignedClasses().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unassigned Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getUnassignedClasses().map((cls: any) => (
                    <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                      <div>
                        <h3 className="font-medium">{cls.name}</h3>
                        <p className="text-sm text-neutral-500">
                          Grade {cls.grade} {cls.section} • {cls.students?.length || 0} students
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          No Class Teacher Assigned
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
