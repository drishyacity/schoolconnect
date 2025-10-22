import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

import AdminDashboard from "@/pages/dashboard/admin-dashboard";
import TeacherDashboard from "@/pages/dashboard/teacher-dashboard";
import StudentDashboard from "@/pages/dashboard/student-dashboard";
import AuthPage from "@/pages/auth-page";
import QuizPage from "@/pages/quiz/quiz-page";
import SimpleQuizPage from "@/pages/quiz/simple-quiz-page";
import FixedQuizPage from "@/pages/quiz/fixed-quiz-page";
import QuizCreate from "@/pages/quiz/quiz-create";
import QuizEdit from "@/pages/quiz/quiz-edit";
import QuizView from "@/pages/quiz/quiz-view";

// Lazy-loaded admin components
const UsersPage = lazy(() => import("@/pages/admin/users"));
const AddUserPage = lazy(() => import("@/pages/admin/add-user"));
const ClassesPage = lazy(() => import("@/pages/admin/classes"));
const SubjectsPage = lazy(() => import("@/pages/admin/subjects"));
const TeachersPage = lazy(() => import("@/pages/admin/teachers"));
const StudentsPage = lazy(() => import("@/pages/admin/students"));
const AdminTeacherProfile = lazy(() => import("@/pages/admin/teacher-profile"));
const AdminStudentProfile = lazy(() => import("@/pages/admin/student-profile"));
const AdminProfile = lazy(() => import("@/pages/admin/profile"));
const AdminContentManagement = lazy(() => import("@/pages/admin/content-management"));
const AdminQuizzesPage = lazy(() => import("@/pages/admin/quizzes"));
const ClassTeachersPage = lazy(() => import("@/pages/admin/class-teachers"));

// Lazy-loaded teacher profile components
const TeacherProfile = lazy(() => import("@/pages/teacher/profile"));
const EditTeacherProfile = lazy(() => import("@/pages/teacher/profile/edit"));
const AddQualification = lazy(() => import("@/pages/teacher/profile/add-qualification"));
const AddSubject = lazy(() => import("@/pages/teacher/profile/add-subject"));
const TeacherContentManagement = lazy(() => import("@/pages/teacher/content-management"));

// Lazy-loaded student profile components
const StudentProfile = lazy(() => import("@/pages/student/profile"));
const StudentContentAccess = lazy(() => import("@/pages/student/content-access"));

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {/* Admin Routes */}
      <ProtectedRoute path="/" role="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin" role="admin" component={AdminDashboard} />
      <ProtectedRoute
        path="/admin/users"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <UsersPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/users/new"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AddUserPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/classes"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ClassesPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/subjects"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SubjectsPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/teachers"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TeachersPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/students"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <StudentsPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/content"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AdminContentManagement />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/teachers/:id"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AdminTeacherProfile />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/students/:id"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AdminStudentProfile />
          </Suspense>
        )}
      />

      <ProtectedRoute
        path="/admin/profile"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AdminProfile />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/quizzes"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AdminQuizzesPage />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/admin/class-teachers"
        role="admin"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ClassTeachersPage />
          </Suspense>
        )}
      />

      {/* Teacher Routes */}
      <ProtectedRoute path="/teacher" role="teacher" component={TeacherDashboard} />
      <ProtectedRoute path="/quiz/create" role="teacher" component={QuizCreate} />
      <Route path="/quiz/edit/:id" component={QuizEdit} />
      <Route path="/quiz/view/:id" component={QuizView} />
      <Route path="/content/edit/:id" component={() => {
        const ContentEdit = lazy(() => import("@/pages/content/content-edit"));
        return (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ContentEdit />
          </Suspense>
        );
      }} />

      {/* Teacher Profile Routes */}
      <ProtectedRoute
        path="/teacher/profile"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TeacherProfile />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/teacher/profile/edit"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <EditTeacherProfile />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/teacher/profile/add-qualification"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AddQualification />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/teacher/profile/add-subject"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AddSubject />
          </Suspense>
        )}
      />

      <ProtectedRoute
        path="/teacher/content"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TeacherContentManagement />
          </Suspense>
        )}
      />
      <ProtectedRoute path="/teacher/classes" role="teacher" component={() => <div className="md:ml-64 p-6"><h1 className="text-2xl font-bold mb-6">My Classes</h1><p className="text-lg">View all your class assignments and students.</p></div>} />
      <ProtectedRoute path="/teacher/performance" role="teacher" component={() => <div className="md:ml-64 p-6"><h1 className="text-2xl font-bold mb-6">Student Performance</h1><p className="text-lg">View performance analytics for your students.</p></div>} />
      <ProtectedRoute
        path="/teacher/attendance"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            {(() => {
              const TeacherAttendance = lazy(() => import("@/pages/teacher/attendance"));
              return <TeacherAttendance />;
            })()}
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/teacher/assignments"
        role="teacher"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            {(() => {
              const TeacherAssignments = lazy(() => import("@/pages/teacher/assignments"));
              return <TeacherAssignments />;
            })()}
          </Suspense>
        )}
      />

      {/* Student Routes */}
      <ProtectedRoute path="/student" role="student" component={StudentDashboard} />
      <ProtectedRoute path="/quiz/:id" role="student" component={FixedQuizPage} />
      <ProtectedRoute path="/quiz" role="student" component={() => (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          {(() => {
            const StudentQuizzes = lazy(() => import("@/pages/student/quizzes"));
            return <StudentQuizzes />;
          })()}
        </Suspense>
      )} />
      <ProtectedRoute path="/quiz-attempts" role="student" component={() => (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          {(() => {
            const StudentQuizAttempts = lazy(() => import("@/pages/student/quiz-attempts"));
            return <StudentQuizAttempts />;
          })()}
        </Suspense>
      )} />

      {/* Student Profile Routes */}
      <ProtectedRoute
        path="/student/profile"
        role="student"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <StudentProfile />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/student/profile/edit"
        role="student"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            {/* Dynamic import for edit profile */}
            {(() => {
              const EditStudentProfile = lazy(() => import("@/pages/student/profile/edit"));
              return <EditStudentProfile />;
            })()}
          </Suspense>
        )}
      />

      <ProtectedRoute
        path="/student/content"
        role="student"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <StudentContentAccess />
          </Suspense>
        )}
      />
      <ProtectedRoute
        path="/student/performance"
        role="student"
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            {(() => {
              const StudentPerformance = lazy(() => import("@/pages/student/performance"));
              return <StudentPerformance />;
            })()}
          </Suspense>
        )}
      />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
