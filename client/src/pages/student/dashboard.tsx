import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { QuizList } from "@/components/student/quiz-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  CalendarClock,
  GraduationCap,
  Library,
  MoveRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/student", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/student`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 space-y-6 p-6 md:p-8 md:ml-64">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.name || "Student"}!
          </h1>
          <Button onClick={() => setLocation("/student/classes")}>
            Browse Classes
            <MoveRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Quizzes
              </CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `${dashboardData?.completedQuizzes || 0}/${dashboardData?.totalQuizzes || 0}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Quiz completion progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Assignments Completed
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `${dashboardData?.completedAssignments || 0}/${dashboardData?.totalAssignments || 0}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Assignment completion progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                School Attendance
              </CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `${dashboardData?.attendancePercentage || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                This month's attendance
              </p>
            </CardContent>
          </Card>
        </div>



        <h2 className="text-2xl font-bold tracking-tight pt-4">Available Quizzes</h2>
        <QuizList />
      </div>
    </div>
  );
}