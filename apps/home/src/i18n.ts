import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        features: 'Solutions',
        about: 'Mobile APP Download',
        docs: 'About Us',
        waitlist: 'Use Now',
      },
      about_section: {
        badge: 'OUR MISSION',
        title: 'Meet the Minds Redefining Work.',
        description: 'Born in the heart of global innovation, Dutylix was founded to bridge the gap between human potential and operational complexity. We believe that distance shouldn\'t be a barrier to excellence.',
        founder: {
          label: 'Founder & CEO',
          name: 'Gary Zhan',
          bio: 'A visionary leader with deep roots in global workforce dynamics and automation technology. Gary founded Dutylix to empower overseas enterprises with the tools they need to scale fearlessly.'
        },
        team: {
          title: 'Global DNA, Local Heart.',
          desc: 'Our team comprises experts from 15+ countries, bringing together a rich tapestry of perspectives to solve the world\'s most challenging labor compliance and payroll problems.'
        },
        office: {
          title: 'Where Innovation Resides.',
          desc: 'From our Silicon Valley design studio to our engineering hubs in Singapore and Zurich, we build products that set the standard for the future of work.'
        }
      },
      hero: {
        badge: 'Global Workforce Management Platform',
        title: 'PAYROLL & ATTENDANCE. SIMPLIFIED.',
        description: 'The all-in-one platform for overseas enterprises to manage attendance, automate payroll, and ensure global tax compliance across 150+ countries.',
        getStarted: 'Book a Demo',
        watchDemo: 'View Platform',
        initializing: 'Connecting global payment rails...',
      },
      stats: {
        throughput: 'Countries Covered',
        latency: 'Currencies',
        precision: 'Compliance Accuracy',
        uptime: 'Payout Speed',
      },
      features: {
        badge: 'BUILT FOR MODERN WORKFORCES.',
        description: 'Dutylix automates the entire employee lifecycle from GPS clock-ins to automated overtime payroll calculation.',
        viewAll: 'Explore Solutions',
        items: {
          reasoning: {
            title: 'Automated Attendance',
            desc: "Smart GPS geofencing and biometric verification. Attendance records are generated automatically upon arrival.",
          },
          dist: {
            title: 'Smart Overtime Engine',
            desc: 'Automatic overtime calculation based on local labor laws. Pay multipliers are applied instantly to salary runs.',
          },
          security: {
            title: 'Admin Command Center',
            desc: 'A unified dashboard for managers to monitor team location, attendance, and productivity in real-time.',
          },
          multimodal: {
            title: 'Precision Statistics',
            desc: 'Deep insights into workforce overhead, absence trends, and project-based labor costs.',
          },
          cli: {
            title: 'Employee Self-Service',
            desc: 'Mobile-first app for employees to view payslips, request leave, and clock-in with high-precision location.',
          },
          scaling: {
            title: 'Global Compliance',
            desc: 'Stay compliant with tax and labor laws in 150+ countries. Dutylix handles the rules so you don\'t have to.',
          },
        },
      },
      cta: {
        title: 'UNIFY YOUR WORKFORCE TODAY.',
        description: 'Join thousands of enterprises optimizing their team operations with Dutylix. Real-time attendance, zero-error payroll.',
        getStarted: 'Talk to an Expert',
        contact: 'View Pricing',
      },
      footer: {
        desc: 'The leading platform for intelligent attendance management and automated workforce payroll.',
        product: 'Solutions',
        company: 'Resources',
        follow: 'Connect',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. ALL RIGHTS RESERVED.',
        links: {
          payroll: 'Automated Payroll',
          attendance: 'GPS Attendance',
          tax: 'Tax Compliance',
          employee: 'Employee App',
          pricing: 'Pricing',
          integrations: 'Integrations',
          support: 'Support',
          docs: 'Documentation',
          privacy: 'Privacy',
          terms: 'Terms',
          compliance: 'Compliance'
        },
        certifications: {
          soc2: 'SOC2 TYPE II CERTIFIED',
          gdpr: 'GDPR COMPLIANT'
        }
      },
      dashboard: {
        payout: 'PAYROLL READY',
        status: 'Attendance Verified',
        employee: 'Employee Name',
        location: 'Location Status',
        hours: 'Hours Today',
        overtime: 'Detected Overtime',
        gpsActive: 'GPS Tracking Active',
        adminView: 'Admin Control Panel',
        autoCalc: 'Auto-Calculating Pay...',
        scenes: {
          clockIn: 'Mobile Clock-in',
          records: 'Admin Records',
          payroll: 'Overtime Payroll',
          sop: 'SOP Distribution'
        },
        sceneTitles: {
          s1: 'GPS Verified Clock-in',
          s2: 'Real-time Attendance Monitoring',
          s3: 'Automated Overtime Calculation',
          s4: 'SOP & Task Distribution'
        },
        sceneDescs: {
          s1: 'Employees clock-in with high-precision GPS geofencing. Records are immutable and real-time.',
          s2: 'Managers monitor workforce distribution and presence globally from a single Command Center.',
          s3: 'Payroll engine automatically cross-references attendance vs labor laws to compute overtime pay.',
          s4: 'Push Standard Operating Procedures (SOPs) and safety guidelines directly to specific teams or roles.'
        }
      }
    },
  },
  zh: {
    translation: {
      nav: {
        features: '解决方案',
        about: '移动端APP下载',
        docs: '关于我们',
        waitlist: '立即使用',
      },
      about_section: {
        badge: '我们的使命',
        title: '遇见重塑工作的思想者。',
        description: 'Dutylix 诞生于全球创新的核心，旨在消除人类潜能与运营复杂性之间的隔阂。我们相信，距离不应成为追求卓越的障碍。',
        founder: {
          label: '创始人兼首席执行官',
          name: 'Gary Zhan (詹先生)',
          bio: '一位在全球劳动力动态和自动化技术领域拥有深厚素养的远见领袖。詹先生创立 Dutylix，旨在为出海企业提供无畏扩张所需的工具。'
        },
        team: {
          title: '全球基因，本土情怀。',
          desc: '我们的团队由来自 15 个以上的国家的专家组成，汇聚了丰富的多元视角，致力于解决全球最具挑战性的劳动合规和薪酬问题。'
        },
        office: {
          title: '创新之源。',
          desc: '从硅谷的设计工作室到新加坡和苏黎世的工程枢纽，我们打造的产品正为未来的工作方式设定标准。'
        }
      },
      hero: {
        badge: '智能化劳动力管理平台',
        title: 'DUTYLIX考勤与薪资自动运行',
        description: 'Dutylix 为出海企业提供一站式员工考勤、定位追踪、自动计算加班及薪资发放的合规管理平台。',
        getStarted: '预约演示',
        watchDemo: '查看平台',
        initializing: '正在连接全球支付网络...',
      },
      stats: {
        throughput: '覆盖国家',
        latency: '支持币种',
        precision: '合规准确率',
        uptime: '到账速度',
      },
      features: {
        badge: '为现代化团队打造。',
        description: '从员工 GPS 打卡到加班费自动结算，Dutylix 实现劳动力管理全流程自动化。',
        viewAll: '探索解决方案',
        items: {
          reasoning: {
            title: '自动考勤记录',
            desc: '智能地理围栏与生物特征验证，系统在员工到达指定区域时自动记录出勤，无需手动干预。',
          },
          dist: {
            title: '加班自动结算',
            desc: '基于当地劳动法自动识别加班时长。秒级完成加班系数计算并计入下月薪资发放流。',
          },
          security: {
            title: '管理员控制台',
            desc: '全方位的管理后台，实时监控团队分布位置、考勤状态及工作效率。',
          },
          multimodal: {
            title: '多维统计洞察',
            desc: '深度分析人力成本、缺勤趋势及各项目用工产出，助力企业精细化管理。',
          },
          cli: {
            title: '员工自助移动端',
            desc: '简洁的员工 APP，支持高精度定位打卡、查看电子工资单及在线请假申请。',
          },
          scaling: {
            title: '全球合规基础',
            desc: '覆盖 150+ 国家，自动适配异地税务及劳动法规冲突，确保企业运营无风险。',
          },
        },
      },
      cta: {
        title: '立即开启高效团队管理。',
        description: '加入数千家正在使用 Dutylix 优化运营的企业。实现实时考勤、薪资发放零差错。',
        getStarted: '咨询专家',
        contact: '查看定价',
      },
      footer: {
        desc: '领先的智能考勤管理与劳动力自动化薪酬平台。',
        product: '解决方案',
        company: '资源',
        follow: '关注我们',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. 版权所有。',
        links: {
          payroll: '自动薪酬',
          attendance: 'GPS 考勤',
          tax: '税务合规',
          employee: '员工 APP',
          pricing: '价格',
          integrations: '集成',
          support: '支持',
          docs: '文档',
          privacy: '隐私政策',
          terms: '服务条款',
          compliance: '合规中心'
        },
        certifications: {
          soc2: 'SOC2 TYPE II 认证',
          gdpr: '符合 GDPR 标准'
        }
      },
      dashboard: {
        payout: '薪资预备',
        status: '考勤已验证',
        employee: '员工姓名',
        location: '位置状态',
        hours: '今日工时',
        overtime: '检测到加班',
        gpsActive: 'GPS 追踪激活',
        adminView: '管理员控制面板',
        autoCalc: '自动计算薪酬...',
        scenes: {
          clockIn: '移动端打卡',
          records: '考勤记录',
          payroll: '加班薪酬',
          sop: 'SOP 分发'
        },
        sceneTitles: {
          s1: 'GPS 验证打卡',
          s2: '实时考勤监控',
          s3: '自动加班计算',
          s4: 'SOP 与任务分发'
        },
        sceneDescs: {
          s1: '员工通过高精度 GPS 地理围栏打卡。记录不可篡改且实时同步。',
          s2: '经理通过全球统一控制中心实时监控团队分布和出勤。',
          s3: '薪酬引擎自动比对考勤与劳动法，精准计算加班工资。',
          s4: '直接向特定团队或角色推送标准作业程序 (SOP) 和安全指南。'
        }
      }
    },
  },
  zht: {
    translation: {
      nav: {
        features: '解決方案',
        about: '移動端APP下載',
        docs: '關於我們',
        waitlist: '立即使用',
      },
      hero: {
        badge: '智能化勞動力管理平台',
        title: 'DUTYLIX考勤與薪酬自動運行',
        description: '海外企業管理考勤、自動化薪酬並發放、確保 150 多個國家全球稅務合規的一站式平台。',
        getStarted: '預約演示',
        watchDemo: '查看平台',
        initializing: '正在連接全球支付網絡...',
      },
      about_section: {
        badge: '我們的使命',
        title: '遇見重塑工作的思想者。',
        description: 'Dutylix 誕生於全球創新的核心，旨在消除人類潛能與運營複雜性之間的隔閡。我們相信，距離不應成為追求卓越的障礙。',
        founder: {
          label: '創始人兼首席執行官',
          name: 'Gary Zhan (詹先生)',
          bio: '一位在全球勞動力動態和自動化技術領域擁有深厚素養的遠見領袖。詹先生創立 Dutylix，旨在為出海企業提供無畏擴張所需的工具。'
        },
        team: {
          title: '全球基因，本土情懷。',
          desc: '我們的團隊由來自 15 個以上的國家的專家組成，匯聚了豐富的多元視角，致力於解決全球最具挑戰性的勞動合規和薪酬問題。'
        },
        office: {
          title: '創新之源。',
          desc: '從硅谷的设计工作室到新加坡和蘇黎世的工程樞紐，我們打造的產品正為未來的工作方式設定標準。'
        }
      },
      stats: {
        throughput: '覆蓋國家',
        latency: '支持幣種',
        precision: '合規準確率',
        uptime: '到帳速度',
      },
      features: {
        badge: '專為全球團隊打造。',
        description: '藉助 Dutylix 的自動化勞動力引擎，消除國際運營的複雜性。',
        viewAll: '探索解決方案',
        items: {
          reasoning: {
            title: '自動化考勤',
            desc: '針對全球遠程和現場團隊的智能地理圍欄和生物特徵驗證，直接集成當地勞動法。',
          },
          dist: {
            title: '全球薪酬發放',
            desc: '立即以當地貨幣向您的團隊發放薪水。我們處理結匯、銀行費用和國際轉帳。',
          },
          security: {
            title: '稅務與合規',
            desc: '根據當地管轄規則實時計算並自動申報稅務和社保繳納情況。',
          },
          multimodal: {
            title: '洞察統計',
            desc: '可視化儀表板，展示每個地區的勞動力間接費用、加班跟踪和生產力指標。',
          },
          cli: {
            title: '數字確認',
            desc: '無紙化工資條和每筆交易的安全數字確認，可在任何移動設備上訪問。',
          },
          scaling: {
            title: '全球合規基礎',
            desc: '覆蓋 150+ 國家，自動適配異地稅務及勞動法規衝突，確保企業運營無風險。',
          },
        },
      },
      cta: {
        title: '全球擴張不再有壓力。',
        description: '加入成千上萬使用 Dutylix 管理全球團隊的企業。今天就開始擴展您的勞動力。',
        getStarted: '諮詢專家',
        contact: '查看定價',
      },
      footer: {
        desc: '全球勞動力管理和自動化薪酬的領先平台。',
        product: '解決方案',
        company: '資源',
        follow: '關注我們',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. 版權所有。',
        links: {
          payroll: '全球薪資',
          attendance: '考勤專業版',
          tax: '稅務合規',
          employee: '員工應用',
          pricing: '價格',
          integrations: '集成',
          support: '支持',
          docs: '文檔',
          privacy: '隱私政策',
          terms: '使用條款',
          compliance: '合規中心'
        },
        certifications: {
          soc2: '通過 SOC2 TYPE II 認證',
          gdpr: '符合 GDPR 標準'
        }
      },
      dashboard: {
        payout: '即時支付',
        status: '已確認並驗證',
        employee: '員工姓名',
        location: '地點狀態',
        hours: '本日工時',
        overtime: '系統識別加班',
        gpsActive: 'GPS 實時定位中',
        adminView: '管理員控制面板',
        autoCalc: '自動計算薪資中...',
        scenes: {
          clockIn: '移動端打卡',
          records: '考勤記錄監控',
          payroll: '加班薪酬計算',
          sop: 'SOP 標準下發'
        },
        sceneTitles: {
          s1: '高精度 GPS 驗證打卡',
          s2: '管理員實時考勤監控',
          s3: '智能化加班薪酬結算',
          s4: 'SOP 標準作業程序分發'
        },
        sceneDescs: {
          s1: '員工通過高精度地理圍欄打卡，記錄實時上傳，防作弊且不可篡改。',
          s2: '管理員在後台一鍵查看全球員工分佈、實時出勤狀態及地理位置軌跡。',
          s3: '根據當地勞動法自動計算加班時長與階梯薪資，確保發放零差錯。',
          s4: '針對不同崗位和職級下發標準作業指導書 (SOP)，確保流程合規與安全。'
        }
      }
    },
  },
  th: {
    translation: {
      nav: {
        features: 'โซลูชัน',
        about: 'ดาวน์โหลดแอปมือถือ',
        docs: 'เกี่ยวกับเรา',
        waitlist: 'ใช้งานทันที',
      },
      about_section: {
        badge: 'พันธกิจของเรา',
        title: 'พบกับผู้ที่กำหนดนิยามใหม่ของการทำงาน',
        description: 'Dutylix ถือกำเนิดขึ้นท่ามกลางนวัตกรรมระดับโลก โดยก่อตั้งขึ้นเพื่อเชื่อมช่องว่างระหว่างศักยภาพของมนุษย์และความซับซ้อนในการดำเนินงาน เราเชื่อว่าระยะทางไม่ควรเป็นอุปสรรคต่อความเป็นเลิศ',
        founder: {
          label: 'ผู้ก่อตั้งและซีอีโอ',
          name: 'Gary Zhan',
          bio: 'ผู้นำที่มีวิสัยทัศน์ซึ่งมีรากฐานที่ลึกซึ้งในด้านพลวัตของแรงงานระดับโลกและเทคโนโลยีระบบอัตโนมัติ Gary ก่อตั้ง Dutylix เพื่อเสริมศักยภาพให้กับองค์กรต่างประเทศด้วยเครื่องมือที่จำเป็นสำหรับการขยายธุรกิจอย่างมั่นใจ'
        },
        team: {
          title: 'ดีเอ็นเอระดับโลก หัวใจท้องถิ่น',
          desc: 'ทีมงานของเราประกอบด้วยผู้เชี่ยวชาญจากกว่า 15 ประเทศ ผสมผสานมุมมองที่หลากหลายเพื่อแก้ปัญหาการปฏิบัติตามกฎหมายแรงงานและระบบเงินเดือนที่ท้าทายที่สุดในโลก'
        },
        office: {
          title: 'ที่ซึ่งนวัตกรรมดำรงอยู่',
          desc: 'จากสตูดิโอออกแบบในซิลิคอนวัลเลย์ไปจนถึงศูนย์วิศวกรรมในสิงคโปร์และซูริก เราสร้างผลิตภัณฑ์ที่เป็นมาตรฐานสำหรับอนาคตของการทำงาน'
        }
      },
      hero: {
        badge: 'แพลตฟอร์มการจัดการแรงงานระดับโลก',
        title: 'การลงเวลาทำงานและเงินดือน. ทำเรื่องยากให้เป็นเรื่องง่าย.',
        description: 'แพลตฟอร์มครบวงจรสำหรับองค์กรต่างประเทศในการจัดการการลงเวลาทำงาน จ่ายเงินเดือนอัตโนมัติ และรับประกันการปฏิบัติตามกฎภาษีทั่วโลกใน 150+ ประเทศ',
        getStarted: 'จองการสาธิต',
        watchDemo: 'ดูแพลตฟอร์ม',
        initializing: 'กำลังเชื่อมต่อช่องทางการชำระเงินทั่วโลก...',
      },
      stats: {
        throughput: 'ประเทศที่ครอบคลุม',
        latency: 'สกุลเงิน',
        precision: 'ความถูกต้องแม่นยำ',
        uptime: 'ความเร็วในการโอน',
      },
      features: {
        badge: 'สร้างมาเพื่อทีมระดับโลก',
        description: 'ขจัดความซับซ้อนของการดำเนินงานระหว่างประเทศด้วยระบบเครื่องยนต์แรงงานอัตโนมัติของ Dutylix',
        viewAll: 'สำรวจโซลูชัน',
        items: {
          reasoning: {
            title: 'การลงเวลาทำงานอัตโนมัติ',
            desc: 'ระบบ Geofencing และการยืนยันตัวตนด้วยไบโอเมตริกซ์ที่ชาญฉลาดสำหรับทีมที่ทำงานทางไกลและหน้างานทั่วโลก รวมเข้ากับกฎหมายแรงงานท้องถิ่นโดยตรง',
          },
          dist: {
            title: 'การจ่ายเงินเดือนทั่วโลก',
            desc: 'จ่ายเงินเดือนให้ทีมของคุณเป็นสกุลเงินท้องถิ่นได้ทันที เราดูแลเรื่องการแลกเปลี่ยนเงินตรา ค่าธรรมเนียมธนาคาร และการโอนเงินระหว่างประเทศ',
          },
          security: {
            title: 'ภาษีและการปฏิบัติตามกฎระเบียบ',
            desc: 'การคำนวณภาษีและเงินสมทบประกันสังคมอัตโนมัติในเวลาจริงตามกฎระเบียบของแต่ละประเทศ',
          },
          multimodal: {
            title: 'สถิติเชิงลึก',
            desc: 'แดชบอร์ดภาพสำหรับค่าใช้จ่ายแรงงาน การติดตามการทำงานล่วงเวลา และเมตริกการผลิตในทุกภูมิภาค',
          },
          cli: {
            title: 'การยืนยันแบบดิจิทัล',
            desc: 'สลิปเงินเดือนแบบไร้กระดาษและการยืนยันแบบดิจิทัลที่ปลอดภัยสำหรับทุกธุรกรรม เข้าถึงได้จากสมาร์ทโฟนทุกเครื่อง',
          },
          scaling: {
            title: 'โครงสร้างพื้นฐานที่ปรับสเกลได้',
            desc: 'ตั้งแต่พนักงาน 10 คนไปจนถึง 10,000 คน แพลตฟอร์มของเราเติบโตไปพร้อมกับการขยายตัวระหว่างประเทศของคุณโดยไม่มีภาระการจัดการเพิ่มเติม',
          },
        },
      },
      cta: {
        title: 'ขยายธุรกิจไปทั่วโลกโดยไม่มีความเครียด',
        description: 'เข้าร่วมองค์กรนับพันที่จัดการทีมระดับโลกด้วย Dutylix ขยายแรงงานของคุณวันนี้',
        getStarted: 'ปรึกษาผู้เชี่ยวชาญ',
        contact: 'ดูราคา',
      },
      footer: {
        desc: 'แพลตฟอร์มชั้นนำสำหรับการจัดการแรงงานทั่วโลกและการจ่ายเงินเดือนอัตโนมัติ',
        product: 'โซลูชัน',
        company: 'ทรัพยากร',
        follow: 'ติดตามเรา',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. สงวนลิขสิทธิ์ทั้งหมด',
        links: {
          payroll: 'การจ่ายเงินเดือนทั่วโลก',
          attendance: 'การลงเวลาทำงานโปร',
          tax: 'การปฏิบัติตามภาษี',
          employee: 'แอปสำหรับพนักงาน',
          pricing: 'ราคา',
          integrations: 'การรวมระบบ',
          support: 'การสนับสนุน',
          docs: 'เอกสาร',
          privacy: 'ความเป็นส่วนตัว',
          terms: 'เงื่อนไข',
          compliance: 'การปฏิบัติตามกฎ'
        },
        certifications: {
          soc2: 'การรับรอง SOC2 type II',
          gdpr: 'เป็นไปตาม GDPR'
        }
      },
      dashboard: {
        payout: 'จ่ายทันที',
        status: 'ยืนยันและตรวจสอบแล้ว'
      }
    },
  },
  id: {
    translation: {
      nav: {
        features: 'Solusi',
        about: 'Unduh Aplikasi Seluler',
        docs: 'Dokumentasi API',
        waitlist: 'Use Now',
      },
      hero: {
        badge: 'Platform Manajemen Tenaga Kerja Global',
        title: 'PAYROLL & ABSENSI. JADI MUDAH.',
        description: 'Platform all-in-one untuk perusahaan luar negeri untuk mengelola absensi, otomatisasi payroll, dan memastikan kepatuhan pajak global di 150+ negara.',
        getStarted: 'Pesan Demo',
        watchDemo: 'Lihat Platform',
        initializing: 'Menghubungkan jaringan pembayaran global...',
      },
      stats: {
        throughput: 'Negara Tercover',
        latency: 'Mata Uang',
        precision: 'Akurasi Kepatuhan',
        uptime: 'Kecepatan Bayar',
      },
      features: {
        badge: 'DIBANGUN UNTUK TIM GLOBAL.',
        description: 'Hilangkan kompleksitas operasional internasional dengan mesin tenaga kerja otomatis Dutylix.',
        viewAll: 'Jelajahi Solusi',
        items: {
          reasoning: {
            title: 'Absensi Otomatis',
            desc: 'Geofencing cerdas and verifikasi biometrik untuk tim remote and on-site di seluruh dunia, terintegrasi langsung dengan hukum tenaga kerja lokal.',
          },
          dist: {
            title: 'Pembayaran Global',
            desc: 'Bayar tim Anda dalam mata uang lokal secara instan. Kami menangani konversi, biaya bank, dan transfer internasional.',
          },
          security: {
            title: 'Pajak & Kepatuhan',
            desc: 'Pelaporan pajak otomatis dan kontribusi jaminan sosial dihitung secara real-time sesuai dengan aturan yurisdiksi lokal.',
          },
          multimodal: {
            title: 'Statistik Insightful',
            desc: 'Dashboard visual untuk biaya tenaga kerja, pelacakan lembur, and metrik produktivitas di setiap wilayah.',
          },
          cli: {
            title: 'Konfirmasi Digital',
            desc: 'Slip gaji tanpa kertas dan konfirmasi digital yang aman untuk setiap transaksi, dapat diakses di perangkat seluler apa pun.',
          },
          scaling: {
            title: 'Infrastruktur Scalable',
            desc: 'Dari 10 karyawan hingga 10.000. Platform kami berkembang seiring ekspansi internasional Anda tanpa beban administratif.',
          },
        },
      },
      cta: {
        title: 'GO GLOBAL TANPA STRES.',
        description: 'Bergabunglah dengan ribuan perusahaan yang mengelola tim global mereka dengan Dutylix. Skalakan tenaga kerja Anda hari ini.',
        getStarted: 'Bicara dengan Ahli',
        contact: 'Lihat Harga',
      },
      footer: {
        desc: 'Platform terkemuka untuk manajemen tenaga kerja global dan otomatisasi payroll.',
        product: 'Solusi',
        company: 'Sumber Daya',
        follow: 'Ikuti Kami',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. HAK CIPTA DILINDUNGI.',
        links: {
          payroll: 'Payroll Global',
          attendance: 'Absensi Pro',
          tax: 'Kepatuhan Pajak',
          employee: 'Aplikasi Karyawan',
          pricing: 'Harga',
          integrations: 'Integrasi',
          support: 'Dukungan',
          docs: 'Dokumentasi',
          privacy: 'Privasi',
          terms: 'Ketentuan',
          compliance: 'Kepatuhan'
        },
        certifications: {
          soc2: 'BERSERTIFIKAT SOC2 TYPE II',
          gdpr: 'PATUH GDPR'
        }
      },
      dashboard: {
        payout: 'Pembayaran Instan',
        status: 'Dikonfirmasi & Diverifikasi'
      }
    },
  },
  ms: {
    translation: {
      nav: {
        features: 'Penyelesaian',
        about: 'Muat Turun Aplikasi Mudah Alih',
        docs: 'Dok API',
        waitlist: 'Guna Sekarang',
      },
      hero: {
        badge: 'Platform Pengurusan Tenaga Kerja Global',
        title: 'PAYROLL & KEHADIRAN. DIPERMUDAHKAN.',
        description: 'Platform semua-dalam-satu untuk perusahaan luar negara mengurus kehadiran, mengautomasikan pengurusan gaji, and memastikan pematuhan cukai global di 150+ negara.',
        getStarted: 'Tempah Demo',
        watchDemo: 'Lihat Platform',
        initializing: 'Menghubungkan rangkaian pembayaran global...',
      },
      stats: {
        throughput: 'Negara Diliputi',
        latency: 'Mata Wang',
        precision: 'Ketepatan Pematuhan',
        uptime: 'Kelajuan Pembayaran',
      },
      features: {
        badge: 'DIBINA UNTUK PASUKAN GLOBAL.',
        description: 'Hilangkan kerumitan operasi antarabangsa dengan enjin tenaga kerja automatik Dutylix.',
        viewAll: 'Teroka Penyelesaian',
        items: {
          reasoning: {
            title: 'Kehadiran Automatik',
            desc: 'Geofencing pintar dan pengesan biometrik untuk pasukan jarak jauh dan di tapak di seluruh dunia, disepadukan secara langsung dengan undang-undang buruh tempatan.',
          },
          dist: {
            title: 'Pembayaran Global',
            desc: 'Bayar pasukan anda dalam mata wang tempatan dengan segera. Kami mengendalikan penukaran, yuran bank dan pindahan antarabangsa.',
          },
          security: {
            title: 'Cukai & Pematuhan',
            desc: 'Pemfailan cukai automatik dan sumbangan keselamatan sosial yang dikira dalam masa nyata mengikut peraturan bidang kuasa tempatan.',
          },
          multimodal: {
            title: 'Statistik Berwawasan',
            desc: 'Papan pemuka visual untuk overhed tenaga kerja, penjejakan kerja lebih masa and metrik produktiviti merentas setiap wilayah.',
          },
          cli: {
            title: 'Pengesahan Digital',
            desc: 'Slip gaji tanpa kertas and pengesahan digital yang selamat untuk setiap transaksi, boleh diakses pada mana-mana peranti mudah alih.',
          },
          scaling: {
            title: 'Infrastruktur Bolehskala',
            desc: 'Daripada 10 pekerja kepada 10,000. Platform kami berskala dengan pengembangan antarabangsa anda tanpa overhed pentadbiran.',
          },
        },
      },
      cta: {
        title: 'GO GLOBAL TANPA TEKANAN.',
        description: 'Sertai beribu-ribu perusahaan yang menguruskan pasukan global mereka dengan Dutylix. Skalakan tenaga kerja anda hari ini.',
        getStarted: 'Bincang dengan Pakar',
        contact: 'Lihat Harga',
      },
      footer: {
        desc: 'Platform terkemuka untuk pengurusan tenaga kerja global dan pengurusan gaji automatik.',
        product: 'Penyelesaian',
        company: 'Sumber',
        follow: 'Ikuti Kami',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. SEMUA HAK TERPELIHARA.',
        links: {
          payroll: 'Payroll Global',
          attendance: 'Kehadiran Pro',
          tax: 'Pematuhan Cukai',
          employee: 'Aplikasi Pekerja',
          pricing: 'Harga',
          integrations: 'Integrasi',
          support: 'Sokongan',
          docs: 'Dokumentasi',
          privacy: 'Privasi',
          terms: 'Syarat',
          compliance: 'Pematuhan'
        },
        certifications: {
          soc2: 'DIIKTIRAF SOC2 TYPE II',
          gdpr: 'PATUH GDPR'
        }
      },
      dashboard: {
        payout: 'Pembayaran Segera',
        status: 'Disahkan & Disemak'
      }
    },
  },
  es: {
    translation: {
      nav: {
        features: 'Soluciones',
        about: 'Descargar App Móvil',
        docs: 'Docs API',
        waitlist: 'Usar ahora',
      },
      hero: {
        badge: 'Plataforma de Gestión de Personal Global',
        title: 'NÓMINA Y ASISTENCIA. SIMPLIFICADOS.',
        description: 'La plataforma integral para que las empresas en el extranjero gestionen la asistencia, automaticen la nómina y garanticen el cumplimiento tributario global en más de 150 países.',
        getStarted: 'Reservar Demo',
        watchDemo: 'Ver Plataforma',
        initializing: 'Conectando redes de pago globales...',
      },
      stats: {
        throughput: 'Países Cubiertos',
        latency: 'Monedas',
        precision: 'Precisión de Cumplimiento',
        uptime: 'Velocidad de Pago',
      },
      features: {
        badge: 'CONSTRUIDO PARA EQUIPOS GLOBALES.',
        description: 'Elimine la complejidad de las operaciones internacionales con el motor de personal automatizado de Dutylix.',
        viewAll: 'Explorar Soluciones',
        items: {
          reasoning: {
            title: 'Asistencia Automatizada',
            desc: 'Geocercas inteligentes y verificación biométrica para equipos remotos y presenciales en todo el mundo, integradas con las leyes laborales locales.',
          },
          dist: {
            title: 'Desembolso Global',
            desc: 'Pague a su equipo en su moneda local al instante. Manejamos conversiones, comisiones bancarias y transferencias internacionales.',
          },
          security: {
            title: 'Impuestos y Cumplimiento',
            desc: 'Declaraciones de impuestos automatizadas y contribuciones a la seguridad social calculadas en tiempo real según las normas locales.',
          },
          multimodal: {
            title: 'Estadísticas Perspicaces',
            desc: 'Tableros visuales para gastos de personal, seguimiento de horas extras y métricas de productividad en cada región.',
          },
          cli: {
            title: 'Confirmación Digital',
            desc: 'Recibos de nómina sin papel and confirmación digital segura para cada transacción, accesible en cualquier dispositivo móvil.',
          },
          scaling: {
            title: 'Infraestructura Escalable',
            desc: 'De 10 a 10,000 empleados. Nuestra plataforma escala con su expansión internacional sin gastos administrativos.',
          },
        },
      },
      cta: {
        title: 'GLOBALÍCESE SIN ESTRÉS.',
        description: 'Únase a miles de empresas que gestionan sus equipos globales con Dutylix. Amplíe su personal hoy mismo.',
        getStarted: 'Hablar con un Experto',
        contact: 'Ver Precios',
      },
      footer: {
        desc: 'La plataforma líder para la gestión global de personal y nómina automatizada.',
        product: 'Soluciones',
        company: 'Recursos',
        follow: 'Síguenos',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. TODOS LOS DERECHOS RESERVADOS.',
        links: {
          payroll: 'Nómina Global',
          attendance: 'Asistencia Pro',
          tax: 'Cumplimiento Fiscal',
          employee: 'App de Empleado',
          pricing: 'Precios',
          integrations: 'Integraciones',
          support: 'Soporte',
          docs: 'Documentación',
          privacy: 'Privacia',
          terms: 'Condiciones',
          compliance: 'Cumplimiento'
        },
        certifications: {
          soc2: 'CERTIFICADO SOC2 TYPE II',
          gdpr: 'CUMPLE CON GDPR'
        }
      },
      dashboard: {
        payout: 'Pago Instantáneo',
        status: 'Confirmado y Verificado'
      }
    },
  },
  pt: {
    translation: {
      nav: {
        features: 'Soluções',
        about: 'Descarregar App Móvel',
        docs: 'Docs API',
        waitlist: 'Usar agora',
      },
      hero: {
        badge: 'Plataforma de Gestão de Força de Trabalho Global',
        title: 'FOLHA E PRESENÇA. SIMPLIFICADOS.',
        description: 'A plataforma completa para empresas no exterior gerenciarem assiduidade, automatizarem a folha de pagamento e garantirem conformidade fiscal global em mais de 150 países.',
        getStarted: 'Reservar Demo',
        watchDemo: 'Ver Plataforma',
        initializing: 'Conectando redes de pagamento globais...',
      },
      stats: {
        throughput: 'Países Cobertos',
        latency: 'Moedas',
        precision: 'Precisão de Conformidade',
        uptime: 'Velocidade de Pagamento',
      },
      features: {
        badge: 'CONSTRUÍDO PARA EQUIPES GLOBAIS.',
        description: 'Elimine a complexidade das operações internacionais com o mecanismo de força de trabalho automatizado da Dutylix.',
        viewAll: 'Explorar Soluções',
        items: {
          reasoning: {
            title: 'Presença Automatizada',
            desc: 'Cercas geográficas inteligentes e verificação biométrica para equipes remotas e presenciais em todo o mundo, integradas às leis trabalhistas locais.',
          },
          dist: {
            title: 'Desembolso Global',
            desc: 'Pague sua equipe em sua moeda local instantaneamente. Lidamos com conversões, taxas bancárias e transferências internacionais.',
          },
          security: {
            title: 'Impostos e Conformidade',
            desc: 'Declarações fiscais automatizadas e contribuições para a segurança social calculadas em tempo real de acordo com as regras locais.',
          },
          multimodal: {
            title: 'Estatísticas Perspicazes',
            desc: 'Painéis visuais para despesas de pessoal, rastreamento de horas extras and métricas de produtividade em प्रत्येक região.',
          },
          cli: {
            title: 'Confirmação Digital',
            desc: 'Holerites sem papel and confirmação digital segura para cada transação, acessível em qualquer dispositivo móvel.',
          },
          scaling: {
            title: 'Infrastrutura Escalável',
            desc: 'De 10 a 10.000 funcionários. Nossa plataforma escala com sua expansão internacional sem custos administrativos.',
          },
        },
      },
      cta: {
        title: 'TORNE-SE GLOBAL SEM ESTRESSE.',
        description: 'Junte-se a milhares de empresas que gerenciam suas equipes globais com a Dutylix. Amplie sua força de trabalho hoje.',
        getStarted: 'Falar com Especialista',
        contact: 'Ver Preços',
      },
      footer: {
        desc: 'A plataforma líder para gestão global de força de trabalho e folha de pagamento automatizada.',
        product: 'Soluções',
        company: 'Recursos',
        follow: 'Siga-nos',
        rights: '© 2026 DUTYLIX TECHNOLOGIES. TODOS OS DIREITOS RESERVADOS.',
        links: {
          payroll: 'Folha de Pagamento Global',
          attendance: 'Presença Pro',
          tax: 'Conformidade Fiscal',
          employee: 'App do Funcionário',
          pricing: 'Preços',
          integrations: 'Integrações',
          support: 'Suporte',
          docs: 'Documentação',
          privacy: 'Privacidade',
          terms: 'Termos',
          compliance: 'Conformidade'
        },
        certifications: {
          soc2: 'CERTIFICADO SOC2 TYPE II',
          gdpr: 'ESTÁ EM CONFORMIDADE COM O GDPR'
        }
      },
      dashboard: {
        payout: 'Pagamento Instantâneo',
        status: 'Confirmado e Verificado'
      }
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
