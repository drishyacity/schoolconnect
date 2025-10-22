import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  BookOpen,
  FileText,
  Home,
  LogOut,
  Menu,
  PenTool,
  School,
  User,
  Users,
  VideoIcon,
  HelpCircle,
  Bell,
  BookText,
  Briefcase,
  BarChart2,
  Book,
  LineChart,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarSectionProps {
  title: string;
  links: SidebarLink[];
}

const SidebarSection = ({ title, links }: SidebarSectionProps) => {
  const [location] = useLocation();

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-xs uppercase text-white/60 font-semibold">{title}</div>
      {links.map((link, index) => (
        <Link key={index} href={link.href}>
          <div
            className={cn(
              "flex items-center px-4 py-3 text-white hover:bg-primary-dark cursor-pointer",
              location === link.href && "bg-primary-dark"
            )}
          >
            <span className="mr-3">{link.icon}</span>
            <span>{link.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export function Sidebar() {
  const { user, logoutMutation, isLoading } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full md:w-64 bg-primary text-white md:h-screen md:fixed z-20">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-primary-light">
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center text-primary">
                <School size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl">EduManage</h1>
                <p className="text-xs text-white/70">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin navigation links
  const adminDashboardLinks: SidebarLink[] = [
    { label: "Overview", href: "/admin", icon: <Home size={18} /> },
    { label: "My Profile", href: "/admin/profile", icon: <User size={18} /> },
  ];

  const adminManagementLinks: SidebarLink[] = [
    { label: "Users", href: "/admin/users", icon: <Users size={18} /> },
    { label: "Teachers", href: "/admin/teachers", icon: <User size={18} /> },
    { label: "Students", href: "/admin/students", icon: <School size={18} /> },
    { label: "Classes", href: "/admin/classes", icon: <BookOpen size={18} /> },
    { label: "Class Teachers", href: "/admin/class-teachers", icon: <UserCheck size={18} /> },
    { label: "Subjects", href: "/admin/subjects", icon: <Book size={18} /> },
  ];

  const adminContentLinks: SidebarLink[] = [
    { label: "Content Management", href: "/admin/content", icon: <BookText size={18} /> },
    { label: "Quizzes", href: "/admin/quizzes", icon: <HelpCircle size={18} /> },
  ];

  // Teacher navigation links
  const teacherDashboardLinks: SidebarLink[] = [
    { label: "Overview", href: "/teacher", icon: <Home size={18} /> },
    { label: "My Profile", href: "/teacher/profile", icon: <User size={18} /> },
  ];

  const teacherContentLinks: SidebarLink[] = [
    { label: "Content Management", href: "/teacher/content", icon: <BookText size={18} /> },
    { label: "Create Quizzes", href: "/quiz/create", icon: <HelpCircle size={18} /> },
  ];

  const teacherStudentLinks: SidebarLink[] = [
    { label: "My Classes", href: "/teacher/classes", icon: <Users size={18} /> },
    { label: "Daily Attendance", href: "/teacher/attendance", icon: <ClipboardCheck size={18} /> },
    { label: "Check Assignments", href: "/teacher/assignments", icon: <BookOpen size={18} /> },
    { label: "Performance", href: "/teacher/performance", icon: <LineChart size={18} /> },
  ];

  // Student navigation links
  const studentDashboardLinks: SidebarLink[] = [
    { label: "Overview", href: "/student", icon: <Home size={18} /> },
    { label: "My Profile", href: "/student/profile", icon: <User size={18} /> },
  ];

  const studentLearningLinks: SidebarLink[] = [
    { label: "Learning Materials", href: "/student/content", icon: <BookText size={18} /> },
    { label: "Quizzes", href: "/quiz", icon: <HelpCircle size={18} /> },
    { label: "Quiz Attempts", href: "/quiz-attempts", icon: <ClipboardCheck size={18} /> },
  ];

  const studentProgressLinks: SidebarLink[] = [
    { label: "Performance", href: "/student/performance", icon: <LineChart size={18} /> },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 md:hidden">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-4"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu />
          </Button>
          <h2 className="text-lg font-semibold text-neutral-800">
            {location === "/admin" || location === "/" ? "Dashboard" :
             location === "/teacher" ? "Teacher Dashboard" :
             location === "/student" ? "Student Dashboard" : "EduManage LMS"}
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Bell size={20} />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle size={20} />
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className={cn(
          "w-full md:w-64 bg-primary text-white md:h-screen md:fixed z-20 transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "block fixed inset-0" : "hidden md:block"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-primary-light">
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center text-primary">
                <School size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl">EduManage</h1>
                <p className="text-xs text-white/70">
                  {user?.role === 'admin' ? 'Administrator' :
                   user?.role === 'teacher' ? 'Teacher' :
                   user?.role === 'student' ? 'Student' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic navigation based on user role */}
          <div className="py-4 flex-1 overflow-y-auto">
            {user?.role === 'admin' && (
              <>
                <SidebarSection title="Dashboard" links={adminDashboardLinks} />
                <SidebarSection title="Management" links={adminManagementLinks} />
                <SidebarSection title="Content" links={adminContentLinks} />
              </>
            )}

            {user?.role === 'teacher' && (
              <>
                <SidebarSection title="Dashboard" links={teacherDashboardLinks} />
                <SidebarSection title="Content Management" links={teacherContentLinks} />
                <SidebarSection title="Students" links={teacherStudentLinks} />
              </>
            )}

            {user?.role === 'student' && (
              <>
                <SidebarSection title="Dashboard" links={studentDashboardLinks} />
                <SidebarSection title="Learning" links={studentLearningLinks} />
                <SidebarSection title="Progress" links={studentProgressLinks} />
              </>
            )}
          </div>

          <div className="mt-auto border-t border-primary-light">
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 border-2 border-primary-light">
                  {user?.profileImage ? (
                    <AvatarImage src={user.profileImage} alt={user.name} />
                  ) : (
                    <AvatarFallback className="bg-primary-light text-white">
                      {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{user?.name}</h3>
                  <p className="text-xs text-white/70 truncate">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
