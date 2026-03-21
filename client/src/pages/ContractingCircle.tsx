import { HeroSection } from '@/components/circle/HeroSection'
import { ValueProps } from '@/components/circle/ValueProps'
import { WhatsIncluded } from '@/components/circle/WhatsIncluded'
import { Testimonials } from '@/components/circle/Testimonials'
import { PricingSection } from '@/components/circle/PricingSection'
import { FAQSection } from '@/components/circle/FAQSection'
import { FinalCTA } from '@/components/circle/FinalCTA'
import { Footer } from '@/components/circle/Footer'
import { AmbientBackground } from '@/components/circle/AmbientBackground'
import { GradientBar } from '@/components/circle/GradientBar'

export default function ContractingCircle() {
  return (
    <div className="relative min-h-screen overflow-x-hidden no-scrollbar grain-overlay">
      <GradientBar />
      <AmbientBackground />
      <HeroSection />
      <ValueProps />
      <WhatsIncluded />
      <Testimonials />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}
