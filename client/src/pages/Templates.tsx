import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, FileText, BarChart3, ClipboardList, DollarSign } from "lucide-react";

const TEMPLATES_URL = "https://drive.google.com/drive/folders/1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068";

const categories = [
  {
    icon: <FileText className="w-6 h-6 text-ember" />,
    title: "Sales Scripts",
    description: "Proven scripts for cold calls, follow-ups, and closing conversations that have generated millions in revenue.",
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-ember" />,
    title: "Deal Analysis Frameworks",
    description: "Spreadsheets and frameworks for analyzing deals, calculating margins, and making data-driven decisions.",
  },
  {
    icon: <ClipboardList className="w-6 h-6 text-ember" />,
    title: "Operations Checklists",
    description: "Step-by-step checklists for project management, quality control, and team coordination.",
  },
  {
    icon: <DollarSign className="w-6 h-6 text-ember" />,
    title: "Pricing & Estimating",
    description: "Templates for accurate estimating, competitive pricing, and proposal creation.",
  },
];

export default function Templates() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-cream">Loading...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/circle");
    return null;
  }

  return (
    <div className="min-h-screen bg-navy-deep text-cream">
      <header className="border-b border-white/5 bg-navy-deep/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button onClick={() => setLocation("/portal")} variant="ghost" size="sm" className="text-cream-muted hover:text-cream">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="text-2xl font-bold font-display text-ember">ALP</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold font-display mb-4">Templates & Resources</h1>
          <p className="text-cream-muted text-lg mb-8">
            Access the premium template library — sales scripts, deal frameworks, operational systems, and more. These are the exact tools used to close $2.5B+ in construction deals.
          </p>
          <Button
            onClick={() => window.open(TEMPLATES_URL, "_blank")}
            className="bg-ember hover:bg-ember-light text-navy-deep font-bold text-lg px-8 py-6"
          >
            Open Template Library
            <ExternalLink className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {categories.map((cat, i) => (
            <div key={i} className="bg-navy border border-white/5 rounded-xl p-8 hover:border-ember/30 transition-colors ember-glow">
              <div className="mb-4">{cat.icon}</div>
              <h3 className="text-xl font-bold font-display mb-3">{cat.title}</h3>
              <p className="text-cream-muted leading-relaxed mb-6">{cat.description}</p>
              <Button
                onClick={() => window.open(TEMPLATES_URL, "_blank")}
                variant="outline"
                className="border-ember/50 text-ember hover:bg-ember/10"
              >
                View Templates
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
