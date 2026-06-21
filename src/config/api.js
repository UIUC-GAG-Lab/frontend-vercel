// API configuration for different environments
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_BASE_URL || 'https://ur2-backend.onrender.com'
    : 'http://localhost:5001');

export { API_BASE_URL };