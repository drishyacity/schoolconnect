import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  File,
  FileText,
  MoreVertical,
  Trash2,
  PenIcon,
  Download,
  Eye,
  Book,
  Briefcase,
  Video,
  LineChart,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ContentListProps {
  contentType?: string | null;
  classId?: number | null;
  subjectId?: number | null;
  role: "admin" | "teacher" | "student";
  teacherId?: number | null;
  studentId?: number | null;
  viewOnly?: boolean;
}

export default function ContentListFixed({
  contentType,
  classId,
  subjectId,
  role,
  teacherId,
  studentId,
  viewOnly = false,
}: ContentListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Build query params
  let queryParams = new URLSearchParams();
  if (contentType) queryParams.append("contentType", contentType);
  if (classId) queryParams.append("classId", classId.toString());
  if (subjectId) queryParams.append("subjectId", subjectId.toString());
  if (teacherId) queryParams.append("authorId", teacherId.toString());

  console.log(`ContentListFixed: Fetching with params: ${queryParams.toString()}`);

  // Fetch content data directly from the server
  const { data: contents = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/contents", { contentType, classId, subjectId, teacherId }],
    queryFn: async () => {
      console.log(`Executing fetch for contents with params: ${queryParams.toString()}`);
      const res = await fetch(`http://localhost:5000/api/contents?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch contents: ${res.status}`);
      }

      const data = await res.json();
      console.log(`Received ${data.length} contents from API`);
      return data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  const handleReload = () => {
    refetch();
    toast({
      title: "Refreshing content",
      description: "Content list is being refreshed...",
    });
  };

  // Delete content mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/contents/${id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Content deleted",
        description: "The content has been successfully deleted.",
      });
      // Invalidate all content queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      // Refresh the current view
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting content",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Update content status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/contents/${id}`, { status });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The content status has been successfully updated.",
      });
      // Invalidate all content queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
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

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this content?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4" />;
      case "homework":
        return <Briefcase className="h-4 w-4" />;
      case "dpp":
        return <LineChart className="h-4 w-4" />;
      case "lecture":
        return <Video className="h-4 w-4" />;
      case "sample_paper":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getContentTypeName = (type: string) => {
    switch (type) {
      case "note":
        return "Notes";
      case "homework":
        return "Homework";
      case "dpp":
        return "Daily Practice";
      case "lecture":
        return "Lecture";
      case "sample_paper":
        return "Sample Paper";
      default:
        return type;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
      case "published":
        return "success";
      case "draft":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  // Filter content based on role permissions
  const filteredContents = contents.filter((content: any) => {
    // Admin can see all content
    if (role === "admin") return true;

    // Teachers can see all content (both their own and admin-created)
    if (role === "teacher") {
      return true; // Show all content for teachers
    }

    // Students can see only published/active content for their enrolled classes
    if (role === "student") {
      return content.status === "published" || content.status === "active";
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  if (filteredContents.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <Book className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No content found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {role === "teacher"
            ? "Create new content to start sharing with your students."
            : "No content is available for the selected filters."}
        </p>
      </div>
    );
  }

  return (
    <div>
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
            <TableHead>Type</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Created</TableHead>
            {!viewOnly && <TableHead>Status</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredContents.map((content: any) => (
            <TableRow key={content.id}>
              <TableCell className="font-medium">{content.title}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getContentTypeIcon(content.contentType)}
                  <span className="ml-2">{getContentTypeName(content.contentType)}</span>
                </div>
              </TableCell>
              <TableCell>{content.class?.name || "-"}</TableCell>
              <TableCell>{content.subject?.name || "-"}</TableCell>
              <TableCell>{formatDate(content.createdAt)}</TableCell>
              {!viewOnly && (
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(content.status)}>
                    {content.status === "active" ? "published" : content.status}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedContent(content);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>

                    {content.fileUrl && (
                      <DropdownMenuItem
                        onClick={() => {
                          window.location.href = content.fileUrl;
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    )}

                    {!viewOnly && (
                      <>
                        {/* Edit option for admin or any teacher */}
                        {(role === "admin" || role === "teacher") && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContent(content);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <PenIcon className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Status change option for all teachers and admin */}
                        {(role === "admin" || role === "teacher") && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Badge
                                variant={getStatusBadgeVariant(content.status)}
                                className="mr-2"
                              >
                                {content.status === "active" ? "published" : content.status}
                              </Badge>
                              Change Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuRadioGroup
                                value={content.status}
                                onValueChange={(value) => handleStatusChange(content.id, value)}
                              >
                                <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Delete option for admin or any teacher */}
                        {(role === "admin" || role === "teacher") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(content.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* View Content Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title}</DialogTitle>
            <DialogDescription>
              {getContentTypeName(selectedContent?.contentType || "")}
              {selectedContent?.class && ` - ${selectedContent.class.name}`}
              {selectedContent?.subject && ` - ${selectedContent.subject.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedContent?.description && (
              <div>
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-sm text-gray-500 mt-1">{selectedContent.description}</p>
              </div>
            )}

            {selectedContent?.dueDate && (
              <div>
                <h4 className="text-sm font-medium">Due Date</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedContent.dueDate)}
                </p>
              </div>
            )}

            {selectedContent?.fileUrl && (
              <div>
                <h4 className="text-sm font-medium">File</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.href = selectedContent.fileUrl}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update the content details
            </DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="py-4">
              <iframe
                src={`/content/edit/${selectedContent.id}`}
                className="w-full h-[500px] border-0"
                title="Edit Content"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
