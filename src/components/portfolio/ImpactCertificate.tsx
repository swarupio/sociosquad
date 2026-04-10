import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Award, Shield } from "lucide-react";
import { useRef } from "react";

interface ImpactCertificateProps {
  name: string;
  hours: number;
  tasks: number;
  causes: number;
  level: number;
  joinDate: string;
  onClose: () => void;
}

const ImpactCertificate = ({ name, hours, tasks, causes, level, joinDate, onClose }: ImpactCertificateProps) => {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SocioSquad Impact Certificate - ${name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f0e8; }
          .cert {
            width: 800px; padding: 60px; background: white;
            border: 3px solid #2d6a4f; border-radius: 16px;
            position: relative; overflow: hidden;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
          .cert::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8px;
            background: linear-gradient(90deg, #2d6a4f, #d4a843);
          }
          .cert::after {
            content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 8px;
            background: linear-gradient(90deg, #d4a843, #2d6a4f);
          }
          .corner { position: absolute; width: 80px; height: 80px; opacity: 0.05; }
          .corner-tl { top: 20px; left: 20px; border-top: 3px solid #2d6a4f; border-left: 3px solid #2d6a4f; }
          .corner-tr { top: 20px; right: 20px; border-top: 3px solid #2d6a4f; border-right: 3px solid #2d6a4f; }
          .corner-bl { bottom: 20px; left: 20px; border-bottom: 3px solid #2d6a4f; border-left: 3px solid #2d6a4f; }
          .corner-br { bottom: 20px; right: 20px; border-bottom: 3px solid #2d6a4f; border-right: 3px solid #2d6a4f; }
          .header { text-align: center; margin-bottom: 40px; }
          .brand { font-family: 'Playfair Display', serif; font-size: 28px; color: #2d6a4f; font-weight: 800; }
          .subtitle { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #888; margin-top: 8px; }
          .title { font-family: 'Playfair Display', serif; font-size: 32px; color: #1a1a1a; text-align: center; margin-bottom: 8px; }
          .recipient { font-family: 'Playfair Display', serif; font-size: 42px; color: #2d6a4f; text-align: center; margin: 20px 0; font-weight: 700; }
          .desc { text-align: center; color: #666; font-size: 14px; line-height: 1.7; max-width: 500px; margin: 0 auto 32px; }
          .stats { display: flex; justify-content: center; gap: 40px; margin: 32px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 28px; font-weight: 700; color: #2d6a4f; }
          .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
          .footer-item { text-align: center; }
          .footer-line { width: 140px; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
          .footer-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .id { font-size: 9px; color: #bbb; text-align: center; margin-top: 24px; }
          @media print { body { background: white; } .cert { border: none; box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="cert">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
          <div class="header">
            <div class="brand">SocioSquad</div>
            <div class="subtitle">Volunteer Impact Certificate</div>
          </div>
          <div class="title">Certificate of Impact</div>
          <div style="text-align:center;color:#888;font-size:13px;">This is to certify that</div>
          <div class="recipient">${name}</div>
          <div class="desc">
            has demonstrated exceptional commitment to social impact through volunteering,
            contributing ${hours} hours across ${causes} causes since ${joinDate}.
          </div>
          <div class="stats">
            <div class="stat"><div class="stat-value">${hours}</div><div class="stat-label">Hours</div></div>
            <div class="stat"><div class="stat-value">${tasks}</div><div class="stat-label">Events</div></div>
            <div class="stat"><div class="stat-value">${causes}</div><div class="stat-label">Causes</div></div>
            <div class="stat"><div class="stat-value">${level}</div><div class="stat-label">Level</div></div>
          </div>
          <div class="footer">
            <div class="footer-item"><div class="footer-line"></div><div class="footer-label">Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
            <div class="footer-item"><div class="footer-line"></div><div class="footer-label">SocioSquad Platform</div></div>
          </div>
          <div class="id">Certificate ID: SS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Impact Certificate
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6" ref={certRef}>
            <div className="bg-background rounded-xl border-2 border-primary/20 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" style={{ background: "var(--gradient-primary)" }} />

              <div className="text-center mb-6">
                <p className="text-xl font-display font-bold text-primary">SocioSquad</p>
                <p className="text-[10px] tracking-[3px] uppercase text-muted-foreground mt-1">Volunteer Impact Certificate</p>
              </div>

              <div className="text-center mb-4">
                <p className="text-xs text-muted-foreground mb-1">This is to certify that</p>
                <p className="text-2xl font-display font-bold text-foreground">{name}</p>
              </div>

              <p className="text-center text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
                has contributed <span className="font-semibold text-foreground">{hours} hours</span> across{" "}
                <span className="font-semibold text-foreground">{causes} causes</span>, completing{" "}
                <span className="font-semibold text-foreground">{tasks} events</span> since {joinDate}.
              </p>

              <div className="flex justify-center gap-8 mb-6">
                {[
                  { label: "Hours", value: hours },
                  { label: "Events", value: tasks },
                  { label: "Causes", value: causes },
                  { label: "Level", value: level },
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-lg font-bold text-primary">{stat.value}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-center">
                  <div className="w-24 border-b border-muted-foreground/30 mb-1" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-primary/20" />
                <div className="text-center">
                  <div className="w-24 border-b border-muted-foreground/30 mb-1" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">SocioSquad</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-105 transition-all"
            >
              <Download className="w-4 h-4" /> Download PDF
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImpactCertificate;
