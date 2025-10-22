import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLogin = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
      },
    });
  };

  // Redirect if already logged in
  if (user) {
    const redirectPath = 
      user.role === "admin" ? "/admin"
      : user.role === "teacher" ? "/teacher"
      : "/student";
    return <Redirect to={redirectPath} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex flex-col w-full md:w-1/2 justify-center items-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center">
            <div className="bg-primary rounded-full p-3 mb-4">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-center">Learning Management System</h1>
            <p className="text-center text-muted-foreground mt-2">
              Access your educational content and resources
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLogin)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Log in"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-primary to-primary-dark items-center justify-center p-8">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-6">
            Welcome to our Learning Management System
          </h2>
          <p className="text-lg mb-8">
            Our platform provides a seamless learning experience with features designed
            for students, teachers, and administrators. Access your courses, create
            content, take quizzes, and track your progress all in one place.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-bold text-xl mb-2">Students</h3>
              <p>Access courses, view assignments, take quizzes, and track your progress.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-bold text-xl mb-2">Teachers</h3>
              <p>Create courses, upload content, design quizzes, and grade student work.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-bold text-xl mb-2">Administrators</h3>
              <p>Manage users, courses, and monitor system activity and performance.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-bold text-xl mb-2">Content</h3>
              <p>Access notes, homework, quizzes, lectures, and other learning resources.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}