import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { trackEvent } from "../lib/analytics.js";
import { captureError } from "../lib/monitoring.js";
import Button from "./Button.jsx";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    trackEvent("client_error", { error_type: "render" });
    captureError(error, { source: "render", error_type: "render" });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-16">
        <section className="glass w-full max-w-lg rounded-2xl p-8 text-center" role="alert">
          <AlertTriangle className="mx-auto h-10 w-10 text-violet" aria-hidden="true" />
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Что-то пошло не так</h1>
          <p className="mt-3 text-sm text-mute">
            Попробуйте обновить этот экран. Данные сервера не были изменены.
          </p>
          <Button type="button" onClick={this.handleReset} className="mt-6">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Повторить
          </Button>
        </section>
      </main>
    );
  }
}
