import type { ScanResult, ScanHistoryItem, ScanModuleResult, RiskLevel } from '../types';
import { getToken } from './authService';

export interface ScanOptions {
  type: 'QUICK' | 'DEEP' | 'CUSTOM';
  modules?: string[];
}

export type ScanStatusCallback = (moduleUpdates: Partial<Record<string, ScanModuleResult>>) => void;

// Helper to determine risk level from score
const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 90) return 'SAFE';
  if (score >= 70) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  if (score >= 30) return 'HIGH';
  return 'CRITICAL';
};

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const data = await response.json().catch(() => null);
  return data?.detail || fallback;
};

// Maps a raw backend scan document (from /scan or /scans/{id}) to our frontend ScanResult shape
const mapBackendToScanResult = (data: any, id: string): ScanResult => ({
  id,
  url: data.website || data.url,
  timestamp: data.timestamp || new Date().toISOString(),
  overallScore: data.summary?.security_score ?? 0,
  riskLevel: (data.summary?.risk_level as RiskLevel) ?? getRiskLevel(data.summary?.security_score ?? 0),
  modules: {
    ssl: {
      moduleName: 'SSL/TLS',
      status: 'COMPLETE',
      scoreDeduction: 0,
      findings: data.scans?.ssl?.ssl_enabled
        ? [`SSL is enabled via ${data.scans.ssl.protocol_version}`, `Issuer: ${data.scans.ssl.issuer}`]
        : ['SSL is NOT enabled or invalid.'],
      remediations: data.scans?.ssl?.ssl_enabled ? [] : ['Install a valid SSL certificate.'],
      rawOutput: data.scans?.ssl
    },
    headers: {
      moduleName: 'Security Headers',
      status: 'COMPLETE',
      scoreDeduction: (data.scans?.headers?.missing_headers?.length || 0) * 5,
      findings: data.scans?.headers?.missing_headers?.length
        ? [`Missing headers: ${data.scans.headers.missing_headers.join(', ')}`]
        : ['All critical security headers are present.'],
      remediations: data.scans?.headers?.missing_headers?.map((h: string) => `Configure the ${h} header.`) || [],
      rawOutput: data.scans?.headers
    },
    ports: {
      moduleName: 'Open Ports',
      status: 'COMPLETE',
      scoreDeduction: (data.scans?.ports?.open_ports?.length || 0) * 10,
      findings: data.scans?.ports?.open_ports?.length
        ? data.scans.ports.open_ports.map((p: any) => `Port ${p.port} (${p.service}) is open.`)
        : ['No high-risk open ports detected.'],
      remediations: data.scans?.ports?.open_ports?.map((p: any) => `Verify if Port ${p.port} needs to be publicly exposed.`) || [],
      rawOutput: data.scans?.ports
    },
    dns: {
      moduleName: 'DNS & Email',
      status: 'COMPLETE',
      scoreDeduction: (!data.scans?.dns?.has_spf || !data.scans?.dns?.has_dmarc) ? 10 : 0,
      findings: [
        `SPF: ${data.scans?.dns?.has_spf ? 'Present' : 'Missing'}`,
        `DMARC: ${data.scans?.dns?.has_dmarc ? 'Present' : 'Missing'}`
      ],
      remediations: data.scans?.dns?.has_dmarc ? [] : ['Configure DMARC and SPF to prevent email spoofing.'],
      rawOutput: data.scans?.dns
    },
    seo: {
      moduleName: 'SEO & Metadata',
      status: 'COMPLETE',
      scoreDeduction: 0,
      findings: data.scans?.seo?.title ? [`Page title: ${data.scans.seo.title}`] : ['Missing page title.'],
      remediations: data.scans?.seo?.missing_alt_images > 0 ? [`Add alt text to ${data.scans.seo.missing_alt_images} images.`] : [],
      rawOutput: data.scans?.seo
    },
    technology: {
      moduleName: 'Tech Stack',
      status: 'COMPLETE',
      scoreDeduction: 0,
      findings: data.scans?.technology?.technologies
        ? Object.entries(data.scans.technology.technologies).map(([k, v]) => `${k}: ${v}`)
        : ['Could not detect specific technologies.'],
      remediations: [],
      rawOutput: data.scans?.technology
    },
    performance: {
      moduleName: 'Performance',
      status: 'COMPLETE',
      scoreDeduction: data.scans?.performance?.performance_score < 80 ? 10 : 0,
      findings: data.scans?.performance?.performance_score
        ? [`Score: ${data.scans.performance.performance_score}/100`, `FCP: ${data.scans.performance.first_contentful_paint}`]
        : ['Performance data unavailable.'],
      remediations: data.scans?.performance?.performance_score < 80 ? ['Optimize assets to improve performance score.'] : [],
      rawOutput: data.scans?.performance
    },
    info: {
      moduleName: 'Domain Info',
      status: 'COMPLETE',
      scoreDeduction: 0,
      findings: [
        `Registrar: ${data.website_info?.registrar || 'Unknown'}`,
        `Hosted in: ${data.website_info?.country || 'Unknown'}`
      ],
      remediations: [],
      rawOutput: data.website_info
    },
    // New optional modules (additive; existing modules above are unchanged)
    cookies: {
      moduleName: 'Cookie Security',
      status: 'COMPLETE',
      scoreDeduction: data.cookies?.cookies?.filter((c: any) => c.issues?.length).length
        ? data.cookies.cookies.filter((c: any) => c.issues?.length).length * 2
        : 0,
      findings: data.cookies?.cookies_found
        ? data.cookies.cookies.map((c: any) => `${c.name}: ${c.issues?.length ? c.issues.join(', ') : 'OK'}`)
        : ['No cookies were set by this page.'],
      remediations: data.cookies?.cookies?.some((c: any) => c.issues?.length)
        ? ['Set Secure, HttpOnly and SameSite attributes on all cookies.']
        : [],
      rawOutput: data.cookies
    },
    emailSecurity: {
      moduleName: 'Email Security',
      status: 'COMPLETE',
      scoreDeduction: 0,
      findings: [
        `SPF: ${data.email_security?.spf_present ? 'Present' : 'Missing'}`,
        `DMARC: ${data.email_security?.dmarc_present ? `Present (${data.email_security.dmarc_strength})` : 'Missing'}`,
        `DKIM (common selectors): ${data.email_security?.dkim_selectors_found?.length ? data.email_security.dkim_selectors_found.join(', ') : 'None found'}`
      ],
      remediations: !data.email_security?.dkim_selectors_found?.length
        ? ['Configure DKIM signing for outgoing mail.']
        : [],
      rawOutput: data.email_security
    },
    exposedPaths: {
      moduleName: 'Exposed Paths',
      status: 'COMPLETE',
      scoreDeduction: (data.exposed_paths?.exposed_count || 0) * 8,
      findings: data.exposed_paths?.exposed_count
        ? data.exposed_paths.findings
            .filter((f: any) => f.risk === 'exposed')
            .map((f: any) => `${f.path} appears publicly exposed (HTTP ${f.status_code})`)
        : ['No commonly sensitive files were found exposed.'],
      remediations: data.exposed_paths?.exposed_count
        ? ['Remove or block public access to exposed sensitive files.']
        : [],
      rawOutput: data.exposed_paths
    },
    cors: {
      moduleName: 'CORS Configuration',
      status: 'COMPLETE',
      scoreDeduction: data.cors?.risk === 'HIGH' ? 10 : 0,
      findings: data.cors?.risk === 'HIGH'
        ? [`Access-Control-Allow-Origin: ${data.cors.allow_origin}`, 'Server reflects arbitrary origins or allows wildcard with credentials.']
        : ['No CORS misconfiguration detected.'],
      remediations: data.cors?.risk === 'HIGH'
        ? ['Restrict Access-Control-Allow-Origin to a trusted allowlist.']
        : [],
      rawOutput: data.cors
    },
    subdomains: {
      moduleName: 'Subdomains',
      status: 'COMPLETE',
      scoreDeduction: 0,
      findings: data.subdomains?.success
        ? [`${data.subdomains.count} subdomain(s) found via ${data.subdomains.source}`]
        : ['Subdomain enumeration unavailable (sources unreachable).'],
      remediations: [],
      rawOutput: data.subdomains
    }
  }
});

