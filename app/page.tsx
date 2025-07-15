import FooterSection from "@/components/homepage/footer";
import HeroSection from "@/components/homepage/hero-section";
import FeaturesSection from "@/components/homepage/features-section";
import TestimonialsSection from "@/components/homepage/testimonials-section";
import PricingSection from "@/components/homepage/pricing-section";
import Navbar from "@/components/homepage/navbar";

export default async function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <HeroSection />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="testimonials">
          <TestimonialsSection />
        </div>
        <div id="pricing">
          <PricingSection />
        </div>
      </main>
      <FooterSection />
    </>
  );
}