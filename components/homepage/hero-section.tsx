"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Receipt, Shield, TrendingUp, Camera, Car, Send, DollarSign, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function HeroSection() {
  const [currentStat, setCurrentStat] = useState(0);
  
  const stats = [
    { value: "$127,483", label: "Revenue This Month" },
    { value: "$48,291", label: "Expenses Tracked" },
    { value: "$79,192", label: "Net Profit" },
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
                Track. Bill. Get Paid. One Flow.
              </motion.div>

              {/* Main heading */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-7xl"
              >
                Every receipt, mile, invoice,
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {" "}payment in one flow
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
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 text-lg sm:text-xl leading-relaxed"
              >
                <div className="flex flex-wrap items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
                  {[
                    { icon: Camera, text: "Snap receipts", color: "text-purple-600 dark:text-purple-400" },
                    { icon: Car, text: "Log miles", color: "text-blue-600 dark:text-blue-400" },
                    { icon: Send, text: "Send invoices", color: "text-indigo-600 dark:text-indigo-400" },
                    { icon: DollarSign, text: "Record payments", color: "text-purple-600 dark:text-purple-400" },
                    { icon: BarChart3, text: "Live P&L", color: "text-blue-600 dark:text-blue-400" }
                  ].map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: 0.3 + (index * 0.1),
                        type: "spring",
                        stiffness: 200
                      }}
                      className="flex items-center"
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-sm hover:shadow-md">
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <span className="font-medium text-gray-700 dark:text-gray-200">{item.text}</span>
                      </span>
                      {index < 4 && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + (index * 0.1) }}
                          className="mx-3"
                        >
                          <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-4 text-center text-gray-500 dark:text-gray-400"
                >
                  All in <span className="font-semibold text-purple-600 dark:text-purple-400">Flowvya</span> — your complete financial workflow
                </motion.p>
              </motion.div>

              {/* CTA buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              >
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link href="/sign-up">
                    Start Free
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
                  <span>Your Data Stays Yours</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>$2.3M+ Invoiced Monthly</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>Real-time P&L Updates</span>
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
                        app.flowvya.com
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

                      {/* Financial Activity */}
                      <div className="lg:col-span-2">
                        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            Recent Activity
                          </h3>
                          <div className="space-y-3">
                            {[
                              { type: "invoice", icon: Send, title: "Invoice #INV-2024-089", subtitle: "Sent to Tech Corp", amount: "$5,250.00", status: "sent", color: "text-blue-600" },
                              { type: "payment", icon: DollarSign, title: "Payment Received", subtitle: "From StartupXYZ", amount: "$3,800.00", status: "completed", color: "text-green-600" },
                              { type: "expense", icon: Receipt, title: "Office Supplies", subtitle: "Staples", amount: "$284.99", status: "tagged", color: "text-purple-600" },
                              { type: "mileage", icon: Car, title: "Client Meeting", subtitle: "45 miles roundtrip", amount: "$25.65", status: "logged", color: "text-indigo-600" },
                            ].map((item, index) => (
                              <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700`}>
                                    <item.icon className={`h-5 w-5 ${item.color}`} />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {item.title}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {item.subtitle}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {item.amount}
                                  </div>
                                  <span className={`text-xs ${
                                    item.status === 'completed' ? 'text-green-600' : 
                                    item.status === 'sent' ? 'text-blue-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {item.status}
                                  </span>
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
                            Financial Insights
                          </h3>
                          <div className="space-y-3">
                            <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800 dark:text-green-400">Revenue Up 23%</span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Your revenue is trending 23% higher than last month. Great job!
                              </p>
                            </div>
                            <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-400">62% Profit Margin</span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Your net profit margin is healthy at 62% this month.
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