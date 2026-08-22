import { Download, Share, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  useEffect(() => {
    // Check if already installed & running standalone
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true

    setIsStandalone(isStandaloneMode)

    // Check if previously dismissed in last 7 days
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed')
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (days < 7) {
        setIsDismissed(true)
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    // Listen for beforeinstallprompt (Android / Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted installation')
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowIOSHelp(true)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  // Don't render if already installed or dismissed or desktop without prompt
  if (isStandalone || isDismissed || (!deferredPrompt && !isIOS)) {
    return null
  }

  return (
    <aside aria-label="Install App" className="pwa-banner-wrap animate-slide-up">
      <div className="pwa-banner-card glass-panel">
        <div className="pwa-banner-icon">
          <img src="/pwa-192x192.png" alt="Pace Finance App" className="pwa-app-icon" />
        </div>

        <div className="pwa-banner-text">
          <h4>Install Pace Finance</h4>
          <p>Add to your home screen for instant full-screen access.</p>
        </div>

        <div className="pwa-banner-actions">
          <button onClick={handleInstallClick} className="pwa-install-btn">
            {isIOS ? <Smartphone size={15} /> : <Download size={15} />}
            <span>Install</span>
          </button>
          <button onClick={handleDismiss} className="pwa-dismiss-btn" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Modal */}
      {showIOSHelp && (
        <div className="pwa-ios-modal-backdrop" onClick={() => setShowIOSHelp(false)}>
          <div className="pwa-ios-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-header">
              <h3>Install on iPhone / iPad</h3>
              <button onClick={() => setShowIOSHelp(false)} className="pwa-modal-close">
                <X size={18} />
              </button>
            </div>
            <ol className="pwa-ios-steps">
              <li>
                <span>1</span>
                <div>
                  Tap the <strong>Share</strong> button <Share size={14} className="inline-icon" /> in your Safari navigation bar at the bottom.
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  Tap <strong>Add</strong> in the top-right corner to launch Pace in full screen! 🚀
                </div>
              </li>
            </ol>
            <button onClick={() => setShowIOSHelp(false)} className="pwa-ios-got-it">
              Got it!
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
