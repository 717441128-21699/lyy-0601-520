import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AudioImport } from './pages/AudioImport';
import { BeatAnalysis } from './pages/BeatAnalysis';
import { TrackEditor } from './pages/TrackEditor';
import { Validation } from './pages/Validation';
import { Preview } from './pages/Preview';
import { Batch } from './pages/Batch';
import { Reports } from './pages/Reports';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="audio-import" element={<AudioImport />} />
          <Route path="beat-analysis" element={<BeatAnalysis />} />
          <Route path="track-editor" element={<TrackEditor />} />
          <Route path="validation" element={<Validation />} />
          <Route path="preview" element={<Preview />} />
          <Route path="batch" element={<Batch />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}
