import { ArrowLeft, FileText, Mail, ShieldCheck, Smartphone } from "lucide-react";
import type { SupportedLanguageCode } from "@wmshr/i18n";
import type { HomePageRoute } from "../lib/homeRoute";

type LegalPageProps = {
  contactEmail: string;
  currentLanguage: SupportedLanguageCode;
  page: Exclude<HomePageRoute, "home">;
  onBackHome: () => void;
};

type LegalCopy = {
  badge: string;
  title: string;
  intro: string;
  effectiveDateLabel: string;
  controllerLabel: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
  contactTitle: string;
  contactBody: string;
  backHome: string;
};

function getPrivacyCopy(language: SupportedLanguageCode, contactEmail: string): LegalCopy {
  const isChinese = language.startsWith("zh");

  if (isChinese) {
    return {
      badge: "隐私政策",
      title: "WMSHR App 隐私政策",
      intro:
        "本隐私政策适用于 WMSHR App 及相关门户服务，说明我们如何收集、使用、存储和保护与员工考勤、薪资查看、通知和账户登录相关的数据。",
      effectiveDateLabel: "生效日期：2026 年 6 月 12 日",
      controllerLabel: "服务主体：Dutylix / WMSHR",
      sections: [
        {
          title: "1. 我们收集哪些信息",
          body: [
            "当你登录和使用 App 时，我们可能收集账号信息，例如员工账号、姓名、部门、岗位、所属国家或地区，以及用于维持登录状态的访问令牌。",
            "当你使用考勤功能时，我们可能收集打卡时间、出勤记录、考勤状态、通知已读状态，以及与你相关的薪资结果、SOP 阅读状态等业务数据。",
            "当你在 Android 设备上执行打卡或定位相关功能时，我们可能在获得权限后收集精确位置信息、定位精度和反向地理编码得到的地点名称，用于考勤核验和地点展示。",
          ],
        },
        {
          title: "2. 我们如何使用这些信息",
          body: [
            "我们使用这些信息提供员工登录、身份校验、考勤打卡、工资单查看、系统通知、SOP 阅读确认和多语言体验等核心功能。",
            "位置信息仅用于你主动触发的考勤相关流程，例如签到、签退、地点识别和考勤记录同步。",
          ],
        },
        {
          title: "3. 本地存储与安全措施",
          body: [
            "App 会使用设备安全存储能力保存登录态；如果你开启“记住我”，账号和密码也可能加密保存在设备本地，以便下次快捷登录。",
            "我们采取合理的技术和组织措施保护数据，包含访问控制、传输加密及最小化访问原则，但任何系统都无法保证绝对安全。",
          ],
        },
        {
          title: "4. 数据共享与披露",
          body: [
            "我们不会为了广告出售你的个人信息。",
            "我们可能在提供服务所必需的范围内，与托管、数据库、认证、日志或运维支持服务提供商共享数据；也可能在法律要求、执法请求或保护合法权益所必需时披露信息。",
          ],
        },
        {
          title: "5. 你的选择与权利",
          body: [
            "你可以拒绝授予定位权限，但这可能导致考勤打卡等依赖位置的功能不可用或受限。",
            "如需查询、更正、删除账户相关信息，或申请删除保存在系统中的个人数据，请通过下方联系方式与我们联系。",
          ],
        },
        {
          title: "6. 保留期限",
          body: [
            "我们会在实现业务目的、履行合同义务、满足合规和争议处理需要的期限内保留相关数据；超过必要期限后，我们会根据适用法律和系统策略进行删除或匿名化处理。",
          ],
        },
        {
          title: "7. 政策更新",
          body: [
            "当产品功能、数据处理方式或法律要求发生变化时，我们可能更新本政策。更新后的版本会发布在本页面，并以页面上的生效日期为准。",
          ],
        },
      ],
      contactTitle: "联系我们",
      contactBody: `如果你对本隐私政策、数据安全或账户数据处理有任何问题，请联系：${contactEmail}`,
      backHome: "返回首页",
    };
  }

  return {
    badge: "Privacy Policy",
    title: "WMSHR App Privacy Policy",
    intro:
      "This Privacy Policy explains how WMSHR and related portal services collect, use, store, and protect data related to employee sign-in, attendance, payroll viewing, notifications, and account access.",
    effectiveDateLabel: "Effective date: June 12, 2026",
    controllerLabel: "Service provider: Dutylix / WMSHR",
    sections: [
      {
        title: "1. Information we collect",
        body: [
          "When you sign in and use the app, we may collect account information such as employee account, name, department, role, country or region, and access tokens used to maintain your session.",
          "When you use attendance and payroll features, we may collect check-in and check-out timestamps, attendance records, attendance status, notification read status, payroll results, and SOP acknowledgement records related to your account.",
          "When you use attendance features on Android devices, and when permission is granted, we may collect precise location data, location accuracy, and reverse-geocoded place names for attendance verification and workplace display.",
        ],
      },
      {
        title: "2. How we use information",
        body: [
          "We use this information to provide employee sign-in, identity verification, attendance tracking, payroll viewing, system notifications, SOP acknowledgement, and multilingual product experiences.",
          "Location data is used only for user-initiated attendance workflows such as check-in, check-out, workplace recognition, and attendance synchronization.",
        ],
      },
      {
        title: "3. Local storage and security",
        body: [
          "The app uses secure device storage to persist sign-in state. If you enable the remember-me option, account credentials may also be stored locally on the device to speed up future sign-ins.",
          "We use reasonable technical and organizational safeguards, including access controls, encrypted transport, and least-privilege access, but no system can guarantee absolute security.",
        ],
      },
      {
        title: "4. Sharing and disclosure",
        body: [
          "We do not sell personal information for advertising purposes.",
          "We may share data with hosting, database, authentication, logging, or operations providers when necessary to deliver the service, and may disclose information when required by law or to protect legal rights.",
        ],
      },
      {
        title: "5. Your choices and rights",
        body: [
          "You can deny location permission, but attendance workflows that depend on device location may be unavailable or limited.",
          "To request access, correction, deletion, or clarification regarding your account data, contact us using the email below.",
        ],
      },
      {
        title: "6. Retention",
        body: [
          "We retain information for as long as needed to provide services, fulfill contractual obligations, satisfy compliance requirements, resolve disputes, and enforce legitimate business needs, after which data may be deleted or anonymized.",
        ],
      },
      {
        title: "7. Policy changes",
        body: [
          "We may update this policy when product features, data processing practices, or legal requirements change. The latest version will be posted on this page with an updated effective date.",
        ],
      },
    ],
    contactTitle: "Contact",
    contactBody: `If you have questions about this Privacy Policy or data handling practices, contact us at ${contactEmail}.`,
    backHome: "Back to home",
  };
}

