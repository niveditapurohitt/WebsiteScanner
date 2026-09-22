export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  scansRemaining: number;
}

export interface Session {
  user: User;
  isAuthenticated: boolean;
  token: string; // Generic token, agnostic to JWT vs session ID
}

export type ScanModuleStatus = 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';

export interface ScanModuleResult {
  moduleName: string;
  status: ScanModuleStatus;
  scoreDeduction: number;
  findings: string[];
  remediations: string[];
  rawOutput?: any;
}

export interface ScanResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  riskLevel: RiskLevel;
  modules: {
    ssl: ScanModuleResult;
    headers: ScanModuleResult;
    ports: ScanModuleResult;
    dns: ScanModuleResult;
    seo: ScanModuleResult;
    technology: ScanModuleResult;
    performance: ScanModuleResult;
    info: ScanModuleResult;
    // New optional modules (additive; existing modules above are unchanged)
    cookies?: ScanModuleResult;
    emailSecurity?: ScanModuleResult;
    exposedPaths?: ScanModuleResult;
    cors?: ScanModuleResult;
    subdomains?: ScanModuleResult;
  };
}

export interface ScanHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  score: number;
  riskLevel: RiskLevel;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AuthCredentials {
  email: string;
  password?: string;
  fullName?: string;
}
