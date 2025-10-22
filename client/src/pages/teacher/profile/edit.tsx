import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Save, Upload } from "lucide-react";
import { experienceLevels } from "@/lib/utils";

type Teacher = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
  bio: string | null;
  experienceLevel: string | null;
};

// Form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  profileImage: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditTeacherProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: teacherDetails, isLoading, refetch } = useQuery<Teacher>({
    queryKey: ["/api/users", user?.id],
    queryFn: async () => {
      console.log(`Fetching teacher details for user ${user?.id}`);
      const res = await fetch(`http://localhost:5000/api/users/${user?.id}`, {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch teacher details: ${res.status}`);
      }

      const data = await res.json();
      console.log(`Received teacher details:`, data);
      return data;
    },
    enabled: !!user && user.role === "teacher",
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: teacherDetails?.name || user?.name || "",
      bio: teacherDetails?.bio || "",
      experienceLevel: teacherDetails?.experienceLevel || "",
      profileImage: teacherDetails?.profileImage || null,
    },
  });

  // Update form default values when data loads
  useEffect(() => {
    if (teacherDetails) {
      console.log("Teacher details loaded:", teacherDetails);
      console.log("Experience level:", teacherDetails.experienceLevel);

      form.reset({
        name: teacherDetails.name,
        bio: teacherDetails.bio,
        experienceLevel: teacherDetails.experienceLevel || "",
        profileImage: teacherDetails.profileImage,
      });

      setImagePreview(teacherDetails.profileImage);
    }
  }, [teacherDetails, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log(`Updating profile for user ${user?.id} with data:`, data);

      const res = await fetch(`http://localhost:5000/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update profile: ${res.status}`);
      }

      return await res.json();
    },
    onSuccess: () => {
      // Manually refetch the data
      refetch();

      // Also invalidate the queries to ensure fresh data using the correct query key structure
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "teacher-details"] });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
        variant: "default",
      });

      // Go back to profile page
      setLocation("/teacher/profile");
    },
    onError: (error: any) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Failed to update profile",
        description: error.message || "An error occurred while updating your profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For a real implementation, this would upload to a server
      // Here we just create a data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        form.setValue("profileImage", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

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

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />

      <div className="md:ml-64 p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Button variant="outline" size="icon" className="mr-3" onClick={() => setLocation("/teacher/profile")}>
              <ChevronLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Profile</h1>
              <p className="text-neutral-600">Update your teacher profile information</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and profile settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Image */}
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div>
                    <Avatar className="h-24 w-24">
                      {imagePreview ? (
                        <AvatarImage src={imagePreview} alt={form.getValues("name")} />
                      ) : (
                        <AvatarFallback className="text-xl bg-primary text-white">
                          {getInitials(form.getValues("name") || user?.name || '')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>

                  <div className="space-y-2 flex-1">
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("profileImage")?.click()}
                      >
                        <Upload size={16} className="mr-2" />
                        Upload Image
                      </Button>
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            setImagePreview(null);
                            form.setValue("profileImage", null);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <FormDescription>
                      Recommended size: 300x300px. Max file size: 2MB.
                    </FormDescription>
                  </div>
                </div>

                <Separator />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your public display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Experience Level */}
                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your experience level" />
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
                        Select your teaching experience level.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bio */}
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write a short bio about yourself..."
                          className="resize-none min-h-[120px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on your profile. Write about your teaching philosophy,
                        experience, or any other relevant information.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between border-t border-neutral-200 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/teacher/profile")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || !form.formState.isDirty}
                >
                  {updateProfileMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">◌</span>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}