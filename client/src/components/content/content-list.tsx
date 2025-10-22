import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DropdownMenuTrigger
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
import { apiRequest } from "@/lib/queryClient";
import ContentForm from "@/components/content/content-form";
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

export function ContentList({
  contentType,
  classId,
  subjectId,
  role,
  teacherId,
  studentId,
  viewOnly = false,
}: ContentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);

  // Build query params
  let queryParams = new URLSearchParams();
  if (contentType) queryParams.append("contentType", contentType);
  if (classId) queryParams.append("classId", classId.toString());
  if (subjectId) queryParams.append("subjectId", subjectId.toString());
  if (teacherId) queryParams.append("authorId", teacherId.toString());

  // Add timestamp to prevent caching
  queryParams.append("_t", Date.now().toString());

  console.log(`ContentList: Fetching with params: ${queryParams.toString()}`);

  // Fetch content data directly from the server
  const { data: contents = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/contents?${queryParams.toString()}`],
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
      queryClient.invalidateQueries({ queryKey: [`/api/contents`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting content",
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

    // Teachers can see only their content or content for their classes
    if (role === "teacher") {
      return teacherId ? content.authorId === teacherId : true;
    }

    // Students can see only published/active content for their enrolled classes
    if (role === "student") {
      return content.status === "published" || content.status === "active";
    }

    return true;
  });

  // Function to render file preview based on file type
  const renderFilePreview = (content: any) => {
    if (!content?.fileUrl) return null;

    const fileType = content.fileType?.toLowerCase();
    const url = content.fileUrl;
    const fileName = content.fileName?.toLowerCase();

    console.log('Preview Debug:', { fileType, fileName, url });

    // Group file types for better handling
    const isImage = fileType?.startsWith('image/') ||
                   fileType?.includes('jpeg') ||
                   fileType?.includes('jpg') ||
                   fileType?.includes('png') ||
                   fileType?.includes('gif') ||
                   fileType?.includes('webp') ||
                   fileType?.includes('svg') ||
                   fileType?.includes('bmp') ||
                   fileName?.endsWith('.jpg') ||
                   fileName?.endsWith('.jpeg') ||
                   fileName?.endsWith('.png') ||
                   fileName?.endsWith('.gif') ||
                   fileName?.endsWith('.webp') ||
                   fileName?.endsWith('.svg') ||
                   fileName?.endsWith('.bmp');

    const isVideo = fileType?.startsWith('video/') ||
                   fileType?.includes('mp4') ||
                   fileType?.includes('mpeg') ||
                   fileType?.includes('mov') ||
                   fileType?.includes('avi') ||
                   fileType?.includes('webm') ||
                   fileType?.includes('mkv') ||
                   fileName?.endsWith('.mp4') ||
                   fileName?.endsWith('.mpeg') ||
                   fileName?.endsWith('.mov') ||
                   fileName?.endsWith('.avi') ||
                   fileName?.endsWith('.webm') ||
                   fileName?.endsWith('.mkv');

    const isAudio = fileType?.startsWith('audio/') ||
                   fileType?.includes('mp3') ||
                   fileType?.includes('wav') ||
                   fileType?.includes('ogg') ||
                   fileType?.includes('m4a') ||
                   fileName?.endsWith('.mp3') ||
                   fileName?.endsWith('.wav') ||
                   fileName?.endsWith('.ogg') ||
                   fileName?.endsWith('.m4a');

    const isPDF = fileType === 'application/pdf' ||
                 fileType?.includes('pdf') ||
                 fileName?.endsWith('.pdf');

    const isDocument = fileType?.includes('word') ||
                      fileType?.includes('excel') ||
                      fileType?.includes('powerpoint') ||
                      fileType?.includes('doc') ||
                      fileType?.includes('docx') ||
                      fileType?.includes('xls') ||
                      fileType?.includes('xlsx') ||
                      fileType?.includes('ppt') ||
                      fileType?.includes('pptx') ||
                      fileType === 'text/plain' ||
                      fileType?.includes('txt') ||
                      fileType?.includes('csv') ||
                      fileName?.endsWith('.doc') ||
                      fileName?.endsWith('.docx') ||
                      fileName?.endsWith('.xls') ||
                      fileName?.endsWith('.xlsx') ||
                      fileName?.endsWith('.ppt') ||
                      fileName?.endsWith('.pptx') ||
                      fileName?.endsWith('.txt') ||
                      fileName?.endsWith('.csv');

    console.log('File Type Detection:', { isImage, isVideo, isAudio, isPDF, isDocument });

    if (isImage) {
      return (
        <div className="flex justify-center items-center">
          <img
            src={url}
            alt="Preview"
            className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    } else if (isVideo) {
      return (
        <div className="flex justify-center items-center">
          <video
            src={url}
            controls
            className="max-w-full max-h-[600px] rounded-lg shadow-lg"
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else if (isAudio) {
      return (
        <div className="flex justify-center items-center p-4 bg-gray-50 rounded-lg">
          <audio
            src={url}
            controls
            className="w-full max-w-md"
            controlsList="nodownload"
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    } else if (isPDF) {
      return (
        <div className="flex justify-center items-center">
          <iframe
            src={url}
            className="w-full h-[600px] rounded-lg shadow-lg border-0"
            title="PDF Preview"
          />
        </div>
      );
    } else if (isDocument) {
      // For documents, we'll use Google Docs Viewer as a fallback
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <div className="flex flex-col items-center space-y-4">
          <iframe
            src={googleDocsUrl}
            className="w-full h-[600px] rounded-lg shadow-lg border-0"
            title="Document Preview"
          />
          <Button
            variant="link"
            className="text-blue-600 hover:underline p-0 h-auto"
            onClick={() => window.location.href = url}
          >
            Download Document
          </Button>
        </div>
      );
    } else {
      // For other file types, show a download button
      return (
        <div className="flex flex-col items-center space-y-4 p-8 bg-gray-50 rounded-lg">
          <File className="h-16 w-16 text-gray-400" />
          <p className="text-sm text-gray-600">Preview not available for this file type</p>
          <Button
            variant="outline"
            onClick={() => window.location.href = url}
          >
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>
        </div>
      );
    }
  };

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

                    {!viewOnly && (role === "admin" || role === "teacher") && (
                      <>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedContent(content);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <PenIcon className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleDelete(content.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
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
                <h4 className="text-sm font-medium">Attached File</h4>
                <div className="mt-2 space-y-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = selectedContent.fileUrl}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download File
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewContent(selectedContent);
                        setIsPreviewDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview File
                    </Button>
                  </div>
                  <div className="mt-4">
                    {renderFilePreview(selectedContent)}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium">Created By</h4>
              <p className="text-sm text-gray-500 mt-1">
                {selectedContent?.author?.name || "Unknown"} on {selectedContent && formatDate(selectedContent.createdAt)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription>
              {previewContent?.fileName || "Preview"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewContent && renderFilePreview(previewContent)}
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
            <ContentForm
              contentData={selectedContent}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: [`/api/contents`] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentList;