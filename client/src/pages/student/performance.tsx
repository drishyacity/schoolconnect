import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, BarChart, PieChart, Activity, Award, TrendingUp, HelpCircle, FileText, BookOpen } from "lucide-react";

export default function StudentPerformance() {
  const { user } = useAuth();

  // Fetch student performance data
  const { data, isLoading } = useQuery({
    queryKey: ["/api/dashboard/student"],
    queryFn: async () => {
      console.log("Fetching student dashboard data");
      const res = await fetch("http://localhost:5000/api/dashboard/student", {
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
      console.log("Received student dashboard data:", data);
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
            <h1 className="text-2xl font-bold mb-2">My Performance</h1>
            <p className="text-neutral-600">
              Track your academic progress and performance across all subjects.
            </p>
          </div>

          <Tabs defaultValue="overview" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-primary" />
                      Overall Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {isLoading ? "Loading..." : `${data?.averageScore || 0}%`}
                    </div>
                    <div className="text-sm text-neutral-500 mb-4">
                      Average score across all subjects
                    </div>
                    <Progress value={data?.averageScore || 0} className="h-2" />
                    <div className="flex justify-between mt-2 text-xs text-neutral-500">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Award className="h-4 w-4 mr-2 text-accent" />
                      Completion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {isLoading ? "Loading..." : `${data?.completedQuizzes || 0}/${data?.totalQuizzes || 0}`}
                    </div>
                    <div className="text-sm text-neutral-500 mb-4">
                      Quizzes completed
                    </div>
                    <Progress
                      value={data?.completedQuizzes && data?.totalQuizzes ?
                        (data.completedQuizzes / data.totalQuizzes) * 100 : 0}
                      className="h-2"
                    />
                    <div className="flex justify-between mt-2 text-xs text-neutral-500">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-secondary" />
                      Progress Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {isLoading ? "Loading..." : "+5%"}
                    </div>
                    <div className="text-sm text-neutral-500 mb-4">
                      Improvement since last month
                    </div>
                    <div className="h-[60px] flex items-end justify-between">
                      {[30, 45, 25, 60, 40, 50, 70].map((value, i) => (
                        <div
                          key={i}
                          className="bg-primary/80 w-[8%] rounded-t"
                          style={{ height: `${value}%` }}
                        ></div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-neutral-500">
                      <span>Week 1</span>
                      <span>Week 7</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Performance */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-base font-medium">Recent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? (
                      <p className="text-center py-4 text-neutral-500">Loading performance data...</p>
                    ) : data?.recentPerformance?.length > 0 ? (
                      data.recentPerformance.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="mr-4">
                              {item.type === 'quiz' && <HelpCircle className="h-5 w-5 text-accent" />}
                              {item.type === 'assignment' && <FileText className="h-5 w-5 text-primary" />}
                              {item.type === 'exam' && <BookOpen className="h-5 w-5 text-secondary" />}
                            </div>
                            <div>
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-neutral-500">{item.subject}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className={`mr-4 ${getScoreBadgeColor(item.score)}`}>
                              {item.score}%
                            </Badge>
                            <span className="text-sm text-neutral-500">{formatDate(item.date)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-neutral-500">No recent performance data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subjects">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Subject Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {isLoading ? (
                      <p className="text-center py-4 text-neutral-500">Loading subject data...</p>
                    ) : data?.subjectPerformance?.length > 0 ? (
                      data.subjectPerformance.map((subject: any) => (
                        <div key={subject.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">{subject.name}</h3>
                            <Badge className={getScoreBadgeColor(subject.score)}>
                              {subject.score}%
                            </Badge>
                          </div>
                          <Progress value={subject.score} className="h-2" />
                          <div className="flex justify-between text-xs text-neutral-500">
                            <span>{subject.teacher}</span>
                            <span>{subject.grade || 'No grade'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-neutral-500">No subject performance data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quizzes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Quiz Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? (
                      <p className="text-center py-4 text-neutral-500">Loading quiz data...</p>
                    ) : data?.quizPerformance?.length > 0 ? (
                      data.quizPerformance.map((quiz: any) => (
                        <div key={quiz.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                          <div>
                            <h3 className="font-medium">{quiz.title}</h3>
                            <p className="text-sm text-neutral-500">{quiz.subject}</p>
                          </div>
                          <div className="flex items-center">
                            <Badge className={`mr-4 ${getScoreBadgeColor(quiz.score)}`}>
                              {quiz.score}%
                            </Badge>
                            <span className="text-sm text-neutral-500">{formatDate(quiz.date)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-neutral-500">No quiz performance data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Assignment Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? (
                      <p className="text-center py-4 text-neutral-500">Loading assignment data...</p>
                    ) : data?.assignmentPerformance?.length > 0 ? (
                      data.assignmentPerformance.map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                          <div>
                            <h3 className="font-medium">{assignment.title}</h3>
                            <p className="text-sm text-neutral-500">{assignment.subject}</p>
                          </div>
                          <div className="flex items-center">
                            <Badge className={`mr-4 ${getScoreBadgeColor(assignment.score)}`}>
                              {assignment.score}%
                            </Badge>
                            <span className="text-sm text-neutral-500">{formatDate(assignment.date)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-neutral-500">No assignment performance data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// Helper functions
function getScoreBadgeColor(score: number) {
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-blue-100 text-blue-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
