import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Globe, MapPin, List, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import ForexWidget from '../components/ForexWidget'
import { forexAPI } from '../lib/api'

export default function Forex() {
  const [baseCurrency, setBaseCurrency] = useState('ZAR')
  
  const { data: historicalData, isLoading } = useQuery({
    queryKey: ['forex-historical', baseCurrency],
    queryFn: async () => (await forexAPI.getHistorical(baseCurrency, 30)),
  })

  return (
    <div className="forex-page-container dashboard-v2">
      <header className="dash-header">
        <div className="header-info">
          <h1>Forex Analytics</h1>
          <p className="text-muted">Global Market Intelligence & Exchange Data</p>
        </div>
        <div className="header-actions">
           <div className="month-picker-pill">
              <Globe size={16} />
              <span>Base: {baseCurrency}</span>
           </div>
        </div>
      </header>

      <div className="bento-grid">
        {/* Main Forex Module */}
        <div className="bento-item glass-panel span-2" style={{ padding: '2rem' }}>
          <ForexWidget />
        </div>

        {/* Tactical Overview */}
        <div className="bento-item glass-panel">
          <div className="item-header">
            <h3>Rand Sentiment</h3>
          </div>
          <div className="sentiment-display">
            <div className="sentiment-bar">
               <div className="sentiment-fill" style={{ width: '65%', backgroundColor: '#ef4444' }}></div>
            </div>
            <div className="sentiment-labels">
               <span className="text-neg">Weakened</span>
               <span>Neutral</span>
               <span className="text-pos">Strong</span>
            </div>
            <p className="sentiment-note">The ZAR is currently showing weak resistance against the Greenback due to global risk-off sentiment.</p>
          </div>
        </div>

        {/* Global Hubs */}
        <div className="bento-item glass-panel">
           <div className="item-header">
             <h3>Global Financial Hubs</h3>
           </div>
           <div className="hubs-list">
              <div className="hub-item">
                 <span>New York (NYSE)</span>
                 <span className="badge success">Open</span>
              </div>
              <div className="hub-item">
                 <span>London (LSE)</span>
                 <span className="badge success">Open</span>
              </div>
              <div className="hub-item">
                 <span>Tokyo (TSE)</span>
                 <span className="badge danger">Closed</span>
              </div>
              <div className="hub-item">
                 <span>Johannesburg (JSE)</span>
                 <span className="badge success">Open</span>
              </div>
           </div>
        </div>

        {/* Historical Insight placeholder */}
        <div className="bento-item glass-panel span-2">
           <div className="item-header">
             <h3>30-Day Trajectory (ZAR/USD)</h3>
           </div>
           <div className="placeholder-chart">
              {/* This would ideally be a Recharts line chart */}
              <div className="css-sparkline">
                 <div className="wave"></div>
              </div>
           </div>
           <div className="chart-meta">
              <span>Low: R18.45</span>
              <span>High: R19.22</span>
              <span>Avg: R18.88</span>
           </div>
        </div>

        {/* Strategic Tip */}
        <div className="bento-item glass-panel span-2">
           <div className="item-header">
             <h3>Strategic Intel</h3>
           </div>
           <div className="intel-card-content">
              <TrendingDown className="text-neg" size={24} style={{ marginBottom: '1rem' }} />
              <p>Currency volatility is currently expected to spike. If you have international payments due, consider partial hedging or locking in rates during brief ZAR corrective rallies.</p>
           </div>
        </div>
      </div>
    </div>
  )
}
