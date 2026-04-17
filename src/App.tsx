/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import AdResizer from './components/AdResizer';
import AdUpscaler from './components/AdUpscaler';
import AdSuperimposer from './components/AdSuperimposer';
import ProposalGenerator from './components/ProposalGenerator';
import { ToolId } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('resizer');

  const renderTool = () => {
    switch (activeTool) {
      case 'resizer':
        return <AdResizer />;
      case 'upscaler':
        return <AdUpscaler />;
      case 'superimposer':
        return <AdSuperimposer />;
      case 'proposal':
        return <ProposalGenerator />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Coming Soon</h2>
            <p className="text-slate-500 max-w-md">
              We're working hard to bring you this tool. Stay tuned for updates!
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans selection:bg-slate-900 selection:text-white">
      <Sidebar activeTool={activeTool} onToolSelect={setActiveTool} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTool()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

