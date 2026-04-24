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
import { useSearch } from 'wouter'
import { useEffect, useState } from 'react'

function SubscriptionBanner() {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const error = params.get('error')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (error === 'no_subscription') {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 15000)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-900/95 border-b border-amber-600/50 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-start gap-3">
        <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <p className="text-amber-100 font-semibold text-sm">Active subscription required</p>
          <p className="text-amber-200/80 text-sm mt-1">
            Portal access is exclusively for Contractor Circle members with an active subscription. If you just purchased and are seeing this message, try logging in again in a few minutes — your access may still be processing.
          </p>
        </div>
        <button onClick={() => setVisible(false)} className="text-amber-400 hover:text-amber-200 flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ContractorCircle() {
  return (
    <div className="relative min-h-screen overflow-x-hidden no-scrollbar grain-overlay">
      <SubscriptionBanner />
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
