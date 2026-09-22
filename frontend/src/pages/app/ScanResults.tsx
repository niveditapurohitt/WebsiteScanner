import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Activity, Info, Download, Share2 } from 'lucide-react';
import { scanService } from '../../services/scanService';
import type { ScanResult, ScanModuleResult } from '../../types';
import { generateScanReportPDF } from '../../utils/pdfReport';
import AIChat from '../../components/AIChat';

export default function ScanResults() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (id) {
      scanService.getScanResult(id).then(data => {
        setResult(data);
        setIsLoading(false);
      });
    }
  }, [id]);

  const handleExportPDF = () => {
    if (!result) return;
    setIsExporting(true);
    try {
      generateScanReportPDF(result);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Activity className="w-8 h-8 animate-pulse text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Analyzing results...</p>
      </div>
    );
  }

  if (!result) return <div>Scan not found.</div>;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-severity-critical';
      case 'HIGH': return 'text-severity-high';
      case 'MEDIUM': return 'text-severity-medium';
      case 'LOW': return 'text-severity-low';
      case 'SAFE': return 'text-severity-safe';
      default: return 'text-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-severity-safe';
    if (score >= 50) return 'text-severity-medium';
    return 'text-severity-critical';
  };

  // Calculate dynamic action summary
  let criticalIssues = 0;
  let warnings = 0;
  let passedChecks = 0;

  Object.values(result.modules).forEach(mod => {
    if (mod.scoreDeduction > 10) criticalIssues++;
    else if (mod.scoreDeduction > 0) warnings++;
    else passedChecks++;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app" className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Scan Report</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              Target: <span className="font-semibold text-foreground">{result.url}</span>
              <span className="text-border">•</span>
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-md text-sm font-medium hover:bg-secondary transition-colors">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="space-y-6 bg-background p-4 rounded-xl">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-secondary stroke-current"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${getScoreColor(result.overallScore)} stroke-current`}
                  strokeWidth="3"
                  strokeDasharray={`${result.overallScore}, 100`}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold">{result.overallScore}</span>
              </div>
            </div>
            <h3 className="font-semibold text-lg">Overall Score</h3>
            <p className="text-muted-foreground text-sm mt-1">Based on 8 security metrics</p>
          </div>

          {/* Risk Level */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk Level</h3>
            <div className={`text-4xl font-display font-bold ${getRiskColor(result.riskLevel)}`}>
              {result.riskLevel}
            </div>
            <p className="text-sm mt-4 text-muted-foreground leading-relaxed">
              This site has {result.riskLevel === 'SAFE' ? 'minimal' : 'moderate'} vulnerabilities that could expose user data or affect uptime. Immediate remediation of highlighted issues is recommended.
            </p>
          </div>

          {/* Action Summary */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-severity-critical/10 rounded-full text-severity-critical">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{criticalIssues} Critical Issues</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-severity-medium/10 rounded-full text-severity-medium">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{warnings} Warnings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-severity-safe/10 rounded-full text-severity-safe">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{passedChecks} Passed Checks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Results */}
      <div>
        <h2 className="text-xl font-display font-bold mb-4">Detailed Findings</h2>
        <div className="space-y-4">
          {Object.entries(result.modules).map(([key, mod]: [string, ScanModuleResult]) => (
            <div key={key} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 flex items-center justify-between bg-secondary/20">
                <div className="flex items-center gap-3">
                  {mod.scoreDeduction === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-severity-safe" />
                  ) : mod.scoreDeduction > 10 ? (
                    <XCircle className="w-5 h-5 text-severity-critical" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-severity-medium" />
                  )}
                  <h3 className="font-semibold">{mod.moduleName}</h3>
                </div>
                {mod.scoreDeduction > 0 && (
                  <span className="text-sm font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">
                    -{mod.scoreDeduction} pts
                  </span>
                )}
              </div>
              <div className="p-5 border-t border-border space-y-6">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Findings</h4>
                  <ul className="space-y-2">
                    {mod.findings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {mod.remediations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recommended Actions</h4>
                    <ul className="space-y-2">
                      {mod.remediations.map((rem, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm bg-secondary/50 p-3 rounded-md">
                          <CheckCircle2 className="w-4 h-4 text-severity-safe mt-0.5 shrink-0" />
                          <span>{rem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
      
      {/* Floating AI Chat */}
      <AIChat scanResult={result} />
    </div>
  );
}
