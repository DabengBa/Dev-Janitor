import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getAiCliTools, installAiTool, updateAiTool, uninstallAiTool } from '../../ipc/commands';
import { useAppStore, AiCliToolStore } from '../../store';
import { ConfirmDialog } from '../shared/ConfirmDialog';

export function AiCliView() {
    const { t } = useTranslation();

    // Use global store for data that should persist
    const tools = useAppStore((state) => state.aiCliToolsData);
    const setTools = useAppStore((state) => state.setAiCliToolsData);

    // Local state for transient UI
    const [isLoading, setIsLoading] = useState(false);
    const [isOperating, setIsOperating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const getToolDisplayName = (tool: AiCliToolStore) =>
        t(`ai_cli.tools.${tool.id}.name`, { defaultValue: tool.name });
    const getToolDescription = (tool: AiCliToolStore) =>
        t(`ai_cli.tools.${tool.id}.description`, { defaultValue: tool.description });

    const refreshToolsData = useCallback(async ({ preserveMessages = false }: { preserveMessages?: boolean } = {}) => {
        setIsLoading(true);
        if (!preserveMessages) {
            setError(null);
            setSuccess(null);
        }

        try {
            const result = await getAiCliTools();
            setTools(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    }, [setTools]);

    const handleRefresh = useCallback(() => {
        void refreshToolsData();
    }, [refreshToolsData]);

    const [pendingAction, setPendingAction] = useState<{
        type: 'install' | 'update' | 'uninstall';
        tool: AiCliToolStore;
    } | null>(null);

    const handleInstall = (tool: AiCliToolStore) => {
        if (!tool.install_supported) {
            window.open(tool.docs_url, '_blank');
            return;
        }
        setPendingAction({ type: 'install', tool });
    };

    const handleUpdate = (tool: AiCliToolStore) => {
        if (!tool.update_supported) {
            window.open(tool.migration_url ?? tool.docs_url, '_blank');
            return;
        }
        setPendingAction({ type: 'update', tool });
    };

    const handleUninstall = (tool: AiCliToolStore) => {
        if (!tool.uninstall_supported) {
            window.open(tool.docs_url, '_blank');
            return;
        }
        setPendingAction({ type: 'uninstall', tool });
    };

    const confirmAction = async () => {
        if (!pendingAction) return;
        const { type, tool } = pendingAction;
        const toolName = getToolDisplayName(tool);
        setPendingAction(null);

        setIsOperating(`${type}-${tool.id}`);
        setError(null);
        setSuccess(null);

        try {
            let result: string;
            let message: string;
            if (type === 'install') {
                result = await installAiTool(tool.id);
                message = t('ai_cli.success_install', { name: toolName });
            } else if (type === 'update') {
                result = await updateAiTool(tool.id);
                message = tool.support_status === 'legacy'
                    ? t('ai_cli.success_migrate', { name: toolName })
                    : t('ai_cli.success_update', { name: toolName });
            } else {
                result = await uninstallAiTool(tool.id);
                message = t('ai_cli.success_uninstall', { name: toolName });
            }
            setSuccess(result.trim() ? `${message}\n${result}` : message);
            await refreshToolsData({ preserveMessages: true });
        } catch (e) {
            setError(String(e));
        } finally {
            setIsOperating(null);
        }
    };

    const getPendingDescription = () => {
        if (!pendingAction) return '';
        const { type, tool } = pendingAction;
        const name = getToolDisplayName(tool);
        if (type === 'install')
            return t('ai_cli.confirm_install', { name, command: tool.install_command });
        if (type === 'update')
            return tool.support_status === 'legacy'
                ? t('ai_cli.confirm_migrate', { name })
                : t('ai_cli.confirm_update', { name });
        return t('ai_cli.confirm_uninstall', { name });
    };

    const installedCount = tools.filter(t => t.installed).length;

    return (
        <div className="view-container ai-cli-view">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('ai_cli.description')}</p>
                    {tools.length > 0 && (
                        <p className="text-tertiary mt-4">
                            {t('ai_cli.installed_summary', { installed: installedCount, total: tools.length })}
                        </p>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner spinner-sm" />
                            {t('ai_cli.scanning')}
                        </>
                    ) : (
                        t('common.refresh')
                    )}
                </button>
            </div>

            {error && (
                <div className="card message-card error-card">
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="card message-card success-card">
                    <pre className="m-0 pre-wrap">{success}</pre>
                </div>
            )}

            {tools.length > 0 && (
                <div className="tools-grid">
                    {tools.map((tool) => (
                        <div key={tool.id} className={`card tool-card ${tool.installed ? 'installed' : ''} ${tool.support_status}`}>
                            <div className="tool-header">
                                <h4>{getToolDisplayName(tool)}</h4>
                                <div className="tool-statuses">
                                    {tool.support_status === 'legacy' && (
                                        <span className="status-badge legacy">{t('ai_cli.status_legacy')}</span>
                                    )}
                                    {tool.installed ? (
                                        <span className="status-badge installed">{t('ai_cli.status_installed')}</span>
                                    ) : (
                                        <span className="status-badge not-installed">{t('ai_cli.status_not_installed')}</span>
                                    )}
                                </div>
                            </div>
                            <p className="tool-description">{getToolDescription(tool)}</p>
                            {tool.support_status === 'legacy' && (
                                <p className="tool-notice">
                                    {t(`ai_cli.tools.${tool.id}.notice`, { defaultValue: t('ai_cli.legacy_notice') })}
                                </p>
                            )}
                            {tool.version && (
                                <p className="tool-version">v{tool.version}</p>
                            )}
                            <div className="tool-actions">
                                {tool.installed ? (
                                    <>
                                        {tool.update_supported && (
                                            <button
                                                className="btn btn-primary btn-small"
                                                onClick={() => handleUpdate(tool)}
                                                disabled={isOperating !== null}
                                            >
                                                {isOperating === `update-${tool.id}` ? (
                                                    <span className="spinner spinner-xs" />
                                                ) : tool.support_status === 'legacy' ? (
                                                    t('ai_cli.migrate')
                                                ) : (
                                                    t('ai_cli.update')
                                                )}
                                            </button>
                                        )}
                                        {tool.uninstall_supported && (
                                            <button
                                                className="btn btn-danger btn-small"
                                                onClick={() => handleUninstall(tool)}
                                                disabled={isOperating !== null}
                                            >
                                                {isOperating === `uninstall-${tool.id}` ? (
                                                    <span className="spinner spinner-xs" />
                                                ) : (
                                                    t('ai_cli.uninstall')
                                                )}
                                            </button>
                                        )}
                                    </>
                                ) : tool.install_supported ? (
                                    <button
                                        className="btn btn-primary btn-small"
                                        onClick={() => handleInstall(tool)}
                                        disabled={isOperating !== null}
                                    >
                                        {isOperating === `install-${tool.id}` ? (
                                            <span className="spinner spinner-xs" />
                                        ) : (
                                            t('ai_cli.install')
                                        )}
                                    </button>
                                ) : null}
                                <a
                                    href={tool.migration_url ?? tool.docs_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-small"
                                >
                                    {tool.support_status === 'legacy'
                                        ? t('ai_cli.migration_guide')
                                        : t('ai_cli.docs')}
                                </a>
                            </div>

                            {tool.config_paths && tool.config_paths.length > 0 && (
                                <div className="config-section">
                                    <h5>{t('ai_cli.config_files')}</h5>
                                    <div className="config-list">
                                        {tool.config_paths.map((config, idx) => (
                                            <div key={idx} className={`config-item ${config.exists ? 'exists' : 'missing'}`}>
                                                <span className="config-name">{config.name}</span>
                                                <span className="config-path" title={config.path}>
                                                    {config.path}
                                                </span>
                                                <span className={`config-status ${config.exists ? 'exists' : 'missing'}`}>
                                                    {config.exists ? t('ai_cli.config_exists') : t('ai_cli.config_missing')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tools.length === 0 && !isLoading && (
                <div className="card empty-state">
                    <p>{t('ai_cli.empty')}</p>
                </div>
            )}

            <ConfirmDialog
                open={pendingAction !== null}
                title={pendingAction?.type === 'uninstall'
                    ? t('ai_cli.confirm_uninstall_title', { defaultValue: 'Uninstall Tool' })
                    : pendingAction?.type === 'update'
                    ? pendingAction.tool.support_status === 'legacy'
                        ? t('ai_cli.confirm_migrate_title', { defaultValue: 'Migrate Tool' })
                        : t('ai_cli.confirm_update_title', { defaultValue: 'Update Tool' })
                    : t('ai_cli.confirm_install_title', { defaultValue: 'Install Tool' })
                }
                description={getPendingDescription()}
                danger={pendingAction?.type === 'uninstall'}
                onConfirm={confirmAction}
                onCancel={() => setPendingAction(null)}
            />
        </div>
    );
}
