import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Upload, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define schema for content
const contentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  contentType: z.enum(['note', 'homework', 'dpp', 'lecture', 'sample_paper'], {
    required_error: "Please select a content type",
  }),
  description: z.string().optional().nullable(),
  classId: z.string().min(1, "Please select a class").transform(val => parseInt(val, 10)),
  subjectId: z.string().min(1, "Please select a subject").transform(val => parseInt(val, 10)),
  status: z.enum(['draft', 'published', 'archived'], {
    required_error: "Please select a status",
  }).default('published'),
  dueDate: z.string().optional().nullable().transform(val => val ? new Date(val).toISOString() : null),
  fileUrl: z.string().optional().nullable(),
  authorId: z.number().optional(), // This will be set by the server
  fileType: z.string().optional(),
  fileName: z.string().optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

interface Class {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

interface ContentFormProps {
  contentData?: any;
  onSuccess?: () => void;
  teacherClassesAndSubjects?: {
    classes: Class[];
    subjects: Subject[];
  };
}

export function ContentForm({
  contentData,
  onSuccess,
  teacherClassesAndSubjects,
}: ContentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch classes if not provided through props
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !teacherClassesAndSubjects,
  });

  // Fetch subjects if not provided through props
  const { data: subjects = [], error: subjectsError, isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !teacherClassesAndSubjects,
    retry: 1,
    onSettled: (data, error) => {
      if (error) {
        console.error("Error fetching subjects:", error);
        toast({
          title: "Error",
          description: "Failed to fetch subjects. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Use the classes and subjects data from props if provided
  const classesData: Class[] = teacherClassesAndSubjects?.classes?.length ? teacherClassesAndSubjects.classes : classes;
  const subjectsData: Subject[] = teacherClassesAndSubjects?.subjects?.length ? teacherClassesAndSubjects.subjects : (subjects as Subject[]);

  console.log("Classes data:", classesData);
  console.log("Subjects data:", subjectsData);

  // Show loading state only if we're loading subjects and don't have teacherClassesAndSubjects
  if (isLoadingSubjects && !teacherClassesAndSubjects && !subjectsData.length) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Loading subjects...</p>
      </div>
    );
  }

  // Show error state if subjects failed to load and we don't have teacherClassesAndSubjects
  if (subjectsError && !teacherClassesAndSubjects && !subjectsData.length) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Failed to load subjects. Please try again.</p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/subjects"] })}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show empty state if no subjects are available
  if (!subjectsData.length && !teacherClassesAndSubjects) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No subjects available. Please add subjects first.</p>
      </div>
    );
  }

  const form = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: contentData?.title || "",
      contentType: contentData?.contentType || "note",
      description: contentData?.description || "",
      classId: contentData?.classId?.toString() || "",
      subjectId: contentData?.subjectId?.toString() || "",
      status: contentData?.status || "published",
      dueDate: contentData?.dueDate ? new Date(contentData.dueDate).toISOString().split('T')[0] : "",
      fileUrl: contentData?.fileUrl || "",
      fileType: contentData?.fileType || "",
      fileName: contentData?.fileName || "",
    },
  });

  // Update form when contentData changes
  useEffect(() => {
    if (contentData) {
      form.reset({
        title: contentData.title || "",
        contentType: contentData.contentType || "note",
        description: contentData.description || "",
        classId: contentData.classId?.toString() || "",
        subjectId: contentData.subjectId?.toString() || "",
        status: contentData.status || "published",
        dueDate: contentData.dueDate ? new Date(contentData.dueDate).toISOString().split('T')[0] : "",
        fileUrl: contentData.fileUrl || "",
        fileType: contentData.fileType || "",
        fileName: contentData.fileName || "",
      });
      setPreviewUrl(contentData.fileUrl || null);
    }
  }, [contentData, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      form.setValue('fileUrl', '');
      form.setValue('fileType', selectedFile.type);
      form.setValue('fileName', selectedFile.name);
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const link = e.target.value;
    form.setValue('fileUrl', link);
    if (link) {
      setFile(null);
      setPreviewUrl(null);
      form.setValue('fileType', '');
      form.setValue('fileName', '');
    }
  };

  const uploadFile = async (file: File) => {
    console.log("Uploading file:", file.name, file.type, file.size);

    // Use native fetch for file uploads instead of apiRequest
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Don't set Content-Type header - browser will set it with boundary
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Important: Don't set Content-Type header for multipart/form-data
        // The browser will set it automatically with the correct boundary
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload error response:", errorText);
        throw new Error(`File upload failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Upload success response:", data);
      return data.fileUrl;
    } catch (error: any) {
      console.error("File upload error:", error);
      throw new Error(error.message || 'Failed to upload file');
    }
  };

  const onSubmit = async (data: ContentFormData) => {
    try {
      console.log("Form submission data:", data);
      setIsUploading(true);
      let fileUrl = data.fileUrl;

      if (file && uploadType === 'file') {
        try {
          fileUrl = await uploadFile(file);
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          // If file upload fails but we have a URL, continue with that
          if (!fileUrl) {
            throw uploadError;
          }
        }
      }

      // If no file and no URL, set fileUrl to empty string to avoid null issues
      if (!fileUrl && !file) {
        fileUrl = "";
      }

      const contentPayload = {
        ...data,
        fileUrl,
        authorId: user?.id,
      };

      console.log("Content payload:", contentPayload);

      if (contentPayload.id) {
        await apiRequest('PUT', `/api/contents/${contentPayload.id}`, contentPayload);
        toast({
          title: "Content updated",
          description: "The content has been successfully updated.",
        });
      } else {
        const response = await apiRequest('POST', '/api/contents', contentPayload);
        console.log("Content creation response:", response);
        toast({
          title: "Content created",
          description: "The content has been successfully created.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/contents'] });
      onSuccess?.();
    } catch (error: any) {
      console.error("Content submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isSubmitting = isUploading;

  // Function to render file preview based on file type
  const renderFilePreview = () => {
    const currentFile = file || contentData;
    if (!currentFile) return null;

    const url = previewUrl || currentFile.fileUrl;
    const fileType = file?.type || currentFile.fileType;

    if (!url) return null;

    // Group file types for better handling
    const isImage = fileType?.startsWith('image/');
    const isVideo = fileType?.startsWith('video/');
    const isAudio = fileType?.startsWith('audio/');
    const isPDF = fileType === 'application/pdf';
    const isDocument = fileType?.includes('word') ||
                      fileType?.includes('excel') ||
                      fileType?.includes('powerpoint') ||
                      fileType === 'text/plain';

    if (isImage) {
      return <img src={url} alt="Preview" className="max-w-full h-auto" />;
    } else if (isVideo) {
      return <video src={url} controls className="max-w-full" />;
    } else if (isAudio) {
      return <audio src={url} controls className="w-full" />;
    } else if (isPDF) {
      return <iframe src={url} className="w-full h-[500px]" />;
    } else if (isDocument) {
      return (
        <div className="p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">Document preview not available</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Open document in new tab
          </a>
        </div>
      );
    } else {
      return (
        <div className="p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">Preview not available for this file type</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Open file in new tab
          </a>
        </div>
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="note">Notes</SelectItem>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="dpp">Daily Practice Problem</SelectItem>
                      <SelectItem value="lecture">Lecture</SelectItem>
                      <SelectItem value="sample_paper">Sample Paper</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classesData.map((cls: Class) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectsData.map((subject: Subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.watch("contentType") === "homework" || form.watch("contentType") === "dpp") && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      When this assignment is due
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description"
                      className="min-h-[120px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                      value={field.value}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="draft" id="draft" />
                        <Label htmlFor="draft">Draft</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="published" id="published" />
                        <Label htmlFor="published">Published</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="archived" id="archived" />
                        <Label htmlFor="archived">Archived</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div>
                <FormLabel>Attachment</FormLabel>
                <div className="mt-1">
                  <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as 'file' | 'link')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload File
                      </TabsTrigger>
                      <TabsTrigger value="link" className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Add Link
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="file" className="space-y-4">
                      <FormItem>
                        <FormLabel>Upload File</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            onChange={handleFileChange}
                            disabled={!!form.watch('fileUrl')}
                          />
                        </FormControl>
                        <FormDescription>
                          Upload a file from your computer
                        </FormDescription>
                      </FormItem>
                      {previewUrl && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">File Preview</h4>
                          {renderFilePreview()}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="link" className="space-y-4">
                      <FormItem>
                        <FormLabel>File URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter file URL"
                            onChange={handleLinkChange}
                            value={form.watch('fileUrl') || ''}
                            disabled={!!file}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the URL of the file if it's already hosted somewhere
                        </FormDescription>
                      </FormItem>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {(file || contentData?.fileUrl || form.watch("fileUrl")) && (
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      `Selected file: ${file?.name || contentData?.fileName || form.watch("fileName")}`
                    )}
                  </div>

                  {!isUploading && (previewUrl || contentData?.fileUrl || form.watch("fileUrl")) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          type="button"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>File Preview</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          {renderFilePreview()}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {contentData ? "Update Content" : "Create Content"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ContentForm;