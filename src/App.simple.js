// Simple test App without Tailwind classes
import React from 'react';

export default function App() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: 'green', marginBottom: '20px' }}>✅ UR2 Device Interface</h1>
      <p>React app is working!</p>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        marginTop: '20px',
        border: '1px solid #ccc',
        borderRadius: '5px'
      }}>
        <h2>Status Check</h2>
        <ul>
          <li>✅ HTML loaded</li>
          <li>✅ JavaScript executed</li>
          <li>✅ React rendering</li>
        </ul>
      </div>
    </div>
  );
}