import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Users, Calendar, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const allOpportunities: Record<string, { title: string; org: string; location: string; type: string; category: string; hours: string; spots: number; match: number; description: string }> = {
  "1": { title: "Ocean Cleanup Drive", org: "Blue Planet Foundation", location: "Bali, Indonesia", type: "On-Site", category: "Environment", hours: "8h", spots: 12, match: 94, description: "Join us for a full-day beach and ocean cleanup initiative. You'll work alongside marine biologists and local communities to remove plastic waste from coastal areas. Equipment and training provided." },
  "2": { title: "Code for Good Hackathon", org: "Tech4Impact", location: "Remote", type: "Remote", category: "Technology", hours: "48h", spots: 50, match: 91, description: "A weekend-long hackathon building software solutions for nonprofits. Teams of 4-5 will tackle real challenges faced by organizations worldwide. Prizes and mentorship included." },
  "3": { title: "Youth Mentorship Program", org: "Future Leaders", location: "New York, USA", type: "Hybrid", category: "Education", hours: "4h/week", spots: 20, match: 87, description: "Guide young students through STEM concepts and career development. Weekly 1-on-1 sessions with personalized curriculum support." },
  "4": { title: "Medical Camp Volunteer", org: "Doctors Without Borders", location: "Nairobi, Kenya", type: "On-Site", category: "Healthcare", hours: "2 weeks", spots: 8, match: 82, description: "Support medical professionals in providing healthcare services to underserved communities. Training provided for non-medical volunteers." },
  "5": { title: "Community Garden Project", org: "Green Roots", location: "London, UK", type: "On-Site", category: "Environment", hours: "6h", spots: 30, match: 78, description: "Help build and maintain urban community gardens that provide fresh produce to food banks and local families." },
  "6": { title: "Disaster Relief Coordination", org: "Red Cross", location: "Remote", type: "Remote", category: "Humanitarian", hours: "Flexible", spots: 5, match: 85, description: "Coordinate logistics and communication for disaster relief operations worldwide from a remote operations center." },
};

const OpportunityDetail = () => {
  const { id } = useParams();
  const [joined, setJoined] = useState(false);
  const opp = id ? allOpportunities[id] : null;

  if (!opp) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <div className="glass-card p-16">
              <p className="text-xl text-muted-foreground mb-4">Opportunity not found</p>
              <Link to="/opportunities" className="text-cyan hover:underline">← Back to Opportunities</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <ScrollReveal>
            <Link to="/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Opportunities
            </Link>
          </ScrollReveal>

          <ScrollReveal>
            <div className="glass-card p-8 mb-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{opp.category}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{opp.type}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{opp.title}</h1>
                  <p className="text-muted-foreground">{opp.org}</p>
                </div>
                <span className="text-2xl font-bold gradient-text shrink-0">{opp.match}% match</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: MapPin, label: "Location", value: opp.location },
                  { icon: Clock, label: "Duration", value: opp.hours },
                  { icon: Users, label: "Spots Left", value: `${opp.spots}` },
                  { icon: Calendar, label: "Type", value: opp.type },
                ].map((detail, i) => (
                  <div key={i} className="bg-secondary/50 rounded-xl p-4">
                    <detail.icon className="w-4 h-4 text-cyan mb-2" />
                    <p className="text-xs text-muted-foreground">{detail.label}</p>
                    <p className="text-sm font-medium text-foreground">{detail.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-8">
                <h3 className="font-semibold text-foreground mb-3">About this opportunity</h3>
                <p className="text-muted-foreground leading-relaxed">{opp.description}</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setJoined(true)}
                disabled={joined}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity ${joined ? "opacity-70 cursor-default" : ""}`}
                style={{ background: joined ? "hsl(var(--secondary))" : "var(--gradient-primary)" }}
              >
                {joined ? (
                  <><CheckCircle2 className="w-5 h-5 text-cyan" /> <span className="text-foreground">Joined — You're In!</span></>
                ) : (
                  <span className="text-primary-foreground">Join This Opportunity</span>
                )}
              </motion.button>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OpportunityDetail;
