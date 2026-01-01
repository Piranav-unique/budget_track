import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { user, loginMutation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, location, navigate]);

  // Check for OAuth errors in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error) {
      toast.error("Authentication failed", {
        description: error === 'google_auth_failed' 
          ? "Google authentication failed. Please try again."
          : error === 'github_auth_failed'
          ? "GitHub authentication failed. Please try again."
          : "Authentication failed. Please try again.",
        position: "bottom-right",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    }
  }, [location.search]);

  // Redirect if already logged in (immediate check)
  if (user) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        // Redirect to the page they were trying to access, or dashboard
        const from = (location.state as any)?.from?.pathname || "/";
        navigate(from, { replace: true });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Logo in top-left */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-semibold text-foreground">SmartSpend</span>
            <span className="text-lg sm:text-xl font-semibold text-foreground underline">Flow</span>
          </div>
        </Link>
      </div>

      {/* Notification Indicator in top-right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8">
        <button
          className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:bg-green-600 transition-colors shadow-md"
          onClick={() => {
            toast.info("Notifications", {
              description: "You have no new messages.",
              position: "bottom-right",
            });
          }}
          aria-label="Notifications"
        >
          <span className="text-xs font-bold">IM</span>
        </button>
      </div>

      {/* Centered Card */}
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>

          {/* Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ACCESS QUICKLY</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full border-2 border-border hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
              disabled={loginMutation.isPending}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-2 border-border hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                window.location.href = "/api/auth/github";
              }}
              disabled={loginMutation.isPending}
            >
              GitHub
            </Button>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}