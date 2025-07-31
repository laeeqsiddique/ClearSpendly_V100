import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Flowvya - Smart Expense Tracking",
  description: "Learn about Flowvya's mission to simplify expense management with AI-powered receipt processing and intelligent categorization.",
  openGraph: {
    title: "About Flowvya",
    description: "Smart expense tracking made simple",
    type: "website",
  },
};

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              About Flowvya
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simplifying expense management with intelligent automation and 
              real-time insights for businesses of all sizes.
            </p>
          </div>

          {/* Mission Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Flowvya was created to eliminate the hassle of expense tracking. 
                We believe that managing business expenses should be effortless, accurate, 
                and insightful. Our platform combines cutting-edge AI technology with 
                intuitive design to transform how businesses handle their financial data.
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">AI-Powered Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our advanced OCR technology automatically extracts data from receipts 
                  and invoices, reducing manual entry by up to 95%.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Smart Categorization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Machine learning algorithms automatically categorize expenses, 
                  learning from your patterns to improve accuracy over time.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Real-time Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get instant visibility into spending patterns with dynamic dashboards 
                  and customizable reports that help you make informed decisions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Multi-tenant Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Built for teams with enterprise-grade security, role-based access, 
                  and complete data isolation between organizations.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Technology Stack */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Built with Modern Technology</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-semibold">Next.js 15</div>
                  <div className="text-sm text-muted-foreground">React Framework</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-semibold">Supabase</div>
                  <div className="text-sm text-muted-foreground">Database & Auth</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-semibold">OpenAI GPT</div>
                  <div className="text-sm text-muted-foreground">AI Processing</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-semibold">TypeScript</div>
                  <div className="text-sm text-muted-foreground">Type Safety</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center bg-primary/5 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of businesses that have streamlined their expense 
              management with Flowvya.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/sign-up">Start Free Trial</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/dashboard">View Demo</Link>
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-center mt-12 text-sm text-muted-foreground">
            <p>
              Questions? Contact us at{" "}
              <a 
                href="mailto:support@clearspendly.com" 
                className="text-primary hover:underline"
              >
                support@clearspendly.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}