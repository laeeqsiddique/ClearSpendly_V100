"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Receipt, Shield, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function HeroSection() {
  const [currentStat, setCurrentStat] = useState(0);
  
  const stats = [
    { value: "$847K", label: "Expenses Tracked" },
    { value: "12,483", label: "Receipts Processed" },
    { value: "99.8%", label: "OCR Accuracy" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stats.length]);

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-300 opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-300 opacity-20 blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative">
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8 inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-4 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI-Powered Receipt Intelligence
              </motion.div>

              {/* Main heading */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-7xl"
              >
                Turn Receipts Into
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {" "}Insights
                  </span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 7.5C2 7.5 75 2 150 7.5C225 13 298 7.5 298 7.5"
                      stroke="url(#gradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#9333ea" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </motion.h1>

              {/* Subheading */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-300"
              >
                Smart expense tracking for modern businesses. Upload receipts, get instant 
                categorization, detect price anomalies, and unlock powerful analytics—all 
                while keeping your data private.
              </motion.p>

              {/* CTA buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              >
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link href="/sign-up">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="#demo">
                    Watch Demo
                  </Link>
                </Button>
              </motion.div>

              {/* Trust indicators */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-12 flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-12"
              >
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>SOC2 Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <span>10M+ Receipts Processed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span>30% Cost Savings</span>
                </div>
              </motion.div>
            </div>

            {/* Demo section */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-20"
              id="demo"
            >
              <div className="relative mx-auto max-w-5xl">
                {/* Browser window */}
                <div className="overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
                  {/* Browser header */}
                  <div className="flex items-center gap-2 bg-gray-800 px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="inline-flex items-center rounded-md bg-gray-700 px-3 py-1 text-xs text-gray-300">
                        app.clearspendly.com
                      </div>
                    </div>
                  </div>

                  {/* Dashboard preview */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Stats cards */}
                      <div className="lg:col-span-3">
                        <div className="grid gap-4 md:grid-cols-3">
                          {stats.map((stat, index) => (
                            <motion.div
                              key={index}
                              initial={{ scale: 1 }}
                              animate={{ scale: currentStat === index ? 1.05 : 1 }}
                              transition={{ duration: 0.3 }}
                              className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm"
                            >
                              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {stat.value}
                              </div>
                              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {stat.label}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Receipt list */}
                      <div className="lg:col-span-2">
                        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            Recent Receipts
                          </h3>
                          <div className="space-y-3">
                            {[
                              { vendor: "Whole Foods Market", amount: "$127.43", category: "Groceries", status: "processed" },
                              { vendor: "Office Depot", amount: "$84.99", category: "Office Supplies", status: "anomaly" },
                              { vendor: "Delta Airlines", amount: "$487.20", category: "Travel", status: "processed" },
                            ].map((receipt, index) => (
                              <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    <Receipt className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {receipt.vendor}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {receipt.category}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {receipt.amount}
                                  </div>
                                  {receipt.status === "anomaly" && (
                                    <span className="text-xs text-orange-600 dark:text-orange-400">
                                      Price Alert
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* AI Chat */}
                      <div className="lg:col-span-1">
                        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            AI Assistant
                          </h3>
                          <div className="space-y-3">
                            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-sm">
                              <p className="text-gray-700 dark:text-gray-300">
                                "What was my biggest expense last month?"
                              </p>
                            </div>
                            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-3 text-sm">
                              <p className="text-purple-700 dark:text-purple-300">
                                Your biggest expense was $487.20 at Delta Airlines on March 15th for business travel.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shadow effect */}
                <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-purple-400 to-blue-400 opacity-20 blur-3xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}