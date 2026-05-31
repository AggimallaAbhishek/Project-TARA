import { __apiInternal, api, getBackendHealth } from './apiClient/internal/client';
import { getAuthConfig, getMe, googleAuth, logoutRequest } from './apiClient/endpoints/auth';
import {
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
  compareAnalyses,
  deleteAnalysis,
  downloadAnalysisDiagramPng,
  downloadAnalysisPdf,
  extractDiagram,
  getAnalyses,
  getAnalysis,
  getAnalysisDiagramSvg,
  getAnalysisSummary,
  getAnalysisVersionComparison,
} from './apiClient/endpoints/analysis';
import {
  createProject,
  getProject,
  getProjectActivity,
  getProjectAnalyses,
  getProjects,
  updateProject,
} from './apiClient/endpoints/projects';

export {
  __apiInternal,
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
  compareAnalyses,
  createProject,
  deleteAnalysis,
  downloadAnalysisDiagramPng,
  downloadAnalysisPdf,
  extractDiagram,
  getAnalyses,
  getAnalysis,
  getAnalysisDiagramSvg,
  getAnalysisSummary,
  getAnalysisVersionComparison,
  getAuthConfig,
  getBackendHealth,
  getMe,
  getProject,
  getProjectActivity,
  getProjectAnalyses,
  getProjects,
  googleAuth,
  logoutRequest,
  updateProject,
};

export default api;
