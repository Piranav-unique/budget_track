import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground mb-2">Page not found</p>
          <p className="text-sm text-muted-foreground mb-6">
            Sorry, the page you're looking for doesn't exist. Let's get you back
            on track!
          </p>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
