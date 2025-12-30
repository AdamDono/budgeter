import { AlertCircle } from 'lucide-react'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // danger, warning, info
}) {
  if (!isOpen) return null

  const typeConfig = {
    danger: {
      icon: <AlertCircle className="text-red-400" size={36} />,
      confirmClass: 'btn-danger',
      iconContainerClass: 'bg-red-500/20 text-red-400'
    },
    warning: {
      icon: <AlertCircle className="text-amber-400" size={36} />,
      confirmClass: 'btn-warning',
      iconContainerClass: 'bg-amber-500/20 text-amber-400'
    },
    info: {
      icon: <AlertCircle className="text-blue-400" size={36} />,
      confirmClass: 'btn-primary',
      iconContainerClass: 'bg-blue-500/20 text-blue-400'
    }
  }

  const config = typeConfig[type] || typeConfig.danger

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="modal-content small confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-body text-center">
          <div className={`confirm-icon-container ${config.iconContainerClass}`}>
            {config.icon}
          </div>
          <h2 className="confirm-title">{title}</h2>
          <div className="confirm-message-container">
            <p className="confirm-message">{message}</p>
          </div>
          
          <div className="confirm-actions">
            <button className="btn ghost" onClick={onClose}>
              {cancelText}
            </button>
            <button className={`btn ${config.confirmClass}`} onClick={() => {
              onConfirm()
              onClose()
            }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
