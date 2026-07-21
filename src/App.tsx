import React, { Component, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ConfirmDialog } from './components/shared/ConfirmDialog';
import { AutoUpdaterProvider, useUpdater } from './hooks/useAutoUpdater';
import './styles/index.css';

// Lazy load views for better performance
const ToolsView = lazy(() => import('./components/views/ToolsView').then(m => ({ default: m.ToolsView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const PackagesView = lazy(() => import('./components/views/PackagesView').then(m => ({ default: m.PackagesView })));
const CacheView = lazy(() => import('./components/views/CacheView').then(m => ({ default: m.CacheView })));
const AiCleanupView = lazy(() => import('./components/views/AiCleanupView').then(m => ({ default: m.AiCleanupView })));
const ChatHistoryView = lazy(() => import('./components/views/ChatHistoryView').then(m => ({ default: m.ChatHistoryView })));
const ServicesView = lazy(() => import('./components/views/ServicesView').then(m => ({ default: m.ServicesView })));
const ConfigView = lazy(() => import('./components/views/ConfigView').then(m => ({ default: m.ConfigView })));
const AiCliView = lazy(() => import('./components/views/AiCliView').then(m => ({ default: m.AiCliView })));
const SecurityScanView = lazy(() => import('./components/views/SecurityScanView').then(m => ({ default: m.SecurityScanView })));

function LoadingFallback() {
  return (
    <div className="app-loading" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('View crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error">
          <h2 className="app-error-title">Something went wrong</h2>
          <p className="app-error-message">
            {this.state.error?.message}
          </p>
          <button
            className="btn btn-primary app-error-action"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CurrentView() {
  const currentView = useAppStore((state) => state.currentView);

  const viewComponents: Record<string, React.LazyExoticComponent<() => React.ReactElement>> = {
    tools: ToolsView,
    packages: PackagesView,
    cache: CacheView,
    ai_cleanup: AiCleanupView,
    chat_history: ChatHistoryView,
    services: ServicesView,
    config: ConfigView,
    ai_cli: AiCliView,
    security_scan: SecurityScanView,
    settings: SettingsView,
  };

  const ViewComponent = viewComponents[currentView] ?? ToolsView;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ViewComponent />
    </Suspense>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const currentView = useAppStore((state) => state.currentView);
  const {
    pendingUpdate,
    promptOpen,
    status,
    progress,
    confirmInstall,
    cancelInstall,
  } = useUpdater();
  const updateBusy = status === 'downloading' || status === 'installing' || status === 'restarting';

  const updateDescription = (() => {
    if (status === 'downloading') {
      return progress?.percent === undefined
        ? t('updater.downloading')
        : t('updater.downloading_progress', { progress: progress.percent });
    }
    if (status === 'installing') {
      return t('updater.installing');
    }
    if (status === 'restarting') {
      return t('updater.restarting');
    }
    return pendingUpdate ? t('updater.available', { version: pendingUpdate.version }) : '';
  })();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="content-area">
          <ErrorBoundary key={currentView}>
            <CurrentView />
          </ErrorBoundary>
        </div>
      </main>
      <ConfirmDialog
        open={promptOpen}
        title={t('updater.confirm_install_title')}
        description={updateDescription}
        confirmLabel={updateBusy ? t(`updater.${status}`) : t('updater.install')}
        busy={updateBusy}
        onConfirm={confirmInstall}
        onCancel={cancelInstall}
      />
    </div>
  );
}

function App() {
  return (
    <AutoUpdaterProvider>
      <AppContent />
    </AutoUpdaterProvider>
  );
}

export default App;
