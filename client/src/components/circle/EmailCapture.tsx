import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const subscribeMutation = trpc.email.subscribe.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribeMutation.isPending) return;

    setError('');
    try {
      await subscribeMutation.mutateAsync({ email });
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      console.error('Error submitting email:', err);
      setError(err.message || 'Failed to subscribe. Please try again.');
    }
  };

  return (
    <section className="relative py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-midnight/40 to-midnight/20 border-y border-cream/5">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ember/30 bg-ember/8 mb-4">
            <Mail size={14} className="text-ember" />
            <span className="text-xs font-semibold text-ember uppercase tracking-wide">Stay Updated</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-cream mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
            Get the Inside Track
          </h2>
          <p className="text-sm sm:text-base text-cream/60 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Join contractors scaling their businesses. Get exclusive insights, case studies, and first access to new Circle features.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subscribeMutation.isPending || submitted}
              className="flex-1 px-4 py-3 rounded-lg bg-cream/5 border border-cream/10 text-cream placeholder-cream/40 focus:outline-none focus:border-ember/50 focus:bg-cream/8 transition-all disabled:opacity-50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              required
            />
            <button
              type="submit"
              disabled={subscribeMutation.isPending || !email || submitted}
              className="px-6 py-3 rounded-lg bg-ember hover:bg-ember-light text-midnight font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-wait whitespace-nowrap"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {submitted ? (
                <>
                  <span>✓ Subscribed</span>
                </>
              ) : subscribeMutation.isPending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-midnight/30 border-t-midnight rounded-full animate-spin" />
                  <span>Subscribing...</span>
                </>
              ) : (
                <>
                  <span>Subscribe</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          <p className="text-xs text-cream/40 mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            No spam. Unsubscribe anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
