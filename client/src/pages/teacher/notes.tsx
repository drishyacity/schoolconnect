import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContentForm } from "@/components/teacher/content-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatDate } from "@/lib/utils";
import { Plus, FileText, Download } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

export default function NotesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["/api/contents", "note", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/contents?type=note");
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 space-y-6 p-6 md:p-8 md:ml-64">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Note</DialogTitle>
                <DialogDescription>
                  Create and upload notes for your students
                </DialogDescription>
              </DialogHeader>
              <ContentForm />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Notes</CardTitle>
            <CardDescription>
              View and manage notes you've uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-6 text-center text-muted-foreground">
                Loading notes...
              </div>
            ) : notes.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No notes uploaded yet. Click the "Upload Note" button to add one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date Uploaded</TableHead>
                    <TableHead>File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.filter((note: any) => note.authorId === user?.id).map((note: any) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-primary" />
                          {note.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        {note.class ? (
                          <Badge variant="outline">
                            {note.class.name}
                          </Badge>
                        ) : (
                          "All Classes"
                        )}
                      </TableCell>
                      <TableCell>{formatDate(new Date(note.createdAt))}</TableCell>
                      <TableCell>
                        {note.fileUrl ? (
                          <a
                            href={note.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary hover:underline"
                          >
                            <Download className="mr-1 h-4 w-4" />
                            Download
                          </a>
                        ) : (
                          "No file uploaded"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}