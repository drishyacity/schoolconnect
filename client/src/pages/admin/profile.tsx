import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Camera, Upload, X, Pencil, Check, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Form validation schema
const ProfileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  bio: z.string().nullable().optional(),
  profileImage: z.string().nullable().optional(),
});

// Function to create an image from a canvas crop operation
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

// Function to get the cropped image
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number } | null
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx || !pixelCrop) {
    return imageSrc;
  }

  // Set canvas size to match the desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // As Base64 string
  return canvas.toDataURL('image/jpeg', 0.95);
};

type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function AdminProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);

  const { data: profileData, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const profileForm = useForm<z.infer<typeof ProfileFormSchema>>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
      profileImage: user?.profileImage || null,
    },
  });

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
        
        // Focus on the button to prevent keyboard from showing
        dummyButton.focus();
        
        // Remove the button after it served its purpose
        setTimeout(() => {
          document.body.removeChild(dummyButton);
        }, 100);
      };
      
      // Call this in multiple timeouts to ensure it works across different mobile devices
      setTimeout(preventAutoFocus, 50);
      setTimeout(preventAutoFocus, 150);
      setTimeout(preventAutoFocus, 300);
      setTimeout(preventAutoFocus, 500);
    } else {
      setIsEditingProfile(false);
    }
  };

  // Update form values when profile data changes
  useEffect(() => {
    if (profileData) {
      const userData = profileData as User;
      profileForm.reset({
        name: userData.name || "",
        email: userData.email || "",
        bio: userData.bio || null,
        profileImage: userData.profileImage || null,
      });
    }
  }, [profileData, profileForm]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof ProfileFormSchema>) => {
      const res = await apiRequest("PATCH", `/api/user`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditingProfile(false);
      setPreviewImage(null);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const handleProfileSubmit = (data: z.infer<typeof ProfileFormSchema>) => {
    // If there's a preview image, use that instead of the current profile image
    if (previewImage) {
      data.profileImage = previewImage;
    }
    
    updateProfileMutation.mutate(data);
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
    
    // Create a file reader to convert the image to base64 and show the cropper
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
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
  
  // Handle cropper complete
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  // Apply the crop
  const applyCrop = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      setPreviewImage(croppedImage);
      setShowCropper(false);
      setImageSrc(null);
      
      // Set the form value with the cropped image
      profileForm.setValue("profileImage", croppedImage);
      
      toast({
        title: "Image cropped",
        description: "Your profile image has been cropped successfully.",
      });
    } catch (error) {
      toast({
        title: "Crop failed",
        description: "Failed to crop the image. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Cancel the crop
  const cancelCrop = () => {
    setShowCropper(false);
    setImageSrc(null);
  };

  // Get initials for avatar fallback
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Admin Profile</h1>
          <p className="text-neutral-600">Manage your profile information</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div 
                className="mx-auto mb-4 relative group cursor-pointer" 
                onClick={() => {
                  profileForm.reset({
                    name: user?.name || "",
                    email: user?.email || "",
                    bio: user?.bio || "",
                    profileImage: user?.profileImage || null,
                  });
                  openEditProfileDialog(true);
                }}
              >
                <Avatar className="h-32 w-32 mx-auto">
                  {user?.profileImage ? (
                    <AvatarImage src={user.profileImage} alt={user.name} />
                  ) : (
                    <AvatarFallback className="text-3xl bg-primary text-white">
                      {getInitials(user?.name || "")}
                    </AvatarFallback>
                  )}
                  <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil className="h-6 w-6 text-white" />
                  </div>
                </Avatar>
              </div>
              <CardTitle>{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Role</h3>
                  <p className="font-medium">Administrator</p>
                </div>
                
                {user?.bio && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">Bio</h3>
                    <p className="text-sm text-neutral-700">{user.bio}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => {
                  profileForm.reset({
                    name: user?.name || "",
                    email: user?.email || "",
                    bio: user?.bio || "",
                    profileImage: user?.profileImage || null,
                  });
                  openEditProfileDialog(true);
                }}
              >
                Edit Profile
              </Button>
            </CardFooter>
          </Card>
          
          {/* Account Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>View and manage your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <div className="p-2 bg-neutral-100 rounded-md mt-1">{user?.name}</div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="p-2 bg-neutral-100 rounded-md mt-1">{user?.email}</div>
                  </div>
                </div>
                
                <div>
                  <Label>Username</Label>
                  <div className="p-2 bg-neutral-100 rounded-md mt-1">{user?.username}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={(open) => {
        if (open) {
          openEditProfileDialog(true);
        } else {
          setIsEditingProfile(false);
          setPreviewImage(null);
          setImageSrc(null);
          setShowCropper(false);
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and picture.
            </DialogDescription>
          </DialogHeader>
          
          {showCropper && imageSrc ? (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Crop Your Image</h3>
                <p className="text-sm text-neutral-500">Drag and zoom to adjust your profile picture</p>
              </div>
              
              <div className="relative h-64 mb-4 overflow-hidden rounded-lg max-w-full w-full mx-auto">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>

              <div className="flex flex-col gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Zoom</Label>
                    <span className="text-xs text-neutral-500">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="h-4 w-4 text-neutral-500" />
                    <Slider
                      value={[zoom]}
                      min={1}
                      max={3}
                      step={0.01}
                      onValueChange={(value) => setZoom(value[0])}
                      className="flex-1"
                    />
                    <ZoomIn className="h-4 w-4 text-neutral-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelCrop}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={applyCrop}
                >
                  <Check className="mr-2 h-4 w-4" /> Apply Crop
                </Button>
              </div>
            </div>
          ) : (
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="flex flex-col items-center space-y-4 mb-6">
                  <div className="relative group">
                    <Avatar className="h-24 w-24">
                      {previewImage ? (
                        <AvatarImage src={previewImage} alt={user?.name || ""} />
                      ) : user?.profileImage ? (
                        <AvatarImage src={user.profileImage} alt={user.name} />
                      ) : (
                        <AvatarFallback className="text-xl bg-primary text-white">
                          {getInitials(user?.name || "")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    {/* Image upload button overlay */}
                    <label 
                      htmlFor="profile-image" 
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-white" />
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
                  
                  <div className="text-center mb-2">
                    <p className="text-xs text-neutral-400">
                      {isUploadingImage ? 'Uploading...' : 'Click the image to upload a new photo'}
                    </p>
                  </div>
                  
                  <div className="w-full flex justify-center gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      className="flex items-center justify-center" 
                      onClick={() => document.getElementById('profile-image')?.click()}
                      disabled={isUploadingImage}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    
                    {(previewImage || user?.profileImage) && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1" 
                        onClick={() => {
                          setPreviewImage(null);
                          profileForm.setValue("profileImage", null);
                        }}
                      >
                        <X size={14} />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Your email" {...field} />
                      </FormControl>
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
                          placeholder="Write something about yourself..." 
                          className="resize-none min-h-[120px]" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        This bio will be visible on your profile.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-2">
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
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}