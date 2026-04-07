import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shuffle, MapPin, Clock, Users, Timer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";

const recommendations = [
  {
    id: "h6",
    title: "Beach Cleanup",
    org: "SocioSquad Community",
    match: 94,
    tags: ["Environment", "Outdoor"],
    location: "Juhu Beach, Mumbai",
    date: "Mar 9, 9:00 AM",
    spots: "10/25 spots filled",
    urgent: false,
    urgencyLabel: "Medium Priority",
    urgencyColor: "bg-amber-100 text-amber-700",
    timeLabel: "2.5 hrs",
  },
  {
    id: "h8",
    title: "Food Drive Sorting",
    org: "SocioSquad Community",
    match: 91,
    tags: ["Community", "Food"],
    location: "Community Center, Mumbai",
    date: "Mar 11, 11:30 AM",
    spots: "12/20 spots filled",
    urgent: true,
    urgencyLabel: "High Priority",
    urgencyColor: "bg-red-100 text-red-700",
    timeLabel: "1.5 hrs",
  },
  {
    id: "h1",
    title: "Versova Beach Cleanup",
    org: "Clean Coast Mumbai",
    match: 87,
    tags: ["Environment", "Outdoor"],
    location: "Versova Beach, Andheri West",
    date: "Mar 15, 8:00 AM",
    spots: "20/30 spots filled",
    urgent: false,
    urgencyLabel: "High Priority",
    urgencyColor: "bg-red-100 text-red-700",
    timeLabel: "2 hrs",
  },
];

const allOpportunities = [
  { id: 1, title: "Community Garden Cleanup" },
  { id: 2, title: "Blood Donation Camp" },
  { id: 3, title: "Beach Cleanup Drive" },
  { id: 4, title: "Youth Mentorship Program" },
  { id: 5, title: "Senior Care Companionship" },
  { id: 6, title: "Animal Shelter Support" },
];

const AIRecommendations = () => {
  const navigate = useNavigate();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSurpriseMe = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const random = allOpportunities[Math.floor(Math.random() * allOpportunities.length)];
      setIsSpinning(false);
      navigate(`/opportunities/${random.id}`);
    }, 800);
  };

  return (
    <section className="py-24 relative bg-secondary">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-sm font-semibold font-body text-primary uppercase tracking-wider">Campaigns</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mt-2 text-foreground">
                Discover Our Campaigns
              </h2>
              <p className="text-muted-foreground max-w-xl mt-3 font-body">
                Join us in doing something great for our community.
              </p>
            </div>
            <Link to="/opportunities" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold font-body text-primary hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recommendations.map((rec, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-card border border-border rounded-3xl p-6 h-full flex flex-col hover:shadow-lg transition-all duration-300"
              >
                {/* Priority & Time */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold font-body ${rec.urgencyColor}`}>
                    {rec.urgencyLabel}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium font-body flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" /> {rec.timeLabel}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-foreground mb-1">{rec.title}</h3>
                <p className="text-sm text-muted-foreground font-body mb-4">{rec.org}</p>

                {/* Details */}
                <div className="space-y-2 mb-5 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {rec.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> {rec.date}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <Users className="w-3.5 h-3.5 shrink-0" /> {rec.spots}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex gap-2 flex-wrap mb-5">
                  {rec.tags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground font-medium font-body">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link to="/opportunities/1" className="w-full py-3 rounded-full text-sm font-semibold font-body bg-primary text-primary-foreground flex items-center justify-center gap-2 group">
                  Apply Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="text-center">
            <motion.button
              onClick={handleSurpriseMe}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              animate={isSpinning ? { rotate: 360 } : {}}
              transition={{ duration: 0.6 }}
              className="px-8 py-4 rounded-full font-semibold font-body border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-2"
            >
              <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              {isSpinning ? "Finding your match..." : "Surprise Me — Find a Random Match"}
            </motion.button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AIRecommendations;
