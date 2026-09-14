"use client";
import { useState, useEffect } from "react";
import { Plus, X, Link2 } from "lucide-react";
import type { QuickLink, Theme } from "@/types";
import { DEFAULT_QUICK_LINKS, generateId } from "@/lib/utils";

const STORAGE_KEY = "dashboard_quick_links";

// ── Favicon helpers ────────────────────────────────────────────────────────────

function hostnameFromUrl(url: string): string {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; }
  catch { return ""; }
}

/**
 * Google's public favicon service — returns the site's real favicon at 64px.
 * Falls back to a letter avatar if the image errors.
 */
function faviconUrl(url: string): string {
  const host = hostnameFromUrl(url);
  if (!host) return "";
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}

interface FaviconProps {
  url: string;
  label: string;
  size?: number;
}

function Favicon({ url, label, size = 28 }: FaviconProps) {
  const [errored, setErrored] = useState(false);
  const src = faviconUrl(url);
  const letter = label.charAt(0).toUpperCase();

  if (!src || errored) {
    // Letter avatar fallback
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        className="rounded-lg bg-current/10 flex items-center justify-center font-bold opacity-70 flex-none"
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      className="rounded-lg object-contain flex-none"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  theme: Theme;
  cardClass: string;
}

export default function QuickLinks({ cardClass }: Props) {
  const [links, setLinks] = useState<QuickLink[]>(DEFAULT_QUICK_LINKS);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ label: "", url: "" });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setLinks(JSON.parse(stored) as QuickLink[]); } catch { /* ignore */ }
    }
  }, []);

  const save = (updated: QuickLink[]) => {
    setLinks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim()) return;
    const url = form.url.startsWith("http") ? form.url : `https://${form.url}`;
    save([...links, { id: generateId(), label: form.label, url }]);
    setForm({ label: "", url: "" });
    setIsAdding(false);
  };

  const removeLink = (id: string) => save(links.filter((l) => l.id !== id));

  return (
    <div className={`${cardClass} p-3.5 lg:p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-sky-500">
        <div className="flex items-center gap-2">
          <Link2 size={16} />
          <h2 className="font-semibold text-sm tracking-wide">Truy cập nhanh</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 rounded-lg transition"
          title="Thêm liên kết"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Grid — 4 cols on mobile, up to 8 on wider */}
      <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-1">
        {links.map((link) => (
          <div key={link.id} className="group relative">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-current/10 transition"
            >
              <Favicon url={link.url} label={link.label} size={28} />
              <span className="text-[10px] font-medium opacity-60 truncate w-full text-center leading-none">
                {link.label}
              </span>
            </a>
            {/* Remove button */}
            <button
              onClick={() => removeLink(link.id)}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full
                         opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-10"
            >
              <X size={9} />
            </button>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-sm p-5 relative`}>
            <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
            <h3 className="text-sm font-semibold mb-4 text-sky-500">Thêm liên kết nhanh</h3>
            <form onSubmit={addLink} className="space-y-3">
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Tên (VD: YouTube)"
                className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                autoFocus
              />
              <div className="flex gap-2 items-center">
                {/* Live favicon preview */}
                {form.url && (
                  <Favicon url={form.url} label={form.label || "?"} size={28} />
                )}
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="URL (VD: youtube.com)"
                  className="flex-1 bg-current/5 border border-current/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}