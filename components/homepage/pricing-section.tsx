"use client";

import { Button } from "@/components/ui/button";
import { ReceiptCard } from "@/components/ui/receipt-card";
import { Check, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      { text: "Up to 100 receipts/month", included: true },
      { text: "Basic AI categorization", included: true },
      { text: "Email & drag-drop upload", included: true },
      { text: "CSV export", included: true },
      { text: "Email support", included: true },
      { text: "Price anomaly detection", included: false },
      { text: "API access", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing teams",
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: [
      { text: "Up to 1,000 receipts/month", included: true },
      { text: "Advanced AI with custom rules", included: true },
      { text: "All upload methods", included: true },
      { text: "All export formats", included: true },
      { text: "Price anomaly detection", included: true },
      { text: "API access", included: true },
      { text: "Priority support", included: true },
      { text: "Custom integrations", included: false },
    ],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Tailored for large organizations",
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      { text: "Unlimited receipts", included: true },
      { text: "Custom AI training", included: true },
      { text: "White-label options", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Custom integrations", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "SLA guarantees", included: true },
      { text: "On-premise deployment", included: true },
    ],
    cta: "Contact sales",
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
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <ReceiptCard 
                className="h-full" 
                variant={plan.popular ? "highlighted" : "default"}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </p>
                  
                  {/* Price */}
                  <div className="mt-6">
                    {plan.monthlyPrice ? (
                      <div>
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          /{isYearly ? 'year' : 'month'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        Custom
                      </div>
                    )}
                  </div>
                </div>

                {/* Features list */}
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${
                        feature.included 
                          ? 'text-gray-700 dark:text-gray-300' 
                          : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <div className="mt-8">
                  <Button 
                    asChild 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link href={plan.name === "Enterprise" ? "/contact" : "/sign-up"}>
                      {plan.cta}
                    </Link>
                  </Button>
                </div>
              </ReceiptCard>
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