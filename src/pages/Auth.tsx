import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import heroVolunteers from "@/assets/hero-volunteers.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");

  const [signInErrors, setSignInErrors] = useState<{ email?: string; password?: string }>({});
  const [signUpErrors, setSignUpErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [signInApiError, setSignInApiError] = useState("");
  const [signUpApiError, setSignUpApiError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInApiError("");
    const errors: typeof signInErrors = {};
    if (!signInEmail.trim()) errors.email = "Email is required";
    else if (!validateEmail(signInEmail)) errors.email = "Enter a valid email address";
    if (!signInPassword) errors.password = "Password is required";
    else if (signInPassword.length < 6) errors.password = "Password must be at least 6 characters";
    setSignInErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignInLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail.trim(),
      password: signInPassword,
    });
    setSignInLoading(false);

    if (error) {
      setSignInApiError(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpApiError("");
    const errors: typeof signUpErrors = {};
    if (!signUpName.trim()) errors.name = "Name is required";
    if (!signUpEmail.trim()) errors.email = "Email is required";
    else if (!validateEmail(signUpEmail)) errors.email = "Enter a valid email address";
    if (!signUpPassword) errors.password = "Password is required";
    else if (signUpPassword.length < 6) errors.password = "Password must be at least 6 characters";
    setSignUpErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignUpLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail.trim(),
      password: signUpPassword,
      options: {
        data: { full_name: signUpName.trim() },
      },
    });
    setSignUpLoading(false);

    if (error) {
      setSignUpApiError(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/30 transition-all text-sm border border-border";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background relative">
      {/* Back to Home link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 text-sm text-navy-foreground/70 lg:text-navy-foreground/70 hover:text-navy-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden bg-navy">
        {/* Background volunteer image with overlay */}
        <img src={heroVolunteers} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-navy/60" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="space-y-6">
            <Link to="/" className="text-4xl font-extrabold text-navy-foreground inline-block">
              SocioSquad
            </Link>
            <p className="text-xl font-semibold text-navy-foreground">Make Your Impact Count</p>
            <p className="text-navy-foreground/70 text-sm leading-relaxed">
              Join thousands of volunteers making a difference in communities across India.
              Track your impact, connect with causes, and grow together.
            </p>
            <div className="flex justify-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-warm">50K+</div>
                <div className="text-xs text-navy-foreground/60">Volunteers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warm">200+</div>
                <div className="text-xs text-navy-foreground/60">NGOs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warm">500+</div>
                <div className="text-xs text-navy-foreground/60">Events</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="text-3xl font-extrabold text-navy">SocioSquad</Link>
            <p className="text-muted-foreground text-sm mt-1">Make Your Impact Count</p>
          </div>

          <div className="space-y-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="w-full bg-secondary rounded-xl p-1">
                <TabsTrigger value="signin" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Social Login */}
              <div className="space-y-3 pt-6">
                <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-card text-muted-foreground">or continue with email</span>
                </div>
              </div>

              {/* Sign In */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={signInEmail}
                        onChange={(e) => { setSignInEmail(e.target.value); setSignInErrors(p => ({ ...p, email: undefined })); }}
                        className={inputClass}
                      />
                    </div>
                    {signInErrors.email && <p className="text-destructive text-xs mt-1">{signInErrors.email}</p>}
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={signInPassword}
                        onChange={(e) => { setSignInPassword(e.target.value); setSignInErrors(p => ({ ...p, password: undefined })); }}
                        className={inputClass}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signInErrors.password && <p className="text-destructive text-xs mt-1">{signInErrors.password}</p>}
                  </div>
                  <div className="flex justify-end">
                    <button type="button" className="text-xs text-navy hover:underline">Forgot Password?</button>
                  </div>
                  {signInApiError && (
                    <p className="text-destructive text-xs text-center">{signInApiError}</p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={signInLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-warm text-warm-foreground flex items-center justify-center gap-2 disabled:opacity-70 hover:brightness-105 transition-all"
                  >
                    {signInLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                  </motion.button>
                </form>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup">
                {signUpSuccess ? (
                  <div className="text-center space-y-3 py-6">
                    <div className="text-3xl">📧</div>
                    <p className="text-foreground font-semibold">Check your email!</p>
                    <p className="text-muted-foreground text-sm">We've sent a confirmation link to <strong>{signUpEmail}</strong>. Click it to activate your account.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={signUpName}
                          onChange={(e) => { setSignUpName(e.target.value); setSignUpErrors(p => ({ ...p, name: undefined })); }}
                          className={inputClass}
                          maxLength={100}
                        />
                      </div>
                      {signUpErrors.name && <p className="text-destructive text-xs mt-1">{signUpErrors.name}</p>}
                    </div>
                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={signUpEmail}
                          onChange={(e) => { setSignUpEmail(e.target.value); setSignUpErrors(p => ({ ...p, email: undefined })); }}
                          className={inputClass}
                          maxLength={255}
                        />
                      </div>
                      {signUpErrors.email && <p className="text-destructive text-xs mt-1">{signUpErrors.email}</p>}
                    </div>
                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password (min. 6 characters)"
                          value={signUpPassword}
                          onChange={(e) => { setSignUpPassword(e.target.value); setSignUpErrors(p => ({ ...p, password: undefined })); }}
                          className={inputClass}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signUpErrors.password && <p className="text-destructive text-xs mt-1">{signUpErrors.password}</p>}
                    </div>
                    {signUpApiError && (
                      <p className="text-destructive text-xs text-center">{signUpApiError}</p>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={signUpLoading}
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-warm text-warm-foreground flex items-center justify-center gap-2 disabled:opacity-70 hover:brightness-105 transition-all"
                    >
                      {signUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <p className="text-center text-xs text-muted-foreground pt-2">
              By continuing, you agree to our{" "}
              <button className="text-navy hover:underline">Terms of Service</button>{" "}
              and{" "}
              <button className="text-navy hover:underline">Privacy Policy</button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
