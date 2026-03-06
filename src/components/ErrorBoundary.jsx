import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="not-found-page">
          <div className="not-found-content">
            <div className="not-found-code">Oops</div>
            <h1>Something went wrong</h1>
            <p>An unexpected error occurred. Please try refreshing the page.</p>
            <Link to="/" className="btn btn-primary btn-lg" onClick={() => this.setState({ hasError: false })}>
              Back to Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
