import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Clock,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Sidebar } from "@/components/ui/sidebar";
import { formatDate } from "@/lib/utils";

// Define types
type Quiz = {
  id: number;
  title: string;
  description: string | null;
  classId: number;
  subjectId: number;
  authorId: number;
  timeLimit: number;
  passingScore: number;
  totalPoints: number | null;
  createdAt: string;
  contentId: number;
  status: string | null;
  class?: {
    id: number;
    name: string;
  };
  subject?: {
    id: number;
    name: string;
  };
  author?: {
    id: number;
    name: string;
    role: string;
  };
};

export default function QuizzesPage() {
  const [_, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const { toast } = useToast();

  // Fetch quizzes with details
  const { data: quizzes = [], isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ["/api/quizzes", { withDetails: true }],
    queryFn: async () => {
      const res = await fetch("/api/quizzes?withDetails=true");
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      return res.json();
    },
  });

  // Update quiz status mutation
  const updateQuizStatusMutation = useMutation({
    mutationFn: async ({ contentId, status }: { contentId: number; status: string }) => {
      const res = await fetch(`/api/contents/${contentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update quiz status");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Quiz status has been updated successfully.",
      });

      // Refetch quizzes
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update quiz status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch classes for filter dropdown
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  // Fetch subjects for filter dropdown
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
  });

  // Filter quizzes based on search and dropdowns
  const filteredQuizzes = quizzes.filter((quiz: Quiz) => {
    const matchesSearch = !search ||
      quiz.title.toLowerCase().includes(search.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(search.toLowerCase()));

    const matchesClass = !selectedClass || selectedClass === 'all' || quiz.classId === parseInt(selectedClass);
    const matchesSubject = !selectedSubject || selectedSubject === 'all' || quiz.subjectId === parseInt(selectedSubject);

    return matchesSearch && matchesClass && matchesSubject;
  });

  // Handle delete quiz
  const handleDelete = async () => {
    if (!quizToDelete) return;

    try {
      const res = await fetch(`/api/contents/${quizToDelete.contentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete quiz");

      toast({
        title: "Quiz deleted",
        description: `Quiz "${quizToDelete.title}" has been deleted.`,
        variant: "default",
      });

      // Refetch quizzes
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });

      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle status change
  const handleStatusChange = (quiz: Quiz, newStatus: string) => {
    updateQuizStatusMutation.mutate({
      contentId: quiz.contentId,
      status: newStatus,
    });
  };

  // Get status badge for quiz
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Draft</Badge>;

    switch (status.toLowerCase()) {
      case 'published':
        return <Badge className="bg-green-600">Published</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Quiz Management</h1>
            <Button onClick={() => setLocation("/quiz/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          </div>

          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Filter and search through all quizzes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search quizzes..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Classes</SelectLabel>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((classItem: any) => (
                        <SelectItem key={classItem.id} value={classItem.id.toString()}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Subjects</SelectLabel>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((subject: any) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quizzes</CardTitle>
              <CardDescription>
                Manage and organize all quizzes in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingQuizzes || isLoadingClasses || isLoadingSubjects ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No quizzes found. Try adjusting your filters or create a new quiz.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead>Time Limit</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuizzes.map((quiz: Quiz) => (
                      <TableRow key={quiz.id}>
                        <TableCell className="font-medium">{quiz.title}</TableCell>
                        <TableCell>{quiz.class?.name || "No Class"}</TableCell>
                        <TableCell>{quiz.subject?.name || "No Subject"}</TableCell>
                        <TableCell>
                          <Select
                            value={quiz.status || "draft"}
                            onValueChange={(value) => handleStatusChange(quiz, value)}
                            disabled={updateQuizStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue>
                                {getStatusBadge(quiz.status)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(quiz.createdAt))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                            <span>{quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setLocation(`/quiz/view/${quiz.id}`)}
                              title="View Quiz"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setLocation(`/quiz/edit/${quiz.id}`)}
                              title="Edit Quiz"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => {
                                setQuizToDelete(quiz);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete Quiz"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the quiz "
              {quizToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}