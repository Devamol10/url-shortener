import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error at application level:", error, errorInfo);
  }

  handleReload = () => {
    // Clear potentially corrupted storage and reload to a safe page
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', 
          width: '100vw',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#0b0f19',
          color: '#ffffff',
          textAlign: 'center',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</h1>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Oops! Something went wrong.</h2>
          <p style={{ color: '#9ca3af', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.6' }}>
            The application encountered an unexpected error. This usually happens during a session transition.
          </p>
          <button 
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(108, 99, 255, 0.3)'
            }}
          >
            Restart Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
