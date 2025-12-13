import { Link } from "react-router-dom";
import { ChevronLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

function SettingsContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your budgeting experience
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                More Features Coming Soon
              </h2>
              <p className="text-muted-foreground mt-2">
                We're working on additional settings and customization options.
                Features like notification preferences, currency settings, and
                account management will be available soon.
              </p>
              <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                Check Back Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <Layout>
      <SettingsContent />
    </Layout>
  );
}
