import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Book, Users, GraduationCap, LineChart } from "lucide-react";

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
  completedQuizzes?: number;
  totalQuizzes?: number;
  averageScore?: number;
  enrolledClasses?: Array<{
    id: number;
    name: string;
    grade: number;
    section: string | null;
  }>;
};

export default function StudentProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: studentDetails, isLoading } = useQuery<StudentDetails>({
    queryKey: [`/api/users/${user?.id}`],
    enabled: !!user && user.role === "student",
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
            <h1 className="text-2xl font-bold">Student Profile</h1>
            <p className="text-neutral-600">Manage your profile and view your class information</p>
          </div>
          <Button 
            className="mt-4 md:mt-0"
            onClick={() => setLocation("/student/profile/edit")}
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
                  {studentDetails?.profileImage ? (
                    <AvatarImage src={studentDetails.profileImage} alt={studentDetails.name} />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary text-white">
                      {getInitials(studentDetails?.name || user?.name || '')}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <CardTitle>{studentDetails?.name || user?.name}</CardTitle>
              <CardDescription>{studentDetails?.email || user?.email}</CardDescription>
              
              {(studentDetails?.grade && studentDetails?.section) ? (
                <Badge variant="outline" className="mt-2">
                  <GraduationCap size={14} className="mr-1" />
                  Class {studentDetails.grade}-{studentDetails.section}
                </Badge>
              ) : studentDetails?.grade ? (
                <Badge variant="outline" className="mt-2">
                  <GraduationCap size={14} className="mr-1" />
                  Grade {studentDetails.grade}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Bio</h3>
                  <p className="text-sm">
                    {studentDetails?.bio || "No bio provided yet."}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Student ID</h3>
                  <div className="text-sm font-mono bg-neutral-100 p-2 rounded">
                    {studentDetails?.username || user?.username}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-neutral-200 flex justify-center py-4">
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link href="/student">Go to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Academic Information */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-neutral-200">
              <CardTitle>Academic Information</CardTitle>
              <CardDescription>
                Your classes, grades, and academic progress
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="bg-blue-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Book className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold">{studentDetails?.enrolledClasses?.length || 0}</div>
                      <div className="text-sm text-neutral-600">Enrolled Classes</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="bg-green-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold">{studentDetails?.completedQuizzes || 0}/{studentDetails?.totalQuizzes || 0}</div>
                      <div className="text-sm text-neutral-600">Quizzes Completed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="bg-purple-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2">
                        <LineChart className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold">{studentDetails?.averageScore || 0}%</div>
                      <div className="text-sm text-neutral-600">Average Score</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-lg font-semibold mb-4">Your Classes</h3>
              
              {studentDetails?.enrolledClasses && studentDetails.enrolledClasses.length > 0 ? (
                <div className="space-y-4">
                  {studentDetails.enrolledClasses.map((cls) => (
                    <Card key={cls.id} className="overflow-hidden">
                      <div className="p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{cls.name}</h4>
                          <p className="text-sm text-neutral-600">
                            Grade {cls.grade}{cls.section ? `-${cls.section}` : ''}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/student/classes/${cls.id}`}>View Class</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                  <Book size={36} className="text-neutral-300 mx-auto mb-2" />
                  <h3 className="text-neutral-600 font-medium mb-1">No classes yet</h3>
                  <p className="text-neutral-400 text-sm mb-4">
                    You are not enrolled in any classes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}