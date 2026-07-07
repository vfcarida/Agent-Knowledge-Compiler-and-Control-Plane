/**
 * @module App
 * @description Master entrypoint and router dashboard component.
 */

import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout.js';
import { KanbanBoard } from './components/kanban/KanbanBoard.js';
import { KnowledgeGraph } from './components/knowledge-graph/KnowledgeGraph.js';
import { ChangeHistory } from './components/logs/ChangeHistory.js';
import { useOKFData } from './hooks/use-okf-data.js';
import { FolderOpen, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('kanban');
  const { data, loading, error, loadFromFiles, loadFromDirectory } = useOKFData();

  // Handle Directory Picker selection
  const handleDirectoryPicker = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker();
        await loadFromDirectory(handle);
      } else {
        alert('Directory Picker is only supported in modern Chromium browsers. Try drag-dropping or select directory via input.');
      }
    } catch (err) {
      console.error('[App] Directory picker cancelled or failed:', err);
    }
  };

  const renderActiveTab = () => {
    if (!data) return null;
    switch (currentTab) {
      case 'kanban':
        return <KanbanBoard applications={data.applications} />;
      case 'graph':
        return <KnowledgeGraph data={data} />;
      case 'logs':
        return <ChangeHistory data={data} />;
      default:
        return <KanbanBoard applications={data.applications} />;
    }
  };

  return (
    <MainLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      data={data}
      loading={loading}
      error={error}
      loadFromFiles={loadFromFiles}
      loadFromDirectory={loadFromDirectory}
    >
      {data ? (
        renderActiveTab()
      ) : (
        /* Welcome Loading Dashboard State */
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center">
          {/* Logo container */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-neon-indigo/20 blur-xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-tr from-neon-indigo via-neon-blue to-neon-purple rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
              <Cpu className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
            Welcome to Open Career Format Orchestrator
          </h2>
          <p className="text-zinc-400 text-sm max-w-lg mb-10 leading-relaxed">
            A privacy-first career manager. All your experience, skills, and vacancy applications live locally on your machine in Markdown files.
          </p>

          {/* Cards for features */}
          <div className="grid grid-cols-2 gap-6 w-full mb-10 text-left">
            <div className="glass-panel p-6 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-neon-blue mb-3" />
              <h4 className="font-semibold text-zinc-100 mb-1">
                Privacy-by-Design
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Zero remote database hosting. No personal identifiable information (PII) gets sent to external servers. You own your career data.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <FolderOpen className="w-8 h-8 text-neon-purple mb-3" />
              <h4 className="font-semibold text-zinc-100 mb-1">
                Local Directory Parsing
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamlessly index your local <code>.okf</code> markdown catalog on the fly directly inside your browser container.
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleDirectoryPicker}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-neon-indigo to-neon-blue hover:from-neon-indigo/90 hover:to-neon-blue/90 border border-white/10 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            Select .okf Directory
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </MainLayout>
  );
}
