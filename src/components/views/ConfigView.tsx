import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { diagnoseEnv, EnvDiagnosis } from '../../ipc/commands';

export function ConfigView() {
    const { t } = useTranslation();
    const [diagnosis, setDiagnosis] = useState<EnvDiagnosis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'path' | 'shell' | 'issues'>('path');
    const [showDevOnly, setShowDevOnly] = useState(false);

    const handleDiagnose = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await diagnoseEnv();
            setDiagnosis(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Filter PATH entries
    const filteredPaths = diagnosis?.path_entries.filter(p =>
        !showDevOnly || p.is_dev_related
    ) || [];

    const existingShellConfigs = diagnosis?.shell_configs.filter(c => c.exists) || [];

    const severityColors: Record<string, string> = {
        error: '#ff4d4f',
        warning: '#faad14',
        info: '#1890ff',
    };

    return (
        <div className="view-container">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('config.description')}</p>
                    {diagnosis && (
                        <p className="text-tertiary" style={{ marginTop: 4 }}>
                            {t('config.summary', {
                                paths: diagnosis.path_entries.length,
                                configs: existingShellConfigs.length,
                            })}
                        </p>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleDiagnose}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                            {t('config.diagnosing')}
                        </>
                    ) : (
                        t('config.diagnose')
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'path' ? 'active' : ''}`}
                    onClick={() => setActiveTab('path')}
                >
                    {t('config.tab_path')}
                    {diagnosis && (
                        <span className="tab-count">{diagnosis.path_entries.length}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'shell' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shell')}
                >
                    {t('config.tab_shell')}
                    {diagnosis && (
                        <span className="tab-count">{existingShellConfigs.length}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
                    onClick={() => setActiveTab('issues')}
                >
                    {t('config.tab_issues')}
                    {diagnosis && diagnosis.issues.length > 0 && (
                        <span className="tab-count warning">{diagnosis.issues.length}</span>
                    )}
                </button>
            </div>

            {error && (
                <div className="card message-card error-card">
                    <p>{error}</p>
                </div>
            )}

            {/* PATH Tab */}
            {activeTab === 'path' && diagnosis && (
                <div className="tab-content">
                    <div className="filter-bar">
                        <label className="filter-checkbox">
                            <input
                                type="checkbox"
                                checked={showDevOnly}
                                onChange={(e) => setShowDevOnly(e.target.checked)}
                            />
                            {t('config.filter_dev_only')}
                        </label>
                    </div>

                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '5%' }}>{t('config.table_index')}</th>
                                        <th style={{ width: '45%' }}>{t('config.table_path')}</th>
                                        <th style={{ width: '15%' }}>{t('config.table_category')}</th>
                                        <th style={{ width: '10%' }}>{t('config.table_exists')}</th>
                                        <th style={{ width: '25%' }}>{t('config.table_issues')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPaths.map((entry, idx) => (
                                        <tr key={idx} className={entry.issues.length > 0 ? 'issue-row' : ''}>
                                            <td>{idx + 1}</td>
                                            <td className="path-cell">{entry.path}</td>
                                            <td>
                                                <span className={`category-badge ${entry.is_dev_related ? 'dev' : 'system'}`}>
                                                    {entry.category}
                                                </span>
                                            </td>
                                            <td>
                                                {entry.exists ? (
                                                    <span className="status-ok">{t('common.yes')}</span>
                                                ) : (
                                                    <span className="status-error">{t('common.no')}</span>
                                                )}
                                            </td>
                                            <td>
                                                {entry.issues.length > 0 && (
                                                    <span className="issue-text">
                                                        {entry.issues.join(', ')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Shell Configs Tab */}
            {activeTab === 'shell' && diagnosis && (
                <div className="tab-content">
                    {existingShellConfigs.length === 0 ? (
                        <div className="card empty-state">
                            <p>{t('config.no_shell_configs')}</p>
                        </div>
                    ) : (
                        <div className="shell-configs">
                            {existingShellConfigs.map((config, idx) => (
                                <div key={idx} className="card shell-config">
                                    <div className="config-header">
                                        <h4>{config.name}</h4>
                                        <span className="config-path">{config.path}</span>
                                    </div>

                                    {config.dev_exports.length > 0 && (
                                        <div className="exports-section">
                                            <h5>{t('config.dev_exports', { count: config.dev_exports.length })}</h5>
                                            <pre className="exports-code">
                                                {config.dev_exports.join('\n')}
                                            </pre>
                                        </div>
                                    )}

                                    {config.issues.length > 0 && (
                                        <div className="config-issues">
                                            {config.issues.map((issue, i) => (
                                                <span key={i} className="issue-badge">{issue}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Issues Tab */}
            {activeTab === 'issues' && diagnosis && (
                <div className="tab-content">
                    {diagnosis.issues.length === 0 && diagnosis.suggestions.length === 0 ? (
                        <div className="card success-card">
                            <p>{t('config.no_issues')}</p>
                        </div>
                    ) : (
                        <>
                            {diagnosis.issues.length > 0 && (
                                <div className="card">
                                    <h4 className="section-title">{t('config.issues_found')}</h4>
                                    <div className="issues-list">
                                        {diagnosis.issues.map((issue, idx) => (
                                            <div key={idx} className="issue-item">
                                                <span
                                                    className="severity-badge"
                                                    style={{ backgroundColor: severityColors[issue.severity] }}
                                                >
                                                    {issue.severity}
                                                </span>
                                                <div className="issue-content">
                                                    <strong className="issue-category">{issue.category}</strong>
                                                    <p className="issue-message">{issue.message}</p>
                                                    {issue.suggestion && (
                                                        <p className="issue-suggestion">
                                                            {t('config.suggestion', { suggestion: issue.suggestion })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {diagnosis.suggestions.length > 0 && (
                                <div className="card">
                                    <h4 className="section-title">{t('config.suggestions')}</h4>
                                    <ul className="suggestions-list">
                                        {diagnosis.suggestions.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <style>{`
        .view-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border);
        }
        .tab {
          padding: var(--spacing-sm) var(--spacing-lg);
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab:hover {
          color: var(--color-primary);
        }
        .tab.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }
        .tab-count {
          background: var(--color-bg-tertiary);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
        }
        .tab-count.warning {
          background: rgba(250, 173, 20, 0.2);
          color: #faad14;
        }
        .tab-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .filter-bar {
          display: flex;
          gap: var(--spacing-md);
        }
        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: var(--font-size-sm);
          cursor: pointer;
        }
        .path-cell {
          font-family: 'Consolas', monospace;
          font-size: 12px;
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .category-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }
        .category-badge.dev {
          background: rgba(82, 196, 26, 0.2);
          color: #52c41a;
        }
        .category-badge.system {
          background: var(--color-bg-tertiary);
          color: var(--color-text-tertiary);
        }
        .status-ok {
          color: #52c41a;
          font-weight: bold;
        }
        .status-error {
          color: #ff4d4f;
          font-weight: bold;
        }
        .issue-row {
          background: rgba(250, 173, 20, 0.05) !important;
        }
        .issue-text {
          font-size: 11px;
          color: #faad14;
        }
        .shell-configs {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .shell-config {
          padding: var(--spacing-md);
        }
        .config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        .config-header h4 {
          margin: 0;
          color: var(--color-primary);
        }
        .config-path {
          font-family: 'Consolas', monospace;
          font-size: 11px;
          color: var(--color-text-tertiary);
        }
        .exports-section h5 {
          margin: 0 0 8px 0;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
        .exports-code {
          background: var(--color-bg-tertiary);
          padding: var(--spacing-sm);
          border-radius: var(--border-radius-sm);
          font-family: 'Consolas', monospace;
          font-size: 11px;
          overflow-x: auto;
          margin: 0;
        }
        .config-issues {
          margin-top: var(--spacing-sm);
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }
        .issue-badge {
          background: rgba(250, 173, 20, 0.2);
          color: #faad14;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }
        .section-title {
          margin: 0 0 var(--spacing-md) 0;
          font-size: var(--font-size-md);
        }
        .issues-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .issue-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-sm);
          background: var(--color-bg-secondary);
          border-radius: var(--border-radius-sm);
        }
        .severity-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          color: white;
          text-transform: uppercase;
          flex-shrink: 0;
          height: fit-content;
        }
        .issue-content {
          flex: 1;
        }
        .issue-category {
          font-size: var(--font-size-sm);
        }
        .issue-message {
          margin: 4px 0;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
        .issue-suggestion {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: var(--color-text-tertiary);
        }
        .suggestions-list {
          margin: 0;
          padding-left: var(--spacing-lg);
        }
        .suggestions-list li {
          margin-bottom: var(--spacing-sm);
          color: var(--color-text-secondary);
        }
        .message-card {
          padding: var(--spacing-md);
        }
        .error-card {
          border-color: var(--color-danger);
          background-color: rgba(255, 77, 79, 0.1);
          color: var(--color-danger);
        }
        .success-card {
          border-color: var(--color-success);
          background-color: rgba(82, 196, 26, 0.1);
          color: var(--color-success);
        }
      `}</style>
        </div>
    );
}
