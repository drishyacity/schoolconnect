import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Book,
  CalendarCheck,
  HelpCircle,
  LineChart,
  Video,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { formatDateShort } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
  const { user } = useAuth();

  // Fetch student dashboard data
  const { data, isLoading } = useQuery({
    queryKey: ["/api/dashboard/student"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />

      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Student Dashboard</h1>
            <p className="text-neutral-600">
              Welcome back, {user?.name}! Here's a summary of your courses and learning activities.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Pending Assignments"
              value={isLoading ? "Loading..." : data?.pendingAssignments || 0}
              icon={<CalendarCheck size={20} />}
              iconClass="bg-accent/10 text-accent"
              trend={{
                label: "Due this week",
              }}
            />

            <StatsCard
              title="Quizzes Completed"
              value={isLoading ? "Loading..." : `${data?.completedQuizzes || 0}/${data?.totalQuizzes || 0}`}
              icon={<HelpCircle size={20} />}
              iconClass="bg-secondary/10 text-secondary"
              trend={{
                label: `${data?.completedQuizzes && data?.totalQuizzes ? Math.round((data.completedQuizzes / data.totalQuizzes) * 100) : 0}% completion rate`,
              }}
            />

            <StatsCard
              title="Average Score"
              value={isLoading ? "Loading..." : `${data?.averageScore || 0}%`}
              icon={<LineChart size={20} />}
              trend={{
                value: "5%",
                label: "from last month",
                positive: true
              }}
            />
          </div>

          {/* My Courses & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-neutral-200 p-4 flex justify-between items-center">
                <CardTitle className="text-base font-semibold">My Courses</CardTitle>
                <Button variant="link" size="sm" asChild>
                  <Link href="/student/courses">View All</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoading ? (
                    <p className="text-center py-4 text-neutral-500">Loading courses...</p>
                  ) : data?.enrolledCourses?.length > 0 ? (
                    data.enrolledCourses.slice(0, 4).map((course: any) => {
                      const progress = course.progress || 0;
                      const grade = course.grade || "N/A";

                      return (
                        <div key={course.id} className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition duration-300">
                          <div className="flex items-center mb-3">
                            <span className="bg-primary-light text-white w-10 h-10 flex items-center justify-center rounded-full mr-3">
                              <Book size={18} />
                            </span>
                            <div>
                              <h3 className="font-semibold">{course.name}</h3>
                              <p className="text-sm text-neutral-500">{course.teacher?.name || "No teacher assigned"}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm">
                              <span className="text-neutral-500">Progress:</span>
                              <span className="font-medium ml-1">{progress}%</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-neutral-500">Grade:</span>
                              <span className="font-medium ml-1">{grade}</span>
                            </div>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                          <div className="mt-4">
                            <Link href={`/student/content?classId=${course.id}`}>
                              <Button variant="outline" size="sm" className="text-primary">View Course</Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-4 text-neutral-500 md:col-span-2">No courses found. Please contact your administrator.</p>
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
                  <Link href="/student/content?type=homework">
                    <Button variant="outline" className="text-primary font-medium">View All Deadlines</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Resources */}
          <Card className="mb-8">
            <CardHeader className="border-b border-neutral-200 p-4">
              <CardTitle className="text-base font-semibold">Learning Resources</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/student/content?type=note" className="w-full">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-primary/10 p-3 rounded-full text-primary mb-4">
                      <Book size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Class Notes</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-2">Access lecture notes</p>
                  </Button>
                </Link>

                <Link href="/student/content?type=lecture" className="w-full">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-accent/10 p-3 rounded-full text-accent mb-4">
                      <Video size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Recorded Lectures</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-2">Watch video lectures</p>
                  </Button>
                </Link>

                <Link href="/quiz" className="w-full">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-secondary/10 p-3 rounded-full text-secondary mb-4">
                      <HelpCircle size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Practice Quizzes</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-2">Test your knowledge</p>
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Link href="/student/content?type=dpp" className="w-full">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-primary/10 p-3 rounded-full text-primary mb-4">
                      <LineChart size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Daily Practice</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-2">Practice problems</p>
                  </Button>
                </Link>

                <Link href="/student/content?type=sample_paper" className="w-full">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-accent/10 p-3 rounded-full text-accent mb-4">
                      <FileText size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Sample Papers</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-2">Exam preparation</p>
                  </Button>
                </Link>

                <Link href="/student/content" className="w-full">
                  <Button variant="outline" className="w-full h-auto min-h-[200px] border border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 transition duration-300">
                    <div className="bg-secondary/10 p-3 rounded-full text-secondary mb-4">
                      <Book size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">Study Materials</h3>
                    <p className="text-sm text-neutral-600 text-center line-clamp-2">Learning resources</p>
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
