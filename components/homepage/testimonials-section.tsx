"use client";

// Removed receipt card import
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const testimonials = [
  {
    content: "Flowvya replaced three separate apps for us. From scanning receipts to sending branded invoices to tracking P&L—everything flows seamlessly. Our cash flow visibility improved overnight.",
    author: "Sarah Chen",
    role: "Freelance Marketing Consultant",
    company: "Chen Creative Studio",
    rating: 5,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    content: "The mileage templates are genius. I saved 4 hours last month just by not re-entering the same client routes. Plus the branded invoices make us look way more professional.",
    author: "Marcus Thompson",
    role: "Independent Contractor",
    company: "Thompson Electrical",
    rating: 5,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
  },
  {
    content: "Game changer for tax season. The Schedule C exports are perfectly formatted and my accountant loves getting everything organized. No more shoebox of receipts!",
    author: "Lisa Rodriguez",
    role: "Freelance Graphic Designer",
    company: "Rodriguez Design Co",
    rating: 5,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
  },
];

const stats = [
  { value: "90%+", label: "Receipt Read Accuracy" },
  { value: "6.5hrs", label: "Weekly Time Savings" },
  { value: "3sec", label: "Average Processing" },
  { value: "24/7", label: "Real-time P&L" },
];

// Animated counter component
function AnimatedCounter({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState("0");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Extract number from value string
    const numericPart = value.match(/\d+/)?.[0];
    if (!numericPart) {
      setDisplayValue(value);
      return;
    }

    const targetNumber = parseInt(numericPart);
    const suffix = value.replace(numericPart, "");
    let current = 0;
    const increment = Math.ceil(targetNumber / 30); // Animate over ~30 frames
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetNumber) {
        current = targetNumber;
        clearInterval(timer);
      }
      setDisplayValue(current + suffix);
    }, 50);

    return () => clearInterval(timer);
  }, [value, isVisible]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={() => setIsVisible(true)}
      viewport={{ once: true }}
    >
      {displayValue}
    </motion.span>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-purple-600 dark:text-purple-400">
            Testimonials
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Trusted by business owners everywhere
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Real stories from business owners who streamlined their workflow with Flowvya
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="relative h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content wrapper */}
                <div className="relative z-10 h-full flex flex-col">
                  {/* Quote icon */}
                  <Quote className="h-8 w-8 text-purple-200 dark:text-purple-700 mb-4" />
                  
                  {/* Rating */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Content */}
                  <blockquote className="flex-1 mb-8">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                      "{testimonial.content}"
                    </p>
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 p-0.5">
                      <div className="h-full w-full rounded-full overflow-hidden bg-white dark:bg-gray-900">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.author}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-lg">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {testimonial.company}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats section - Redesigned */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 via-blue-50 to-purple-50 dark:from-purple-600 dark:via-purple-700 dark:to-blue-600 p-1">
            {/* Animated gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 dark:from-purple-400 dark:via-pink-500 dark:to-blue-500 opacity-50 dark:opacity-75 blur-xl animate-pulse" />
            
            <div className="relative rounded-3xl bg-white/90 dark:bg-gray-900/95 backdrop-blur-sm p-8 md:p-12">
              {/* Floating elements */}
              <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-purple-200/50 dark:bg-purple-400/20 blur-2xl animate-pulse" />
              <div className="absolute bottom-4 left-4 h-16 w-16 rounded-full bg-blue-200/50 dark:bg-blue-400/20 blur-2xl animate-pulse delay-1000" />
              
              <div className="mx-auto max-w-7xl relative">
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-100/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-purple-700 dark:text-white mb-4"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Live metrics
                  </motion.div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                    The numbers speak for themselves
                  </h3>
                  <p className="mt-2 text-lg text-gray-600 dark:text-purple-200">
                    Real results from real customers
                  </p>
                </div>

                {/* Unified stats display */}
                <div className="relative">
                  {/* Connecting lines */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 dark:via-white/20 to-transparent hidden md:block" />
                  
                  <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
                    {stats.map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ 
                          duration: 0.6, 
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 100
                        }}
                        viewport={{ once: true }}
                        className={`relative group text-center p-8 ${
                          index < stats.length - 1 ? 'border-r border-gray-200/60 dark:border-white/10' : ''
                        } ${
                          index < 2 ? 'border-b border-gray-200/60 dark:border-white/10 md:border-b-0' : ''
                        }`}
                      >
                        {/* Hover background */}
                        <div className="absolute inset-0 bg-purple-50/50 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Stat content */}
                        <div className="relative z-10">
                          <div className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-br from-purple-600 to-blue-600 dark:from-white dark:to-purple-200 bg-clip-text text-transparent">
                            <AnimatedCounter value={stat.value} />
                          </div>
                          <div className="text-sm text-gray-600 dark:text-purple-200 font-medium uppercase tracking-wider">
                            {stat.label}
                          </div>
                        </div>

                        {/* Subtle pulse effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-purple-200/20 to-blue-200/20 dark:from-purple-400/10 dark:to-blue-400/10 opacity-0"
                          animate={{ 
                            opacity: [0, 0.3, 0],
                          }}
                          transition={{
                            duration: 3,
                            delay: index * 0.5,
                            repeat: Infinity,
                            repeatType: "loop"
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="mt-12 text-center"
                >
                  <p className="text-gray-600 dark:text-purple-200 mb-4">
                    Join thousands of businesses already saving time and money
                  </p>
                  <button className="inline-flex items-center gap-2 rounded-full bg-purple-600 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-purple-600 hover:bg-purple-700 dark:hover:bg-gray-100 transition-colors">
                    Start your free trial
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}