import { useTranslation } from 'react-i18next';
import { useAppStore, Theme } from '../../store';
import { changeLanguage } from '../../i18n';
import { useUpdater } from '../../hooks/useAutoUpdater';

export function SettingsView() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useAppStore();
    const {
        currentVersion,
        isTauri,
        pendingUpdate,
        status,
        progress,
        error,
        checkForUpdates,
        requestInstall,
    } = useUpdater();

    const themes: { value: Theme; label: string }[] = [
        { value: 'light', label: t('settings.theme_light') },
        { value: 'dark', label: t('settings.theme_dark') },
        { value: 'system', label: t('settings.theme_system') },
    ];

    const updateBusy = status === 'checking' || status === 'downloading' || status === 'installing' || status === 'restarting';
    const updateStatus = (() => {
        switch (status) {
            case 'checking':
                return t('updater.checking');
            case 'available':
                return t('updater.available_short', { version: pendingUpdate?.version });
            case 'up-to-date':
                return t('updater.up_to_date');
            case 'downloading':
                return progress?.percent === undefined
                    ? t('updater.downloading')
                    : t('updater.downloading_progress', { progress: progress.percent });
            case 'installing':
                return t('updater.installing');
            case 'restarting':
                return t('updater.restarting');
            case 'unsupported':
                return t('updater.unsupported');
            case 'error':
                return error ? t('updater.failed_detail', { error }) : t('updater.failed');
            default:
                return t('updater.ready');
        }
    })();

    const updateAction = status === 'available' && pendingUpdate ? requestInstall : () => void checkForUpdates();
    const updateActionLabel = status === 'available' && pendingUpdate
        ? t('updater.install')
        : status === 'error'
            ? t('updater.retry')
            : t('updater.check');

    return (
        <div className="view-container settings-view">
            <div className="card settings-card">
                {/* Theme */}
                <div className="setting-item">
                    <label className="setting-label">{t('settings.theme')}</label>
                    <div className="setting-options">
                        {themes.map((item) => (
                            <button
                                key={item.value}
                                className={`btn ${theme === item.value ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setTheme(item.value)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Language */}
                <div className="setting-item">
                    <label className="setting-label">{t('settings.language')}</label>
                    <div className="setting-options">
                        <button
                            className={`btn ${i18n.language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => changeLanguage('en')}
                        >
                            {t('settings.language_en')}
                        </button>
                        <button
                            className={`btn ${i18n.language === 'zh' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => changeLanguage('zh')}
                        >
                            {t('settings.language_zh')}
                        </button>
                    </div>
                </div>

                <div className="setting-item">
                    <label className="setting-label">{t('settings.updates')}</label>
                    <div className="setting-update-row">
                        <div className="setting-update-copy">
                            <div className="setting-version">
                                {t('settings.current_version')}: v{currentVersion.replace(/^v/, '')}
                            </div>
                            <div className={`setting-update-status is-${status}`} role="status">
                                {updateStatus}
                            </div>
                            {status === 'downloading' && (
                                <div
                                    className="update-progress"
                                    role="progressbar"
                                    aria-label={t('updater.downloading')}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={progress?.percent}
                                >
                                    <span style={{ width: `${progress?.percent ?? 0}%` }} />
                                </div>
                            )}
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={updateAction}
                            disabled={!isTauri || updateBusy}
                        >
                            {updateBusy && <span className="spinner spinner-xs" aria-hidden="true" />}
                            {updateActionLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