function getTermsCopy(language: SupportedLanguageCode, contactEmail: string): LegalCopy {
  const isChinese = language.startsWith("zh");

  if (isChinese) {
    return {
      badge: "服务条款",
      title: "WMSHR App 服务条款",
      intro:
        "本服务条款适用于 WMSHR App 及相关服务。下载、安装、访问或使用本应用，即表示你同意遵守这些条款。",
      effectiveDateLabel: "生效日期：2026 年 6 月 12 日",
      controllerLabel: "服务主体：Dutylix / WMSHR",
      sections: [
        {
          title: "1. 服务范围",
          body: [
            "WMSHR App 为企业员工提供登录、考勤打卡、薪资查看、通知接收、SOP 阅读确认等移动端功能。",
            "我们可根据业务或合规需要随时调整、暂停或更新部分功能。",
          ],
        },
        {
          title: "2. 账户与使用资格",
          body: [
            "你应使用由所属组织提供或授权的账户访问本应用，并对账户下发生的活动负责。",
            "未经授权，不得冒用他人身份、共享账户、规避访问控制或尝试干扰服务正常运行。",
          ],
        },
        {
          title: "3. 可接受使用",
          body: [
            "你同意仅将本应用用于合法、合规及与你工作相关的目的。",
            "你不得利用本应用上传恶意内容、攻击系统、抓取受限数据、逆向工程服务，或实施任何违反法律或雇主政策的行为。",
          ],
        },
        {
          title: "4. 企业数据与内容",
          body: [
            "本应用中显示的考勤、薪资、通知、制度文件及相关数据，可能由你的雇主或所属组织提供并控制。",
            "你应遵守组织内部关于机密信息、薪资信息和文件资料的使用与保密要求。",
          ],
        },
        {
          title: "5. 服务可用性与免责声明",
          body: [
            "我们会尽合理努力保持服务稳定，但不保证服务始终不中断、无错误或完全满足所有特定需求。",
            "在适用法律允许范围内，服务按“现状”和“可用”基础提供。",
          ],
        },
        {
          title: "6. 责任限制",
          body: [
            "在适用法律允许的最大范围内，对于因使用或无法使用本服务而导致的间接、附带、特殊或后果性损失，我们不承担责任。",
          ],
        },
        {
          title: "7. 条款变更与终止",
          body: [
            "我们可以在业务、法律或安全要求变化时更新本条款。更新后继续使用本应用即视为接受更新后的条款。",
            "若你违反本条款、组织政策或法律要求，我们可暂停或终止相关访问权限。",
          ],
        },
      ],
      contactTitle: "联系我们",
      contactBody: `如对本条款有任何疑问，请联系：${contactEmail}`,
      backHome: "返回首页",
    };
  }

  return {
    badge: "Terms of Service",
    title: "WMSHR App Terms of Service",
    intro:
      "These Terms of Service apply to WMSHR App and related services. By downloading, installing, accessing, or using the app, you agree to these terms.",
    effectiveDateLabel: "Effective date: June 12, 2026",
    controllerLabel: "Service provider: Dutylix / WMSHR",
    sections: [
      {
        title: "1. Service scope",
        body: [
          "WMSHR App provides mobile access to employee sign-in, attendance workflows, payroll viewing, notifications, and SOP acknowledgement features.",
          "We may modify, suspend, or update parts of the service when business, product, or compliance requirements change.",
        ],
      },
      {
        title: "2. Accounts and eligibility",
        body: [
          "You must use an account provided or authorized by your organization and are responsible for activity that occurs through that account.",
          "You may not impersonate others, share credentials improperly, bypass access controls, or interfere with normal service operations.",
        ],
      },
      {
        title: "3. Acceptable use",
        body: [
          "You agree to use the app only for lawful, authorized, and work-related purposes.",
          "You may not upload malicious content, attack the system, extract restricted data, reverse engineer the service, or engage in conduct that violates law or employer policy.",
        ],
      },
      {
        title: "4. Organization content and data",
        body: [
          "Attendance, payroll, notifications, SOP files, and related information shown in the app may be provided and controlled by your employer or organization.",
          "You are responsible for complying with internal confidentiality, payroll-handling, and document-use requirements that apply to that information.",
        ],
      },
      {
        title: "5. Availability and disclaimers",
        body: [
          "We use reasonable efforts to keep the service available, but we do not guarantee uninterrupted operation, error-free performance, or fitness for every specific use case.",
          "To the extent permitted by law, the service is provided on an \"as is\" and \"as available\" basis.",
        ],
      },
      {
        title: "6. Limitation of liability",
        body: [
          "To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages arising from use of, or inability to use, the service.",
        ],
      },
      {
        title: "7. Changes and termination",
        body: [
          "We may update these terms when business, legal, or security requirements change. Continued use after an update means you accept the revised terms.",
          "We may suspend or terminate access if you violate these terms, organization policy, or applicable law.",
        ],
      },
    ],
    contactTitle: "Contact",
    contactBody: `If you have questions about these terms, contact us at ${contactEmail}.`,
    backHome: "Back to home",
  };
}

