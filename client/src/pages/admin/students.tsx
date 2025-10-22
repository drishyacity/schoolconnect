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
import { ChevronRight, Search, GraduationCap, Plus, RefreshCw } from "lucide-react";

type Student = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  profileImage: string | null;
  grade: number | null;
  section: string | null;
};

export default function StudentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: students, isLoading, refetch } = useQuery<Student[]>({
    queryKey: ["/api/users?role=student"],
  });

  // Filter students based on search query
  const filteredStudents = students?.filter(student => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.username.toLowerCase().includes(query) ||
      (student.grade && student.grade.toString().includes(query)) ||
      (student.section && student.section.toLowerCase().includes(query))
    );
  });

  const handleStudentClick = (id: number) => {
    setLocation(`/admin/students/${id}`);
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
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-neutral-600">Manage and view all students in the system</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="icon">
              <RefreshCw size={16} />
            </Button>
            <Button onClick={() => setLocation("/admin/users/new?role=student")}>
              <Plus size={16} className="mr-2" />
              Add Student
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search students by name, email, or grade"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-neutral-500">Loading students...</p>
            </div>
          ) : filteredStudents && filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Grade/Section</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleStudentClick(student.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {student.profileImage ? (
                              <AvatarImage src={student.profileImage} alt={student.name} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-neutral-500">{student.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{student.username}</TableCell>
                      <TableCell>
                        {student.grade ? (
                          <Badge variant="outline">
                            <GraduationCap size={14} className="mr-1" />
                            Grade {student.grade}{student.section ? `-${student.section}` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not assigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => {
                          e.stopPropagation();
                          handleStudentClick(student.id);
                        }}>
                          <GraduationCap size={16} className="mr-1" />
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
                {searchQuery ? "No students found matching your search." : "No students found in the system."}
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