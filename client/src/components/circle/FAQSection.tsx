import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Who is The Contracting Circle for?",
    answer: "Any contractor who is serious about scaling their business — whether you're doing $500K or $10M+ a year. If you're tired of guessing and want proven systems, live coaching, and a community of operators who actually execute, this is for you.",
  },
  {
    question: "What happens on the weekly calls?",
    answer: "Every Thursday evening, Marshall leads a live group call. These rotate between hot seats (bring your real challenges), Q&A sessions, and focused teaching on topics like sales, estimating, hiring, and operations. You'll leave every call with something actionable.",
  },
  {
    question: "What are the monthly deal reviews?",
    answer: "Bring your actual proposals, bids, and deals. Marshall reviews them live with the group — breaking down what's working, what's leaving money on the table, and how to position for the close. This alone has been worth the membership for many operators.",
  },
  {
    question: "What's in the template library?",
    answer: "Battle-tested SOPs, contracts, estimating spreadsheets, operational checklists, and more — built from $2.5B+ in real-world execution. These aren't generic downloads. They're the actual documents used in high-performing contracting operations.",
  },
  {
    question: "How does the Discord community work?",
    answer: "You get 24/7 access to a private Discord server with organized channels for different topics — sales, operations, wins, deal help, and general discussion. Marshall and the team are active in there regularly. It's a curated network of serious operators, not a noisy Facebook group.",
  },
  {
    question: "What if I miss a call?",
    answer: "Every session is recorded and added to the replay library. New members get instant access to the entire archive from day one. The library grows every week, making your membership more valuable over time.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. No contracts, no commitments, no cancellation fees. If you're not getting value, you can cancel anytime. But founding members who stay locked in keep their rate for life — even when the price goes up.",
  },
  {
    question: "What does 'Founding Member' mean?",
    answer: "Founding members are the first operators to join The Contracting Circle. Your $497/mo rate is locked in permanently — it will never increase for you, even as we add more features and raise the price for new members. You're building this with us from the ground floor.",
  },
];

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.5, ease: easeOutCubic, delay: index * 0.06 }}
      className="border-b border-cream/5 last:border-b-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
      >
        <span
          className="text-sm sm:text-base font-medium text-cream group-hover:text-ember transition-colors duration-200 pr-4"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className="text-cream-muted/40" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOutCubic }}
            className="overflow-hidden"
          >
            <p className="text-sm text-cream-muted/70 leading-relaxed pb-5 pr-8">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section className="relative z-10 py-16 sm:py-24 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: easeOutCubic }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
            Questions
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Frequently Asked
          </h2>
        </motion.div>

        {/* FAQ Items */}
        <div className="glass-card rounded-xl px-6 sm:px-8">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
