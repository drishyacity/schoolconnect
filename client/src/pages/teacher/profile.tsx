import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Trash2, GraduationCap, Book, Clock, Plus } from "lucide-react";
import { experienceLevels } from "@/lib/utils";

// Define types for teacher qualifications and subjects
type Qualification = {
  id: number;
  teacherId: number;
  qualification: string;
  institution: string;
  year: number | null;
};

type Subject = {
  id: number;
  name: string;
  description: string | null;
};

type TeacherSubject = {
  id: number;
  teacherId: number;
  subjectId: number;
  subject: Subject;
};

type TeacherDetails = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
  bio: string | null;
  experienceLevel: string | null;
  qualifications: Qualification[];
  subjects: (TeacherSubject & { subject: Subject })[];
};

export default function TeacherProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteQualId, setDeleteQualId] = useState<number | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<number | null>(null);

  const { data: teacherDetails, isLoading, refetch } = useQuery<TeacherDetails>({
    queryKey: ["/api/users", user?.id, "teacher-details"],
    queryFn: async () => {
      console.log(`Fetching teacher details for user ${user?.id}`);
      const res = await fetch(`http://localhost:5000/api/users/${user?.id}/teacher-details`, {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch teacher details: ${res.status}`);
      }

      const data = await res.json();
      console.log(`Received teacher details:`, data);
      return data;
    },
    enabled: !!user && user.role === "teacher",
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  const deleteQualificationMutation = useMutation({
    mutationFn: async (qualificationId: number) => {
      await apiRequest("DELETE", `/api/teachers/qualifications/${qualificationId}`);
    },
    onSuccess: () => {
      // Invalidate the query with the correct query key structure
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "teacher-details"] });
      // Also refetch to ensure UI is updated
      refetch();

      toast({
        title: "Qualification removed",
        description: "Your qualification has been successfully removed.",
        variant: "default",
      });
      setDeleteQualId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to remove qualification",
        description: error.message || "An error occurred while removing the qualification.",
        variant: "destructive",
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (subjectId: number) => {
      await apiRequest("DELETE", `/api/teachers/subjects/${subjectId}`);
    },
    onSuccess: () => {
      // Invalidate the query with the correct query key structure
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "teacher-details"] });
      // Also refetch to ensure UI is updated
      refetch();

      toast({
        title: "Subject removed",
        description: "The subject has been successfully removed from your profile.",
        variant: "default",
      });
      setDeleteSubjectId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to remove subject",
        description: error.message || "An error occurred while removing the subject.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteQualification = (id: number) => {
    setDeleteQualId(id);
  };

  const handleDeleteSubject = (id: number) => {
    setDeleteSubjectId(id);
  };

  const confirmDeleteQualification = () => {
    if (deleteQualId) {
      deleteQualificationMutation.mutate(deleteQualId);
    }
  };

  const confirmDeleteSubject = () => {
    if (deleteSubjectId) {
      deleteSubjectMutation.mutate(deleteSubjectId);
    }
  };

  const getExperienceLevelLabel = (level: string) => {
    return experienceLevels.find(e => e.value === level)?.label || level;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="animate-pulse text-neutral-400">Loading profile information...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />

      <div className="md:ml-64 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Teacher Profile</h1>
            <p className="text-neutral-600">Manage your profile, qualifications and subjects</p>
          </div>
          <Button
            className="mt-4 md:mt-0"
            onClick={() => setLocation("/teacher/profile/edit")}
          >
            <Pencil size={16} className="mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Avatar className="h-24 w-24">
                  {teacherDetails?.profileImage ? (
                    <AvatarImage src={teacherDetails.profileImage} alt={teacherDetails.name} />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary text-white">
                      {getInitials(teacherDetails?.name || user?.name || '')}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <CardTitle>{teacherDetails?.name || user?.name}</CardTitle>
              <CardDescription>{teacherDetails?.email || user?.email}</CardDescription>

              {teacherDetails?.experienceLevel && (
                <Badge variant="outline" className="mt-2">
                  <Clock size={14} className="mr-1" />
                  {getExperienceLevelLabel(teacherDetails.experienceLevel)}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Bio</h3>
                  <p className="text-sm">
                    {teacherDetails?.bio || "No bio provided yet. Click 'Edit Profile' to add a bio."}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    {teacherDetails?.subjects && teacherDetails.subjects.length > 0 ? (
                      teacherDetails.subjects.map((subj) => (
                        <Badge key={subj.id} variant="secondary">
                          <Book size={12} className="mr-1" />
                          {subj.subject.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-400">No subjects assigned yet</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-neutral-200 flex justify-center py-4">
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link href="/teacher">Go to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Qualifications & Subjects Tabs */}
          <Card className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="border-b border-neutral-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="overview">Qualifications</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Qualifications & Certificates</h3>
                    <Button size="sm" asChild>
                      <Link href="/teacher/profile/add-qualification">
                        <Plus size={16} className="mr-1" />
                        Add Qualification
                      </Link>
                    </Button>
                  </div>

                  {teacherDetails?.qualifications && teacherDetails.qualifications.length > 0 ? (
                    <div className="space-y-4">
                      {teacherDetails.qualifications.map((qual) => (
                        <Card key={qual.id} className="overflow-hidden">
                          <div className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <GraduationCap size={18} className="text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{qual.qualification}</h4>
                                <p className="text-sm text-neutral-600">{qual.institution}</p>
                                {qual.year && (
                                  <p className="text-xs text-neutral-500 mt-1">Year: {qual.year}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteQualification(qual.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                      <GraduationCap size={36} className="text-neutral-300 mx-auto mb-2" />
                      <h3 className="text-neutral-600 font-medium mb-1">No qualifications added yet</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        Add your degrees, certificates and qualifications
                      </p>
                      <Button size="sm" asChild>
                        <Link href="/teacher/profile/add-qualification">
                          <Plus size={16} className="mr-1" />
                          Add First Qualification
                        </Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="subjects" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Teaching Subjects</h3>
                      <p className="text-sm text-neutral-500">You can teach up to 3 subjects</p>
                    </div>
                    {teacherDetails?.subjects && teacherDetails.subjects.length < 3 && (
                      <Button size="sm" asChild>
                        <Link href="/teacher/profile/add-subject">
                          <Plus size={16} className="mr-1" />
                          Add Subject
                        </Link>
                      </Button>
                    )}
                  </div>

                  {teacherDetails?.subjects && teacherDetails.subjects.length > 0 ? (
                    <div className="space-y-4">
                      {teacherDetails.subjects.map((subj) => (
                        <Card key={subj.id} className="overflow-hidden">
                          <div className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="bg-secondary/10 p-2 rounded-full">
                                <Book size={18} className="text-secondary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{subj.subject.name}</h4>
                                {subj.subject.description && (
                                  <p className="text-sm text-neutral-600">{subj.subject.description}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteSubject(subj.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                      <Book size={36} className="text-neutral-300 mx-auto mb-2" />
                      <h3 className="text-neutral-600 font-medium mb-1">No subjects added yet</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        Add the subjects you can teach (maximum 3)
                      </p>
                      <Button size="sm" asChild>
                        <Link href="/teacher/profile/add-subject">
                          <Plus size={16} className="mr-1" />
                          Add First Subject
                        </Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Delete Qualification Confirmation Dialog */}
      <AlertDialog open={!!deleteQualId} onOpenChange={() => setDeleteQualId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this qualification from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={confirmDeleteQualification}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subject Confirmation Dialog */}
      <AlertDialog open={!!deleteSubjectId} onOpenChange={() => setDeleteSubjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This subject will be removed from your teaching profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={confirmDeleteSubject}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}