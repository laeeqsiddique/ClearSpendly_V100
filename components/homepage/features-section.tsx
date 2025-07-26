"use client";

import { ReceiptCard } from "@/components/ui/receipt-card";
import { 
  ScanLine, 
  Car, 
  FileText, 
  DollarSign, 
  BarChart3, 
  History,
  Zap,
  Users,
  Shield,
  Lock,
  Smartphone,
  Globe
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "Scan to Sheet",
    description: "Snap a receipt and see it instantly organized in a tidy, spreadsheet‑style grid—export‑ready in one click and downright addictive to use.",
    icon: ScanLine,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
  },
  {
    title: "Template-Based Mileage Entry",
    description: "Enter miles in seconds—turn frequent routes into templates and save hours every month.",
    icon: Car,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
  },
  {
    title: "Invoices with Direct & Partial Payments",
    description: "Create professional, fully‑branded invoices, emails styled with your logo and colors. Record payments and track running balances in one place.",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
  },
  {
    title: "Instant P & L Insights",
    description: "Generate real‑time P & L and get clean, categorized exports—prepped for your Schedule paperwork.",
    icon: BarChart3,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
  },
  {
    title: "Full Document History",
    description: "See the full document flow—each invoice from draft to final, every partial payment and balance updates",
    icon: History,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
  },
];

const additionalFeatures = [
  {
    title: "No More Vanishing Receipts",
    description: "Receipts that vanish when tax time hits – no more digging through glove‑boxes and email threads to prove deductible expenses.",
    icon: FileText,
  },
  {
    title: "Stop Re‑Entering Mileage",
    description: "Re‑entering the same mileage data over and over – repeating routes eats hours and invites errors.",
    icon: Car,
  },
  {
    title: "One App for Everything",
    description: "Juggling three apps just to send an invoice and record the payment – copy‑pasting figures between systems slows cash flow and breeds mistakes.",
    icon: Zap,
  },
  {
    title: "Your Brand, Not Theirs",
    description: "Generic invoices and reminder emails that make the business look amateur – customers see a vendor's logo instead of yours.",
    icon: Users,
  },
  {
    title: "Know Your Profit Now",
    description: "Waiting until month‑end to know if you're profitable – spreadsheet merges and accountant emails delay real‑time insight into cash and margins.",
    icon: BarChart3,
  },
  {
    title: "Clear Paper Trails",
    description: "Unclear paper trails when clients part‑pay or change an invoice – tracking edits and balances across emails leaves you exposed during audits or disputes.",
    icon: History,
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
            Everything your business needs
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            From receipts to invoices to P&L reports, manage your entire business 
            financial flow in one powerful app.
          </p>
        </div>

        {/* Main features grid */}
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
                <div className="relative h-full overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
                  {/* Gradient background */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${
                    index === 0 ? 'from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-indigo-950/20' :
                    index === 1 ? 'from-purple-50 via-blue-50 to-purple-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-purple-950/20' :
                    index === 2 ? 'from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-blue-950/20' :
                    index === 3 ? 'from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20' :
                    'from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20'
                  }`} />
                  
                  {/* Floating elements */}
                  <div className="absolute top-6 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="absolute bottom-6 left-6 h-8 w-8 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-lg group-hover:scale-125 transition-transform duration-500" />
                  
                  <div className="relative p-8">
                    {/* Icon with enhanced styling */}
                    <div className={`inline-flex rounded-2xl p-4 mb-6 ${feature.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <feature.icon className={`h-8 w-8 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>

                    {/* Enhanced content */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                      {feature.description}
                    </p>

                    {/* Animated bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Additional features */}
        <div className="mx-auto mt-20 max-w-7xl">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/50 p-8 ring-1 ring-gray-200 dark:ring-gray-800">
            <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-8">
              The headaches Flowvya eliminates for good
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