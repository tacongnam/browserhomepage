"use client";
import { useState } from "react";
import { Copy, ExternalLink, CheckCheck } from "lucide-react";
import type { Email } from "@/types";

interface Props {
  email: Email;
  onClick: () => void;
}

export default function EmailCard({ email, onClick }: Props) {
  const [copied, setCopied] = useState(false);
  const isHust = email.sender?.includes("hust.edu.vn");

  const copyOtp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email.otp) return;
    await navigator.clipboard.writeText(email.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = email.isVerification
    ? "border-violet-500"
    : isHust
    ? "border-red-500"
    : "border-blue-500";

  const bgColor = email.isVerification
    ? "bg-violet-500/5 hover:bg-violet-500/10"
    : isHust
    ? "bg-red-500/5 hover:bg-red-500/10"
    : "bg-current/5 hover:bg-current/10";

  const badge = email.isVerification
    ? { label: "OTP/Verify", cls: "text-violet-400 bg-violet-500/10" }
    : isHust
    ? { label: "HUST", cls: "text-red-500 bg-red-500/10" }
    : { label: email.type, cls: "text-blue-500" };

  return (
    <div
      onClick={onClick}
      className={`py-2 px-3 rounded-lg border-l-4 transition cursor-pointer ${borderColor} ${bgColor}`}
    >
      {/* Top row: badge + time */}
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="text-[11px] opacity-50">{email.time}</span>
      </div>

      {/* Sender + subject */}
      <h3 className="text-sm font-semibold truncate leading-tight">{email.sender}</h3>
      <p className="text-[12px] opacity-70 truncate mt-0.5">{email.subject}</p>

      {/* OTP highlight */}
      {email.otp && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5"
        >
          <span className="text-xs text-violet-400 font-medium">Mã OTP:</span>
          <span className="text-base font-bold tracking-[0.3em] text-violet-300 flex-1">
            {email.otp}
          </span>
          <button
            onClick={copyOtp}
            className="p-1 text-violet-400 hover:text-violet-200 transition"
            title="Sao chép mã"
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {/* Magic link highlight */}
      {email.magicLink && !email.otp && (
        <a
          href={email.magicLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5 text-xs text-violet-300 hover:text-violet-100 transition group"
        >
          <ExternalLink size={12} className="flex-none" />
          <span className="truncate flex-1">Mở link xác minh</span>
          <span className="text-[10px] opacity-60 group-hover:opacity-100 transition">→</span>
        </a>
      )}
    </div>
  );
}