function getComplianceCopy(language: SupportedLanguageCode, contactEmail: string): LegalCopy {
  const isChinese = language.startsWith("zh");

  if (isChinese) {
    return {
      badge: "合规说明",
      title: "WMSHR App 合规说明",
      intro:
        "本页面概述 WMSHR App 在数据处理、访问控制和员工端业务流程方面的基本合规实践，用于帮助企业客户、员工用户和应用商店审核理解服务边界。",
      effectiveDateLabel: "更新日期：2026 年 6 月 12 日",
      controllerLabel: "适用范围：WMSHR App 与相关门户服务",
      sections: [
        {
          title: "1. 业务定位",
          body: [
            "WMSHR App 是企业员工端应用，主要用于考勤、通知、薪资查看和制度确认，不面向儿童用户，也不作为公开社交平台使用。",
          ],
        },
        {
          title: "2. 数据最小化原则",
          body: [
            "我们仅处理提供服务所需的数据，例如员工身份信息、考勤记录、通知状态、SOP 确认信息以及为考勤核验所需的位置数据。",
            "与业务无关的敏感数据不会被主动要求采集。",
          ],
        },
        {
          title: "3. 权限与访问控制",
          body: [
            "访问企业数据前需要员工登录，服务端基于账户权限返回可见范围内的数据。",
            "位置权限仅在考勤相关流程中请求，用户可以拒绝，但相关功能可能受限。",
          ],
        },
        {
          title: "4. 数据安全措施",
          body: [
            "我们采用传输加密、访问控制、设备安全存储和最小权限原则来降低未授权访问风险。",
            "登录状态会保存在设备安全存储中，以支持重新打开应用后的连续使用体验。",
          ],
        },
        {
          title: "5. 组织责任与审核支持",
          body: [
            "企业客户应确保其通过本服务提供给员工的数据具备合法处理基础，并为员工提供必要的内部通知。",
            "如应用商店、客户或审计方需要审核访问，我们可通过测试账号或审核说明配合验证关键流程。",
          ],
        },
        {
          title: "6. 联系方式",
          body: [
            `如需进一步了解本应用的隐私、权限或合规实践，请联系：${contactEmail}`,
          ],
        },
      ],
      contactTitle: "合规联系",
      contactBody: `如需安全、隐私或审核协助，请发送邮件至：${contactEmail}`,
      backHome: "返回首页",
    };
  }

  return {
    badge: "Compliance",
    title: "WMSHR App Compliance Overview",
    intro:
      "This page summarizes key compliance practices for WMSHR App related to data handling, access control, and employee-facing business workflows so customers, users, and app reviewers can understand the service boundaries.",
    effectiveDateLabel: "Updated: June 12, 2026",
    controllerLabel: "Applies to: WMSHR App and related portal services",
    sections: [
      {
        title: "1. Service positioning",
        body: [
          "WMSHR App is an employee-facing business app for attendance, notifications, payroll viewing, and SOP acknowledgement. It is not designed for children and is not intended to operate as a public social platform.",
        ],
      },
      {
        title: "2. Data minimization",
        body: [
          "We process only the data needed to operate the service, such as employee identity details, attendance records, notification state, SOP acknowledgement, and location data required for attendance verification.",
          "We do not intentionally request unrelated sensitive data for routine use of the app.",
        ],
      },
      {
        title: "3. Permissions and access control",
        body: [
          "Employee access requires sign-in, and server-side access control is used to return only data that the signed-in account is allowed to view.",
          "Location permission is requested only for attendance-related flows. Users can decline the permission, though related features may become limited.",
        ],
      },
      {
        title: "4. Security practices",
        body: [
          "We use encrypted transport, access controls, secure device storage, and least-privilege principles to reduce the risk of unauthorized access.",
          "Session state is stored using device-secure storage to support continued access after the app is reopened.",
        ],
      },
      {
        title: "5. Organization responsibilities and review support",
        body: [
          "Customer organizations are responsible for ensuring they have an appropriate legal basis to provide workforce data through the service and for delivering any required employee notices.",
          "When app stores, customers, or auditors need functional review access, we can support evaluation with review instructions or test credentials for core workflows.",
        ],
      },
      {
        title: "6. Contact",
        body: [
          `For additional privacy, security, or review support questions, contact ${contactEmail}.`,
        ],
      },
    ],
    contactTitle: "Compliance contact",
    contactBody: `For security, privacy, or reviewer-support questions, email ${contactEmail}.`,
    backHome: "Back to home",
  };
}

