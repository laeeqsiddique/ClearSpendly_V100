"use client";

import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { text: "Up to 3 invoices/month", included: true },
      { text: "Unlimited receipt scanning", included: true },
      { text: "Basic mileage tracking", included: true },
      { text: "Standard invoice templates", included: true },
      { text: "Basic P&L reporting", included: true },
      { text: "Email support", included: true },
      { text: "Custom branding", included: false },
      { text: "Payment tracking", included: false },
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    description: "For serious business owners",
    monthlyPrice: 39,
    yearlyPrice: 390,
    features: [
      { text: "Unlimited invoices", included: true },
      { text: "Unlimited receipt scanning", included: true },
      { text: "Advanced mileage templates", included: true },
      { text: "Custom branded invoices & emails", included: true },
      { text: "Payment tracking & reminders", included: true },
      { text: "Real-time P&L insights", included: true },
      { text: "Schedule C exports", included: true },
      { text: "Priority support", included: true },
      { text: "Multi-entity management", included: false },
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Premium", 
    description: "For growing enterprises",
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Multi-entity management", included: true },
      { text: "API access & webhooks", included: true },
      { text: "Advanced analytics dashboard", included: true },
      { text: "Custom integrations", included: true },
      { text: "White-label invoices", included: true },
    ],
    cta: "Start Premium Trial",
    popular: false,
  },
];

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-purple-600 dark:text-purple-400">
            Pricing
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Choose the perfect plan for your business
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <span className={`text-sm ${!isYearly ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-purple-600"
          />
          <span className={`text-sm ${isYearly ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
            Yearly
            <span className="ml-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
              Save 20%
            </span>
          </span>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto mt-16 grid max-w-lg gap-8 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className={`relative h-full overflow-hidden rounded-2xl border transition-all duration-300 ${
                plan.popular 
                  ? 'border-purple-200 dark:border-purple-800 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/50 dark:to-gray-900 shadow-lg shadow-purple-500/20' 
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg'
              }`}>
                {/* Gradient overlay for popular plan */}
                {plan.popular && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                )}

                <div className="relative p-8 h-full flex flex-col">
                  {/* Popular badge inside card */}
                  {plan.popular && (
                    <div className="flex justify-center mb-4">
                      <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                        <Sparkles className="h-4 w-4" />
                        Most Popular
                      </div>
                    </div>
                  )}
                  {/* Plan header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {plan.description}
                    </p>
                    
                    {/* Price */}
                    <div className="mt-6">
                      {plan.monthlyPrice !== null ? (
                        <div className="flex items-end justify-center gap-1">
                          {plan.monthlyPrice === 0 ? (
                            <span className="text-5xl font-bold text-gray-900 dark:text-white">Free</span>
                          ) : (
                            <>
                              <span className="text-sm text-gray-500 dark:text-gray-400">$</span>
                              <span className="text-5xl font-bold text-gray-900 dark:text-white">
                                {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400 pb-1">
                                /{isYearly ? 'year' : 'month'}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        Custom
                      </div>
                    )}
                  </div>
                </div>

                  {/* Features list - grows to fill available space */}
                  <div className="space-y-4 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        {feature.included ? (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mt-0.5">
                            <X className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                        <span className={`text-sm leading-relaxed ${
                          feature.included 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-400 dark:text-gray-600 line-through'
                        }`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA button - always at bottom */}
                  <div className="mt-8">
                    <Button 
                      asChild 
                      className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl' 
                          : 'hover:shadow-md'
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      <Link href="/sign-up">
                        {plan.cta}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ link */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400">
            Have questions? Check out our{" "}
            <Link href="/faq" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
              frequently asked questions
            </Link>
            {" "}or{" "}
            <Link href="/contact" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
              contact our team
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}