import type {EmployeeProfile, MobileLoginResponse} from '../../features/auth/types';
import type {
  EmployeeNotification,
  EmployeeNotificationListResult,
  MobileHomeSummary,
  TodayAttendanceStatus,
} from '../../features/attendance/types';
import type {MobilePayrollResultDetail} from '../../features/payroll/types';
import type {SopDocument} from '../../features/sop/types';

const SCREENSHOT_TOKEN = 'wmshr-screenshot-token';
const SCREENSHOT_EMPLOYEE: EmployeeProfile = {
  id: 16,
  employeeNo: 'MWS0016',
  name: 'Lina Chen',
  country: 'Thailand',
  phone: '+66 89 550 1628',
  role: 'Warehouse Coordinator',
  dept: 'Inbound Operations',
  photo: null,
  status: 'active',
};

const SCREENSHOT_NOTIFICATIONS: EmployeeNotification[] = [
  {
    id: 9001,
    type: 'payroll_confirmed',
    title: 'Payroll confirmed for May 2026',
    content: 'Your May payroll result has been reviewed and confirmed. Tap to view the full payslip details.',
    bizId: 501,
    bizMonth: '2026-05',
    readAt: null,
    createdAt: '2026-06-01T09:20:00Z',
  },
  {
    id: 9002,
    type: 'payroll_confirmed',
    title: 'Night shift allowance updated',
    content: 'Your final overtime and night shift allowance have been added to the confirmed May payroll result.',
    bizId: 501,
    bizMonth: '2026-05',
    readAt: '2026-06-01T10:15:00Z',
    createdAt: '2026-05-30T14:05:00Z',
  },
  {
    id: 9003,
    type: 'payroll_confirmed',
    title: 'Attendance exception cleared',
    content: 'The late clock-in exception from May 18 has been reviewed and cleared by your supervisor.',
    bizId: 501,
    bizMonth: '2026-05',
    readAt: '2026-05-29T11:10:00Z',
    createdAt: '2026-05-29T10:30:00Z',
  },
];

const SCREENSHOT_HOME_SUMMARY: MobileHomeSummary = {
  yearMonth: '2026-05',
  monthHours: 182.5,
  attendanceDays: 23,
  pendingSopCount: 2,
  unreadNotificationCount: 1,
  notifications: SCREENSHOT_NOTIFICATIONS,
};

const SCREENSHOT_TODAY_STATUS: TodayAttendanceStatus = {
  date: '2026-06-13',
  status: 'checked_in',
  checkInTime: '08:56',
  checkOutTime: null,
  locationName: 'Bangna Logistics Park · Gate A',
  locationAccuracy: 18,
  canCheckIn: false,
  canCheckOut: true,
  requiresDescriptionInWorkTime: false,
  warning: undefined,
};

