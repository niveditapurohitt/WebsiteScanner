import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Globe, Activity, Rocket, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { scanService } from '../../services/scanService';
import { useAuthStore } from '../../store/authStore';
import type { ScanHistoryItem } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const setScansRemaining = useAuthStore((state) => state.setScansRemaining);
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    scanService.getScanHistory().then(setHistory).catch((err) => console.error(err));
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsScanning(true);
    try {
      const result = await scanService.startScan(url, { type: 'QUICK' }, () => {});
      if (typeof result.scansRemaining === 'number') {
        setScansRemaining(result.scansRemaining);
      }
      navigate(`/app/scan/${result.id}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to perform the scan. Make sure the backend is running.");
    } finally {
      setIsScanning(false);
    }
  };

  const chartData = history.slice().reverse().map(item => ({
    name: new Date(item.timestamp).toLocaleDateString(),
    score: item.score
  }));

  const avgScore = history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;
  const safeScans = history.filter(h => h.riskLevel === 'SAFE' || h.riskLevel === 'LOW').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground mt-1">
          Ready to secure another domain? {session?.user && (
            <span className="text-foreground font-medium">{session.user.scansRemaining} scans remaining.</span>
          )}
        </p>
      </div>

      {/* Main Scan Card */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
        <form onSubmit={handleScan} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-semibold">Target URL</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                id="url"
                type="url" 
                placeholder="https://example.com"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
              />
            </div>
          </div>
          


          <button 
            type="submit" 
            disabled={isScanning}
            className="w-full md:w-auto px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isScanning ? (
              <Activity className="w-5 h-5 animate-pulse" />
            ) : (
              <Rocket className="w-5 h-5" />
            )}
            {isScanning ? 'Initiating Scan...' : 'Start Security Scan'}
          </button>
        </form>
      </div>
      
      {history.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats & Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-muted-foreground">Avg Score</h3>
                </div>
                <p className="text-4xl font-display font-bold">{avgScore}<span className="text-xl text-muted-foreground">/100</span></p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-muted-foreground">Safe Scans</h3>
                </div>
                <p className="text-4xl font-display font-bold">{safeScans}<span className="text-xl text-muted-foreground">/{history.length}</span></p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-72">
              <h3 className="font-semibold mb-4">Score Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Scans */}
          <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Recent Scans</h2>
              <Link to="/app/history" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {history.slice(0, 5).map(scan => (
                  <Link key={scan.id} to={`/app/scan/${scan.id}`} className="block p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-secondary/20 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold truncate max-w-[180px]" title={scan.url}>{scan.url}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        scan.score >= 80 ? 'bg-green-500/20 text-green-500' :
                        scan.score >= 50 ? 'bg-amber-500/20 text-amber-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {scan.score}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        {scan.riskLevel === 'SAFE' || scan.riskLevel === 'LOW' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        )}
                        {scan.riskLevel} Risk
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-display font-bold mb-4">Recent Scans</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 text-center text-muted-foreground">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No recent scans found.</p>
              <p className="text-sm mt-1">Run your first scan above to see history.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
