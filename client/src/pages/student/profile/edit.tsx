import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Camera, User } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define types for profile data
type StudentProfile = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
  bio: string | null;
  grade: number | null;
  section: string | null;
};

// Form validation schema
const profileFormSchema = z.object({
  bio: z.string().max(500, "Bio should be at most 500 characters").nullable().optional(),
  profileImage: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function EditStudentProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Query to get the student profile
  const { data: studentProfile, isLoading } = useQuery<StudentProfile>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });
  
  // Set up form with initial values from profile data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: studentProfile?.bio || "",
      profileImage: studentProfile?.profileImage || "",
    },
    values: {
      bio: studentProfile?.bio || "",
      profileImage: studentProfile?.profileImage || "",
    },
  });
  
  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: ProfileFormValues) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, updatedProfile);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully",
      });
      
      // Redirect back to profile
      setLocation("/student/profile");
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: ProfileFormValues) => {
    // If there's a preview image, use that instead of the form value
    if (previewImage && previewImage !== studentProfile?.profileImage) {
      values.profileImage = previewImage;
    }
    
    updateProfileMutation.mutate(values);
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile image must be less than 5MB",
        variant: "destructive",
      });
      setIsUploadingImage(false);
      return;
    }
    
    // Create a fake upload using FileReader for base64 conversion
    // In a real app, you would upload this to a server/storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to preview the image. Please try again.",
        variant: "destructive",
      });
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="animate-pulse text-neutral-400">Loading profile information...</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!studentProfile) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div className="md:ml-64 p-6">
          <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <div className="text-neutral-600">Profile not found or an error occurred.</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold">Edit Profile</h1>
            <p className="text-neutral-600">Update your personal information and profile picture</p>
          </div>
          <Button asChild variant="outline" className="mt-4 md:mt-0">
            <Link to="/student/profile">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a new profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="mb-6 relative group">
                <Avatar className="h-32 w-32">
                  {(previewImage || studentProfile.profileImage) ? (
                    <AvatarImage 
                      src={previewImage || studentProfile.profileImage || ''} 
                      alt={studentProfile.name} 
                    />
                  ) : (
                    <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                      {getInitials(studentProfile.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {/* Image upload button overlay */}
                <label 
                  htmlFor="profile-image" 
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="h-8 w-8 text-white" />
                </label>
                
                <input 
                  id="profile-image" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
              </div>
              
              <div className="text-center mb-4">
                <h3 className="font-medium">{studentProfile.name}</h3>
                <p className="text-sm text-neutral-500">{studentProfile.email}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {isUploadingImage ? 'Uploading...' : 'Click the image to upload a new photo'}
                </p>
              </div>
              
              <div className="w-full">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center" 
                  onClick={() => document.getElementById('profile-image')?.click()}
                  disabled={isUploadingImage}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploadingImage ? 'Uploading...' : 'Upload New Picture'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Profile Information Card */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your bio and personal details</CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  {/* Display-only fields */}
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Username</h3>
                    <p className="text-neutral-800">{studentProfile.username}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Name</h3>
                    <p className="text-neutral-800">{studentProfile.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Email</h3>
                    <p className="text-neutral-800">{studentProfile.email}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Grade</h3>
                    <p className="text-neutral-800">{studentProfile.grade || 'Not assigned'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Section</h3>
                    <p className="text-neutral-800">{studentProfile.section || 'Not assigned'}</p>
                  </div>
                  
                  {/* Editable fields */}
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself..."
                            className="resize-none h-32"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          A short bio to help teachers and classmates know more about you.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end space-x-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/student/profile")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending || isUploadingImage}
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}