const SCREENSHOT_PAYROLL_DETAIL: MobilePayrollResultDetail = {
  result: {
    id: 501,
    employeeId: 16,
    employeeNo: 'MWS0016',
    employeeName: 'Lina Chen',
    employeeDept: 'Inbound Operations',
    employeeRole: 'Warehouse Coordinator',
    yearMonth: '2026-05',
    salaryType: 'fixed',
    fixedSalary: 28500,
    hourlyRate: null,
    currency: 'THB',
    effectiveAttendanceDays: 23,
    mealAllowanceDayUnits: 22,
    mealAllowanceTotal: 1760,
    attendanceBonusAmount: 1200,
    validHours: 182.5,
    standardHours: 176,
    hourlyPay: 0,
    overtimePayHours: 6.5,
    overtimePay: 1450,
    allowanceTotal: 800,
    deductionTotal: 320,
    otherTotal: 0,
    socialSecurityAmount: 750,
    serviceFeeAmount: 285,
    grossPay: 33995,
    totalDeduction: 1070,
    netPay: 32925,
    calculationStatus: 'confirmed',
    reviewStatus: 'approved',
    blockedReason: null,
    calculatedAt: '2026-05-31T16:45:00Z',
    confirmedAt: '2026-06-01T09:00:00Z',
    createdAt: '2026-05-31T16:40:00Z',
    updatedAt: '2026-06-01T09:00:00Z',
  },
  employee: {
    id: 16,
    employeeNo: 'MWS0016',
    name: 'Lina Chen',
    role: 'Warehouse Coordinator',
    dept: 'Inbound Operations',
    salaryType: 'fixed',
    hourlyRate: null,
    fixedSalary: 28500,
    attendanceBonus: 1200,
    socialSecurity: 750,
    mealAllowance: 80,
    serviceFeeRate: 1,
    currency: 'THB',
    photo: null,
  },
  salaryProfile: {
    id: 61,
    employeeId: 16,
    salaryType: 'fixed',
    fixedSalary: 28500,
    hourlyRate: null,
    serviceFeeRate: 1,
    currency: 'THB',
    effectiveStartDate: '2026-01-01',
    effectiveEndDate: null,
  },
  attendanceSummary: {
    yearMonth: '2026-05',
    totalValidHours: 182.5,
    totalStandardHours: 176,
    totalOvertimePayHours: 6.5,
    exceptionCount: 0,
    blockedReason: null,
  },
  dailyStandardHours: 8,
  adjustmentItems: [
    {
      id: 1,
      employeeId: 16,
      yearMonth: '2026-05',
      type: 'allowance',
      name: 'Night shift allowance',
      amount: 800,
      note: '4 shifts',
    },
    {
      id: 2,
      employeeId: 16,
      yearMonth: '2026-05',
      type: 'deduction',
      name: 'Uniform replacement',
      amount: 320,
      note: 'one-time',
    },
  ],
  exceptionDetails: [],
};

const SCREENSHOT_SOPS: SopDocument[] = [
  {
    id: '301',
    title: 'Forklift pre-shift safety inspection',
    version: 'v2.3',
    updatedAt: '2026-06-10',
    readStatus: 'unread',
    content:
      '<p>Before each shift, inspect brakes, horn, warning lights, forks, and battery status. Record issues immediately and stop operation if any critical item fails inspection.</p><p>Wear your reflective vest and confirm the aisle is clear before moving loaded pallets.</p>',
    attachments: [
      {
        name: 'Inspection checklist',
        url: 'https://example.com/sop-checklist.pdf',
        size: 'PDF · 1.2 MB',
      },
    ],
  },
  {
    id: '302',
    title: 'Inbound pallet labeling standard',
    version: 'v1.9',
    updatedAt: '2026-06-05',
    readStatus: 'read',
    readAt: '2026-06-06T10:20:00Z',
    content:
      '<p>Apply the inbound label to the upper-right corner of each pallet wrap. Confirm SKU, batch number, and destination zone before staging.</p>',
    attachments: [],
  },
  {
    id: '303',
    title: 'Cold-chain loading checklist',
    version: 'v1.4',
    updatedAt: '2026-05-28',
    readStatus: 'read',
    readAt: '2026-05-29T09:00:00Z',
    content:
      '<p>Verify trailer temperature, seal integrity, and pallet wrapping before dispatch. Escalate any mismatch immediately.</p>',
    attachments: [],
  },
];

function createLoginResponse(account: string): MobileLoginResponse {
  return {
    token: SCREENSHOT_TOKEN,
    expiresAt: '2027-06-13T08:00:00Z',
    employee: {
      ...SCREENSHOT_EMPLOYEE,
      employeeNo: account.trim().toUpperCase() || SCREENSHOT_EMPLOYEE.employeeNo,
    },
  };
}

function parsePath(input: string) {
  const baseUrl = 'https://wmshr-screenshots.local';
  const url = new URL(input.startsWith('/') ? `${baseUrl}${input}` : input, baseUrl);
  return {
    pathname: url.pathname,
    searchParams: url.searchParams,
  };
}

export function getScreenshotSession() {
  return {
    accessToken: SCREENSHOT_TOKEN,
    expiresAt: '2027-06-13T08:00:00Z',
    employee: SCREENSHOT_EMPLOYEE,
  };
}

