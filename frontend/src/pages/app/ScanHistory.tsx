import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Trash2, ExternalLink, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { scanService } from '../../services/scanService';
import type { ScanHistoryItem } from '../../types';

export default function ScanHistory() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = () => {
    setIsLoading(true);
    scanService.getScanHistory()
      .then(setHistory)
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this scan from history?")) {
      try {
        await scanService.deleteScan(id);
        setHistory((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error(err);
        alert('Failed to delete scan.');
      }
    }
  };

  const clearHistory = async () => {
    if (confirm("Are you sure you want to clear ALL scan history?")) {
      try {
        await scanService.clearHistory();
        setHistory([]);
      } catch (err) {
        console.error(err);
        alert('Failed to clear history.');
      }
    }
  };

  const filteredHistory = history.filter(item =>
    item.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Scan History</h1>
          <p className="text-muted-foreground mt-1">Review your past security assessments.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors text-sm font-semibold"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading scan history...</div>
        ) : history.length > 0 ? (
          <>
            <div className="p-4 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by URL..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Target URL</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Score</th>
                    <th className="px-6 py-4 font-semibold">Risk Level</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-medium">{item.url}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          item.score >= 80 ? 'bg-green-500/20 text-green-500' :
                          item.score >= 50 ? 'bg-amber-500/20 text-amber-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {item.score}/100
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5">
                          {item.riskLevel === 'SAFE' || item.riskLevel === 'LOW' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : item.riskLevel === 'MEDIUM' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                          )}
                          {item.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/app/scan/${item.id}`}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-secondary"
                            title="View Report"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-secondary"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredHistory.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No scans found matching your search.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No scan history available.</p>
            <Link to="/app" className="text-primary hover:underline mt-2 inline-block">
              Run your first scan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