export const scanService = {
  async startScan(url: string, _options: ScanOptions, onUpdate: ScanStatusCallback): Promise<ScanResult & { scansRemaining?: number }> {
    const modules = ['ssl', 'headers', 'ports', 'dns', 'seo', 'technology', 'performance', 'info', 'cookies', 'emailSecurity', 'exposedPaths', 'cors', 'subdomains'];

    // Set all to running state while we wait for backend
    const runningUpdates: any = {};
    modules.forEach(m => {
      runningUpdates[m] = {
        moduleName: m.toUpperCase(),
        status: 'RUNNING',
        scoreDeduction: 0,
        findings: [],
        remediations: []
      };
    });
    onUpdate(runningUpdates);

    // Call actual backend API, authenticated as the current user
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, `Scan failed with status ${response.status}`));
    }

    const data = await response.json();
    const mappedResult = mapBackendToScanResult(data, data.id);

    // Push final complete state to UI
    const completedUpdates: any = {};
    modules.forEach(m => {
      completedUpdates[m] = mappedResult.modules[m as keyof typeof mappedResult.modules];
    });
    onUpdate(completedUpdates);

    return { ...mappedResult, scansRemaining: data.scans_remaining };
  },

  async getScanResult(scanId: string): Promise<ScanResult> {
    const response = await fetch(`/api/scans/${scanId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Scan not found'));
    }

    const data = await response.json();
    return mapBackendToScanResult(data, data.id);
  },

  async getScanHistory(): Promise<ScanHistoryItem[]> {
    const response = await fetch('/api/scans', {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Could not load scan history'));
    }

    const data = await response.json();
    return data.map((item: any) => ({
      id: item.id,
      url: item.url,
      timestamp: item.timestamp,
      score: item.score,
      riskLevel: item.risk_level as RiskLevel,
    }));
  },

  async deleteScan(scanId: string): Promise<void> {
    const response = await fetch(`/api/scans/${scanId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Could not delete scan'));
    }
  },

  async clearHistory(): Promise<void> {
    const response = await fetch('/api/scans', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, 'Could not clear scan history'));
    }
  }
};
