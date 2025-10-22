import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Pencil, BookOpen, Book, CalendarClock } from "lucide-react";
import { Link } from "wouter";

// Define types for student profile
type StudentDetails = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
  bio: string | null;
  grade: number | null;
  section: string | null;
  enrolledClasses: {
    id: number;
    name: string;
    grade: number;
    section: string | null;
  }[];
  completedQuizzes: number;
  totalQuizzes: number;
  averageScore: number;
};

export default function StudentProfile() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: studentDetails, isLoading } = useQuery<StudentDetails>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

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
            <div className="animate-pulse text-neutral-400">Loading student profile information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="text-neutral-600">Profile not found or an error occurred.</div>
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
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-neutral-600">View and manage your profile information</p>
          </div>
          <Button asChild className="mt-4 md:mt-0">
            <Link to="/student/profile/edit">
              <Pencil className="mr-2 h-4 w-4" /> Edit Profile
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Information Card */}
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Student Information</CardTitle>
              <CardDescription>Personal details and class information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center mb-6 pt-4">
                <div className="relative group mb-4">
                  <Avatar className="h-24 w-24">
                    {studentDetails.profileImage ? (
                      <AvatarImage src={studentDetails.profileImage} alt={studentDetails.name} />
                    ) : (
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {getInitials(studentDetails.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Link to="/student/profile/edit" className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-5 w-5 text-white" />
                  </Link>
                </div>
                <h2 className="text-xl font-bold">{studentDetails.name}</h2>
                <p className="text-neutral-600">{studentDetails.username}</p>
                <div className="mt-2 text-sm text-center">
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <User size={14} />
                    <span>Student</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Email</h3>
                  <p>{studentDetails.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Grade</h3>
                  <p>{studentDetails.grade || "Not assigned"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Section</h3>
                  <p>{studentDetails.section || "Not assigned"}</p>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-neutral-500">Bio</h3>
                    <Link to="/student/profile/edit" className="text-xs text-primary flex items-center hover:underline">
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Link>
                  </div>
                  {studentDetails.bio ? (
                    <p className="text-sm">{studentDetails.bio}</p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">Add a bio to tell others about yourself</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Statistics */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Academic Statistics</CardTitle>
              <CardDescription>Your academic performance and enrolled classes</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="classes">
                <TabsList className="mb-4">
                  <TabsTrigger value="classes">Enrolled Classes</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="classes">
                  <div className="space-y-4">
                    {studentDetails.enrolledClasses && studentDetails.enrolledClasses.length > 0 ? (
                      studentDetails.enrolledClasses.map((classItem) => (
                        <Card key={classItem.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{classItem.name}</h3>
                              <p className="text-sm text-neutral-500">
                                Grade {classItem.grade}{classItem.section ? `, Section ${classItem.section}` : ''}
                              </p>
                            </div>
                            <Button variant="outline" asChild>
                              <Link to={`/student/classes/${classItem.id}`}>
                                <BookOpen className="mr-2 h-4 w-4" /> View
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-neutral-500">
                        You are not enrolled in any classes yet.
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="performance">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold mb-2">
                          {studentDetails.completedQuizzes} / {studentDetails.totalQuizzes}
                        </div>
                        <div className="text-sm text-center text-neutral-500 flex items-center">
                          <Book className="mr-1 h-4 w-4" /> Quizzes Completed
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold mb-2">
                          {studentDetails.averageScore ? `${studentDetails.averageScore}%` : "N/A"}
                        </div>
                        <div className="text-sm text-center text-neutral-500 flex items-center">
                          <CalendarClock className="mr-1 h-4 w-4" /> Average Score
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold mb-2">
                          {studentDetails.totalQuizzes - studentDetails.completedQuizzes}
                        </div>
                        <div className="text-sm text-center text-neutral-500 flex items-center">
                          <CalendarClock className="mr-1 h-4 w-4" /> Pending Quizzes
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* We can add a performance chart here later */}
                  <div className="text-center py-4 text-neutral-600">
                    {studentDetails.completedQuizzes > 0 ? (
                      <p>Detailed performance metrics will be available soon.</p>
                    ) : (
                      <p>Complete quizzes to see your performance metrics.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}