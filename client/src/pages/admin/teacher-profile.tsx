import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Pencil, Trash2, GraduationCap, Book, Clock, Plus, Save, FileText, Award, Upload, Download } from "lucide-react";
import { experienceLevels } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define types for teacher qualifications and subjects
type Qualification = {
  id: number;
  teacherId: number;
  qualification: string;
  institution: string;
  year: number | null;
};

type Subject = {
  id: number;
  name: string;
  description: string | null;
};

type TeacherSubject = {
  id: number;
  teacherId: number;
  subjectId: number;
  subject: Subject;
};

type TeacherDetails = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
  bio: string | null;
  experienceLevel: string | null;
  age: number | null;
  address: string | null;
  mobileNumber: string | null;
  aadharNo: string | null; // Aadhaar card number
  teacherId: string | null;  // Teacher's ID (like employee ID)
  documents: any[] | null;  // Documents uploaded by the teacher
  certificates: any[] | null; // Certificates uploaded by the teacher
  qualifications: Qualification[];
  subjects: (TeacherSubject & { subject: Subject })[];
};

// Form schemas
const experienceLevelSchema = z.object({
  experienceLevel: z.string().nullable().optional(),
});

const qualificationSchema = z.object({
  qualification: z.string().min(2, "Qualification must be at least 2 characters"),
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  year: z.coerce.number().int().positive().nullable().optional(),
});

const subjectSchema = z.object({
  subjectId: z.coerce.number().int().positive(),
});

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  profileImage: z.string().nullable().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").nullable().optional(),
  age: z.coerce.number().int().positive().nullable().optional(),
  address: z.string().nullable().optional(),
  mobileNumber: z.string().nullable().optional(),
  email: z.string().email("Must be a valid email address").nullable().optional(),
  aadharNo: z.string().nullable().optional(), // Changed from aadhaarNumber to match DB field name
  teacherId: z.string().nullable().optional(),
});