export async function handleScreenshotRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = String(init?.method || 'GET').toUpperCase();
  const {pathname, searchParams} = parsePath(path);

  if (pathname === '/api/mobile/auth/login' && method === 'POST') {
    const payload = JSON.parse(String(init?.body || '{}')) as {account?: string; password?: string};
    if (!payload.account?.trim() || !payload.password?.trim()) {
      throw new Error('Please enter employee account and password');
    }
    return createLoginResponse(payload.account) as T;
  }

  if (pathname === '/api/mobile/auth/me' && method === 'GET') {
    return {employee: SCREENSHOT_EMPLOYEE} as T;
  }

  if (pathname === '/api/mobile/attendance/today' && method === 'GET') {
    return SCREENSHOT_TODAY_STATUS as T;
  }

  if (pathname === '/api/mobile/attendance/check-in' && method === 'POST') {
    return {
      ...SCREENSHOT_TODAY_STATUS,
      status: 'checked_in',
      canCheckIn: false,
      canCheckOut: true,
    } as T;
  }

  if (pathname === '/api/mobile/attendance/check-out' && method === 'POST') {
    return {
      ...SCREENSHOT_TODAY_STATUS,
      status: 'checked_out',
      checkOutTime: '18:07',
      canCheckOut: false,
    } as T;
  }

  if (pathname === '/api/mobile/attendance/location' && method === 'POST') {
    const payload = JSON.parse(String(init?.body || '{}')) as {locationName?: string};
    return {
      ...SCREENSHOT_TODAY_STATUS,
      locationName: payload.locationName || SCREENSHOT_TODAY_STATUS.locationName,
    } as T;
  }

  if (pathname === '/api/mobile/home/summary' && method === 'GET') {
    return SCREENSHOT_HOME_SUMMARY as T;
  }

  if (pathname === '/api/mobile/notifications' && method === 'GET') {
    const limit = Number(searchParams.get('limit') || SCREENSHOT_NOTIFICATIONS.length);
    const offset = Number(searchParams.get('offset') || 0);
    const items = SCREENSHOT_NOTIFICATIONS.slice(offset, offset + limit);
    const result: EmployeeNotificationListResult = {
      items,
      total: SCREENSHOT_NOTIFICATIONS.length,
      limit,
      offset,
    };
    return result as T;
  }

  if (/^\/api\/mobile\/notifications\/\d+\/read$/.test(pathname) && method === 'POST') {
    const id = Number(pathname.split('/')[4]);
    const nextItem = SCREENSHOT_NOTIFICATIONS.find((item) => item.id === id);
    if (!nextItem) {
      throw new Error('Notification not found');
    }
    return {
      ...nextItem,
      readAt: '2026-06-13T09:15:00Z',
    } as T;
  }

  if (/^\/api\/mobile\/payroll-results\/\d+$/.test(pathname) && method === 'GET') {
    return SCREENSHOT_PAYROLL_DETAIL as T;
  }

  if (pathname === '/api/mobile/sops' && method === 'GET') {
    const keyword = String(searchParams.get('keyword') || '').trim().toLowerCase();
    const limit = Number(searchParams.get('limit') || SCREENSHOT_SOPS.length);
    const offset = Number(searchParams.get('offset') || 0);
    const filtered = keyword
      ? SCREENSHOT_SOPS.filter((item) => item.title.toLowerCase().includes(keyword))
      : SCREENSHOT_SOPS;
    return filtered.slice(offset, offset + limit) as T;
  }

  if (/^\/api\/mobile\/sops\/[^/]+$/.test(pathname) && method === 'GET') {
    const sopId = pathname.split('/').pop() || '';
    const nextDocument = SCREENSHOT_SOPS.find((item) => item.id === sopId);
    if (!nextDocument) {
      throw new Error('SOP not found');
    }
    return nextDocument as T;
  }

  if (/^\/api\/mobile\/sops\/[^/]+\/read$/.test(pathname) && method === 'POST') {
    const sopId = pathname.split('/')[4] || '';
    const nextDocument = SCREENSHOT_SOPS.find((item) => item.id === sopId);
    if (!nextDocument) {
      throw new Error('SOP not found');
    }
    return {
      ...nextDocument,
      readStatus: 'read',
      readAt: '2026-06-13T09:20:00Z',
    } as T;
  }

  throw new Error(`Unhandled screenshot mock request: ${method} ${pathname}`);
}
