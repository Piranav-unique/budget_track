import Layout from "@/components/Layout";

export default function Terms() {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4 bg-white rounded-xl border border-border shadow-sm p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            These sample terms describe how you can use the SmartSpend Flow
            application. Update this text with your real terms when you are
            ready.
          </p>
          <div className="space-y-3 text-sm text-foreground">
            <p>• You are responsible for the accuracy of the data you enter.</p>
            <p>
              • The insights and charts are for informational purposes only and
              are not financial advice.
            </p>
            <p>
              • By using this app you agree that your usage may be logged to
              improve the product.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}


