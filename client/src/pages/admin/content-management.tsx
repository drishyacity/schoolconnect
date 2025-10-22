import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContentListFixed from "@/components/content/content-list-fixed";
import ContentForm from "@/components/content/content-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";

export default function AdminContentManagement() {
  const [contentType, setContentType] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Fetch classes and subjects for filtering
  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="md:ml-64 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
            <p className="text-gray-500 mt-1">
              Manage all educational content across the platform
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add New Content
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Create New Content</DialogTitle>
                <DialogDescription>
                  Add new educational content to the platform
                </DialogDescription>
              </DialogHeader>
              <ContentForm
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <TabsList className="mb-4 md:mb-0">
                <TabsTrigger
                  value="all"
                  onClick={() => setContentType(null)}
                  className="text-sm"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="note"
                  onClick={() => setContentType("note")}
                  className="text-sm"
                >
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="homework"
                  onClick={() => setContentType("homework")}
                  className="text-sm"
                >
                  Homework
                </TabsTrigger>
                <TabsTrigger
                  value="dpp"
                  onClick={() => setContentType("dpp")}
                  className="text-sm"
                >
                  DPPs
                </TabsTrigger>
                <TabsTrigger
                  value="lecture"
                  onClick={() => setContentType("lecture")}
                  className="text-sm"
                >
                  Lectures
                </TabsTrigger>
                <TabsTrigger
                  value="sample_paper"
                  onClick={() => setContentType("sample_paper")}
                  className="text-sm"
                >
                  Sample Papers
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                <select
                  className="border rounded-md px-3 py-1 text-sm"
                  value={selectedClassId || ""}
                  onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md px-3 py-1 text-sm"
                  value={selectedSubjectId || ""}
                  onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject: any) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <TabsContent value="all" className="mt-4">
              <ContentListFixed
                contentType={contentType}
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                role="admin"
              />
            </TabsContent>
            <TabsContent value="note" className="mt-4">
              <ContentListFixed
                contentType="note"
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                role="admin"
              />
            </TabsContent>
            <TabsContent value="homework" className="mt-4">
              <ContentListFixed
                contentType="homework"
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                role="admin"
              />
            </TabsContent>
            <TabsContent value="dpp" className="mt-4">
              <ContentListFixed
                contentType="dpp"
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                role="admin"
              />
            </TabsContent>
            <TabsContent value="lecture" className="mt-4">
              <ContentListFixed
                contentType="lecture"
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                role="admin"
              />
            </TabsContent>
            <TabsContent value="sample_paper" className="mt-4">
              <ContentListFixed
                contentType="sample_paper"
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                role="admin"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}