"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart, FileSpreadsheet, Calculator, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PnlFeatureSection() {
  return (
    <section className="py-24 sm:py-32 bg-gradient-to-br from-purple-50 via-transparent to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-base font-semibold leading-7 text-purple-600 dark:text-purple-400">
              Real-time Financial Intelligence
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Instant P & L Insights
            </h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
              {/* Header bar */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">Profit & Loss Dashboard</h4>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-sm text-white">
                      Real-time
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-sm text-white">
                      Schedule C Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8">
                <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                  Flowvya turns every approved receipt, logged mile, and tracked payment into instant P & L insights. 
                  Watch your revenue, expenses, and net profit update in real-time. Export Schedule C-formatted reports 
                  with a single click—your accountant will love you.
                </p>

                {/* Feature highlights */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
                      <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Revenue Tracking</h5>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Invoice payments flow directly into P&L
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                      <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Smart Categories</h5>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Schedule C line items auto-mapped
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                      <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Tax-Ready Export</h5>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Download formatted for Schedule filing
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sample metrics */}
                <div className="mt-8 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        $127,483
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Total Revenue
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        $48,291
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Total Expenses
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        $79,192
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Net Profit
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/sign-up">
                      Start Tracking P&L
                      <BarChart3 className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link href="#demo">
                      See P&L Demo
                      <Download className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}