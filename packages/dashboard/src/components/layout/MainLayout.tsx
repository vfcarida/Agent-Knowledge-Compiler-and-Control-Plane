/**
 * @module components/layout/MainLayout
 * @description Master layout wrapper coordinating Sidebar, Header, and Page Content.
 */

import React from "react";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import type { CareerBundleData } from "../../types/career.js";

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  data: CareerBundleData | null;
  loading: boolean;
  error: string | null;
  loadFromFiles: (files: File[]) => Promise<void>;
  loadFromDirectory: (dirHandle: FileSystemDirectoryHandle) => Promise<void>;
}

export function MainLayout({
  children,
  currentTab,
  setCurrentTab,
  data,
  loading,
  error,
  loadFromFiles,
  loadFromDirectory,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-bg font-sans text-zinc-100 selection:bg-neon-indigo/30 selection:text-indigo-200">
      {/* Sidebar navigation and statistics */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        data={data}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating gradient orb in background */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-neon-indigo/10 blur-[150px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-neon-blue/5 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Global Action Header */}
        <Header
          data={data}
          loading={loading}
          error={error}
          loadFromFiles={loadFromFiles}
          loadFromDirectory={loadFromDirectory}
        />

        {/* Dynamic Page Router container */}
        <main className="flex-1 overflow-y-auto p-10">{children}</main>
      </div>
    </div>
  );
}
