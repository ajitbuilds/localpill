import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Global Error Caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: '#f8fafc', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                    <div style={{
                        background: 'white', padding: '3rem', borderRadius: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        maxWidth: '500px', width: '100%', textAlign: 'center', border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#111827' }}>
                            Something went wrong
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                            {this.state.error && this.state.error.toString()}
                        </p>
                        <pre style={{ textAlign: 'left', fontSize: '0.7rem', color: 'red', overflow: 'auto', maxHeight: '200px', whiteSpace: 'pre-wrap' }}>
                            {this.state.error && this.state.error.stack}
                        </pre>
                        <button className="btn-dynamic"
                            onClick={() => window.location.reload()}
                            style={{
                                background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 1.5rem',
                                borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s', width: '100%'
                            }}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
