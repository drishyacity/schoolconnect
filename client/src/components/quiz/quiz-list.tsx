import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Quiz = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  totalPoints: number;
  passingScore: number;
  dueDate: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
};

type QuizListProps = {
  role?: "admin" | "teacher" | "student";
  classId?: number | null;
  subjectId?: number | null;
  teacherId?: number | null;
};

export function QuizList({ role, classId, subjectId, teacherId }: QuizListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Build query params
  const queryParams = new URLSearchParams();

  // Always include role
  if (role) queryParams.append("role", role);

  // Always include class and subject if available
  if (classId) queryParams.append("classId", classId.toString());
  if (subjectId) queryParams.append("subjectId", subjectId.toString());

  // For teacher role, don't filter by author to see all quizzes including admin-created ones
  if (role !== "teacher" && teacherId) {
    queryParams.append("authorId", teacherId.toString());
  }

  // Always include details
  queryParams.append("withDetails", "true");

  console.log(`QuizList component: Fetching quizzes with params: ${queryParams.toString()}`);

  // Fetch quizzes with filters
  const { data: quizzes = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/quizzes", { role, classId, subjectId, teacherId }],
    queryFn: async () => {
      console.log(`Executing fetch for quizzes with params: ${queryParams.toString()}`);

      // Use the correct port (5000) for API requests
      const apiUrl = `http://localhost:5000/api/quizzes?${queryParams.toString()}`;
      console.log(`Fetching from: ${apiUrl}`);

      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log(`Received ${data.length} quizzes from API:`, data);
      return data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0 // Consider data stale immediately
  });

  const handleEdit = (quizId: number) => {
    setLocation(`/quiz/edit/${quizId}`);
  };

  const handleDelete = async (quizId: number) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/quizzes/${quizId}`);
      toast({
        title: "Quiz deleted",
        description: "The quiz has been successfully deleted",
      });
      // Refresh the quiz list after deletion
      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting quiz",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // Update quiz status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ contentId, status }: { contentId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/contents/${contentId}`, { status });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The quiz status has been successfully updated.",
      });
      // Invalidate all quiz queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      // Refresh the current view
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (quiz: any, status: string) => {
    updateStatusMutation.mutate({ contentId: quiz.contentId, status });
  };

  const handleView = (quizId: number) => {
    setLocation(`/quiz/view/${quizId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <div className="mx-auto h-12 w-12 text-gray-300">📋</div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No quizzes found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {role === "teacher"
            ? "Create new quizzes or select different filters to see quizzes."
            : "No quizzes are available for the selected filters."}
        </p>
      </div>
    );
  }

  const handleReload = () => {
    refetch();
    toast({
      title: "Refreshing quizzes",
      description: "Quiz list is being refreshed...",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReload}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Time Limit</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quizzes.map((quiz: Quiz) => (
            <TableRow key={quiz.id}>
              <TableCell className="font-medium">{quiz.title}</TableCell>
              <TableCell>{quiz.timeLimit} minutes</TableCell>
              <TableCell>{quiz.totalPoints}</TableCell>
              <TableCell>
                {quiz.dueDate ? format(new Date(quiz.dueDate), "MMM d, yyyy") : format(new Date(quiz.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={quiz.status === "published" ? "default" : "secondary"}
                >
                  {quiz.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(quiz.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Quiz
                      </DropdownMenuItem>

                      {/* Edit option only for admin or the teacher who created it */}
                      {(role === "admin" || (role === "teacher" && quiz.authorId === user?.id)) && (
                        <DropdownMenuItem onClick={() => handleEdit(quiz.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Quiz
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {/* Status change option for all teachers and admin */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Badge
                            variant={quiz.status === "published" ? "default" : "secondary"}
                            className="mr-2"
                          >
                            {quiz.status}
                          </Badge>
                          Change Status
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup
                            value={quiz.status}
                            onValueChange={(value) => handleStatusChange(quiz, value)}
                          >
                            <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Delete option only for admin or the teacher who created it */}
                      {(role === "admin" || (role === "teacher" && quiz.authorId === user?.id)) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(quiz.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Quiz
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}