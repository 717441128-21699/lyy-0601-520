import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Music,
  Activity,
  SlidersHorizontal,
  ShieldCheck,
  PlayCircle,
  Layers,
  FileBarChart,
  Settings,
  Zap,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '工作台' },
  { path: '/audio-import', icon: Music, label: '音频导入' },
  { path: '/beat-analysis', icon: Activity, label: '节拍分析' },
  { path: '/track-editor', icon: SlidersHorizontal, label: '轨道编辑' },
  { path: '/validation', icon: ShieldCheck, label: '规则校验' },
  { path: '/preview', icon: PlayCircle, label: '试玩预览' },
  { path: '/batch', icon: Layers, label: '批处理' },
  { path: '/reports', icon: FileBarChart, label: '报告' },
];

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-64 h-screen bg-bg-dark/80 backdrop-blur-xl border-r border-border flex flex-col"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-cyan">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl neon-text-cyan">RhythmAI</h1>
            <p className="text-xs text-gray-500 font-mono">谱面自动化工具</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-neon">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 w-full"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-mono text-sm">{item.label}</span>
            </motion.div>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button className="sidebar-item w-full">
          <Settings className="w-5 h-5" />
          <span className="font-mono text-sm">设置</span>
        </button>
      </div>
    </motion.aside>
  );
}
