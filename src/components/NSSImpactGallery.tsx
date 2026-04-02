import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow, Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

import nss7daysCamp from "@/assets/nss-7days-camp.jpeg";
import nssChristmas from "@/assets/nss-christmas.jpeg";
import nssMobileRepair from "@/assets/nss-mobile-repair.jpeg";
import nssSolarJal from "@/assets/nss-solar-jal.jpeg";
import nssFinancial from "@/assets/nss-financial.jpeg";
import nssDiwali from "@/assets/nss-diwali.jpeg";
import nssChulla from "@/assets/nss-chulla.jpeg";
import nssWarli from "@/assets/nss-warli.jpeg";
import nssTeachingZp from "@/assets/nss-teaching-zp.jpeg";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import "swiper/css/pagination";

const galleryItems = [
  { title: "7 Days Annual NSS Camp at Palghar", image: nss7daysCamp },
  { title: "Christmas Celebration at Oratory", image: nssChristmas },
  { title: "Mobile Repairing Workshop for ITI Students", image: nssMobileRepair },
  { title: "Solar Jal Jyoti Project", image: nssSolarJal },
  { title: "Financial Planning and Management Session", image: nssFinancial },
  { title: "Diwali Mela 2024", image: nssDiwali },
  { title: "Chulla Project in Walvanda", image: nssChulla },
  { title: "Warli Painting Workshop", image: nssWarli },
  { title: "Teaching at ZP School", image: nssTeachingZp },
];

const NSSImpactGallery = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="text-sm font-semibold font-body text-primary uppercase tracking-wider">NSS Impact Gallery</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mt-3 text-foreground">
              Discover Our Campaigns
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-body mt-3">
              Join us in doing something great for our community.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="relative group overflow-hidden">
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-2 md:left-4 top-[45%] -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-card border border-border text-foreground hover:bg-secondary transition-all duration-300 shadow-soft"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-2 md:right-4 top-[45%] -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-card border border-border text-foreground hover:bg-secondary transition-all duration-300 shadow-soft"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className="flex justify-center">
              <Swiper
                onSwiper={(swiper) => { swiperRef.current = swiper; }}
                onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
                modules={[Autoplay, EffectCoverflow, Navigation, Pagination]}
                effect="coverflow"
                grabCursor
                centeredSlides
                loop
                slidesPerView="auto"
                speed={800}
                autoplay={{ delay: 3000, disableOnInteraction: false }}
                coverflowEffect={{
                  rotate: 40,
                  stretch: -30,
                  depth: 350,
                  modifier: 1,
                  slideShadows: false,
                }}
                pagination={{ clickable: true, el: ".nss-pagination" }}
                className="nss-swiper w-full"
              >
                {galleryItems.map((item, i) => (
                  <SwiperSlide key={i} className="!w-[280px] sm:!w-[380px] md:!w-[480px]">
                    {({ isActive }) => (
                      <div
                        className="transition-all duration-500 ease-out rounded-3xl overflow-hidden mx-auto"
                        style={{
                          transform: isActive ? "scale(1)" : "scale(0.75)",
                          opacity: isActive ? 1 : 0.4,
                          boxShadow: isActive ? "0px 8px 30px rgba(0, 0, 0, 0.12)" : "none",
                          border: isActive ? "2px solid hsl(var(--primary) / 0.3)" : "2px solid transparent",
                        }}
                      >
                        <div className="h-[300px] sm:h-[380px] md:h-[460px] flex items-center justify-center bg-card">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <div className="text-center mt-8">
              <p className="text-lg md:text-xl font-display font-semibold text-foreground transition-all duration-300">
                {galleryItems[activeIndex]?.title}
              </p>
            </div>

            <div className="nss-pagination flex justify-center gap-2 mt-6" />
          </div>
        </ScrollReveal>
      </div>

      <style>{`
        .nss-swiper .swiper-slide {
          transition: all 0.5s ease;
        }
        .nss-pagination .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background: hsl(var(--muted-foreground));
          opacity: 0.3;
          border-radius: 9999px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .nss-pagination .swiper-pagination-bullet-active {
          background: hsl(var(--primary));
          opacity: 1;
          width: 28px;
        }
      `}</style>
    </section>
  );
};

export default NSSImpactGallery;
