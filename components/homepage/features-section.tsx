"use client";

import { ReceiptCard } from "@/components/ui/receipt-card";
import { 
  Upload, 
  Brain, 
  TrendingUp, 
  Shield, 
  MessageSquare, 
  FileText,
  Zap,
  Users,
  BarChart3,
  Lock,
  Smartphone,
  Globe
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "Smart Upload & OCR",
    description: "Drag & drop, snap a photo, or forward emails. Our AI extracts every detail with 99.8% accuracy using local Mistral-7B or cloud fallback.",
    icon: Upload,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
  },
  {
    title: "AI Categorization",
    description: "Automatically categorize expenses with machine learning. Custom rules, smart suggestions, and bulk categorization support.",
    icon: Brain,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
  },
  {
    title: "Price Anomaly Detection",
    description: "Track vendor pricing over time. Get instant alerts when costs spike unexpectedly. Never miss a pricing error again.",
    icon: TrendingUp,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
  },
  {
    title: "Privacy-First Mode",
    description: "Toggle offline processing for complete data privacy. Your receipts never leave your infrastructure when enabled.",
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
  },
  {
    title: "Natural Language Search",
    description: "Ask questions in plain English. 'Show me all office supplies from last quarter' works like magic.",
    icon: MessageSquare,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
  },
  {
    title: "Export & Compliance",
    description: "Generate tax-ready reports, CSV exports, and PDF bundles. GDPR compliant with full data portability.",
    icon: FileText,
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/20",
  },
];

const additionalFeatures = [
  {
    title: "Real-time Analytics",
    description: "Live dashboards with spending trends, category breakdowns, and vendor analytics.",
    icon: BarChart3,
  },
  {
    title: "Multi-tenant Ready",
    description: "Built for teams with role-based access, department isolation, and audit trails.",
    icon: Users,
  },
  {
    title: "Mobile First",
    description: "Native mobile experience for receipt capture on-the-go. Works offline too.",
    icon: Smartphone,
  },
  {
    title: "API Access",
    description: "RESTful API for custom integrations. Webhook support for real-time events.",
    icon: Zap,
  },
  {
    title: "Bank-Level Security",
    description: "256-bit encryption, SOC2 compliance, and regular security audits.",
    icon: Lock,
  },
  {
    title: "Global Support",
    description: "Multi-currency, multi-language support with local tax compliance.",
    icon: Globe,
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-purple-600 dark:text-purple-400">
            Everything you need
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Powerful features for modern expense management
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            From receipt capture to advanced analytics, we've built every feature 
            with privacy and efficiency in mind.
          </p>
        </div>

        {/* Main features grid */}
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <ReceiptCard className="h-full">
                  {/* Background decoration */}
                  <div className="absolute top-4 right-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 blur-2xl" />
                  
                  <div className="relative">
                    {/* Icon */}
                    <div className={`inline-flex rounded-lg p-3 ${feature.bgColor}`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>

                    {/* Content */}
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                </ReceiptCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Additional features */}
        <div className="mx-auto mt-20 max-w-7xl">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/50 p-8 ring-1 ring-gray-200 dark:ring-gray-800">
            <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-8">
              Plus everything else you'd expect
            </h3>
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {additionalFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="flex gap-3"
                >
                  <feature.icon className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Ready to transform your expense management?
          </p>
          <div className="mt-6">
            <a
              href="/sign-up"
              className="inline-flex items-center rounded-md bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              Start your free trial
              <Zap className="ml-2 h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}