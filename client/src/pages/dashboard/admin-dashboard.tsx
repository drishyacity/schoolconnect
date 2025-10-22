import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityCard } from "@/components/dashboard/activity-card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  HelpCircle, 
  School, 
  RefreshCcw,
  PlusCircle,
  FileText,
  BookCheck
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setLocation] = useLocation();

  // Fetch dashboard data
  const { data, isLoading } = useQuery({
    queryKey: ["/api/dashboard/admin", refreshKey],
    retry: false,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // User table columns
  const userColumns = [
    {
      title: "Name",
      field: "name",
    },
    {
      title: "Email",
      field: "email",
      className: "text-neutral-600",
    },
    {
      title: "Role",
      field: "role",
      render: (value: string) => (
        <Badge variant={value === 'admin' ? 'admin' : value === 'teacher' ? 'teacher' : 'student'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      title: "Status",
      field: "status",
      render: () => (
        <Badge variant="active">Active</Badge>
      ),
    },
    {
      title: "Joined Date",
      field: "joinedDate",
      render: () => {
        const date = new Date();
        const formattedDate = `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`;
        return formattedDate;
      },
      className: "text-neutral-600",
    },
  ];

  // Actions for user rows
  const userActions = [
    { label: "View Profile", value: "view" },
    { label: "Edit User", value: "edit" },
    { label: "Reset Password", value: "reset-password" },
    { label: "Disable Account", value: "disable" },
  ];

  const handleUserAction = (action: string, user: any) => {
    console.log(`Action ${action} on user:`, user);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Header (on desktop we use the fixed sidebar) */}
        <header className="bg-white shadow-sm p-4 hidden md:flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-neutral-800">
            Dashboard
          </h2>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <HelpCircle size={20} />
            </Button>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Administrator Dashboard</h1>
            <p className="text-neutral-600">
              Welcome back, {user?.name}! Here's an overview of your school's learning management system.
            </p>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Students"
              value={isLoading ? "Loading..." : data?.totalStudents || 0}
              icon={<School size={20} />}
              trend={{
                value: "12%",
                label: "from last month",
                positive: true
              }}
            />
            
            <StatsCard
              title="Total Teachers"
              value={isLoading ? "Loading..." : data?.totalTeachers || 0}
              icon={<Users size={20} />}
              iconClass="bg-accent/10 text-accent"
              trend={{
                value: "5%",
                label: "from last month",
                positive: true
              }}
            />
            
            <StatsCard
              title="Active Courses"
              value={isLoading ? "Loading..." : data?.totalClasses || 0}
              icon={<BookOpen size={20} />}
              iconClass="bg-secondary/10 text-secondary"
              trend={{
                value: "8%",
                label: "from last month",
                positive: true
              }}
            />
            
            <StatsCard
              title="Quiz Completions"
              value={isLoading ? "Loading..." : data?.totalQuizzes || 0}
              icon={<HelpCircle size={20} />}
              trend={{
                value: "24%",
                label: "from last month",
                positive: true
              }}
            />
          </div>
          
          {/* Recent Activity & Quick Access */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <ActivityCard
              className="lg:col-span-2"
              title="Recent Activity"
              activities={data?.recentActivities || []}
              viewAllLink="/admin/activity"
            />
            
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-neutral-200 p-4">
                <h2 className="font-semibold">Quick Access</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center text-center hover:border-primary/30"
                    onClick={() => setLocation('/admin/users')}
                  >
                    <Users className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm font-medium">Manage Users</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center text-center hover:border-primary/30"
                    onClick={() => setLocation('/admin/classes')}
                  >
                    <BookOpen className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm font-medium">Manage Classes</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center text-center hover:border-primary/30"
                    onClick={() => setLocation('/admin/quizzes')}
                  >
                    <HelpCircle className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm font-medium">Manage Quizzes</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center text-center hover:border-primary/30"
                    onClick={() => setLocation('/admin/homework')}
                  >
                    <PlusCircle className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm font-medium">Homework</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center text-center hover:border-primary/30"
                    onClick={() => setLocation('/admin/subjects')}
                  >
                    <BookCheck className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm font-medium">Subjects</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-2 flex flex-col items-center justify-center text-center hover:border-primary/30"
                    onClick={() => setLocation('/admin/teachers')}
                  >
                    <FileText className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm font-medium">Teachers</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Table of Recent Users */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="border-b border-neutral-200 p-4 flex justify-between items-center">
              <h2 className="font-semibold">Recent Users</h2>
              <Button variant="ghost" size="icon" onClick={handleRefresh}>
                <RefreshCcw className="h-5 w-5" />
              </Button>
            </div>
            
            <DataTable
              columns={userColumns}
              data={data?.recentUsers || []}
              rowActions={userActions}
              onRowAction={handleUserAction}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
