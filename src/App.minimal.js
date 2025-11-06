// Minimal test version of App.js for debugging
import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ color: 'green' }}>✅ UR2 Frontend Test</h1>
      <p>If you can see this, the basic deployment is working!</p>
      <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      <p><strong>API Base URL:</strong> {process.env.REACT_APP_API_BASE_URL || 'Not set'}</p>
      <p><strong>Build Time:</strong> {new Date().toISOString()}</p>
    </div>
  );
}