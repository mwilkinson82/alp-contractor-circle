import { HeroSection } from '@/components/circle/HeroSection'
import { EmailCapture } from '@/components/circle/EmailCapture'
import { ValueProps } from '@/components/circle/ValueProps'
import WhatsIncluded from '@/components/circle/WhatsIncluded'
import { MarshallVideo } from '@/components/circle/MarshallVideo'
import { Testimonials } from '@/components/circle/Testimonials'
import { PricingSection } from '@/components/circle/PricingSection'
import { FAQSection } from '@/components/circle/FAQSection'
import { SubmitQuestionCTA } from '@/components/circle/SubmitQuestionCTA'
import { RevenueImpact } from '@/components/circle/RevenueImpact'
import { JoinCircleCountdown } from '@/components/circle/JoinCircleCountdown'
import { FinalCTA } from '@/components/circle/FinalCTA'
import { Footer } from '@/components/circle/Footer'
import InsideTheCircle from '@/components/circle/InsideTheCircle'
import { PortalPreview } from '@/components/circle/PortalPreview'
import { AmbientBackground } from '@/components/circle/AmbientBackground'
import { GradientBar } from '@/components/circle/GradientBar'
export default function ContractorCircle() {
  return (
    <div className="relative min-h-screen overflow-x-hidden no-scrollbar grain-overlay">
      <GradientBar />
      <AmbientBackground />
      <HeroSection />
      <EmailCapture />
      <ValueProps />
      <WhatsIncluded />
      <MarshallVideo />
      <InsideTheCircle />
      <PortalPreview />
      <RevenueImpact />
      <SubmitQuestionCTA />
      <Testimonials />
      <JoinCircleCountdown />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}
