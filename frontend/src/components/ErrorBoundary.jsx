import { Component } from "react";

/**
 * ErrorBoundary — перехватывает ошибки рендера React-дерева.
 * Оборачивает всё приложение в App.jsx.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <div className="error-boundary__icon">⚠️</div>
            <h1>Что-то пошло не так</h1>
            <p className="error-boundary__message">
              {this.state.error?.message || "Неизвестная ошибка приложения"}
            </p>
            <div className="error-boundary__actions">
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Перезагрузить страницу
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
              >
                На главную
              </button>
            </div>
            <details className="error-boundary__details">
              <summary>Подробности ошибки</summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
