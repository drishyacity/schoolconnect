import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Pencil, Trash2, GraduationCap, Book, Users, Plus, Save, Upload, Camera, X, Loader2, FileText, Eye, Download, ExternalLink, CalendarIcon } from "lucide-react";
import ProfileImageCropper from "@/components/profile/ProfileImageCropper";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define types
type Class = {
  id: number;
  name: string;
  grade: number;
  section: string | null;
  description: string | null;
};

type ClassEnrollment = {
  id: number;
  studentId: number;
  classId: number;
  class: Class;
};

type StudentDocument = {
  id: number;
  studentId: number;
  documentType: string;
  documentUrl: string;
  documentName: string;
  createdAt: string;
};

type StudentDetails = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
  bio: string | null;
  grade: number | null;
  section: string | null;
  enrolledClasses: ClassEnrollment[];
  documents?: StudentDocument[];
  completedQuizzes?: number;
  totalQuizzes?: number;
  averageScore?: number;
  
  // Additional personal details
  age?: number | null;
  rollNumber?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  guardianName?: string | null;
  mobileNumber?: string | null; // Using parentsMobile for this field in UI
  guardianMobile?: string | null;
  parentsMobile?: string | null; // This field serves as student mobile number as well
  address?: string | null;
  aadharNo?: string | null;
  parentsEmail?: string | null;
  admissionNo?: string | null;
  admissionDate?: Date | null;
  busStop?: string | null;
  category?: string | null;
};

// Form schemas
const studentDetailsSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
  grade: z.coerce.number().int().min(1).max(12).nullable(),
  section: z.string().max(10).nullable().optional(),
  
  // Additional personal details
  age: z.coerce.number().int().min(0).max(100).nullable().optional(),
  rollNumber: z.string().max(20).nullable().optional(),
  fatherName: z.string().max(100).nullable().optional(),
  motherName: z.string().max(100).nullable().optional(),
  guardianName: z.string().max(100).nullable().optional(),
  mobileNumber: z.string().max(15).nullable().optional(),
  guardianMobile: z.string().max(15).nullable().optional(),
  parentsMobile: z.string().max(15).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  aadharNo: z.string().max(16).nullable().optional(),
  parentsEmail: z.string().email().nullable().optional(),
  admissionNo: z.string().max(50).nullable().optional(),
  admissionDate: z.union([z.string(), z.date()]).nullable().optional(),
  busStop: z.string().max(100).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
});

// Grade and section only schema
const gradeSectionSchema = z.object({
  grade: z.coerce.number().int().min(1).max(12).nullable(),
  section: z.string().max(10).nullable().optional(),
});

const enrollmentSchema = z.object({
  classId: z.coerce.number().int().positive(),
});

const profileUpdateSchema = z.object({
  profileImage: z.string().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
});

const documentSchema = z.object({
  documentType: z.string(),
  documentUrl: z.string().optional(),
  documentFile: z.any().optional(),
  documentName: z.string().min(1, { message: "Document name is required" }),
});

type StudentDetailsFormValues = z.infer<typeof studentDetailsSchema>;
type GradeSectionFormValues = z.infer<typeof gradeSectionSchema>;
type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;
type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;
type DocumentFormValues = z.infer<typeof documentSchema>;

