// Simple test version of App.js for debugging Vercel deployment
import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>UR2 Frontend Test</h1>
      <p>If you can see this, the basic deployment is working!</p>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>API Base URL: {process.env.REACT_APP_API_BASE_URL || 'Not set'}</p>
    </div>
  );
}