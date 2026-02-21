import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import "swiper/css/pagination";

const galleryItems = [
  { title: "7 Days Annual NSS Camp at Palghar", image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80" },
  { title: "Christmas Celebration at Oratory", image: "https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?w=800&q=80" },
  { title: "Mobile Repairing Workshop for ITI Students", image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80" },
  { title: "Solar Jal Jyoti Project", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80" },
  { title: "Financial Planning and Management Session", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80" },
  { title: "Diwali Mela 2024", image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&q=80" },
  { title: "Chulla Project in Walvanda", image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80" },
  { title: "Warli Painting Workshop", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80" },
  { title: "Teaching at ZP School", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80" },
];

const NSSImpactGallery = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="relative py-20 md:py-28 overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Subtle top gradient blend */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="text-sm font-semibold text-cyan uppercase tracking-wider">NSS Impact Gallery</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">
              Our On-Ground{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(185, 90%, 55%), hsl(190, 95%, 40%))" }}>
                Impact
              </span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="relative group">
            {/* Custom navigation arrows */}
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-card/60 backdrop-blur-sm border border-cyan/30 text-cyan hover:bg-cyan/20 hover:shadow-glow-cyan transition-all duration-300"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-card/60 backdrop-blur-sm border border-cyan/30 text-cyan hover:bg-cyan/20 hover:shadow-glow-cyan transition-all duration-300"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <Swiper
              onSwiper={(swiper) => { swiperRef.current = swiper; }}
              onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
              modules={[EffectCoverflow, Navigation, Pagination]}
              effect="coverflow"
              grabCursor
              centeredSlides
              loop
              slidesPerView="auto"
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 220,
                modifier: 2.5,
                slideShadows: false,
              }}
              pagination={{ clickable: true, el: ".nss-pagination" }}
              breakpoints={{
                0: { slidesPerView: 1.2 },
                640: { slidesPerView: 1.6 },
                1024: { slidesPerView: 2.4 },
              }}
              className="nss-swiper !overflow-visible"
            >
              {galleryItems.map((item, i) => (
                <SwiperSlide key={i} className="!w-[300px] sm:!w-[400px] md:!w-[500px]">
                  {({ isActive }) => (
                    <div
                      className="transition-all duration-500 ease-out rounded-2xl overflow-hidden"
                      style={{
                        transform: isActive ? "scale(1)" : "scale(0.75) rotateY(0deg)",
                        opacity: isActive ? 1 : 0.5,
                        boxShadow: isActive ? "0 0 40px -5px hsl(185 90% 55% / 0.4), 0 0 80px -10px hsl(185 90% 55% / 0.15)" : "none",
                        border: isActive ? "2px solid hsl(185 90% 55% / 0.5)" : "2px solid transparent",
                      }}
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Active caption */}
            <div className="text-center mt-8">
              <p className="text-lg md:text-xl font-semibold text-foreground transition-all duration-300">
                {galleryItems[activeIndex]?.title}
              </p>
            </div>

            {/* Pagination dots */}
            <div className="nss-pagination flex justify-center gap-2 mt-6" />
          </div>
        </ScrollReveal>
      </div>

      {/* Bottom gradient blend */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <style>{`
        .nss-swiper .swiper-slide {
          transition: all 0.5s ease;
        }
        .nss-pagination .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background: hsl(215 20% 55%);
          opacity: 0.5;
          border-radius: 9999px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .nss-pagination .swiper-pagination-bullet-active {
          background: hsl(185 90% 55%);
          opacity: 1;
          width: 28px;
          box-shadow: 0 0 12px hsl(185 90% 55% / 0.5);
        }
      `}</style>
    </section>
  );
};

export default NSSImpactGallery;
