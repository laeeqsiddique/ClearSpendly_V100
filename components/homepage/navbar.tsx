"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Receipt, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "About", href: "/about" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    };
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Receipt className="h-8 w-8 text-purple-600 group-hover:text-purple-700 transition-colors" />
            <div className="absolute -inset-1 bg-purple-200/50 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Flowvya
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-8 lg:ml-20 lg:flex-1 lg:justify-center">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop CTA buttons */}
        <div className="hidden lg:flex lg:gap-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">
              Sign in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">
              Start free trial
            </Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden ml-auto">
          <Button
            variant="ghost"
            size="lg"
            className="h-11 w-11 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Solid white/dark backdrop - completely opaque, no transparency */}
            <motion.div 
              className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            />
            
            {/* Mobile menu panel - full screen, completely solid background */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-0 z-[101] w-full bg-white dark:bg-gray-900 lg:hidden overflow-y-auto"
            >
              <div className="flex flex-col h-full px-6 py-6 sm:px-6 sm:py-6">
                {/* Header with logo and close button */}
                <div className="flex items-center justify-between mb-8">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Receipt className="h-8 w-8 text-purple-600" />
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Flowvya
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-11 w-11 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Navigation content */}
                <div className="flex flex-col flex-1">
                  {/* Navigation links section */}
                  <nav className="flex-1">
                    <div className="space-y-1">
                      {navigation.map((item, index) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="group flex items-center rounded-xl px-6 py-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 ease-in-out"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className="flex-1">{item.name}</span>
                          <svg
                            className="ml-3 h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </nav>

                  {/* Divider */}
                  <div className="my-8">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white dark:bg-gray-900 px-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                          Get started
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons section */}
                  <div className="space-y-3">
                    <Button 
                      asChild 
                      variant="ghost" 
                      size="lg" 
                      className="w-full h-14 text-base font-semibold text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200"
                    >
                      <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                        <span className="flex items-center justify-center gap-2">
                          <span>Sign in</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                          </svg>
                        </span>
                      </Link>
                    </Button>
                    <Button 
                      asChild 
                      size="lg" 
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                        <span className="flex items-center justify-center gap-2">
                          <span>Start free trial</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}