import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { UserForm } from "@/components/admin/user-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  User, 
  School, 
  UserCog, 
  Search, 
  Edit2, 
  Trash2, 
  Lock,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/users", activeTab !== "all" ? activeTab : undefined],
    queryFn: async () => {
      const url = activeTab !== "all" 
        ? `/api/users?role=${activeTab}` 
        : "/api/users";
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number, newPassword: string }) => {
      return apiRequest("POST", `/api/users/${userId}/reset-password`, { password: newPassword });
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "User password has been successfully reset",
      });
      setIsResetPasswordDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      // Add search by admission number for students
      (user.role === "student" && user.admissionNo && user.admissionNo.toLowerCase().includes(query))
    );
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <UserCog className="h-4 w-4 text-primary" />;
      case "teacher":
        return <User className="h-4 w-4 text-accent" />;
      case "student":
        return <School className="h-4 w-4 text-secondary" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="outline" className="border-primary text-primary">
            {getRoleIcon(role)}
            <span className="ml-1">Administrator</span>
          </Badge>
        );
      case "teacher":
        return (
          <Badge variant="outline" className="border-accent text-accent">
            {getRoleIcon(role)}
            <span className="ml-1">Teacher</span>
          </Badge>
        );
      case "student":
        return (
          <Badge variant="outline" className="border-secondary text-secondary">
            {getRoleIcon(role)}
            <span className="ml-1">Student</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {getRoleIcon(role)}
            <span className="ml-1">{role}</span>
          </Badge>
        );
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleResetPassword = (newPassword: string) => {
    if (selectedUser) {
      resetPasswordMutation.mutate({ 
        userId: selectedUser.id, 
        newPassword 
      });
    }
  };

  const [, setLocation] = useLocation();
  
  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="md:ml-64 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-neutral-600">Manage and view all users in the system</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button 
              onClick={() => {
                fetch("/api/users", { cache: "no-store" })
                  .then(response => response.json())
                  .then(data => {
                    queryClient.setQueryData(["/api/users"], data);
                    queryClient.setQueryData(["/api/users", "admin"], data.filter((u: any) => u.role === "admin"));
                    queryClient.setQueryData(["/api/users", "teacher"], data.filter((u: any) => u.role === "teacher"));
                    queryClient.setQueryData(["/api/users", "student"], data.filter((u: any) => u.role === "student"));
                    toast({
                      title: "Refreshed",
                      description: "User list has been refreshed",
                    });
                  });
              }} 
              variant="outline" 
              size="icon"
              title="Refresh user list"
            >
              <RefreshCw size={16} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Fill in the form below to create a new user account
                  </DialogDescription>
                </DialogHeader>
                <UserForm onSuccess={() => {
                  // Close dialog and trigger a manual refetch
                  setIsDialogOpen(false);
                  fetch("/api/users", { cache: "no-store" })
                    .then(response => response.json())
                    .then(data => {
                      queryClient.setQueryData(["/api/users"], data);
                      queryClient.setQueryData(["/api/users", "admin"], data.filter((u: any) => u.role === "admin"));
                      queryClient.setQueryData(["/api/users", "teacher"], data.filter((u: any) => u.role === "teacher"));
                      queryClient.setQueryData(["/api/users", "student"], data.filter((u: any) => u.role === "student"));
                    });
                }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder={activeTab === "student" ? "Search students by name, email, username, or admission number" : "Search users by name, email, or username"}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex space-x-2 w-full md:w-auto md:ml-auto">
                <Button 
                  variant={activeTab === "all" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("all")}
                  className="flex-1 md:flex-none"
                >
                  All
                </Button>
                <Button 
                  variant={activeTab === "admin" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("admin")}
                  className="flex-1 md:flex-none"
                >
                  Admins
                </Button>
                <Button 
                  variant={activeTab === "teacher" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("teacher")}
                  className="flex-1 md:flex-none"
                >
                  Teachers
                </Button>
                <Button 
                  variant={activeTab === "student" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("student")}
                  className="flex-1 md:flex-none"
                >
                  Students
                </Button>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-neutral-500">Loading users...</p>
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    {activeTab === "student" && <TableHead>Admission No.</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow 
                      key={user.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {user.profileImage ? (
                              <AvatarImage src={user.profileImage} alt={user.name} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-neutral-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      {activeTab === "student" && (
                        <TableCell>{user.admissionNo || "-"}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsResetPasswordDialogOpen(true);
                              }}
                            >
                              <Lock className="mr-2 h-4 w-4" />
                              Reset password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-neutral-500">
                {searchQuery ? "No users found matching your search." : "No users found in the system."}
              </p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information
              </DialogDescription>
            </DialogHeader>
            <UserForm 
              isEditing 
              defaultValues={selectedUser} 
              onSuccess={() => {
                setIsEditDialogOpen(false);
                fetch("/api/users", { cache: "no-store" })
                  .then(response => response.json())
                  .then(data => {
                    queryClient.setQueryData(["/api/users"], data);
                    queryClient.setQueryData(["/api/users", "admin"], data.filter((u: any) => u.role === "admin"));
                    queryClient.setQueryData(["/api/users", "teacher"], data.filter((u: any) => u.role === "teacher"));
                    queryClient.setQueryData(["/api/users", "student"], data.filter((u: any) => u.role === "student"));
                    toast({
                      title: "User updated",
                      description: "User information has been updated",
                    });
                  });
              }} 
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will permanently remove the user
              account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                handleDeleteUser();
                // Also update the UI immediately
                fetch("/api/users", { cache: "no-store" })
                  .then(response => response.json())
                  .then(data => {
                    queryClient.setQueryData(["/api/users"], data);
                    queryClient.setQueryData(["/api/users", "admin"], data.filter((u: any) => u.role === "admin"));
                    queryClient.setQueryData(["/api/users", "teacher"], data.filter((u: any) => u.role === "teacher"));
                    queryClient.setQueryData(["/api/users", "student"], data.filter((u: any) => u.role === "student"));
                  });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="newPassword"
              type="password"
              placeholder="New password"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleResetPassword((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
          <DialogFooter className="mt-2">
            <Button 
              variant="outline"
              onClick={() => setIsResetPasswordDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const input = document.getElementById('newPassword') as HTMLInputElement;
                handleResetPassword(input.value);
              }}
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}