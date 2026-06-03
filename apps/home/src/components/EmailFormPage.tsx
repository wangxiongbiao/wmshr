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

interface ContactTranslation {
  formTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  companyLabel: string;
  companyPlaceholder: string;
  subjectLabel: string;
  subjectDefault: string;
  detailsLabel: string;
  detailsPlaceholder: string;
  submitBtn: string;
  sslNote: string;
  successTitle: string;
  successDesc: string;
  backHome: string;
  goAdmin: string;
  validationRequired: string;
  validationEmail: string;
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

const contactTranslations: Record<string, ContactTranslation> = {
  en: {
    formTitle: "Submit Secure Inquiry",
    nameLabel: "Full Name",
    namePlaceholder: "Please enter your name",
    emailLabel: "Corporate Email",
    emailPlaceholder: "name@company.com",
    companyLabel: "Company/Organization Name",
    companyPlaceholder: "Please enter your company name",
    subjectLabel: "Email Subject",
    subjectDefault: "Global Attendance & Automated Payroll Consultation",
    detailsLabel: "Detailed Business Requirements",
    detailsPlaceholder: "Please describe your global compliance, payroll or warehousing requirements in detail...",
    submitBtn: "Transmit Secure Request",
    sslNote: "Your data is protected by SSL protocol & AES-256 grade encryption",
    successTitle: "MESSAGE TRANSMITTED SECURELY",
    successDesc: "Your secure transmission packet has been received regarding global operations. Our experts will respond via your corporate registry within 24 hours.",
    backHome: "Return to Home Platform",
    goAdmin: "Go to Admin Login",
    validationRequired: "This field is required",
    validationEmail: "Please enter a valid email address"
  },
  zh: {
    formTitle: "高安全性安全需求端点",
    nameLabel: "完整姓名",
    namePlaceholder: "请输入您的姓名",
    emailLabel: "企业电子邮箱",
    emailPlaceholder: "name@company.com",
    companyLabel: "公司/机构名称",
    companyPlaceholder: "请输入您的公司名称",
    subjectLabel: "邮件主题",
    subjectDefault: "全球考勤、薪酬与合规服务咨询",
    detailsLabel: "详细业务需求",
    detailsPlaceholder: "请简单描述您的货物类目、预计仓储规模及主要目标市场...",
    submitBtn: "建立安全连接并提交",
    sslNote: "您的商业及通信数据受 SSL 与高级算法加密保护并严格保密",
    successTitle: "加密提交成功！",
    successDesc: "您的业务需求已成功安全提交。解决方案专家与专属顾问将在 24 小时内通过预留的企业邮箱与您取得联系。",
    backHome: "返回主面板",
    goAdmin: "前往后台登录",
    validationRequired: "此项为必填项",
    validationEmail: "请输入正确的电子邮箱"
  },
  zht: {
    formTitle: "高安全性安全需求端點",
    nameLabel: "完整姓名",
    namePlaceholder: "請輸入您的姓名",
    emailLabel: "企業電子郵箱",
    emailPlaceholder: "name@company.com",
    companyLabel: "公司/機構名稱",
    companyPlaceholder: "請輸入您的公司名稱",
    subjectLabel: "郵件主題",
    subjectDefault: "全球考勤、薪疇與合規服務諮詢",
    detailsLabel: "詳細業務需求",
    detailsPlaceholder: "請簡單描述您的貨物類目、預計倉儲規模及主要目標市場...",
    submitBtn: "建立安全連接並提交",
    sslNote: "您的商業及通信數據受 SSL 與高級算法加密保護並嚴格保密",
    successTitle: "加密提交成功！",
    successDesc: "您的業務需求已成功安全提交。解決方案專家與專屬顧問將在 24 小時內通過預留的企業郵箱與您取得聯繫。",
    backHome: "返回主面板",
    goAdmin: "前往後台登入",
    validationRequired: "此項為必填",
    validationEmail: "請輸入正確的電子郵箱"
  },
  th: {
    formTitle: "ส่งคำขอความปลอดภัยสูง",
    nameLabel: "ชื่อจริง - นามสกุล",
    namePlaceholder: "กรุณากรอกชื่อและนามสกุลของคุณ",
    emailLabel: "อีเมลองค์กร",
    emailPlaceholder: "name@company.com",
    companyLabel: "ชื่อบริษัท/องค์กร",
    companyPlaceholder: "กรุณากรอกชื่อบริษัทของคุณ",
    subjectLabel: "หัวข้ออีเมล",
    subjectDefault: "การให้คำปรึกษาเกี่ยวกับระบบเวลาทำงานและเงินดือนอัตโนมัติทั่วโลก",
    detailsLabel: "รายละเอียดความต้องการทางธุรกิจ",
    detailsPlaceholder: "โปรดอธิบายรายละเอียดบริการ ขนาดที่ต้องการ และตลาดเป้าหมายโดยย่อ...",
    submitBtn: "ส่งคำขออย่างปลอดภัย",
    sslNote: "ข้อมูลทางธุรกิจของคุณได้รับการคุ้มครองโดยโปรโตคอล SSL และการเข้ารหัสที่เข้มงวด",
    successTitle: "ส่งข้อมูลแล้ว!",
    successDesc: "ความต้องการทางธุรกิจของคุณได้รับการส่งอย่างปลอดภัยแล้ว ผู้เชี่ยวชาญจะติดต่อกลับผ่านอีเมลบริษัทภายใน 24 ชั่วโมง",
    backHome: "กลับไปที่แดชบอร์ด",
    goAdmin: "ไปยังหน้าแอดมิน",
    validationRequired: "โปรดระบุข้อมูลในช่องนี้",
    validationEmail: "โปรดป้อนที่อยู่อีเมลที่ถูกต้อง"
  },
  id: {
    formTitle: "Kirim Permintaan Keamanan Tinggi",
    nameLabel: "Nama Lengkap",
    namePlaceholder: "Silakan masukkan nama lengkap Anda",
    emailLabel: "Email Perusahaan",
    emailPlaceholder: "name@company.com",
    companyLabel: "Nama Perusahaan/Organisasi",
    companyPlaceholder: "Silakan masukkan nama perusahaan Anda",
    subjectLabel: "Subjek Email",
    subjectDefault: "Konsultasi Absensi & Payroll Otomatis Global",
    detailsLabel: "Detail Persyaratan Bisnis",
    detailsPlaceholder: "Jelaskan dengan singkat kategori layanan, skala, dan pasar target Anda...",
    submitBtn: "Kirim Permintaan Aman",
    sslNote: "Informasi bisnis Anda dilindungi oleh protokol SSL dan dijamin kerahasiaannya",
    successTitle: "PENGIRIMAN DATA SELESAI!",
    successDesc: "Kebutuhan bisnis Anda telah berhasil dikirim. Konsultan khusus kami akan menghubungi Anda melalui email perusahaan dalam waktu 24 jam.",
    backHome: "Kembali ke Beranda",
    goAdmin: "Masuk ke Admin",
    validationRequired: "Kolom ini wajib diisi",
    validationEmail: "Masukkan alamat email yang valid"
  },
  ms: {
    formTitle: "Serahkan Permintaan Keselamatan Tinggi",
    nameLabel: "Nama Penuh",
    namePlaceholder: "Sila masukkan nama penuh anda",
    emailLabel: "E-mel Korporat",
    emailPlaceholder: "name@company.com",
    companyLabel: "Nama Syarikat/Organisasi",
    companyPlaceholder: "Sila masukkan nama syarikat anda",
    subjectLabel: "Perkara E-mel",
    subjectDefault: "Pertanyaan Kehadiran Global & Automasi Payroll",
    detailsLabel: "Butiran Keperluan Perniagaan",
    detailsPlaceholder: "Terangkan ringkas mengenai kategori barangan, anggaran skala penyimpanan dan sasaran pasaran...",
    submitBtn: "Hantar Permintaan Selamat",
    sslNote: "Maklumat perniagaan anda dilindungi oleh protokol SSL dan penyulitan penuh",
    successTitle: "PENGHANTARAN BERJAYA!",
    successDesc: "Permintaan perniagaan anda telah selamat dihantar. Perunding kami akan menghubungi anda melalui e-mel yang disediakan dalam masa 24 jam.",
    backHome: "Kembali ke Dashboard",
    goAdmin: "Masuk Admin",
    validationRequired: "Ruangan ini wajib diisi",
    validationEmail: "Sila masukkan alamat e-mel yang sah"
  },
  es: {
    formTitle: "Enviar Solicitud de Alta Seguridad",
    nameLabel: "Nombre Completo",
    namePlaceholder: "Por favor introduzca su nombre completo",
    emailLabel: "Correo Electrónico Corporativo",
    emailPlaceholder: "name@company.com",
    companyLabel: "Nombre de la Empresa",
    companyPlaceholder: "Por favor introduzca el nombre de su empresa",
    subjectLabel: "Asunto del Correo",
    subjectDefault: "Consulta sobre Asistencia y Nómina Automatizada Global",
    detailsLabel: "Requisitos de Negocio Detallados",
    detailsPlaceholder: "Describa brevemente la categoría de servicio, la escala estimada y los mercados objetivo...",
    submitBtn: "Transmitir Solicitud Segura",
    sslNote: "Sus datos están protegidos por el protocolo SSL y cifrado grado AES-256",
    successTitle: "¡TRANSMISIÓN COMPLETADA!",
    successDesc: "Sus requisitos comerciales se han enviado con éxito. Un asesor de cumplimiento corporativo se comunicará por correo dentro de las 24 horas.",
    backHome: "Volver a la Página Principal",
    goAdmin: "Ir al Admin",
    validationRequired: "Este campo es requerido",
    validationEmail: "Por favor introduzca un correo electrónico válido"
  },
  pt: {
    formTitle: "Enviar Solicitação de Alta Segurança",
    nameLabel: "Nome Completo",
    namePlaceholder: "Insira seu nome completo",
    emailLabel: "E-mail Corporativo",
    emailPlaceholder: "name@company.com",
    companyLabel: "Nome da Empresa/Organização",
    companyPlaceholder: "Insira o nome da sua empresa",
    subjectLabel: "Assunto do E-mail",
    subjectDefault: "Consulta de Folha de Pagamento & Presença Global",
    detailsLabel: "Detalhes de Requisitos de Negócio",
    detailsPlaceholder: "Descreva brevemente a categoria de serviço, escala estimada e mercados alvo...",
    submitBtn: "Transmitir Solicitação Segura",
    sslNote: "Suas informações comerciais são protegidas por protocolo SSL e criptografia AES-256",
    successTitle: "TRANSMISSÃO CONCLUÍDA!",
    successDesc: "Seus requisitos de negócios foram enviados com segurança. Um consultor dedicado responderá através do seu e-mail corporativo em até 24 horas.",
    backHome: "Retornar ao Dashboard",
    goAdmin: "Entrar no Admin",
    validationRequired: "Campo obrigatório",
    validationEmail: "Insira um endereço de e-mail válido"
  }
};

export default function EmailFormPage({ onBack, onOpenAdmin }: EmailFormPageProps) {
  const { i18n } = useTranslation();

  // Detect current display language
  const currentLang = contactTranslations[i18n.language] ? i18n.language : "en";
  const tr = contactTranslations[currentLang];

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

    const logLibrary = [
      `[CLIENT] Initializing secure telemetry channel...`,
      `[ROUTING] Binding payload descriptor nodes...`,
      `[SECURITY] Applying TLSv1.3 encryption handshake with dutylix@163.com`,
      `[ENCRYPTION] Cipher: ECDHE-RSA-AES256-GCM-SHA384`,
      `[CORRIDOR] Injecting corporate client payload metadata regarding: [${formData.company || "Direct Inquiry"}]`,
      `[VALIDATOR] Processing client corporate email registry authentication...`,
      `[COMMITTING] Transmitting requirements packet of: [${formData.name}]`,
      `[GATEWAY] Remote SSL certificate handshake: VERIFIED`,
      `[SUCCESS] Encryption tunnel routed successfully to corporate backlog.`,
      `[SLA] Assigned secure tracking token #DTL-${Math.floor(Math.random() * 89999 + 10000)}`
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
          setSubmitError(error instanceof Error ? error.message : "提交失败，请稍后重试。");
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
                    <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">SECURE ENDPOINT RECIPIENT</div>
                    <div className="text-base font-semibold text-indigo-400">dutylix@163.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono font-medium self-end sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ENC: RSA-4096
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
                      {formData.message.length} chars
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
                        <span>Securing Tunnel Link...</span>
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
                SECURE END-TO-END TRANSMISSION ACTIVE
              </h3>
            </div>

            {/* Terminal simulation log readout */}
            <div className="bg-black/95 rounded-xl p-5 border border-white/5 text-left font-mono text-[11px] text-zinc-300 space-y-1.5 h-[180px] overflow-y-auto select-none">
              <div className="flex items-center gap-2 mb-2 text-zinc-500 border-b border-white/5 pb-2 text-[9px] font-bold uppercase tracking-wider">
                <Globe className="w-3 h-3 text-[#5f5bf6]" />
                Secure Handshake Node & Router Protocol Console
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
