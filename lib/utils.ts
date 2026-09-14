import type { TimeOfDay, Email } from "@/types";

// ─── Time-of-day ──────────────────────────────────────────────────────────────

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

// ─── Dynamic Reminder System ──────────────────────────────────────────────────

const REMINDERS: Record<TimeOfDay, string[]> = {
  morning: [
    "☀️ Buổi sáng tốt lành! Uống một ly nước trước khi làm việc.",
    "🧘 Dành 5 phút thiền định — não bộ sẽ hoạt động hiệu quả hơn cả ngày.",
    "📋 Hôm nay bạn đã lên kế hoạch chưa? Viết ra 3 việc quan trọng nhất.",
    "🌿 Ăn sáng đầy đủ, đừng bỏ bữa — năng lượng đến từ bên trong.",
    "🚿 Một buổi sáng có kỷ luật tạo nên cả ngày có kỷ luật.",
  ],
  afternoon: [
    "💧 Đã đến giờ uống nước — bạn có nhớ lần cuối chưa?",
    "🪴 Đứng dậy, vươn vai 30 giây. Cột sống cảm ơn bạn.",
    "🎯 Chiều rồi — kiểm tra lại danh sách công việc, bạn đã làm được gì?",
    "🍱 Ăn trưa đúng giờ, đừng để não bị 'lag' vì thiếu glucose.",
    "🔋 Mệt thì nghỉ 10 phút thôi — đừng cố làm khi não đã cạn pin.",
  ],
  evening: [
    "🌅 Sắp hết ngày — review lại những gì đã làm được hôm nay.",
    "📵 Hạn chế màn hình sau 9 giờ tối để ngủ sâu hơn.",
    "🛁 Tắm nước ấm giúp hạ nhiệt cơ thể và dễ vào giấc ngủ.",
    "📖 Đọc sách 20 phút trước khi ngủ thay vì lướt mạng.",
    "✅ Chuẩn bị sẵn checklist cho ngày mai — bắt đầu nhanh hơn.",
  ],
  night: [
    "🌙 Khuya rồi — cơ thể cần nghỉ ngơi để phục hồi.",
    "😴 Ngủ đủ 7–8 tiếng là đầu tư tốt nhất cho năng suất ngày mai.",
    "🧠 Não bộ xử lý ký ức khi bạn ngủ — đừng tước đoạt cơ hội đó.",
    "🚫 Tránh caffeine sau 3 giờ chiều để không bị mất ngủ.",
    "💙 Hãy nhớ: nghỉ ngơi không phải lười biếng, đó là chiến lược.",
  ],
};

export function getDynamicReminder(date: Date = new Date()): string {
  const tod = getTimeOfDay(date);
  const pool = REMINDERS[tod];
  // Rotate by minute so it changes periodically but feels stable
  const idx = Math.floor(date.getMinutes() / 15) % pool.length;
  return pool[idx];
}

// ─── OTP / Magic-Link Extractor ───────────────────────────────────────────────

/**
 * Ordered from most-specific to least-specific.
 * Each pattern must capture the digit sequence in group 1.
 *
 * Covers patterns like:
 *   "Your code is 123456"
 *   "Mã xác nhận: 8821"
 *   "G-123456 is your Google verification code"
 *   "Sign-in code: 291 748"          ← spaced 6-digit
 *   "Use 7823 to verify"
 *   "OTP: 4421"
 *   "[AppName] 123456"               ← subject-only pattern
 */
const OTP_PATTERNS: RegExp[] = [
  // Explicit keyword right before digits (vi/en mixed)
  /(?:mã(?:\s*(?:xác\s*(?:minh|nhận)|otp|pin|đăng\s*nhập))?|code|otp|pin|passcode|sign[\s-]in code|verification code|confirm(?:ation)? code|security code)[^\d]{0,30}(\d[\d\s]{3,10}\d)/i,

  // "G-123456" style (Google, Twitch, etc.)
  /\b[A-Z]-(\d{6})\b/,

  // Digits surrounded by whitespace/punctuation, near keyword within 60 chars
  /(?:is|:|-|–)\s*(\d[\d\s]{2,9}\d)\b(?=.{0,80}(?:code|verify|xác minh|sign in|log in|otp|mã))/i,
  /(?:code|verify|xác minh|sign in|log in|otp|mã).{0,60}?(?<!\d)(\d[\d\s]{2,9}\d)(?!\d)/i,

  // Fallback: any standalone 4–8 digit sequence in a verification email
  /(?<!\d)(\d{4,8})(?!\d)/,
];

const MAGIC_LINK_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s"<>]+(?:verify|confirm|activate|magic[-_]?link|signin|sign-in|auth|login|token)[^\s"<>]*/gi,
  /https?:\/\/[^\s"<>]+[?&]token=[^\s"<>&"]{8,}[^\s"<>]*/gi,
];

const VERIFICATION_SUBJECT_PATTERNS: RegExp[] = [
  /\b(otp|verify|verification|confirm|sign.?in code|sign.?in link|login code|mã xác|kích hoạt|đăng nhập|xác minh|passcode|one.?time|security code|your code|access code)\b/i,
];

export function extractEmailVerificationData(
  subject: string,
  snippet: string = ""
): Pick<Email, "otp" | "magicLink" | "isVerification"> {
  const combined = `${subject} ${snippet}`;
  const combinedLower = combined.toLowerCase();

  // Step 1: is this a verification email?
  const isVerification =
    VERIFICATION_SUBJECT_PATTERNS.some((p) => p.test(combined)) ||
    /\b\d{4,8}\b/.test(subject); // subject-only: bare digit code is strong signal

  if (!isVerification) return {};

  // Step 2: extract OTP — try each pattern, normalise spaces out of matched digits
  let otp: string | undefined;
  for (const pattern of OTP_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(combined);
    if (match?.[1]) {
      const digits = match[1].replace(/\s/g, "");
      // Sanity: 4–8 digits, not a year-like number that's probably a date
      if (/^\d{4,8}$/.test(digits) && !/^(19|20)\d{2}$/.test(digits)) {
        otp = digits;
        break;
      }
    }
  }

  // Step 3: extract magic link
  let magicLink: string | undefined;
  for (const pattern of MAGIC_LINK_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combined.match(pattern);
    if (matches?.[0]) { magicLink = matches[0]; break; }
  }

  return { otp, magicLink, isVerification: true };
}

// ─── Default Quick Links ──────────────────────────────────────────────────────

import type { QuickLink } from "@/types";

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: "yt",      label: "YouTube",  url: "https://youtube.com"  },
  { id: "gh",      label: "GitHub",   url: "https://github.com"   },
  { id: "reddit",  label: "Reddit",   url: "https://reddit.com"   },
  { id: "threads", label: "Threads",  url: "https://threads.net"  },
  { id: "fb",      label: "Facebook", url: "https://facebook.com" },
  { id: "twitch",  label: "Twitch",   url: "https://twitch.tv"    },
  { id: "x",       label: "X",        url: "https://x.com"        },
  { id: "notion",  label: "Notion",   url: "https://notion.so"    },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function isTodayOrFuture(dayOfMonth: number, month: number, year: number): boolean {
  const today = new Date();
  const target = new Date(year, month, dayOfMonth);
  today.setHours(0, 0, 0, 0);
  return target >= today;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}