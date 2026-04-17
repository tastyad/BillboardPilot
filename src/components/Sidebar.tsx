import React from 'react';
import { TOOLS } from '../constants';
import { ToolId } from '../types';
import * as Icons from 'lucide-react';

interface SidebarProps {
  activeTool: ToolId;
  onToolSelect: (id: ToolId) => void;
}

export default function Sidebar({ activeTool, onToolSelect }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Icons.Plane className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Billboard Pilot</span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">by Tasty Ad</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {TOOLS.map((tool) => {
          const IconComponent = (Icons as any)[tool.icon];
          const isActive = activeTool === tool.id;
          const isComingSoon = tool.status === 'coming-soon';

          return (
            <button
              key={tool.id}
              onClick={() => !isComingSoon && onToolSelect(tool.id)}
              disabled={isComingSoon}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }
                ${isComingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{tool.name}</span>
              {isComingSoon && (
                <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2">
          <p className="text-xs font-medium opacity-70">Need help?</p>
          <p className="text-sm font-semibold">Contact Support</p>
          <button 
            onClick={() => window.location.href = 'mailto:info@tastyad.com'}
            className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
          >
            info@tastyad.com
          </button>
        </div>
      </div>
    </aside>
  );
}