export default function AdminStudentProfile() {
  // Parse a date string (either ISO or dd/mm/yyyy) to a Date object
  const getDateFromString = (dateString: string | null | undefined): Date | undefined => {
    if (!dateString) return undefined;
    
    try {
      // Log the dateString for debugging
      console.log("Processing date string:", dateString);
      
      // Check if it's in dd/mm/yyyy format
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        console.log("Parsed as dd/mm/yyyy:", date);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Fall back to standard date parsing (for ISO strings, etc.)
      const date = new Date(dateString);
      console.log("Parsed as standard date:", date);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
    
    console.warn("Failed to parse date string:", dateString);
    return undefined;
  };
  
  // Format date strings for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    // Try to handle both ISO strings and dd/mm/yyyy format
    let date: Date;
    
    if (dateString.includes('/')) {
      // dd/mm/yyyy format
      const [day, month, year] = dateString.split('/').map(Number);
      date = new Date(year, month-1, day);
    } else {
      // Assume ISO or similar string format
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };
  
  const { toast } = useToast();
  const { user } = useAuth(); // Add auth hook to ensure we have authentication
  const { id } = useParams();
  const studentId = parseInt(id as string);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [deleteEnrollmentId, setDeleteEnrollmentId] = useState<number | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isAddingEnrollment, setIsAddingEnrollment] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [isViewingDocument, setIsViewingDocument] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isEditingGradeSection, setIsEditingGradeSection] = useState(false);

  // Query to fetch current user to ensure authentication is established
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: studentDetails, isLoading, refetch } = useQuery<StudentDetails>({
    queryKey: [`/api/users/${studentId}`],
    enabled: !!studentId && !isNaN(studentId) && !!currentUser,
  });

  const { data: allClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const detailsForm = useForm<StudentDetailsFormValues>({
    resolver: zodResolver(studentDetailsSchema),
    defaultValues: {
      email: studentDetails?.email,
      grade: studentDetails?.grade,
      section: studentDetails?.section,
      
      // Additional personal details
      age: studentDetails?.age,
      rollNumber: studentDetails?.rollNumber,
      fatherName: studentDetails?.fatherName,
      motherName: studentDetails?.motherName,
      guardianName: studentDetails?.guardianName,
      mobileNumber: studentDetails?.mobileNumber,
      guardianMobile: studentDetails?.guardianMobile,
      parentsMobile: studentDetails?.parentsMobile,
      address: studentDetails?.address,
      aadharNo: studentDetails?.aadharNo,
      parentsEmail: studentDetails?.parentsEmail,
      admissionNo: studentDetails?.admissionNo,
      admissionDate: studentDetails?.admissionDate ? 
        (typeof studentDetails.admissionDate === 'string' ? studentDetails.admissionDate : null) : null,
      busStop: studentDetails?.busStop,
      category: studentDetails?.category,
    },
  });

  const enrollmentForm = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      classId: 0,
    },
  });
  
  const profileForm = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      profileImage: studentDetails?.profileImage,
      bio: studentDetails?.bio,
    },
  });
  
  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      documentType: "",
      documentUrl: "",
      documentName: ""
    },
  });
  
  const gradeSectionForm = useForm<GradeSectionFormValues>({
    resolver: zodResolver(gradeSectionSchema),
    defaultValues: {
      grade: studentDetails?.grade,
      section: studentDetails?.section,
    },
  });

  // Update student details mutation
  const updateDetailsMutation = useMutation({
    mutationFn: async (data: StudentDetailsFormValues) => {
      console.log("Submitting student details:", data);
      
      // Process the data to handle the admissionDate properly
      let processedData = { ...data };
      
      // If admissionDate is present, ensure it's in the right format for the server
      if (processedData.admissionDate) {
        // No need to convert - the server will handle the conversion now
        console.log("Date being sent to server:", processedData.admissionDate);
        
        // We're deliberately not modifying the format as the server expects the original value
      }
      
      // Log the final data being sent
      console.log("Final data being sent to server:", processedData);
      
      // Use apiRequest with authentication
      const response = await apiRequest("PATCH", `/api/users/${studentId}`, processedData);
      
      // Check the response 
      console.log("Server response:", response.ok, response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to update details: ${response.status}`);
      }
      
      return response;
    },
    onSuccess: () => {
      refetch();
      setIsEditingDetails(false);
      toast({
        title: "Student details updated",
        description: "The student's details have been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error during student details update:", error);
      toast({
        title: "Failed to update student details",
        description: error.message || "An error occurred while updating the student details.",
        variant: "destructive",
      });
    },
  });

  // Add enrollment mutation
  const addEnrollmentMutation = useMutation({
    mutationFn: async (data: EnrollmentFormValues) => {
      await apiRequest("POST", `/api/enrollments`, {
        ...data,
        studentId,
      });
    },
    onSuccess: () => {
      refetch();
      setIsAddingEnrollment(false);
      enrollmentForm.reset();
      toast({
        title: "Class enrollment added",
        description: "The student has been enrolled in the class successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to enroll student",
        description: error.message || "An error occurred while enrolling the student.",
        variant: "destructive",
      });
    },
  });

  // Delete enrollment mutation
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await apiRequest("DELETE", `/api/enrollments/${enrollmentId}`);
    },
    onSuccess: () => {
      refetch();
      setDeleteEnrollmentId(null);
      toast({
        title: "Enrollment removed",
        description: "The student has been unenrolled from the class.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove enrollment",
        description: error.message || "An error occurred while removing the enrollment.",
        variant: "destructive",
      });
    },
  });

  // Reset the form when student details change
  useEffect(() => {
    if (studentDetails) {
      detailsForm.reset({
        email: studentDetails.email,
        grade: studentDetails.grade,
        section: studentDetails.section,
        age: studentDetails.age,
        rollNumber: studentDetails.rollNumber,
        fatherName: studentDetails.fatherName,
        motherName: studentDetails.motherName,
        guardianName: studentDetails.guardianName,
        mobileNumber: studentDetails.mobileNumber, // Keep student's mobile number separate
        guardianMobile: studentDetails.guardianMobile,
        parentsMobile: studentDetails.parentsMobile,
        address: studentDetails.address,
        aadharNo: studentDetails.aadharNo,
        parentsEmail: studentDetails.parentsEmail,
        admissionNo: studentDetails.admissionNo,
        admissionDate: studentDetails.admissionDate ? 
          (typeof studentDetails.admissionDate === 'string' ? studentDetails.admissionDate : null) : null,
        busStop: studentDetails.busStop,
        category: studentDetails.category,
      });
      
      profileForm.reset({
        profileImage: studentDetails.profileImage,
        bio: studentDetails.bio,
      });
      
      gradeSectionForm.reset({
        grade: studentDetails.grade,
        section: studentDetails.section,
      });
    }
  }, [studentDetails, detailsForm, profileForm, gradeSectionForm]);

  const handleDetailsSubmit = (data: StudentDetailsFormValues) => {
    // Log the data to console to see what we're submitting
    console.log("Submitting details:", data);
    
    // We'll store student's mobile number in the mobileNumber field even though it doesn't exist in DB
    // This will be handled by the server which will ignore non-existent fields
    // parentsMobile stays as parents' mobile number
    
    console.log("Data for submission:", data);
    updateDetailsMutation.mutate(data);
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateFormValues) => {
      console.log("Submitting profile data:", data);
      
      // Use apiRequest with authentication
      const response = await apiRequest("PATCH", `/api/users/${studentId}`, data);
      
      console.log("Profile update response:", response.ok, response.status);
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      return response;
    },
    onSuccess: () => {
      refetch();
      setIsEditingProfile(false);
      setPreviewImage(null);
      toast({
        title: "Profile updated",
        description: "The student's profile has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Failed to update profile",
        description: error.message || "An error occurred while updating the profile.",
        variant: "destructive",
      });
    },
  });

  const handleEnrollmentSubmit = (data: EnrollmentFormValues) => {
    addEnrollmentMutation.mutate(data);
  };

  const handleProfileSubmit = (data: ProfileUpdateFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  // Handle grade and section updates
  const updateGradeSectionMutation = useMutation({
    mutationFn: async (data: GradeSectionFormValues) => {
      console.log("Updating grade/section:", data);
      const response = await apiRequest("PATCH", `/api/users/${studentId}`, data);
      
      if (!response.ok) {
        throw new Error(`Failed to update grade/section: ${response.status}`);
      }
      
      return response;
    },
    onSuccess: () => {
      refetch();
      setIsEditingGradeSection(false);
      toast({
        title: "Grade and section updated",
        description: "The student's grade and section have been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update grade and section",
        description: error.message || "An error occurred while updating the grade and section.",
        variant: "destructive",
      });
    },
  });
  
  const handleGradeSectionSubmit = (data: GradeSectionFormValues) => {
    updateGradeSectionMutation.mutate(data);
  };

  const handleDeleteEnrollment = (id: number) => {
    setDeleteEnrollmentId(id);
  };

  const confirmDeleteEnrollment = () => {
    if (deleteEnrollmentId) {
      deleteEnrollmentMutation.mutate(deleteEnrollmentId);
    }
  };
  
  // Add document mutation
  const addDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormValues) => {
      await apiRequest("POST", `/api/students/${studentId}/documents`, data);
    },
    onSuccess: () => {
      refetch();
      setIsAddingDocument(false);
      documentForm.reset();
      toast({
        title: "Document added",
        description: "The document has been added to the student's profile.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add document",
        description: error.message || "An error occurred while adding the document.",
        variant: "destructive",
      });
    },
  });
  
  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/student-documents/${documentId}`);
    },
    onSuccess: () => {
      refetch();
      setDeleteDocumentId(null);
      toast({
        title: "Document deleted",
        description: "The document has been removed from the student's profile.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete document",
        description: error.message || "An error occurred while deleting the document.",
        variant: "destructive",
      });
    },
  });
  
  const handleDocumentSubmit = (data: DocumentFormValues) => {
    // If file is uploaded, convert it to data URL before submitting
    if (data.documentFile && data.documentFile[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const documentUrl = reader.result as string;
        addDocumentMutation.mutate({
          ...data,
          documentUrl
        });
      };
      reader.readAsDataURL(data.documentFile[0]);
    } else if (data.documentUrl) {
      // If URL is provided directly
      addDocumentMutation.mutate(data);
    } else {
      toast({
        title: "Document required",
        description: "Please provide either a document URL or upload a file",
        variant: "destructive",
      });
    }
  };
  
  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      documentForm.setValue("documentFile", e.target.files);
      documentForm.setValue("documentName", file.name.split('.')[0] || "Document");
    }
  };
  
  const handleDeleteDocument = (id: number) => {
    setDeleteDocumentId(id);
  };
  
  const confirmDeleteDocument = () => {
    if (deleteDocumentId) {
      deleteDocumentMutation.mutate(deleteDocumentId);
    }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedImage(result);
        // Reset transformation when uploading a new image
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
      };
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read the selected file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Reset image transformation to default
  const resetImageTransform = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };
  
  // Handle image dragging for position adjustment
  const handleImageDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; // Only proceed if primary mouse button is pressed
    
    setImagePosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };
  
  // Touch events for mobile support
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPos.x;
    const deltaY = touch.clientY - touchStartPos.y;
    
    setImagePosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
  };

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Filter out classes that the student is already enrolled in
  const availableClasses = allClasses?.filter(
    cls => !studentDetails?.enrolledClasses.some(ec => ec.classId === cls.id)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="animate-pulse text-neutral-400">Loading student profile information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="text-neutral-600">Student not found or an error occurred.</div>
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
            <Button variant="outline" size="icon" className="mr-3" onClick={() => setLocation("/admin/students")}>
              <ChevronLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Student Profile</h1>
              <p className="text-neutral-600">Manage student profile and class enrollments</p>
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
                    profileImage: studentDetails.profileImage,
                    bio: studentDetails.bio
                  });
                  openEditProfileDialog(true);
                }}
              >
                <Avatar className="h-24 w-24 group-hover:opacity-90 transition-opacity">
                  {previewImage ? (
                    <AvatarImage src={previewImage} alt={studentDetails.name} />
                  ) : studentDetails.profileImage ? (
                    <AvatarImage src={studentDetails.profileImage} alt={studentDetails.name} />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary text-white">
                      {getInitials(studentDetails.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button 
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0 bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  size="sm"
                  variant="default"
                >
                  <Pencil size={14} />
                </Button>
              </div>
              <CardTitle>{studentDetails.name}</CardTitle>
              <CardDescription>{studentDetails.email}</CardDescription>
              
              <div className="mt-2 flex items-center justify-center gap-2">
                {(studentDetails.grade && studentDetails.section) ? (
                  <Badge variant="outline">
                    <GraduationCap size={14} className="mr-1" />
                    Class {studentDetails.grade}-{studentDetails.section}
                  </Badge>
                ) : studentDetails.grade ? (
                  <Badge variant="outline">
                    <GraduationCap size={14} className="mr-1" />
                    Grade {studentDetails.grade}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-neutral-500">
                    No grade assigned
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    gradeSectionForm.reset({ 
                      grade: studentDetails.grade, 
                      section: studentDetails.section 
                    });
                    setIsEditingGradeSection(true);
                  }}
                >
                  <Pencil size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Student ID</h3>
                  <p className="text-sm font-mono bg-neutral-100 p-2 rounded">
                    {studentDetails.username}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Bio</h3>
                  <p className="text-sm">
                    {studentDetails.bio || "No bio provided."}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Academic Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-neutral-50 rounded-md">
                      <p className="text-xs text-neutral-500">Completed Quizzes</p>
                      <p className="text-lg font-semibold">
                        {studentDetails.completedQuizzes || 0}/{studentDetails.totalQuizzes || 0}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-neutral-50 rounded-md">
                      <p className="text-xs text-neutral-500">Average Score</p>
                      <p className="text-lg font-semibold">
                        {studentDetails.averageScore || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-neutral-200 flex justify-center py-4">
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${studentDetails.email}`}>Contact Student</a>
              </Button>
            </CardFooter>
          </Card>

          {/* Class Enrollments Tabs */}
          <Card className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="border-b border-neutral-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="details">Student Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <TabsContent value="details" className="mt-0">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Student Details</h3>
                    <p className="text-sm text-neutral-500">Basic information about the student</p>
                  </div>
                  
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Name</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.name}
                          </div>
                        </div>
                        <div>
                          <Label>Email</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.email}
                          </div>
                        </div>
                        <div>
                          <Label>Username</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.username}
                          </div>
                        </div>
                        <div>
                          <Label>Role</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            <Badge>{studentDetails.role}</Badge>
                          </div>
                        </div>
                        <div>
                          <Label>Grade</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.grade || "Not assigned"}
                          </div>
                        </div>
                        <div>
                          <Label>Section</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.section || "Not assigned"}
                          </div>
                        </div>
                        <div>
                          <Label>Age</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.age || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Admission Number</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.admissionNo || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Admission Date</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.admissionDate 
                              ? new Date(studentDetails.admissionDate).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })
                              : "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Roll Number</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.rollNumber || "Not specified"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Family Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Father's Name</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.fatherName || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Mother's Name</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.motherName || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Guardian's Name</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.guardianName || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.category ? 
                              (studentDetails.category === 'general' ? 'General' : 
                               studentDetails.category === 'obc' ? 'OBC' : 
                               studentDetails.category === 'sc' ? 'SC' : 
                               studentDetails.category === 'st' ? 'ST' : 
                               studentDetails.category === 'ews' ? 'EWS' : 
                               studentDetails.category === 'other' ? 'Other' : 
                               studentDetails.category) 
                              : "Not specified"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Student's Mobile</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.mobileNumber || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Parents' Mobile</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.parentsMobile || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Guardian's Mobile</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.guardianMobile || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Parents' Email</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.parentsEmail || "Not specified"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Address</Label>
                          <div className="mt-1 p-2 border rounded-md min-h-[80px] whitespace-pre-wrap">
                            {studentDetails.address || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Aadhar Number</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.aadharNo || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <Label>Bus Stop</Label>
                          <div className="mt-1 p-2 border rounded-md">
                            {studentDetails.busStop || "Not specified"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Button 
                        onClick={() => {
                          detailsForm.reset({
                            email: studentDetails.email,
                            grade: studentDetails.grade, 
                            section: studentDetails.section,
                            
                            // Additional personal details
                            age: studentDetails.age,
                            rollNumber: studentDetails.rollNumber,
                            fatherName: studentDetails.fatherName,
                            motherName: studentDetails.motherName,
                            guardianName: studentDetails.guardianName,
                            mobileNumber: studentDetails.mobileNumber, // Student's mobile number
                            guardianMobile: studentDetails.guardianMobile,
                            parentsMobile: studentDetails.parentsMobile,
                            address: studentDetails.address,
                            aadharNo: studentDetails.aadharNo,
                            parentsEmail: studentDetails.parentsEmail,
                            admissionNo: studentDetails.admissionNo,
                            admissionDate: studentDetails.admissionDate ? new Date(studentDetails.admissionDate) : null,
                            busStop: studentDetails.busStop,
                            category: studentDetails.category,
                          });
                          setIsEditingDetails(true);
                        }}
                      >
                        <Pencil size={16} className="mr-2" />
                        Edit Student Details
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="documents" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Student Documents</h3>
                      <p className="text-sm text-neutral-500">Manage official documents for this student</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        documentForm.reset();
                        setIsAddingDocument(true);
                      }}
                    >
                      <Plus size={16} className="mr-1" />
                      Add Document
                    </Button>
                  </div>
                  
                  {studentDetails.documents && studentDetails.documents.length > 0 ? (
                    <div className="space-y-4">
                      {studentDetails.documents.map((document) => (
                        <Card key={document.id} className="overflow-hidden">
                          <div className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <Book size={18} className="text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{document.documentName}</h4>
                                <p className="text-sm text-neutral-600">
                                  Type: {document.documentType}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                  Added on: {new Date(document.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedDocument(document);
                                  setIsViewingDocument(true);
                                }}
                              >
                                View
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteDocument(document.id)}
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
                      <Book size={36} className="text-neutral-300 mx-auto mb-2" />
                      <h3 className="text-neutral-600 font-medium mb-1">No documents</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        This student doesn't have any documents attached to their profile
                      </p>
                      <Button size="sm" onClick={() => setIsAddingDocument(true)}>
                        <Plus size={16} className="mr-1" />
                        Add First Document
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="enrollments" className="mt-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Class Enrollments</h3>
                      <p className="text-sm text-neutral-500">Classes this student is enrolled in</p>
                    </div>
                    {availableClasses && availableClasses.length > 0 && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          enrollmentForm.reset();
                          setIsAddingEnrollment(true);
                        }}
                      >
                        <Plus size={16} className="mr-1" />
                        Add Enrollment
                      </Button>
                    )}
                  </div>
                  
                  {studentDetails.enrolledClasses && studentDetails.enrolledClasses.length > 0 ? (
                    <div className="space-y-4">
                      {studentDetails.enrolledClasses.map((enrollment) => (
                        <Card key={enrollment.id} className="overflow-hidden">
                          <div className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <Users size={18} className="text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{enrollment.class.name}</h4>
                                <p className="text-sm text-neutral-600">
                                  Grade {enrollment.class.grade}
                                  {enrollment.class.section && ` - Section ${enrollment.class.section}`}
                                </p>
                                {enrollment.class.description && (
                                  <p className="text-xs text-neutral-500 mt-1">{enrollment.class.description}</p>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteEnrollment(enrollment.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                      <Users size={36} className="text-neutral-300 mx-auto mb-2" />
                      <h3 className="text-neutral-600 font-medium mb-1">No class enrollments</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        This student is not enrolled in any classes
                      </p>
                      {availableClasses && availableClasses.length > 0 ? (
                        <Button size="sm" onClick={() => setIsAddingEnrollment(true)}>
                          <Plus size={16} className="mr-1" />
                          Add First Enrollment
                        </Button>
                      ) : (
                        <p className="text-sm text-neutral-500">No available classes to enroll in.</p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={isAddingDocument} onOpenChange={setIsAddingDocument}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Add a document to the student's profile
            </DialogDescription>
          </DialogHeader>
          <Form {...documentForm}>
            <form onSubmit={documentForm.handleSubmit(handleDocumentSubmit)}>
              <div className="space-y-4 py-4">
                <FormField
                  control={documentForm.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aadhar">Aadhar Card</SelectItem>
                          <SelectItem value="birth-certificate">Birth Certificate</SelectItem>
                          <SelectItem value="transfer-certificate">Transfer Certificate</SelectItem>
                          <SelectItem value="previous-marksheet">Previous Marksheet</SelectItem>
                          <SelectItem value="medical">Medical Certificate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of document you are adding
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={documentForm.control}
                  name="documentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Aadhar Card" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for the document
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="document-file">Upload Document</Label>
                    <Input
                      id="document-file"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleDocumentFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-neutral-500">
                      Upload a document from your device (PDF, images, Word docs)
                    </p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-neutral-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-neutral-500">Or provide a URL</span>
                    </div>
                  </div>
                  
                  <FormField
                    control={documentForm.control}
                    name="documentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/document.pdf" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          A valid URL to the document (PDF, image, or document link)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingDocument(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addDocumentMutation.isPending}
                >
                  {addDocumentMutation.isPending ? "Adding..." : "Add Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={isViewingDocument} onOpenChange={setIsViewingDocument}>
        <DialogContent className="max-w-3xl max-h-screen overflow-auto">
          <DialogHeader>
            <DialogTitle>View Document</DialogTitle>
            <DialogDescription>
              {selectedDocument?.documentName} ({selectedDocument?.documentType})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDocument && (
              <div>
                {/* Document info */}
                <div className="mb-4 bg-neutral-50 p-3 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <FileText size={16} className="text-primary" />
                    <span className="font-medium">{selectedDocument.documentName}</span>
                    <span className="text-neutral-400">•</span>
                    <span>{selectedDocument.documentType}</span>
                    <span className="text-neutral-400">•</span>
                    <span>Added on {new Date(selectedDocument.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Document preview */}
                {selectedDocument.documentUrl.endsWith('.pdf') ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-8 border border-dashed border-gray-300 rounded-md text-center w-full">
                      <div className="bg-neutral-100 rounded-md p-6">
                        <FileText size={64} className="mx-auto mb-4 text-neutral-400" />
                        <p className="text-neutral-600 mb-6 font-medium">PDF Document</p>
                        <div className="flex items-center justify-center gap-3">
                          <Button asChild>
                            <a href={selectedDocument.documentUrl} target="_blank" rel="noopener noreferrer">
                              <Eye size={16} className="mr-2" />
                              View PDF
                            </a>
                          </Button>
                          <Button variant="outline" asChild>
                            <a href={selectedDocument.documentUrl} download={selectedDocument.documentName}>
                              <Download size={16} className="mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* PDF embed if it's a data URL */}
                    {selectedDocument.documentUrl.startsWith('data:application/pdf') && (
                      <div className="w-full mt-6">
                        <h3 className="text-sm font-medium mb-2">Preview:</h3>
                        <iframe 
                          src={selectedDocument.documentUrl} 
                          className="w-full h-[500px] border rounded-md"
                          title={selectedDocument.documentName}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="border border-gray-200 rounded-md p-3 min-h-[300px] w-full flex items-center justify-center bg-neutral-50">
                      <img 
                        src={selectedDocument.documentUrl} 
                        alt={selectedDocument.documentName}
                        className="max-h-[400px] max-w-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzlkYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIGVycm9yIG9yIGRvY3VtZW50IG5vdCBwcmV2aWV3YWJsZTwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Button asChild>
                        <a href={selectedDocument.documentUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={16} className="mr-2" />
                          Open Original
                        </a>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={selectedDocument.documentUrl} download={selectedDocument.documentName}>
                          <Download size={16} className="mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsViewingDocument(false)}
            >
              Close
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                handleDeleteDocument(selectedDocument!.id);
                setIsViewingDocument(false);
              }}
            >
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={deleteDocumentId !== null} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDocument}
              disabled={deleteDocumentMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete Document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Student Details Dialog */}
      <Dialog open={isEditingDetails} onOpenChange={setIsEditingDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-white pb-2">
            <DialogTitle>Edit Student Details</DialogTitle>
            <DialogDescription>
              Update the student's information
            </DialogDescription>
          </DialogHeader>
          <Form {...detailsForm}>
            <form onSubmit={detailsForm.handleSubmit(handleDetailsSubmit)}>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-base font-medium mb-3">Academic Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={detailsForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="e.g. student@example.com" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              The student's primary email address
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g. 10" 
                                min={1}
                                max={12}
                                {...field}
                                value={field.value === null ? '' : field.value}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : parseInt(value));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              The grade level of the student (1-12)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. A" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              The section the student belongs to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="rollNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Roll Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. R123" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g. 15" 
                                min={4}
                                max={30}
                                {...field}
                                value={field.value === null ? '' : field.value}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : parseInt(value));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="admissionNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admission Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. ADM20230001" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="admissionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admission Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      typeof field.value === 'string' 
                                        ? field.value 
                                        : format(field.value, "PPP")
                                    ) : (
                                      <span>Select date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={(() => {
                                    if (!field.value) return undefined;
                                    
                                    try {
                                      // Handle string date value
                                      if (typeof field.value === 'string') {
                                        // Check if it's in dd/mm/yyyy format
                                        if (field.value.includes('/')) {
                                          const [day, month, year] = field.value.split('/')
                                            .map(part => parseInt(part, 10));
                                          return new Date(year, month - 1, day);
                                        }
                                        // Try parsing as ISO date
                                        return new Date(field.value);
                                      }
                                      
                                      // If it's already a Date object
                                      if (field.value instanceof Date) {
                                        return field.value;
                                      }
                                      
                                      return undefined;
                                    } catch (e) {
                                      console.error("Error parsing date:", e, field.value);
                                      return undefined;
                                    }
                                  })()}
                                  onSelect={(date) => {
                                    if (date) {
                                      // Format date as dd/mm/yyyy
                                      const day = date.getDate().toString().padStart(2, '0');
                                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                      const year = date.getFullYear();
                                      const formattedDate = `${day}/${month}/${year}`;
                                      
                                      field.onChange(formattedDate);
                                      console.log("Date selected formatted:", formattedDate);
                                    } else {
                                      field.onChange(null);
                                    }
                                  }}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  captionLayout="dropdown-buttons"
                                  fromYear={1980}
                                  toYear={new Date().getFullYear()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When the student was admitted to the school
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={(value) => field.onChange(value || null)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="obc">OBC</SelectItem>
                                <SelectItem value="sc">SC</SelectItem>
                                <SelectItem value="st">ST</SelectItem>
                                <SelectItem value="ews">EWS</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-medium mb-3">Family Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={detailsForm.control}
                        name="fatherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Father's Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter father's name" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="motherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mother's Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter mother's name" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="guardianName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guardian's Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter guardian's name" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-base font-medium mb-3">Contact Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={detailsForm.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Student's Mobile Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 9876543210" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="parentsMobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parents' Mobile Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 9876543210" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="guardianMobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guardian's Mobile Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 9876543210" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="parentsEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parents' Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="e.g. parent@example.com" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-medium mb-3">Additional Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={detailsForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter complete address" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                                className="min-h-[100px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="aadharNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aadhar Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 123456789012" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                                maxLength={16}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={detailsForm.control}
                        name="busStop"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bus Stop</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter bus stop name" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? null : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditingDetails(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateDetailsMutation.isPending}
                >
                  {updateDetailsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Enrollment Dialog */}
      <Dialog open={isAddingEnrollment} onOpenChange={setIsAddingEnrollment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Class Enrollment</DialogTitle>
            <DialogDescription>
              Enroll the student in a class
            </DialogDescription>
          </DialogHeader>
          <Form {...enrollmentForm}>
            <form onSubmit={enrollmentForm.handleSubmit(handleEnrollmentSubmit)}>
              <div className="space-y-4 py-4">
                <FormField
                  control={enrollmentForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableClasses?.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name} (Grade {cls.grade}{cls.section ? ` - ${cls.section}` : ''})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a class to enroll the student in
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
                  onClick={() => setIsAddingEnrollment(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addEnrollmentMutation.isPending}
                >
                  {addEnrollmentMutation.isPending ? "Enrolling..." : "Add Enrollment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Enrollment Confirmation Dialog */}
      <AlertDialog open={!!deleteEnrollmentId} onOpenChange={() => setDeleteEnrollmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the student from this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteEnrollment}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteEnrollmentMutation.isPending ? "Removing..." : "Remove Enrollment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grade and Section Edit Dialog */}
      <Dialog open={isEditingGradeSection} onOpenChange={setIsEditingGradeSection}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Grade and Section</DialogTitle>
            <DialogDescription>
              Update the student's grade and section information.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...gradeSectionForm}>
            <form onSubmit={gradeSectionForm.handleSubmit(handleGradeSectionSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={gradeSectionForm.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                        value={field.value?.toString() || "null"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Not assigned</SelectItem>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              Grade {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={gradeSectionForm.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                        value={field.value || "null"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Not assigned</SelectItem>
                          {["A", "B", "C", "D", "E", "F"].map((section) => (
                            <SelectItem key={section} value={section}>
                              Section {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditingGradeSection(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateGradeSectionMutation.isPending}
                >
                  {updateGradeSectionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={(open) => {
        if (open) {
          openEditProfileDialog(true);
        } else {
          setIsEditingProfile(false);
          setPreviewImage(null);
          setUploadedImage(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>
              Update the student's profile picture and bio.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <div className="flex flex-col items-center space-y-4 mb-6">
                <ProfileImageCropper
                  initialImage={previewImage || studentDetails.profileImage || null}
                  nameForInitials={studentDetails.name}
                  onCropped={(img) => {
                    setPreviewImage(img);
                    profileForm.setValue("profileImage", img);
                  }}
                  avatarSizeClass="h-24 w-24"
                  title="Crop Profile Image"
                  description="Drag and zoom to adjust the student's profile picture"
                />
              </div>
              
              <FormField
                control={profileForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write a short bio about the student..." 
                        className="resize-none min-h-[120px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      This bio will be visible on the student's profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditingProfile(false);
                  setPreviewImage(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}