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
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";

export default function TeacherAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, { isPresent: boolean; remarks: string }>>({});

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

  // Fetch attendance for selected class and date
  const { data: students, isLoading: isLoadingStudents, refetch } = useQuery({
    queryKey: [`/api/classes/${selectedClass}/attendance`, selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/classes/${selectedClass}/attendance?date=${selectedDate}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json();
    },
    enabled: !!selectedClass,
  });

  // Initialize attendance data when students data changes
  useEffect(() => {
    if (students) {
      const initialData: Record<string, { isPresent: boolean; remarks: string }> = {};
      students.forEach((student: any) => {
        initialData[student.id] = {
          isPresent: student.is_present ?? true, // Default to present
          remarks: student.remarks || ""
        };
      });
      setAttendanceData(initialData);
    }
  }, [students]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecords: any[]) => {
      const promises = attendanceRecords.map(record =>
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(record)
        })
      );
      
      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      return results;
    },
    onSuccess: () => {
      toast({
        title: "Attendance Saved",
        description: "Attendance has been recorded successfully.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save attendance. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAttendance = () => {
    if (!selectedClass || !students) return;

    const attendanceRecords = students.map((student: any) => ({
      classId: parseInt(selectedClass),
      studentId: student.id,
      date: selectedDate,
      isPresent: attendanceData[student.id]?.isPresent ?? true,
      remarks: attendanceData[student.id]?.remarks || ""
    }));

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  const updateAttendance = (studentId: string, field: 'isPresent' | 'remarks', value: boolean | string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const getAttendanceStats = () => {
    if (!students) return { present: 0, absent: 0, total: 0 };
    
    const present = students.filter((student: any) => 
      attendanceData[student.id]?.isPresent !== false
    ).length;
    const total = students.length;
    const absent = total - present;
    
    return { present, absent, total };
  };

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Daily Attendance</h1>
            <p className="text-neutral-600">
              Record daily attendance for your assigned classes.
            </p>
          </div>

          {/* Class and Date Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Attendance Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          {selectedClass && students && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm text-neutral-500">Total Students</p>
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
                      <p className="text-sm text-neutral-500">Present</p>
                      <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <XCircle className="h-8 w-8 text-red-500 mr-3" />
                    <div>
                      <p className="text-sm text-neutral-500">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Attendance List */}
          {selectedClass && students && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Student Attendance</span>
                  <Button 
                    onClick={handleSaveAttendance}
                    disabled={saveAttendanceMutation.isPending}
                  >
                    {saveAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student: any) => (
                    <div key={student.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{student.name}</h3>
                          <p className="text-sm text-neutral-500">Roll No: {student.roll_number}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`present-${student.id}`}
                              checked={attendanceData[student.id]?.isPresent !== false}
                              onCheckedChange={(checked) => 
                                updateAttendance(student.id, 'isPresent', checked === true)
                              }
                            />
                            <label htmlFor={`present-${student.id}`} className="text-sm">
                              Present
                            </label>
                          </div>
                          <Badge 
                            variant={attendanceData[student.id]?.isPresent !== false ? "default" : "destructive"}
                          >
                            {attendanceData[student.id]?.isPresent !== false ? "Present" : "Absent"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Remarks (optional)</label>
                        <Textarea
                          placeholder="Add any remarks..."
                          value={attendanceData[student.id]?.remarks || ""}
                          onChange={(e) => updateAttendance(student.id, 'remarks', e.target.value)}
                          className="w-full"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Class Selected */}
          {!selectedClass && (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-1">Select a Class</h3>
                <p className="text-neutral-500">Choose a class from the dropdown above to record attendance.</p>
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