function getLegalCopy(page: Exclude<HomePageRoute, "home">, language: SupportedLanguageCode, contactEmail: string): LegalCopy {
  if (page === "terms") {
    return getTermsCopy(language, contactEmail);
  }

  if (page === "compliance") {
    return getComplianceCopy(language, contactEmail);
  }

  return getPrivacyCopy(language, contactEmail);
}

export default function LegalPage({ contactEmail, currentLanguage, page, onBackHome }: LegalPageProps) {
  const copy = getLegalCopy(page, currentLanguage, contactEmail);
  const icon = page === "privacy" ? ShieldCheck : page === "terms" ? FileText : Smartphone;
  const HeaderIcon = icon;

  return (
    <main className="relative overflow-hidden pt-32 pb-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-accent/15 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        <button
          type="button"
          onClick={onBackHome}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.backHome}
        </button>

        <section className="glass rounded-[2rem] border border-white/10 p-8 md:p-12 shadow-2xl shadow-black/20">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-brand-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">
            <HeaderIcon className="h-4 w-4" />
            {copy.badge}
          </div>

          <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr] md:items-end">
            <div>
              <h1 className="text-4xl font-display font-bold tracking-tight text-white md:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
                {copy.intro}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
              <div className="flex items-center gap-3 text-white/85">
                <Smartphone className="h-5 w-5 text-brand-accent" />
                <span className="font-semibold">{copy.effectiveDateLabel}</span>
              </div>
              <p className="mt-4 leading-7">{copy.controllerLabel}</p>
            </div>
          </div>

          <div className="mt-12 space-y-6">
            {copy.sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 md:p-7"
              >
                <h2 className="text-xl font-display font-bold text-white md:text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-white/65 md:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-[1.5rem] border border-brand-accent/20 bg-brand-accent/8 p-6 md:p-7">
            <div className="flex items-center gap-3 text-brand-accent">
              <Mail className="h-5 w-5" />
              <h2 className="text-xl font-display font-bold md:text-2xl">{copy.contactTitle}</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/75 md:text-base">
              {copy.contactBody}
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
            >
              <Mail className="h-4 w-4" />
              {contactEmail}
            </a>
          </section>
        </section>
      </div>
    </main>
  );
}
