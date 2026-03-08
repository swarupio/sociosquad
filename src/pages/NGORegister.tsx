import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Globe, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganization } from "@/hooks/useOrganization";
import heroVolunteers from "@/assets/hero-volunteers.jpg";

export default function NGORegister() {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  const { createOrg } = useMyOrganization();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "Mumbai",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, val: string) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Organization name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.contact_email.trim()) e.contact_email = "Contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await createOrg(form);
    setLoading(false);
    if (result) navigate("/ngo/dashboard");
  };

  if (isReady && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Sign in first</h2>
          <p className="text-muted-foreground mb-4">You need an account to register an organization.</p>
          <Link to="/auth">
            <Button className="rounded-xl">Sign In / Sign Up</Button>
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = "rounded-xl";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full lg:bg-transparent lg:backdrop-blur-none lg:text-navy-foreground/70"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      {/* Left visual */}
      <div className="hidden lg:flex lg:w-2/5 relative items-center justify-center overflow-hidden bg-primary">
        <img src={heroVolunteers} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 text-center px-12 max-w-lg">
          <Building2 className="w-16 h-16 mx-auto text-primary-foreground/80 mb-6" />
          <h2 className="text-3xl font-display font-bold text-primary-foreground mb-3">Register Your NGO</h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Join SocioSquad to post volunteer opportunities, manage registrations, and verify volunteer hours — all in one place.
          </p>
          <div className="flex justify-center gap-8 pt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">Free</div>
              <div className="text-xs text-primary-foreground/60">To register</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">10K+</div>
              <div className="text-xs text-primary-foreground/60">Volunteers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">200+</div>
              <div className="text-xs text-primary-foreground/60">NGOs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-card">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="lg:hidden text-center mb-6">
            <Building2 className="w-10 h-10 mx-auto text-primary mb-2" />
            <h2 className="text-2xl font-display font-bold text-foreground">Register Your NGO</h2>
          </div>

          <h3 className="hidden lg:block text-2xl font-display font-bold text-foreground mb-6">Organization Details</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Organization Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Green Earth Foundation" className={`pl-10 ${inputClass}`} maxLength={100} />
              </div>
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description *</label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does your organization do?" className={`${inputClass} resize-none`} rows={3} maxLength={500} />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="ngo@example.com" className={`pl-10 ${inputClass}`} maxLength={255} />
                </div>
                {errors.contact_email && <p className="text-destructive text-xs mt-1">{errors.contact_email}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+91 98765 43210" className={`pl-10 ${inputClass}`} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://yourorg.org" className={`pl-10 ${inputClass}`} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Office address" className={`pl-10 ${inputClass}`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                <select value={form.city} onChange={e => set("city", e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm h-10">
                  <option>Mumbai</option>
                  <option>Delhi</option>
                  <option>Bangalore</option>
                  <option>Pune</option>
                  <option>Chennai</option>
                  <option>Kolkata</option>
                  <option>Hyderabad</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-xl mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Register Organization <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Already registered? <Link to="/ngo/dashboard" className="text-primary hover:underline">Go to Dashboard</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
