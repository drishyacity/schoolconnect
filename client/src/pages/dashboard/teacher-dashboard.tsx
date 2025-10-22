import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Users,
  BookOpen,
  HelpCircle,
  Upload,
  School,
  LineChart,
  FileText,
  Video,
  CalendarCheck,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRelativeTime, formatDateShort } from "@/lib/utils";

export default function TeacherDashboard() {
  const { user } = useAuth();

  // Fetch teacher dashboard data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard/teacher"],
    queryFn: async () => {
      console.log("Fetching teacher dashboard data");
      const res = await fetch("http://localhost:5000/api/dashboard/teacher", {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard data: ${res.status}`);
      }

      const data = await res.json();
      console.log("Received teacher dashboard data:", data);
      return data;
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />

      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Teacher Dashboard</h1>
            <p className="text-neutral-600">
              Welcome back, {user?.name}! Here's an overview of your classes and content.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="My Classes"
              value={isLoading ? "Loading..." : data?.classes?.length || 0}
              icon={<BookOpen size={20} />}
              trend={{
                label: "Active semester",
              }}
            />

            <StatsCard
              title="Total Students"
              value={isLoading ? "Loading..." : data?.totalStudents || 0}
              icon={<School size={20} />}
              iconClass="bg-accent/10 text-accent"
              trend={{
                value: "12",
                label: "since last month",
                positive: true
              }}
            />

            <StatsCard
              title="Pending Grading"
              value={isLoading ? "Loading..." : data?.pendingGrading || 0}
              icon={<Activity size={20} />}
              iconClass="bg-secondary/10 text-secondary"
              trend={{
                label: "Due within 5 days",
              }}
            />

            <StatsCard
              title="Content Uploads"
              value={isLoading ? "Loading..." : data?.contentUploads || 0}
              icon={<Upload size={20} />}
              trend={{
                value: "8",
                label: "this week",
                positive: true
              }}
            />
          </div>

          {/* My Classes & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-neutral-200 p-4 flex justify-between items-center">
                <CardTitle className="text-base font-semibold">My Classes</CardTitle>
                <Button variant="link" size="sm" asChild>
                  <Link href="/teacher/classes">View All</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {isLoading ? (
                    <p className="text-center py-4 text-neutral-500">Loading classes...</p>
                  ) : data?.classes?.length > 0 ? (
                    data.classes.slice(0, 3).map((classItem: any) => (
                      <div key={classItem.id} className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition duration-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{classItem.name}</h3>
                            <p className="text-neutral-600 text-sm">
                              {classItem.subject?.name || "No subject"} • {classItem.schedule || "No schedule"}
                            </p>
                            <div className="flex items-center mt-2">
                              <span className="text-sm text-neutral-600 mr-4">
                                <Users className="h-4 w-4 inline mr-1" /> {classItem.students?.length || 0} Students
                              </span>
                              <span className="text-sm text-neutral-600">
                                <FileText className="h-4 w-4 inline mr-1" /> {classItem.contents?.length || 0} Resources
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-primary">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/teacher/classes/${classItem.id}`}>
                            <Button variant="outline" size="sm" className="text-primary">Class Details</Button>
                          </Link>
                          <Link href={`/teacher/content?classId=${classItem.id}`}>
                            <Button variant="outline" size="sm" className="text-primary">Upload Content</Button>
                          </Link>
                          <Link href={`/teacher/content?type=homework&classId=${classItem.id}`}>
                            <Button variant="outline" size="sm" className="text-primary">Create Assignment</Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-neutral-500">No classes found. Add your first class!</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-neutral-200 p-4">
                <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {isLoading ? (
                    <p className="text-center py-4 text-neutral-500">Loading deadlines...</p>
                  ) : data?.upcomingDeadlines?.length > 0 ? (
                    data.upcomingDeadlines.map((deadline: any) => {
                      const { month, day } = formatDateShort(new Date(deadline.dueDate));
                      const daysLeft = Math.ceil((new Date(deadline.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      let badge = null;

                      if (daysLeft === 0) {
                        badge = <Badge variant="primary" className="bg-primary/10 text-primary">Today</Badge>;
                      } else if (daysLeft === 1) {
                        badge = <Badge variant="primary" className="bg-primary/10 text-primary">Tomorrow</Badge>;
                      } else {
                        badge = <Badge variant="outline" className="bg-neutral-200 text-neutral-700">{daysLeft} days left</Badge>;
                      }

                      return (
                        <div key={deadline.id} className="flex items-start space-x-3">
                          <div className="bg-accent/10 text-accent min-w-[40px] h-10 rounded-md flex flex-col items-center justify-center">
                            <span className="text-xs font-bold">{month}</span>
                            <span className="text-sm font-bold">{day}</span>
                          </div>
                          <div>
                            <h3 className="font-medium">{deadline.title}</h3>
                            <p className="text-sm text-neutral-600">{deadline.description || 'No description'}</p>
                            <div className="mt-1 flex items-center">
                              {badge}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-4 text-neutral-500">No upcoming deadlines.</p>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <Link href="/teacher/deadlines">
                    <Button variant="outline" className="text-primary font-medium">View All Deadlines</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create New Content */}
          <Card className="mb-8">
            <CardHeader className="border-b border-neutral-200 p-4">
              <CardTitle className="text-base font-semibold">Create New Content</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/teacher/content?type=note">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-primary/10 p-3 rounded-full text-primary mb-4">
                      <FileText size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Upload Notes</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-3">Upload lecture notes, slides, or study materials</p>
                  </Button>
                </Link>

                <Link href="/quiz/create">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-accent/10 p-3 rounded-full text-accent mb-4">
                      <HelpCircle size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Create Quiz</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-3">Create MCQ quizzes with auto-scoring</p>
                  </Button>
                </Link>

                <Link href="/teacher/content?type=homework">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-secondary/10 p-3 rounded-full text-secondary mb-4">
                      <CalendarCheck size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Assign Homework</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-3">Create and assign homework with deadlines</p>
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Link href="/teacher/content?type=lecture">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-primary/10 p-3 rounded-full text-primary mb-4">
                      <Video size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Upload Lecture</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-3">Upload recorded video lectures for students</p>
                  </Button>
                </Link>

                <Link href="/teacher/content?type=dpp">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-accent/10 p-3 rounded-full text-accent mb-4">
                      <LineChart size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Create DPP</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-3">Create daily practice problems</p>
                  </Button>
                </Link>

                <Link href="/teacher/content?type=sample_paper">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-secondary/10 p-3 rounded-full text-secondary mb-4">
                      <FileText size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Sample Papers</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-3">Create sample exam papers</p>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
