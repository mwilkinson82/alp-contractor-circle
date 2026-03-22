import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Send, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SuccessStory {
  companyName: string;
  revenueStart: string;
  revenueEnd: string;
  timeframe: string;
  story: string;
  contactEmail: string;
  attachmentFile?: File;
}

export function SuccessStoriesForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<SuccessStory>({
    companyName: "",
    revenueStart: "",
    revenueEnd: "",
    timeframe: "",
    story: "",
    contactEmail: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData((prev) => ({
        ...prev,
        attachmentFile: e.target.files![0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Wire to tRPC mutation to save success story
      console.log("Submitting success story:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setFormData({
          companyName: "",
          revenueStart: "",
          revenueEnd: "",
          timeframe: "",
          story: "",
          contactEmail: "",
        });
      }, 2000);
    } catch (error) {
      console.error("Error submitting success story:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full p-6 rounded-2xl border bg-gradient-to-br from-ember/10 to-transparent border-ember/20 hover:border-ember/40 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ember/20 flex items-center justify-center group-hover:bg-ember/30 transition-colors">
            <Upload size={24} className="text-ember" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-cream">Share Your Success</h3>
            <p className="text-sm text-cream/60">
              Tell us your growth story—we'd love to feature you
            </p>
          </div>
        </div>
      </motion.button>

      {/* Modal */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-ember/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-b from-slate-900 to-transparent p-6 border-b border-ember/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-cream">
                  Share Your Success Story
                </h2>
                <p className="text-sm text-cream/60 mt-1">
                  Help inspire other contractors—your growth matters
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-cream/60" />
              </button>
            </div>

            {/* Form Content */}
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-cream mb-2">
                    Company Name *
                  </label>
                  <Input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g., Betancourt Core Construction"
                    required
                    className="bg-slate-800/50 border-slate-700 text-cream placeholder:text-cream/40"
                  />
                </div>

                {/* Revenue Before & After */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cream mb-2">
                      Revenue Before ALP *
                    </label>
                    <Input
                      type="text"
                      name="revenueStart"
                      value={formData.revenueStart}
                      onChange={handleInputChange}
                      placeholder="e.g., $600K"
                      required
                      className="bg-slate-800/50 border-slate-700 text-cream placeholder:text-cream/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cream mb-2">
                      Revenue After ALP *
                    </label>
                    <Input
                      type="text"
                      name="revenueEnd"
                      value={formData.revenueEnd}
                      onChange={handleInputChange}
                      placeholder="e.g., $20M"
                      required
                      className="bg-slate-800/50 border-slate-700 text-cream placeholder:text-cream/40"
                    />
                  </div>
                </div>

                {/* Timeframe */}
                <div>
                  <label className="block text-sm font-semibold text-cream mb-2">
                    Timeframe *
                  </label>
                  <Input
                    type="text"
                    name="timeframe"
                    value={formData.timeframe}
                    onChange={handleInputChange}
                    placeholder="e.g., 18 months"
                    required
                    className="bg-slate-800/50 border-slate-700 text-cream placeholder:text-cream/40"
                  />
                </div>

                {/* Story */}
                <div>
                  <label className="block text-sm font-semibold text-cream mb-2">
                    Your Story *
                  </label>
                  <Textarea
                    name="story"
                    value={formData.story}
                    onChange={handleInputChange}
                    placeholder="Tell us what changed, what you learned, and how ALP helped you scale. Be specific—other contractors want to know the real impact."
                    required
                    rows={5}
                    className="bg-slate-800/50 border-slate-700 text-cream placeholder:text-cream/40 resize-none"
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-semibold text-cream mb-2">
                    Contact Email *
                  </label>
                  <Input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    required
                    className="bg-slate-800/50 border-slate-700 text-cream placeholder:text-cream/40"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-cream mb-2">
                    Attachment (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov"
                    />
                    <label
                      htmlFor="file-upload"
                      className="block p-4 border-2 border-dashed border-slate-700 rounded-xl text-center cursor-pointer hover:border-ember/40 transition-colors"
                    >
                      {formData.attachmentFile ? (
                        <div className="text-sm text-cream/80">
                          📎 {formData.attachmentFile.name}
                        </div>
                      ) : (
                        <div className="text-sm text-cream/60">
                          Drop a file or click to upload (PDF, docs, images, video)
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-ember to-orange-500 hover:from-ember/90 hover:to-orange-500/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  {isSubmitting ? "Submitting..." : "Submit Your Story"}
                </Button>
              </form>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-4"
                >
                  <CheckCircle size={64} className="text-emerald-400" />
                </motion.div>
                <h3 className="text-2xl font-black text-cream mb-2">
                  Thank You!
                </h3>
                <p className="text-cream/70 mb-6">
                  Your success story has been submitted. We'll review it and may feature it on our site soon.
                </p>
                <p className="text-sm text-cream/50">
                  Redirecting...
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
