import { motion } from 'framer-motion';
import { useProjectStore } from '../../store/useProjectStore';
import { ChevronDown, Bell, User, Download } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { currentProjectId, projects, setCurrentProject, getCurrentProject } = useProjectStore();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const currentProject = getCurrentProject();

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-16 bg-bg-dark/60 backdrop-blur-xl border-b border-border flex items-center justify-between px-6"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowProjectSelector(!showProjectSelector)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-border hover:border-neon-cyan/50 transition-all"
          >
            <span className="font-display font-semibold text-white">{currentProject?.name || '选择项目'}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProjectSelector ? 'rotate-180' : ''}`} />
          </button>

          {showProjectSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-2 w-64 glass-card p-2 z-50"
            >
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    setCurrentProject(project.id);
                    setShowProjectSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-neon-cyan/10 transition-colors ${currentProjectId === project.id ? 'bg-neon-cyan/20 text-neon-cyan' : ''}`}
                >
                  <div className="font-mono text-sm">{project.name}</div>
                  <div className="text-xs text-gray-500">{project.creator}</div>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className={`status-badge status-${currentProject?.status || 'draft'}`}>
            {currentProject?.status === 'draft' ? '草稿' : currentProject?.status === 'reviewing' ? '审核中' : '已完成'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-neon-cyan/10 transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-neon-pink rounded-full animate-pulse" />
        </button>

        <button className="btn-neon flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          导出
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="font-mono text-sm text-gray-300">谱师</span>
        </div>
      </div>
    </motion.header>
  );
}
