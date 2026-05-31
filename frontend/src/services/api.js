import { __apiInternal, api, getBackendHealth } from './api/internal/client';
import { getAuthConfig, getMe, googleAuth, logoutRequest } from './api/endpoints/auth';
import {
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
  compareAnalyses,
  deleteAnalysis,
  downloadAnalysisPdf,
  extractDiagram,
  getAnalyses,
  getAnalysis,
  getAnalysisDiagramSvg,
  getAnalysisSummary,
  getAnalysisVersionComparison,
} from './api/endpoints/analysis';
import {
  createProject,
  getProject,
  getProjectActivity,
  getProjectAnalyses,
  getProjects,
  updateProject,
} from './api/endpoints/projects';

export {
  __apiInternal,
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
  compareAnalyses,
  createProject,
  deleteAnalysis,
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