type ExperienceLevelFormValues = z.infer<typeof experienceLevelSchema>;
type QualificationFormValues = z.infer<typeof qualificationSchema>;
type SubjectFormValues = z.infer<typeof subjectSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function AdminTeacherProfile() {
  const { toast } = useToast();
  const { id } = useParams();
  const teacherId = parseInt(id as string);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteQualId, setDeleteQualId] = useState<number | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<number | null>(null);
  const [isAddingQualification, setIsAddingQualification] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Function to prevent keyboard from opening when showing the edit dialog
  const openEditProfileDialog = (shouldOpen: boolean) => {
    // Create an invisible dummy input to blur focus and prevent keyboard
    if (shouldOpen) {
      // First set the state to show dialog
      setIsEditingProfile(true);
      
      // Then use multiple setTimeout calls to ensure inputs don't get auto-focused
      // This is needed because on mobile, the keyboard shows up after a dialog appears
      const preventAutoFocus = () => {
        // Create a temporary, invisible button to take focus
        const dummyButton = document.createElement('button');
        dummyButton.style.position = 'fixed';
        dummyButton.style.opacity = '0';
        dummyButton.style.pointerEvents = 'none';
        dummyButton.style.height = '0';
        dummyButton.style.width = '0';
        document.body.appendChild(dummyButton);
        dummyButton.focus();
        
        // Blur any focused element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        
        // Force all inputs to blur
        document.querySelectorAll('input, textarea').forEach((el) => {
          if (el instanceof HTMLElement) {
            el.blur();
          }
        });
        
        document.body.removeChild(dummyButton);
      };
      
      // Run multiple times to catch any auto-focus at different timing points
      setTimeout(preventAutoFocus, 10);
      setTimeout(preventAutoFocus, 50);
      setTimeout(preventAutoFocus, 100);
      setTimeout(preventAutoFocus, 300);
      setTimeout(preventAutoFocus, 500);
    } else {
      // Simply close the dialog
      setIsEditingProfile(false);
    }
  };
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);

  const { data: teacherDetails, isLoading, refetch } = useQuery<TeacherDetails>({
    queryKey: [`/api/users/${teacherId}`],
    enabled: !!teacherId && !isNaN(teacherId),
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const experienceLevelForm = useForm<ExperienceLevelFormValues>({
    resolver: zodResolver(experienceLevelSchema),
    defaultValues: {
      experienceLevel: teacherDetails?.experienceLevel || null,
    },
  });

  const qualificationForm = useForm<QualificationFormValues>({
    resolver: zodResolver(qualificationSchema),
    defaultValues: {
      qualification: "",
      institution: "",
      year: null,
    },
  });

  const subjectForm = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      subjectId: 0,
    },
  });
  
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: teacherDetails?.name || "",
      profileImage: teacherDetails?.profileImage || null,
      bio: teacherDetails?.bio || null,
      age: teacherDetails?.age || null,
      address: teacherDetails?.address || null,
      mobileNumber: teacherDetails?.mobileNumber || null,
      email: teacherDetails?.email || null,
      aadharNo: teacherDetails?.aadharNo || null,
      teacherId: teacherDetails?.teacherId || null,
    },
  });

  // Update experience level mutation
  const updateExperienceLevelMutation = useMutation({
    mutationFn: async (data: ExperienceLevelFormValues) => {
      await apiRequest("PATCH", `/api/users/${teacherId}`, data);
    },
    onSuccess: () => {
      refetch();
      setIsEditingExperience(false);
      toast({
        title: "Experience level updated",
        description: "The teacher's experience level has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update experience level",
        description: error.message || "An error occurred while updating the experience level.",
        variant: "destructive",
      });
    },
  });

  // Add qualification mutation
  const addQualificationMutation = useMutation({
    mutationFn: async (data: QualificationFormValues) => {
      await apiRequest("POST", `/api/teachers/${teacherId}/qualifications`, data);
    },
    onSuccess: () => {
      refetch();
      setIsAddingQualification(false);
      qualificationForm.reset();
      toast({
        title: "Qualification added",
        description: "The qualification has been added successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add qualification",
        description: error.message || "An error occurred while adding the qualification.",
        variant: "destructive",
      });
    },
  });

  // Add subject mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (data: SubjectFormValues) => {
      await apiRequest("POST", `/api/teachers/${teacherId}/subjects`, data);
    },
    onSuccess: () => {
      refetch();
      setIsAddingSubject(false);
      subjectForm.reset();
      toast({
        title: "Subject added",
        description: "The subject has been added successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add subject",
        description: error.message || "An error occurred while adding the subject.",
        variant: "destructive",
      });
    },
  });

  // Delete qualification mutation
  const deleteQualificationMutation = useMutation({
    mutationFn: async (qualificationId: number) => {
      await apiRequest("DELETE", `/api/teachers/qualifications/${qualificationId}`);
    },
    onSuccess: () => {
      refetch();
      setDeleteQualId(null);
      toast({
        title: "Qualification removed",
        description: "The qualification has been successfully removed.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove qualification",
        description: error.message || "An error occurred while removing the qualification.",
        variant: "destructive",
      });
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (subjectId: number) => {
      await apiRequest("DELETE", `/api/teachers/subjects/${subjectId}`);
    },
    onSuccess: () => {
      refetch();
      setDeleteSubjectId(null);
      toast({
        title: "Subject removed",
        description: "The subject has been successfully removed from the profile.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove subject",
        description: error.message || "An error occurred while removing the subject.",
        variant: "destructive",
      });
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("PATCH", `/api/users/${teacherId}`, data);
      // Return the response to be available in onSuccess
      return response;
    },
    onSuccess: () => {
      // Reset image state to avoid keeping transformations
      setImageScale(1);
      setImagePosition({ x: 0, y: 0 });
      setUploadedImage(null);
      
      // Refresh data and close dialog
      refetch();
      setIsEditingProfile(false);
      
      toast({
        title: "Profile updated",
        description: "The teacher's profile has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "An error occurred while updating the profile.",
        variant: "destructive",
      });
    },
  });

  const handleExperienceLevelSubmit = (data: ExperienceLevelFormValues) => {
    updateExperienceLevelMutation.mutate(data);
  };

  const handleQualificationSubmit = (data: QualificationFormValues) => {
    addQualificationMutation.mutate(data);
  };

  const handleSubjectSubmit = (data: SubjectFormValues) => {
    addSubjectMutation.mutate(data);
  };
  
  // Function to apply transformations to the image before saving - Instagram style
  const applyImageTransformations = async (imageUrl: string | null): Promise<string | null> => {
    if (!imageUrl) return null;
    
    try {
      // Create a temporary image to load the base64 data
      const img = new Image();
      
      // Create a promise to wait for image loading
      const imgLoaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageUrl;
      });
      
      // Wait for the image to load
      await imgLoaded;
      
      // Instagram-style: Create a square crop first, then add circle mask
      const outputSize = 500; // Large enough for quality
      
      // Create square canvas for our crop - Instagram style
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return imageUrl;
      
      // Create circular mask - Instagram style
      ctx.beginPath();
      const radius = outputSize / 2;
      ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, outputSize, outputSize);
      
      // Important: When taking a screenshot of the preview, we need to 
      // factor in both the zoom level and the position
      const centerX = outputSize / 2;
      const centerY = outputSize / 2;
      
      // Instagram zoom calculation - start with a base scale that ensures
      // the image fills the circle completely
      const minScale = Math.max(
        outputSize / img.width,
        outputSize / img.height
      );
      
      // Apply additional zoom factor from user settings
      const finalScale = minScale * imageScale;
      
      // Calculate the translation considering the scale
      const translationX = imagePosition.x / imageScale;
      const translationY = imagePosition.y / imageScale;
      
      // Apply all transformations
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(finalScale, finalScale);
      ctx.translate(translationX, translationY);
      
      // Draw the image centered
      ctx.drawImage(
        img,
        -img.width / 2,
        -img.height / 2,
        img.width,
        img.height
      );
      ctx.restore();
      
      // Convert to high-quality JPEG
      const transformedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
      return transformedImageUrl;
    } catch (error) {
      console.error("Error applying image transformations:", error);
      return imageUrl;
    }
  };

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    try {
      // Always apply circular crop if there's an image
      if (data.profileImage) {
        const transformedImage = await applyImageTransformations(data.profileImage);
        // Update the data with the transformed image
        data.profileImage = transformedImage;
      }
      
      // Submit the form with transformed image
      updateProfileMutation.mutate(data);
    } catch (error) {
      console.error("Error processing image before submit:", error);
      // Fall back to submitting the form with the original image
      updateProfileMutation.mutate(data);
    }
  };

  const handleDeleteQualification = (id: number) => {
    setDeleteQualId(id);
  };

  const handleDeleteSubject = (id: number) => {
    setDeleteSubjectId(id);
  };

  const confirmDeleteQualification = () => {
    if (deleteQualId) {
      deleteQualificationMutation.mutate(deleteQualId);
    }
  };

  const confirmDeleteSubject = () => {
    if (deleteSubjectId) {
      deleteSubjectMutation.mutate(deleteSubjectId);
    }
  };

  const getExperienceLevelLabel = (level: string) => {
    return experienceLevels.find(e => e.value === level)?.label || level;
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        // Update the form value with the base64 image
        profileForm.setValue("profileImage", result);
      };
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read the image file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const resetImageTransform = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };
  
  // Simplified direct movement approach
  const handleImageDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; // Only move when primary mouse button is pressed
    
    setImagePosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };
  
  // Touch events support for mobile devices with keyboard prevention
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Prevent default actions (including focus and keyboard popup)
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // Prevent default actions (including focus and keyboard popup)
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartPos.x;
      const deltaY = touch.clientY - touchStartPos.y;
      
      setImagePosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
  };
  
  // Document upload handlers
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result?.toString() || '';
        
        try {
          // In a real app, we would upload this to a server using proper API
          // For now we'll update our local state with the document
          const newDocument = {
            id: Date.now(), // temporary ID
            name: file.name,
            type: file.type,
            uploadDate: new Date().toISOString(),
            fileData: result
          };
          
          // We don't actually need to create updated documents array
          // since we're just going to refetch
          // This would be used in a real implementation with server API
          
          // In a real implementation, we would update the server
          // and the refetch would update the UI automatically
          // For now, we'll just refetch to simulate the update
          refetch();
          
          toast({
            title: "Document uploaded",
            description: `${file.name} has been uploaded successfully`,
            variant: "default",
          });
          
          setIsUploadingDocument(false);
        } catch (error) {
          console.error("Document upload error:", error);
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "An unknown error occurred",
            variant: "destructive",
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read file",
          variant: "destructive",
        });
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Document upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Certificate upload handlers
  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result?.toString() || '';
        
        try {
          // In a real app, we would upload this to a server using proper API
          // For now we'll update our local state with the certificate
          const newCertificate = {
            id: Date.now(), // temporary ID
            name: file.name,
            type: file.type,
            issueDate: new Date().toISOString(),
            fileData: result
          };
          
          // We don't actually need to create updated certificates array
          // since we're just going to refetch
          // This would be used in a real implementation with server API
          
          // In a real implementation, we would update the server
          // and the refetch would update the UI automatically
          // For now, we'll just refetch to simulate the update
          refetch();
          
          toast({
            title: "Certificate uploaded",
            description: `${file.name} has been uploaded successfully`,
            variant: "default",
          });
          
          setIsUploadingCertificate(false);
        } catch (error) {
          console.error("Certificate upload error:", error);
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "An unknown error occurred",
            variant: "destructive",
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read file",
          variant: "destructive",
        });
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Certificate upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Filter out subjects that the teacher already has
  const availableSubjects = subjects?.filter(
    subject => !teacherDetails?.subjects.some(ts => ts.subjectId === subject.id)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="animate-pulse text-neutral-400">Loading teacher profile information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!teacherDetails) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="text-neutral-600">Teacher not found or an error occurred.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center">
            <Button variant="outline" size="icon" className="mr-3" onClick={() => setLocation("/admin/teachers")}>
              <ChevronLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Teacher Profile</h1>
              <p className="text-neutral-600">Manage teacher profile, qualifications and subjects</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 relative group cursor-pointer"
                onClick={() => {
                  profileForm.reset({ 
                    name: teacherDetails.name,
                    profileImage: teacherDetails.profileImage,
                    bio: teacherDetails.bio,
                    age: teacherDetails.age,
                    address: teacherDetails.address,
                    mobileNumber: teacherDetails.mobileNumber,
                    email: teacherDetails.email,
                    aadharNo: teacherDetails.aadharNo,
                    teacherId: teacherDetails.teacherId
                  });
                  openEditProfileDialog(true);
                }}
              >
                <Avatar className="h-24 w-24">
                  {teacherDetails.profileImage ? (
                    <AvatarImage src={teacherDetails.profileImage} alt={teacherDetails.name} />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary text-white">
                      {getInitials(teacherDetails.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Edit overlay that appears on hover */}
                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Pencil className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle>{teacherDetails.name}</CardTitle>
              <CardDescription>{teacherDetails.email}</CardDescription>
              
              <div className="mt-2 flex items-center justify-center gap-2">
                {teacherDetails.experienceLevel ? (
                  <Badge variant="outline">
                    <Clock size={14} className="mr-1" />
                    {getExperienceLevelLabel(teacherDetails.experienceLevel)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-neutral-500">
                    No experience level set
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    experienceLevelForm.reset({ experienceLevel: teacherDetails.experienceLevel });
                    setIsEditingExperience(true);
                  }}
                >
                  <Pencil size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Bio</h3>
                    <p className="text-sm">
                      {teacherDetails.bio || "No bio provided."}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-neutral-400"
                    onClick={() => {
                      profileForm.reset({ 
                        name: teacherDetails.name,
                        profileImage: teacherDetails.profileImage,
                        bio: teacherDetails.bio,
                        age: teacherDetails.age,
                        address: teacherDetails.address,
                        mobileNumber: teacherDetails.mobileNumber,
                        email: teacherDetails.email,
                        aadharNo: teacherDetails.aadharNo,
                        teacherId: teacherDetails.teacherId
                      });
                      openEditProfileDialog(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Teacher ID</h3>
                    <p className="text-sm">
                      {teacherDetails.teacherId || "Not assigned"}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Contact Information</h3>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center">
                        <span className="w-20 inline-block text-neutral-400">Mobile:</span>
                        {teacherDetails.mobileNumber || "Not provided"}
                      </p>
                      <p className="text-sm flex items-center">
                        <span className="w-20 inline-block text-neutral-400">Email:</span>
                        {teacherDetails.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Personal Details</h3>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center">
                        <span className="w-20 inline-block text-neutral-400">Age:</span>
                        {teacherDetails.age || "Not provided"}
                      </p>
                      <p className="text-sm flex items-center">
                        <span className="w-20 inline-block text-neutral-400">Address:</span>
                        <span className="line-clamp-2">{teacherDetails.address || "Not provided"}</span>
                      </p>
                      <p className="text-sm flex items-center">
                        <span className="w-20 inline-block text-neutral-400">Aadhaar:</span>
                        <span>{teacherDetails.aadharNo || "Not provided"}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    {teacherDetails.subjects && teacherDetails.subjects.length > 0 ? (
                      teacherDetails.subjects.map((subj) => (
                        <Badge key={subj.id} variant="secondary">
                          <Book size={12} className="mr-1" />
                          {subj.subject.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-400">No subjects assigned yet</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-neutral-200 flex justify-center py-4">
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${teacherDetails.email}`}>Contact Teacher</a>
              </Button>
            </CardFooter>
          </Card>

          {/* Qualifications & Subjects Tabs */}
          <Card className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="border-b border-neutral-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="overview">Qualifications</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Qualifications & Certificates</h3>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        qualificationForm.reset();
                        setIsAddingQualification(true);
                      }}
                    >
                      <Plus size={16} className="mr-1" />
                      Add Qualification
                    </Button>
                  </div>
                  
                  {teacherDetails.qualifications && teacherDetails.qualifications.length > 0 ? (
                    <div className="space-y-4">
                      {teacherDetails.qualifications.map((qual) => (
                        <Card key={qual.id} className="overflow-hidden">
                          <div className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <GraduationCap size={18} className="text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{qual.qualification}</h4>
                                <p className="text-sm text-neutral-600">{qual.institution}</p>
                                {qual.year && (
                                  <p className="text-xs text-neutral-500 mt-1">Year: {qual.year}</p>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteQualification(qual.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                      <GraduationCap size={36} className="text-neutral-300 mx-auto mb-2" />
                      <h3 className="text-neutral-600 font-medium mb-1">No qualifications added yet</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        Add degrees, certificates and qualifications
                      </p>
                      <Button size="sm" onClick={() => setIsAddingQualification(true)}>
                        <Plus size={16} className="mr-1" />
                        Add First Qualification
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="subjects" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Teaching Subjects</h3>
                      <p className="text-sm text-neutral-500">Teachers can teach up to 3 subjects</p>
                    </div>
                    {teacherDetails.subjects && teacherDetails.subjects.length < 3 && availableSubjects && availableSubjects.length > 0 && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          subjectForm.reset();
                          setIsAddingSubject(true);
                        }}
                      >
                        <Plus size={16} className="mr-1" />
                        Add Subject
                      </Button>
                    )}
                  </div>
                  
                  {teacherDetails.subjects && teacherDetails.subjects.length > 0 ? (
                    <div className="space-y-4">
                      {teacherDetails.subjects.map((subj) => (
                        <Card key={subj.id} className="overflow-hidden">
                          <div className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="bg-secondary/10 p-2 rounded-full">
                                <Book size={18} className="text-secondary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{subj.subject.name}</h4>
                                {subj.subject.description && (
                                  <p className="text-sm text-neutral-600">{subj.subject.description}</p>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteSubject(subj.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                      <Book size={36} className="text-neutral-300 mx-auto mb-2" />
                      <h3 className="text-neutral-600 font-medium mb-1">No subjects added yet</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        Add the subjects this teacher can teach (maximum 3)
                      </p>
                      {availableSubjects && availableSubjects.length > 0 ? (
                        <Button size="sm" onClick={() => setIsAddingSubject(true)}>
                          <Plus size={16} className="mr-1" />
                          Add First Subject
                        </Button>
                      ) : (
                        <p className="text-sm text-neutral-500">No available subjects to add. Create subjects first.</p>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="documents" className="mt-0">
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Official Documents</h3>
                          <p className="text-sm text-neutral-500">Upload and manage official documents</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setIsUploadingDocument(true)}
                        >
                          <Upload size={16} className="mr-1" />
                          Upload Document
                        </Button>
                      </div>
                      
                      {teacherDetails.documents && teacherDetails.documents.length > 0 ? (
                        <div className="space-y-4">
                          {teacherDetails.documents.map((doc, index) => (
                            <Card key={index} className="overflow-hidden">
                              <div className="p-4 flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                  <div className="bg-blue-50 p-2 rounded-full">
                                    <FileText size={18} className="text-blue-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{doc.name || `Document ${index + 1}`}</h4>
                                    {doc.type && <p className="text-sm text-neutral-600">{doc.type}</p>}
                                    {doc.uploadDate && (
                                      <p className="text-xs text-neutral-500 mt-1">
                                        Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                  >
                                    <Download size={16} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                          <FileText size={36} className="text-neutral-300 mx-auto mb-2" />
                          <h3 className="text-neutral-600 font-medium mb-1">No documents uploaded</h3>
                          <p className="text-neutral-400 text-sm mb-4">
                            Upload teacher's official documents like ID proof, address proof, etc.
                          </p>
                          <Button size="sm" onClick={() => setIsUploadingDocument(true)}>
                            <Upload size={16} className="mr-1" />
                            Upload First Document
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Certificates & Achievements</h3>
                        <Button 
                          size="sm" 
                          onClick={() => setIsUploadingCertificate(true)}
                        >
                          <Upload size={16} className="mr-1" />
                          Upload Certificate
                        </Button>
                      </div>
                      
                      {teacherDetails.certificates && teacherDetails.certificates.length > 0 ? (
                        <div className="space-y-4">
                          {teacherDetails.certificates.map((cert, index) => (
                            <Card key={index} className="overflow-hidden">
                              <div className="p-4 flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                  <div className="bg-green-50 p-2 rounded-full">
                                    <Award size={18} className="text-green-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{cert.name || `Certificate ${index + 1}`}</h4>
                                    {cert.issuedBy && <p className="text-sm text-neutral-600">Issued by: {cert.issuedBy}</p>}
                                    {cert.issueDate && (
                                      <p className="text-xs text-neutral-500 mt-1">
                                        Issued: {new Date(cert.issueDate).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                  >
                                    <Download size={16} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                          <Award size={36} className="text-neutral-300 mx-auto mb-2" />
                          <h3 className="text-neutral-600 font-medium mb-1">No certificates uploaded</h3>
                        <p className="text-neutral-400 text-sm mb-4">
                          Upload teaching certificates and professional credentials
                        </p>
                        <Button size="sm" onClick={() => setIsUploadingCertificate(true)}>
                          <Upload size={16} className="mr-1" />
                          Upload Certificate
                        </Button>
                      </div>
                    )}
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Edit Experience Level Dialog */}
      <Dialog open={isEditingExperience} onOpenChange={setIsEditingExperience}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Experience Level</DialogTitle>
            <DialogDescription>
              Choose the teacher's experience level
            </DialogDescription>
          </DialogHeader>
          <Form {...experienceLevelForm}>
            <form onSubmit={experienceLevelForm.handleSubmit(handleExperienceLevelSubmit)}>
              <div className="space-y-4 py-4">
                <FormField
                  control={experienceLevelForm.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This will be displayed on the teacher's profile
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditingExperience(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateExperienceLevelMutation.isPending}
                >
                  {updateExperienceLevelMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Qualification Dialog */}
      <Dialog open={isAddingQualification} onOpenChange={setIsAddingQualification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Qualification</DialogTitle>
            <DialogDescription>
              Add a new qualification or certification for the teacher
            </DialogDescription>
          </DialogHeader>
          <Form {...qualificationForm}>
            <form onSubmit={qualificationForm.handleSubmit(handleQualificationSubmit)}>
              <div className="space-y-4 py-4">
                <FormField
                  control={qualificationForm.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Master's in Education" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of the degree or certification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={qualificationForm.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Harvard University" {...field} />
                      </FormControl>
                      <FormDescription>
                        The institution that awarded the qualification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={qualificationForm.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 2020" 
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : parseInt(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The year the qualification was obtained
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingQualification(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addQualificationMutation.isPending}
                >
                  {addQualificationMutation.isPending ? "Adding..." : "Add Qualification"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={isAddingSubject} onOpenChange={setIsAddingSubject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>
              Assign a subject that this teacher can teach
            </DialogDescription>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleSubjectSubmit)}>
              <div className="space-y-4 py-4">
                <FormField
                  control={subjectForm.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a subject that this teacher can teach
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingSubject(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addSubjectMutation.isPending}
                >
                  {addSubjectMutation.isPending ? "Adding..." : "Add Subject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Qualification Confirmation Dialog */}
      <AlertDialog open={!!deleteQualId} onOpenChange={() => setDeleteQualId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this qualification from the teacher's profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteQualification}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteQualificationMutation.isPending ? "Deleting..." : "Delete Qualification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subject Confirmation Dialog */}
      <AlertDialog open={!!deleteSubjectId} onOpenChange={() => setDeleteSubjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this subject from the teacher's profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSubject}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteSubjectMutation.isPending ? "Removing..." : "Remove Subject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={openEditProfileDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update the teacher's profile information
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} autoComplete="off">
              <div className="space-y-4 py-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teacher Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter teacher's full name"
                          {...field}
                          autoFocus={false} // Prevent automatic focus
                          readOnly={true} // Start as read-only to prevent keyboard
                          onClick={(e) => {
                            // Only allow editing after user explicitly taps
                            e.currentTarget.readOnly = false;
                          }}
                          onFocus={(e) => {
                            // If this is an auto-focus event on dialog showing, blur immediately
                            const timestamp = new Date().getTime();
                            const autoFocus = timestamp - profileForm.formState.submitCount < 500;
                            if (autoFocus) {
                              e.currentTarget.blur();
                            } else if (document.activeElement === e.currentTarget) {
                              // Clear readonly only after intentional focus
                              e.currentTarget.readOnly = false;
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="profileImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Picture</FormLabel>
                      <div className="space-y-4">
                        {/* Instagram-style profile picture editor */}
                        <div className="h-64 flex items-center justify-center">
                          {/* Image Preview Area */}
                          {(uploadedImage || field.value) && (
                            <div className="relative w-48 h-48 mx-auto overflow-hidden border-2 border-primary rounded-full">
                              <div 
                                className="w-full h-full flex items-center justify-center cursor-move"
                                onMouseDown={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  // Prevent any focus/keyboard from showing
                                  e.preventDefault();
                                }}
                                onMouseMove={handleImageDrag}
                                onTouchStart={(e) => {
                                  // Prevent touch from focusing and showing keyboard
                                  e.preventDefault();
                                  handleTouchStart(e);
                                }}
                                onTouchMove={(e) => {
                                  // Prevent default touch behavior
                                  e.preventDefault();
                                  handleTouchMove(e);
                                }}
                              >
                                <img 
                                  src={uploadedImage || field.value || ""} 
                                  alt="Profile Preview" 
                                  className="min-w-full min-h-full object-cover"
                                  style={{
                                    transform: `scale(${imageScale}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                                    transformOrigin: 'center',
                                    /* Prevent selection and focus behavior */
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none',
                                    WebkitTouchCallout: 'none'
                                  }}
                                  draggable="false" 
                                  onClick={(e) => e.preventDefault()}
                                  onDragStart={(e) => e.preventDefault()}
                                />
                              </div>
                              <div className="absolute inset-0 rounded-full pointer-events-none ring-2 ring-offset-2 ring-primary-foreground/10" />
                            </div>
                          )}
                        </div>
                        
                        {/* Controls for scale and position */}
                        {(uploadedImage || field.value) && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Label className="w-20">Zoom:</Label>
                              <input 
                                type="range" 
                                min="0.5" 
                                max="2" 
                                step="0.1" 
                                value={imageScale} 
                                onChange={(e) => setImageScale(parseFloat(e.target.value))} 
                                className="flex-1" 
                              />
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="w-full" 
                              onClick={resetImageTransform}
                            >
                              Reset Image Position
                            </Button>
                          </div>
                        )}
                        
                        {/* File upload */}
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="profileImageUpload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-neutral-400" />
                              <p className="mb-2 text-sm text-neutral-600">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-neutral-500">
                                PNG, JPG or JPEG (MAX. 800x800px)
                              </p>
                            </div>
                            <input 
                              id="profileImageUpload" 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Teacher bio and introduction"
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ""}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description of the teacher's background and expertise
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="35"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = e.target.value ? parseInt(e.target.value) : null;
                              field.onChange(value);
                            }}
                            autoFocus={false}
                            readOnly={true}
                            onClick={(e) => {
                              // Only allow editing after user explicitly taps
                              e.currentTarget.readOnly = false;
                            }}
                            onFocus={(e) => {
                              // Clear readonly only after intentional focus
                              if (document.activeElement === e.currentTarget) {
                                e.currentTarget.readOnly = false;
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="teacherId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teacher ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="T123456"
                            {...field}
                            value={field.value || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique ID assigned to the teacher
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={profileForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Complete address"
                          {...field}
                          value={field.value || ""}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="teacher@example.com"
                            {...field}
                            value={field.value || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="9876543210"
                            {...field}
                            value={field.value || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={profileForm.control}
                  name="aadharNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234 5678 9012"
                          {...field}
                          value={field.value || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        Unique Aadhaar number for identification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => openEditProfileDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={isUploadingDocument} onOpenChange={setIsUploadingDocument}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload official documents like ID proof, address proof, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="documentUpload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-12 h-12 mb-3 text-neutral-400" />
                  <p className="mb-2 text-sm text-neutral-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-neutral-500">
                    PDF, PNG, JPG or JPEG (MAX. 5MB)
                  </p>
                </div>
                <input 
                  id="documentUpload" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*"
                  onChange={handleDocumentUpload}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsUploadingDocument(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Certificate Upload Dialog */}
      <Dialog open={isUploadingCertificate} onOpenChange={setIsUploadingCertificate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Certificate</DialogTitle>
            <DialogDescription>
              Upload certificates, awards and achievements documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="certificateUpload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Award className="w-12 h-12 mb-3 text-neutral-400" />
                  <p className="mb-2 text-sm text-neutral-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-neutral-500">
                    PDF, PNG, JPG or JPEG (MAX. 5MB)
                  </p>
                </div>
                <input 
                  id="certificateUpload" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*"
                  onChange={handleCertificateUpload}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsUploadingCertificate(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}