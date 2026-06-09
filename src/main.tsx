import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { useProjectStore } from './store/useProjectStore';
import { useValidationStore } from './store/useValidationStore';
import { loadDemoData } from './mock/demoData';

function AppInitializer() {
  const { projects, setCurrentProject, setCurrentSong, setCurrentChart } = useProjectStore();
  const { addReport } = useValidationStore();

  useEffect(() => {
    if (projects.length === 0) {
      const demo = loadDemoData();
      demo.projects.forEach(p => useProjectStore.getState().addProject(p));
      demo.songs.forEach(s => useProjectStore.getState().addSong(s));
      demo.charts.forEach(c => useProjectStore.getState().addChart(c));
      demo.editHistory.forEach(h => useProjectStore.getState().addEditHistory(h));
      demo.validationReports.forEach(r => addReport(r));
      
      if (demo.projects.length > 0) {
        setCurrentProject(demo.projects[0].id);
      }
      if (demo.songs.length > 0) {
        setCurrentSong(demo.songs[0].id);
      }
      if (demo.charts.length > 0) {
        setCurrentChart(demo.charts[0].id);
      }
    }
  }, []);

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppInitializer />
    <App />
  </StrictMode>,
);
