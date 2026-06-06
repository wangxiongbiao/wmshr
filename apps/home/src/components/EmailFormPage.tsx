import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Lock,
  Globe,
  Terminal,
  Building,
  Mail
} from "lucide-react";

interface EmailFormPageProps {
  onBack: () => void;
  onOpenAdmin: () => void;
}

async function submitLeadRequest(payload: {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  locale: string;
}) {
  const response = await fetch("/api/public/lead-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      companyName: payload.company,
      subject: payload.subject,
      message: payload.message,
      locale: payload.locale,
      source: "home_contact_form"
    })
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Failed to submit contact request");
  }

  return result;
}

export default function EmailFormPage({ onBack, onOpenAdmin }: EmailFormPageProps) {
  const { t, i18n } = useTranslation("portal");

  // 联系表单文案统一来自共享 portal namespace，避免三端切换语言时继续维护组件内私有翻译表。
  const currentLang = i18n.resolvedLanguage || i18n.language || "en";
  const tr = {
    formTitle: t("contact.formTitle"),
    nameLabel: t("contact.nameLabel"),
    namePlaceholder: t("contact.namePlaceholder"),
    emailLabel: t("contact.emailLabel"),
    emailPlaceholder: t("contact.emailPlaceholder"),
    companyLabel: t("contact.companyLabel"),
    companyPlaceholder: t("contact.companyPlaceholder"),
    subjectLabel: t("contact.subjectLabel"),
    subjectDefault: t("contact.subjectDefault"),
    detailsLabel: t("contact.detailsLabel"),
    detailsPlaceholder: t("contact.detailsPlaceholder"),
    submitBtn: t("contact.submitBtn"),
    sslNote: t("contact.sslNote"),
    recipientLabel: t("contact.recipientLabel"),
    encryptionBadge: t("contact.encryptionBadge"),
    charUnit: t("contact.charUnit"),
    submittingBtn: t("contact.submittingBtn"),
    transmittingTitle: t("contact.transmittingTitle"),
    protocolConsole: t("contact.protocolConsole"),
    directInquiry: t("contact.directInquiry"),
    successTitle: t("contact.successTitle"),
    successDesc: t("contact.successDesc"),
    backHome: t("contact.backHome"),
    goAdmin: t("contact.goAdmin"),
    validationRequired: t("contact.validationRequired"),
    validationEmail: t("contact.validationEmail"),
    submitError: t("contact.submitError"),
  };

  // Forms dynamic state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutState, setPayoutState] = useState<"editing" | "transmitting" | "success">("editing");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");

  // Default selection set appropriately when language/translation changes
  useEffect(() => {
    if (!formData.subject) {
      setFormData(prev => ({
        ...prev,
        subject: tr.subjectDefault
      }));
    }
  }, [tr, formData.subject]);

  // Terminal simulated logs to support high-fidelity transmission
  useEffect(() => {
    if (payoutState !== "transmitting") return;

    let cancelled = false;
    setLogLines([]);

    // 终端动画日志是页面可见文案，统一从 portal namespace 生成；保留技术前缀，避免破坏原有视觉节奏。
    const logLibrary = [
      t("contact.logs.client"),
      t("contact.logs.routing"),
      t("contact.logs.security"),
      t("contact.logs.encryption"),
      t("contact.logs.corridor", { company: formData.company || tr.directInquiry }),
      t("contact.logs.validator"),
      t("contact.logs.committing", { name: formData.name }),
      t("contact.logs.gateway"),
      t("contact.logs.success"),
      t("contact.logs.sla", { token: Math.floor(Math.random() * 89999 + 10000) })
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < logLibrary.length) {
        setLogLines(prev => [...prev, logLibrary[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        void submitLeadRequest({
          ...formData,
          locale: currentLang
        }).then(() => {
          if (cancelled) {
            return;
          }
          setTimeout(() => {
            if (!cancelled) {
              setPayoutState("success");
            }
          }, 600);
        }).catch((error) => {
          if (cancelled) {
            return;
          }
          setSubmitError(error instanceof Error ? error.message : tr.submitError);
          setPayoutState("editing");
        });
      }
    }, 300);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentLang, formData, payoutState]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = tr.validationRequired;
    }
    if (!formData.message.trim()) {
      newErrors.message = tr.validationRequired;
    }
    if (!formData.email.trim()) {
      newErrors.email = tr.validationRequired;
    } else {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = tr.validationEmail;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitError("");
    setLogLines([]);
    setIsSubmitting(true);
    setTimeout(() => {
      setPayoutState("transmitting");
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative z-10" id="secured-incidents-console">
      {/* Back home platform button */}
      <div className="mb-8 flex">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors py-2 px-4 rounded-xl glass border-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">{tr.backHome}</span>
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {payoutState === "editing" && (
          <motion.div
            key="email-dark-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl mx-auto"
          >
            {/* Elegant Premium Dark Container matching precisely the user's layout screenshot */}
            <div className="bg-[#121214] text-white rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.7)] border border-white/10 p-8 md:p-14 relative overflow-hidden">

              {/* Header section matching exact design */}
              <div className="bg-[#18181c] border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-[#5f5bf6]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">{tr.recipientLabel}</div>
                    <div className="text-base font-semibold text-indigo-400">dutylix@163.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono font-medium self-end sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {tr.encryptionBadge}
                </div>
              </div>

              {/* Form implementation */}
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Responsive 2-column input grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">

                  {/* Your Name field */}
                  <div className="space-y-2 text-left">
                    <label className="block text-sm font-semibold text-zinc-300">
                      {tr.nameLabel} <span className="text-[#5f5bf6]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder={tr.namePlaceholder}
                      className={`w-full bg-[#18181c] border ${errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-[#5f5bf6]'} rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#5f5bf6]/20 text-white text-sm placeholder-zinc-500 font-medium transition-all`}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-400 font-medium pt-1">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Corporate Email field */}
                  <div className="space-y-2 text-left">
                    <label className="block text-sm font-semibold text-zinc-300">
                      {tr.emailLabel} <span className="text-[#5f5bf6]">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder={tr.emailPlaceholder}
                      className={`w-full bg-[#18181c] border ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-[#5f5bf6]'} rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#5f5bf6]/20 text-white text-sm placeholder-zinc-500 font-medium transition-all`}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-400 font-medium pt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                </div>

                {/* 2-column input grid for Company and Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">

                  {/* Company Name field */}
                  <div className="space-y-2 text-left">
                    <label className="block text-sm font-semibold text-zinc-300">
                      {tr.companyLabel}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        placeholder={tr.companyPlaceholder}
                        className="w-full bg-[#18181c] border border-zinc-800 focus:border-[#5f5bf6] rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#5f5bf6]/20 text-white text-sm placeholder-zinc-500 font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Subject field */}
                  <div className="space-y-2 text-left">
                    <label className="block text-sm font-semibold text-zinc-300">
                      {tr.subjectLabel}
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                      className="w-full bg-[#18181c] border border-zinc-800 focus:border-[#5f5bf6] rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#5f5bf6]/20 text-white text-sm font-medium transition-all"
                    />
                  </div>

                </div>

                {/* Detailed Business Requirements field with relative char counter */}
                <div className="space-y-2 text-left pb-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-zinc-300">
                      {tr.detailsLabel} <span className="text-[#5f5bf6]">*</span>
                    </label>
                    <span className="text-xs font-mono text-zinc-500">
                      {formData.message.length} {tr.charUnit}
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder={tr.detailsPlaceholder}
                    className={`w-full bg-[#18181c] border ${errors.message ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-[#5f5bf6]'} rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-[#5f5bf6]/20 text-white text-sm placeholder-zinc-500 leading-relaxed font-medium resize-none transition-all`}
                  />
                  {errors.message && (
                    <p className="text-xs text-red-400 font-medium pt-1">
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Submit button precisely matching aesthetic premium theme */}
                <div className="pt-2">
                  {submitError ? (
                    <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {submitError}
                    </div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4.5 bg-[#5f5bf6] hover:bg-[#4b47e2] text-white rounded-2xl font-bold text-lg focus:scale-[0.99] hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-700/10 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{tr.submittingBtn}</span>
                      </>
                    ) : (
                      <span>{tr.submitBtn}</span>
                    )}
                  </button>
                </div>

                {/* SSL Confidential note at bottom matching SSL/RSA cryptography */}
                <div className="pt-4 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-[#5f5bf6]" />
                  <span>{tr.sslNote}</span>
                </div>

              </form>
            </div>
          </motion.div>
        )}

        {payoutState === "transmitting" && (
          <motion.div
            key="transmission-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="bg-black/80 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl text-center space-y-6 max-w-3xl mx-auto min-h-[400px] flex flex-col justify-center"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#5f5bf6]/15 border border-[#5f5bf6]/30 flex items-center justify-center mx-auto relative justify-items-center">
                <div className="absolute inset-0 rounded-full border-t-2 border-[#5f5bf6] animate-spin" />
                <Terminal className="text-[#5f5bf6] w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-semibold text-white tracking-tight">
                {tr.transmittingTitle}
              </h3>
            </div>

            {/* Terminal simulation log readout */}
            <div className="bg-black/95 rounded-xl p-5 border border-white/5 text-left font-mono text-[11px] text-zinc-300 space-y-1.5 h-[180px] overflow-y-auto select-none">
              <div className="flex items-center gap-2 mb-2 text-zinc-500 border-b border-white/5 pb-2 text-[9px] font-bold uppercase tracking-wider">
                <Globe className="w-3 h-3 text-[#5f5bf6]" />
                {tr.protocolConsole}
              </div>
              {logLines.map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${line.includes("[SUCCESS]") ? "text-emerald-400 font-bold" : line.includes("[SECURITY]") ? "text-amber-400" : "text-zinc-400"}`}
                >
                  {line}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {payoutState === "success" && (
          <motion.div
            key="transmission-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#121214] text-white p-10 md:p-16 rounded-[2.5rem] border border-white/10 text-center relative overflow-hidden group shadow-[0_30px_70px_rgba(0,0,0,0.7)] flex flex-col justify-center items-center min-h-[450px] max-w-3xl mx-auto"
          >
            {/* Background Glows */}
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,_rgba(95,91,246,0.03)_0%,_transparent_60%)] pointer-events-none" />

            {/* Success Ring Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 10, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500 relative z-10 mb-6"
            >
              <Check className="text-emerald-400 w-10 h-10" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-3.5xl font-display font-black text-[#5f5bf6] mb-4 relative z-10 uppercase tracking-tight"
            >
              {tr.successTitle}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-400 text-sm md:text-base font-medium mb-8 max-w-lg mx-auto relative z-10 leading-relaxed"
            >
              {tr.successDesc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="relative z-10 w-full flex flex-col items-center gap-4"
            >
              <button
                onClick={onBack}
                className="w-full max-w-xs py-4.5 bg-[#5f5bf6] hover:bg-[#4b47e2] text-white rounded-2xl font-bold text-base transition-all shadow-md shadow-indigo-700/10"
              >
                {tr.backHome}
              </button>
              <button
                onClick={onOpenAdmin}
                className="w-full max-w-xs py-4.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-base transition-all"
              >
                {tr.goAdmin}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
