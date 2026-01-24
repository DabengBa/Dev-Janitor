import { useTranslation } from 'react-i18next';
import { useAppStore, Theme } from '../../store';
import { changeLanguage } from '../../i18n';

export function SettingsView() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme, aiEndpoint, setAiEndpoint } = useAppStore();

    const themes: { value: Theme; label: string }[] = [
        { value: 'light', label: t('settings.theme_light') },
        { value: 'dark', label: t('settings.theme_dark') },
        { value: 'system', label: t('settings.theme_system') },
    ];

    return (
        <div className="view-container">
            <div className="card" style={{ maxWidth: 600 }}>
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

                {/* AI Endpoint */}
                <div className="setting-item">
                    <label className="setting-label">{t('settings.ai_endpoint')}</label>
                    <input
                        type="text"
                        className="setting-input"
                        placeholder={t('settings.ai_endpoint_placeholder')}
                        value={aiEndpoint}
                        onChange={(e) => setAiEndpoint(e.target.value)}
                    />
                </div>
            </div>

            <style>{`
        .view-container {
          padding: 0;
        }
        .setting-item {
          margin-bottom: var(--spacing-lg);
        }
        .setting-item:last-child {
          margin-bottom: 0;
        }
        .setting-label {
          display: block;
          font-weight: 500;
          margin-bottom: var(--spacing-sm);
          color: var(--color-text-primary);
        }
        .setting-options {
          display: flex;
          gap: var(--spacing-sm);
        }
        .setting-input {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: var(--font-size-sm);
        }
        .setting-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      `}</style>
        </div>
    );
}
