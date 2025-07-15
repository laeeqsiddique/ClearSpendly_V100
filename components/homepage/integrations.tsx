import { Card } from "@/components/ui/card";
import * as React from "react";
import { Upload, Zap, Shield, Brain, Search, Download } from "lucide-react";

export default function Integrations() {
  return (
    <section>
      <div className="pt-12 pb-32">
        <div className="mx-auto max-w-5xl px-6">
          <div>
            <h2 className="text-balance text-3xl font-semibold md:text-4xl">
              Powerful Features for Modern Businesses
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Transform your receipt management with AI-powered insights and 
              privacy-first processing.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Smart Receipt Upload"
              description="Drag & drop, mobile photo capture, or email forwarding. Supports PDF, JPG, PNG formats with instant processing."
              icon={<Upload className="h-10 w-10 text-indigo-600" />}
            />

            <FeatureCard
              title="AI-Powered OCR"
              description="Local Mistral-7B processing for privacy, with cloud fallback. Extract line items, vendors, and amounts automatically."
              icon={<Brain className="h-10 w-10 text-purple-600" />}
            />

            <FeatureCard
              title="Price Anomaly Detection"
              description="Track price changes over time and get alerts when costs spike. Never miss unexpected vendor price increases."
              icon={<Zap className="h-10 w-10 text-orange-600" />}
            />

            <FeatureCard
              title="Privacy-First Architecture"
              description="Toggle offline-only mode for complete data privacy. Your receipts never leave your infrastructure when enabled."
              icon={<Shield className="h-10 w-10 text-green-600" />}
            />

            <FeatureCard
              title="Intelligent Search & Chat"
              description="Ask questions about your spending in natural language. 'How much did I spend on office supplies last month?'"
              icon={<Search className="h-10 w-10 text-blue-600" />}
            />

            <FeatureCard
              title="Export & Compliance"
              description="Generate CSV reports, PDF bundles, and tax-ready documentation. GDPR compliant with data portability."
              icon={<Download className="h-10 w-10 text-teal-600" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const FeatureCard = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) => {
  return (
    <Card className="p-6 h-full hover:shadow-lg transition-shadow rounded-md">
      <div className="relative">
        <div className="mb-4">{icon}</div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
};
