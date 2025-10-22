import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Search, UserCog, Plus, RefreshCw } from "lucide-react";
import { experienceLevels } from "@/lib/utils";

type Teacher = {
  id: number;
  name: string;
  username: string; 
  email: string;
  role: string;
  profileImage: string | null;
  experienceLevel: string | null;
};

export default function TeachersPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: teachers, isLoading, refetch } = useQuery<Teacher[]>({
    queryKey: ["/api/users?role=teacher"],
  });

  // Filter teachers based on search query
  const filteredTeachers = teachers?.filter(teacher => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(query) ||
      teacher.email.toLowerCase().includes(query) ||
      teacher.username.toLowerCase().includes(query)
    );
  });

  const handleTeacherClick = (id: number) => {
    setLocation(`/admin/teachers/${id}`);
  };

  const getExperienceLevelLabel = (level: string | null) => {
    if (!level) return "Not set";
    const found = experienceLevels.find(exp => exp.value === level);
    return found?.label || level;
  };

  const getInitials = (name: string) => {
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
            <h1 className="text-2xl font-bold">Teachers</h1>
            <p className="text-neutral-600">Manage and view all teachers in the system</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="icon">
              <RefreshCw size={16} />
            </Button>
            <Button onClick={() => setLocation("/admin/users/new?role=teacher")}>
              <Plus size={16} className="mr-2" />
              Add Teacher
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search teachers by name or email"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-neutral-500">Loading teachers...</p>
            </div>
          ) : filteredTeachers && filteredTeachers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow 
                      key={teacher.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleTeacherClick(teacher.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {teacher.profileImage ? (
                              <AvatarImage src={teacher.profileImage} alt={teacher.name} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(teacher.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{teacher.name}</div>
                            <div className="text-sm text-neutral-500">{teacher.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{teacher.username}</TableCell>
                      <TableCell>
                        <Badge variant={teacher.experienceLevel ? "outline" : "secondary"}>
                          {getExperienceLevelLabel(teacher.experienceLevel)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => {
                          e.stopPropagation();
                          handleTeacherClick(teacher.id);
                        }}>
                          <UserCog size={16} className="mr-1" />
                          <ChevronRight size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-neutral-500">
                {searchQuery ? "No teachers found matching your search." : "No teachers found in the system."}
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
    </div>
  );
}