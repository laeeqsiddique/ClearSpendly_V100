"use client";

import { ReceiptCard } from "@/components/ui/receipt-card";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const testimonials = [
  {
    content: "ClearSpendly transformed how we handle expenses. The AI categorization saves us hours every week, and the price anomaly detection has already caught several billing errors.",
    author: "Sarah Chen",
    role: "CFO at TechStart Inc",
    company: "TechStart Inc",
    rating: 5,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    content: "The privacy-first approach sold us. Being able to process receipts locally means our sensitive financial data never leaves our servers. Game changer for compliance.",
    author: "Michael Rodriguez",
    role: "Head of Finance at SecureHealth",
    company: "SecureHealth",
    rating: 5,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
  },
  {
    content: "Finally, a receipt management system that actually works! The natural language search is incredible - I can find any expense in seconds. Worth every penny.",
    author: "Emily Watson",
    role: "Operations Manager at GrowthCo",
    company: "GrowthCo",
    rating: 5,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
  },
];

const stats = [
  { value: "98%", label: "Customer Satisfaction" },
  { value: "45min", label: "Average Time Saved Weekly" },
  { value: "30%", label: "Cost Reduction" },
  { value: "24/7", label: "Support Available" },
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
            Loved by finance teams everywhere
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Don't just take our word for it - hear from some of our satisfied customers
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
              <ReceiptCard className="h-full flex flex-col">
                {/* Quote icon */}
                <Quote className="absolute top-8 right-8 h-8 w-8 text-purple-200 dark:text-purple-800" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Content */}
                <blockquote className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                </blockquote>

                {/* Author */}
                <div className="mt-6 flex items-center gap-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </ReceiptCard>
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
                    Trusted by businesses worldwide
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