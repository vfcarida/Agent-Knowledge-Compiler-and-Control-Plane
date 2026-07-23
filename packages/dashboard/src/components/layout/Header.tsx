/**
 * @module components/layout/Header
 * @description Header containing the folder selector and active candidate status.
 */

import { useRef } from "react";
import { FolderOpen, AlertTriangle } from "lucide-react";
import type { CareerBundleData } from "../../types/career.js";
import { useAuth } from "../../contexts/AuthContext.js";

interface HeaderProps {
  data: CareerBundleData | null;
  loading: boolean;
  error: string | null;
  loadFromFiles: (files: File[]) => Promise<void>;
  loadFromDirectory: (dirHandle: FileSystemDirectoryHandle) => Promise<void>;
}

export function Header({
  data,
  loading,
  error,
  loadFromFiles,
  loadFromDirectory,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, login, logout } = useAuth();

  // Handle Directory Picker selection (Chrome/Edge/Opera supported)
  const handleDirectoryPicker = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const handle = await (window as any).showDirectoryPicker();
        await loadFromDirectory(handle);
      } else {
        // Fallback to legacy file input triggering
        fileInputRef.current?.click();
      }
    } catch (err) {
      console.error("[Header] Directory picker cancelled or failed:", err);
    }
  };

  // Handle fallback file input change
  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Convert FileList to array
      await loadFromFiles(Array.from(files));
    }
  };

  const getPreferencesSummary = () => {
    if (!data?.preferences || data.preferences.length === 0)
      return "No profile loaded";
    const pref = data.preferences[0];
    const roles = pref?.roles?.join(", ") || "Developer";
    const remoteStr = pref?.remote ? "Remote" : "On-Site";
    return `${roles} (${remoteStr})`;
  };

  return (
    <header className="h-20 border-b border-dark-border bg-black/20 flex items-center justify-between px-10 backdrop-blur-md">
      {/* Profile Overview */}
      <div className="flex items-center gap-3">
        {data ? (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {getPreferencesSummary()}
              </p>
              <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
                Bundle Location: Local .okf/ folder parsed successfully
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-zinc-400">
                Waiting for Career Bundle...
              </p>
              <p className="text-[11px] text-zinc-500 font-medium">
                Load your local .okf directory to start orchestrating
              </p>
            </div>
          </>
        )}
      </div>

      {/* Loading & Folder Selector Actions */}
      <div className="flex items-center gap-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-950/20 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-lg max-w-sm overflow-hidden text-ellipsis whitespace-nowrap">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Hidden inputs for directory selector fallback */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
        />

        {/* Mock Auth UI */}
        <div className="flex items-center gap-2 border-r border-dark-border pr-4 mr-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-semibold text-zinc-200">
                  {user.name}
                </p>
                <p className="text-[10px] text-zinc-500">{user.identity}</p>
              </div>
              <button
                onClick={logout}
                className="text-xs bg-dark-bg border border-dark-border px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => login("admin@corp.com", "Admin User", "admin")}
              className="text-xs bg-dark-border border border-zinc-700 px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-300"
            >
              Simulate Login
            </button>
          )}
        </div>

        <button
          onClick={handleDirectoryPicker}
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            loading
              ? "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
              : "bg-neon-indigo hover:bg-neon-indigo/90 border border-neon-indigo/30 text-white shadow-lg shadow-neon-indigo/20"
          }`}
        >
          <FolderOpen className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Parsing Bundle..." : "Select .okf Folder"}
        </button>
      </div>
    </header>
  );
}
