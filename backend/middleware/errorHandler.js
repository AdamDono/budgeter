export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    console.error('Error Details:', err)
  }

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details.map(d => d.message)
    })
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({ error: 'Resource already exists' })
      case '23503': // Foreign key violation
        return res.status(400).json({ error: 'Invalid reference' })
      case '23502': // Not null violation
        return res.status(400).json({ error: 'Required field missing' })
      default:
        console.error('Database error:', err)
        return res.status(500).json({ error: isProduction ? 'Database error' : err.message })
    }
  }

  // Default error
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
  })
}
