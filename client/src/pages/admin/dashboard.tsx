import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  BookCopy,
  GraduationCap,
  BookOpen,
  MoveRight,
  CalendarClock,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/admin"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/admin");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
  });

  const chartData = [
    {
      name: "Students",
      count: dashboardData?.totalStudents || 0,
    },
    {
      name: "Teachers",
      count: dashboardData?.totalTeachers || 0,
    },
    {
      name: "Admins",
      count: dashboardData?.totalAdmins || 0,
    },
    {
      name: "Classes",
      count: dashboardData?.totalClasses || 0,
    },
    {
      name: "Subjects",
      count: dashboardData?.totalSubjects || 0,
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 space-y-6 p-6 md:p-8 md:ml-64">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <h1 className="text-3xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <div className="flex space-x-2">
            <Button onClick={() => setLocation("/admin/subjects")}>
              Manage Subjects
              <MoveRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => setLocation("/admin/users")}>
              Manage Users
              <MoveRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : dashboardData?.totalStudents || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Enrolled students
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Teachers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : dashboardData?.totalTeachers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active teachers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Classes
              </CardTitle>
              <BookCopy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : dashboardData?.totalClasses || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Classes in the system
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Subjects
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : dashboardData?.totalSubjects || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Subjects available
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Distribution of users, classes, and subjects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recently Joined Users</CardTitle>
              <CardDescription>
                New users that joined recently
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : !dashboardData?.recentUsers?.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent users
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData?.recentUsers?.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-start justify-between pb-4 border-b"
                    >
                      <div className="flex items-center">
                        <div className="border rounded-full p-2 mr-3">
                          <UserCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.createdAt && formatDate(new Date(user.createdAt))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest activities across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : !dashboardData?.recentActivities?.length ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent activities
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recentActivities?.map((activity: any) => (
                    <TableRow key={activity.id}>
                      <TableCell>{activity.user?.name || "Unknown"}</TableCell>
                      <TableCell>{activity.type}</TableCell>
                      <TableCell>{activity.resourceName}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarClock className="mr-1 h-4 w-4 text-muted-foreground" />
                          {activity.createdAt && formatDate(new Date(activity.createdAt))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}