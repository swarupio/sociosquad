import ScrollReveal from "./ScrollReveal";
import { motion } from "framer-motion";

import nss7daysCamp from "@/assets/nss-7days-camp.jpeg";
import nssChristmas from "@/assets/nss-christmas.jpeg";
import nssMobileRepair from "@/assets/nss-mobile-repair.jpeg";
import nssSolarJal from "@/assets/nss-solar-jal.jpeg";
import nssFinancial from "@/assets/nss-financial.jpeg";
import nssDiwali from "@/assets/nss-diwali.jpeg";
import nssChulla from "@/assets/nss-chulla.jpeg";
import nssWarli from "@/assets/nss-warli.jpeg";
import nssTeachingZp from "@/assets/nss-teaching-zp.jpeg";

const galleryItems = [
  { title: "7 Days Annual NSS Camp", image: nss7daysCamp },
  { title: "Christmas Celebration", image: nssChristmas },
  { title: "Mobile Repairing Workshop", image: nssMobileRepair },
  { title: "Solar Jal Jyoti Project", image: nssSolarJal },
  { title: "Financial Planning Session", image: nssFinancial },
  { title: "Diwali Mela 2024", image: nssDiwali },
  { title: "Chulla Project", image: nssChulla },
  { title: "Warli Painting Workshop", image: nssWarli },
  { title: "Teaching at ZP School", image: nssTeachingZp },
];

const NSSImpactGallery = () => {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="text-sm font-semibold font-body text-primary uppercase tracking-wider">NSS Impact Gallery</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mt-3 text-foreground">
              Helping People In Need Around The World
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft hover:shadow-lg transition-all duration-300 group"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold text-foreground text-sm">{item.title}</h3>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NSSImpactGallery;
