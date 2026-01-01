import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { registerMutation, user } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Use email as username for now, or extract username from email
    const username = formData.email.split("@")[0];

    registerMutation.mutate(
      {
        username: username,
        password: formData.password,
      },
      {
        onSuccess: () => {
          setIsLoading(false);
          navigate("/dashboard");
        },
        onError: (err: Error) => {
          setIsLoading(false);
          setError(err.message || "Registration failed. Please try again.");
        },
      }
    );
  };

  const handleSocialLogin = (provider: string) => {
    if (provider === "Google") {
      window.location.href = "/api/auth/google";
      return;
    }

    if (provider === "GitHub") {
      window.location.href = "/api/auth/github";
      return;
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

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
      <div className="flex items-center justify-center min-h-screen px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border p-6 sm:p-8 md:p-10">
          {/* Title and Subtitle */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Sign up</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Sign up to continue</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <Input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="border-0 border-b-2 border-border rounded-none px-0 py-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary bg-transparent text-foreground placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            {/* Email Input */}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="border-0 border-b-2 border-border rounded-none px-0 py-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary bg-transparent text-foreground placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="border-0 border-b-2 border-border rounded-none px-0 py-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary bg-transparent text-foreground placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            {/* Sign up Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Signing up...
                </>
              ) : (
                "Sign up"
              )}
            </Button>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
                className="border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="remember"
                className="text-sm text-foreground cursor-pointer select-none"
              >
                Remember me
              </label>
            </div>

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
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSocialLogin("Google")}
                disabled={isLoading}
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSocialLogin("GitHub")}
                disabled={isLoading}
              >
                GitHub
              </Button>
            </div>

            {/* Sign in Link */}
            <div className="text-center text-sm pt-4">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
