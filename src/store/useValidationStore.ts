import { create } from 'zustand';
import type { ValidationReport, ValidationIssue, Chart, HeatMapZone } from '../types';
import { validateChart, autoFixAllIssues, fixIssue } from '../utils/validation/validationRules';
import { useProjectStore } from './useProjectStore';
import { demoValidationIssues, demoHeatZones } from '../mock/demoData';

interface ValidationState {
  reports: Record<string, ValidationReport>;
  isValidating: boolean;
  selectedIssueId: string | null;
  filterSeverity: ('error' | 'warning' | 'info')[];
  filterType: string[];
  showFixed: boolean;
  
  validateCurrentChart: () => Promise<void>;
  validateChart: (chartId: string) => Promise<ValidationReport>;
  validateAll: (projectId: string) => Promise<void>;
  
  fixIssue: (chartId: string, issueId: string) => Promise<boolean>;
  autoFixAll: (chartId: string) => Promise<{ fixedCount: number; failedCount: number }>;
  markIssueFixed: (chartId: string, issueId: string) => void;
  
  addReport: (report: ValidationReport) => void;
  updateIssue: (chartId: string, issueId: string, updates: Partial<ValidationIssue>) => void;
  getLatestReport: (chartId: string) => ValidationReport | undefined;
  
  setSelectedIssue: (id: string | null) => void;
  setFilterSeverity: (severity: ('error' | 'warning' | 'info')[]) => void;
  setFilterType: (types: string[]) => void;
  setShowFixed: (show: boolean) => void;
  
  getFilteredIssues: (chartId: string) => ValidationIssue[];
  getChartHeatZones: (chartId: string) => HeatMapZone[];
  
  loadDemoValidationData: () => void;
  clearReports: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useValidationStore = create<ValidationState>((set, get) => ({
  reports: {},
  isValidating: false,
  selectedIssueId: null,
  filterSeverity: ['error', 'warning', 'info'],
  filterType: [],
  showFixed: false,
  
  validateCurrentChart: async () => {
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart) return;
    
    await get().validateChart(chart.id);
  },
  
  validateChart: async (chartId) => {
    set({ isValidating: true });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    if (!chart) {
      set({ isValidating: false });
      throw new Error('Chart not found');
    }
    
    const report = validateChart(chart);
    
    set(state => ({
      reports: { ...state.reports, [chartId]: report },
      isValidating: false,
    }));
    
    return report;
  },
  
  validateAll: async (projectId) => {
    set({ isValidating: true });
    
    const charts = useProjectStore.getState().getProjectCharts(projectId);
    const reports: Record<string, ValidationReport> = {};
    
    for (const chart of charts) {
      await new Promise(resolve => setTimeout(resolve, 300));
      reports[chart.id] = validateChart(chart);
    }
    
    set(state => ({
      reports: { ...state.reports, ...reports },
      isValidating: false,
    }));
  },
  
  fixIssue: async (chartId, issueId) => {
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    const report = get().reports[chartId];
    
    if (!chart || !report) return false;
    
    const issue = report.issues.find(i => i.id === issueId);
    if (!issue) return false;
    
    const result = fixIssue(chart, issue);
    
    if (result.fixed) {
      useProjectStore.getState().updateChart(chartId, { notes: result.chart.notes });
      
      const updatedReport = validateChart(result.chart);
      set(state => ({
        reports: { ...state.reports, [chartId]: updatedReport },
      }));
      
      return true;
    }
    
    return false;
  },
  
  autoFixAll: async (chartId) => {
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    if (!chart) return { fixedCount: 0, failedCount: 0 };
    
    const result = autoFixAllIssues(chart);
    
    if (result.fixedCount > 0) {
      useProjectStore.getState().updateChart(chartId, { notes: result.chart.notes });
      
      const updatedReport = validateChart(result.chart);
      set(state => ({
        reports: { ...state.reports, [chartId]: updatedReport },
      }));
    }
    
    return { fixedCount: result.fixedCount, failedCount: result.failedCount };
  },
  
  markIssueFixed: (chartId, issueId) => {
    set(state => {
      const report = state.reports[chartId];
      if (!report) return state;
      
      return {
        reports: {
          ...state.reports,
          [chartId]: {
            ...report,
            issues: report.issues.map(i =>
              i.id === issueId ? { ...i, isFixed: true } : i
            ),
          },
        },
      };
    });
  },
  
  addReport: (report) => {
    set(state => ({
      reports: { ...state.reports, [report.chartId]: report },
    }));
  },
  
  updateIssue: (chartId, issueId, updates) => {
    set(state => {
      const report = state.reports[chartId];
      if (!report) return state;
      
      return {
        reports: {
          ...state.reports,
          [chartId]: {
            ...report,
            issues: report.issues.map(i =>
              i.id === issueId ? { ...i, ...updates } : i
            ),
          },
        },
      };
    });
  },
  
  getLatestReport: (chartId) => {
    return get().reports[chartId];
  },
  
  setSelectedIssue: (id) => set({ selectedIssueId: id }),
  setFilterSeverity: (severity) => set({ filterSeverity: severity }),
  setFilterType: (types) => set({ filterType: types }),
  setShowFixed: (show) => set({ showFixed: show }),
  
  getFilteredIssues: (chartId) => {
    const { reports, filterSeverity, filterType, showFixed } = get();
    const report = reports[chartId];
    
    if (!report) return [];
    
    return report.issues.filter(issue => {
      if (!showFixed && issue.isFixed) return false;
      if (!filterSeverity.includes(issue.severity)) return false;
      if (filterType.length > 0 && !filterType.includes(issue.type)) return false;
      return true;
    });
  },
  
  getChartHeatZones: (chartId) => {
    const report = get().reports[chartId];
    return report?.heatZones || demoHeatZones.filter(hz => hz.chartId === chartId);
  },
  
  loadDemoValidationData: () => {
    const charts = useProjectStore.getState().charts;
    const reports: Record<string, ValidationReport> = {};
    
    for (const chart of charts) {
      const issues = demoValidationIssues.filter(i => i.chartId === chart.id);
      const heatZones = demoHeatZones.filter(hz => hz.chartId === chart.id);
      
      if (issues.length > 0) {
        const noteDensity = Array.from({ length: Math.ceil(chart.notes.length / 30) }, () => Math.random() * 8 + 2);
        reports[chart.id] = {
          chartId: chart.id,
          totalIssues: issues.length,
          issues,
          estimatedDifficulty: chart.difficultyLevel,
          noteDensity,
          heatZones,
          passedChecks: ['节拍一致性', '音符完整性'],
          averageNPS: Math.round(chart.notes.length / (chart.notes[chart.notes.length - 1]?.time || 180) * 10) / 10,
          maxNPS: Math.max(...noteDensity),
          totalNotes: chart.notes.length,
        };
      }
    }
    
    set({ reports });
  },
  
  clearReports: () => set({ reports: {} }),
}));
