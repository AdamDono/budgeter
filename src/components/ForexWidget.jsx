import { TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { forexAPI } from '../lib/api'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', symbol: 'د.إ' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', symbol: '¥' },
]

export default function ForexWidget() {
  const [rates, setRates] = useState(null)
  const [prevRates, setPrevRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true)
        // Frankfurter rates are "1 ZAR = X units of currency"
        const data = await forexAPI.getRates('ZAR')
        if (data && data.rates) {
          setRates(data.rates)
          setLastUpdated(new Date())
        }

        // Get historical rates for trend (approx 2 days ago)
        const histData = await forexAPI.getHistorical('ZAR', 2)
        const ratesObj = histData.rates || {}
        const dates = Object.keys(ratesObj).sort()
        if (dates.length > 0) {
          // Use the oldest date in the range as base for comparison
          setPrevRates(ratesObj[dates[0]])
        }
      } catch (err) {
        console.error('Forex error:', err)
        setError('Exchange rates unavailable')
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
    const interval = setInterval(fetchRates, 10 * 60 * 1000) // 10 mins
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="forex-widget">
      <div className="forex-header">
        <div>
          <h2>Market Rates (ZAR)</h2>
          <p className="forex-subtitle">
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}` : 'Refreshing...'}
          </p>
        </div>
        <div className="forex-base-badge">🇿🇦 ZAR</div>
      </div>

      {loading && (
        <div className="forex-loading">
          <div className="skeleton" style={{ height: '100px', width: '100%', borderRadius: '8px' }} />
        </div>
      )}

      {error && !rates && <p className="forex-error">{error}</p>}

      {!loading && rates && (
        <div className="forex-rates">
          {CURRENCIES.map(currency => {
            const currentZarToUnits = rates[currency.code]
            const prevZarToUnits = prevRates?.[currency.code]
            
            if (!currentZarToUnits) return null

            // How many Rands for 1 unit of foreign currency
            // 1 Unit = (1 / rate) Rands
            const randsPerUnit = 1 / currentZarToUnits
            const prevRandsPerUnit = prevZarToUnits ? (1 / prevZarToUnits) : null
            
            const priceChange = prevRandsPerUnit ? ((randsPerUnit - prevRandsPerUnit) / prevRandsPerUnit * 100) : null
            
            // If randsPerUnit went UP (e.g. from R18 to R19), the Rand WEAKENED (Red / TrendingUp in ZAR price)
            // If randsPerUnit went DOWN, the Rand STRENGTHENED (Green / TrendingDown in ZAR price)
            const weakened = priceChange > 0
            
            return (
              <div key={currency.code} className="forex-row">
                <div className="forex-currency">
                  <span className="forex-flag">{currency.flag}</span>
                  <div>
                    <span className="forex-code">{currency.code}</span>
                    <span className="forex-name">{currency.name}</span>
                  </div>
                </div>
                <div className="forex-value">
                  <span className="forex-rate">
                    R {randsPerUnit.toFixed(2)}
                  </span>
                  {priceChange !== null && Math.abs(priceChange) > 0.01 && (
                    <span className={`forex-change ${weakened ? 'up' : 'down'}`}>
                      {weakened ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(priceChange).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          <div className="forex-note">
            <p>R 1.00 ≈ {rates['USD']?.toFixed(3)} USD • Frankfurter API</p>
          </div>
        </div>
      )}
    </div>
  )
}
