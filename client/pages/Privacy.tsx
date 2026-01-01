import Layout from "@/components/Layout";

export default function Privacy() {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4 bg-white rounded-xl border border-border shadow-sm p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            This is a demo privacy policy for your SmartSpend Flow application. You
            can replace this content with your real policy at any time.
          </p>
          <div className="space-y-3 text-sm text-foreground">
            <p>
              • Your expense data is stored securely in your database and is
              only used to power features like analytics and AI insights.
            </p>
            <p>
              • We do not share your personal data with third parties except
              for services you configure (for example, AI providers).
            </p>
            <p>
              • You can export your data at any time from the Settings page
              using the Export Data option.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}


