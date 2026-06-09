import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { useProjectStore } from './store/useProjectStore';
import { useValidationStore } from './store/useValidationStore';
import { loadDemoData } from './mock/demoData';

function AppInitializer() {
  const { 
    projects, 
    songs, 
    charts, 
    isLoading,
    setCurrentProject, 
    setCurrentSong, 
    setCurrentChart,
    initializeFromDatabase,
    loadDemoData: loadDemoDataToStore,
    addEditHistory,
    addProject,
    addSong,
    addChart,
  } = useProjectStore();
  const { addReport } = useValidationStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeFromDatabase();
      
      const state = useProjectStore.getState();
      if (state.projects.length === 0) {
        const demo = loadDemoData();
        demo.projects.forEach(p => addProject(p));
        demo.songs.forEach(s => addSong(s));
        demo.charts.forEach(c => addChart(c));
        demo.editHistory.forEach(h => addEditHistory(h));
        demo.validationReports.forEach(r => addReport(r));
        
        const demoState = useProjectStore.getState();
        if (demoState.projects.length > 0 && !demoState.currentProjectId) {
          const neonCityProject = demoState.projects.find(p => p.name === '霓虹都市') || demoState.projects[0];
          const firstSong = demoState.songs.find(s => s.projectId === neonCityProject.id);
          
          const projectCharts = firstSong 
            ? demoState.charts.filter(c => c.songId === firstSong.id)
            : demoState.charts.filter(c => c.projectId === neonCityProject.id);
          
          const easyChart = projectCharts.find(c => c.difficulty === 'easy')
            || projectCharts.find(c => c.name.toLowerCase() === 'easy')
            || projectCharts[0]
            || null;
          
          useProjectStore.getState().setCurrentProject(neonCityProject.id);
          if (firstSong) useProjectStore.getState().setCurrentSong(firstSong.id);
          if (easyChart) useProjectStore.getState().setCurrentChart(easyChart.id);
        }
      }
      
      setInitialized(true);
    }
    
    if (!initialized) {
      init();
    }
  }, [initialized, initializeFromDatabase, addProject, addSong, addChart, addEditHistory, addReport]);

  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-400 font-mono">加载数据中...</p>
        </div>
      </div>
    );
  }

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppInitializer />
    <App />
  </StrictMode>,
);
