import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#f8fafc', background: '#0f172a', minHeight: '100vh' }}>
          <h1 style={{ marginBottom: 12 }}>SUMMS failed to render</h1>
          <p style={{ marginBottom: 8 }}>Open the browser console and share the error.</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
