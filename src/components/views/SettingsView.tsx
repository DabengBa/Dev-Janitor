import { useTranslation } from 'react-i18next';
import { useAppStore, Theme } from '../../store';
import { changeLanguage } from '../../i18n';

export function SettingsView() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useAppStore();

    const themes: { value: Theme; label: string }[] = [
        { value: 'light', label: t('settings.theme_light') },
        { value: 'dark', label: t('settings.theme_dark') },
        { value: 'system', label: t('settings.theme_system') },
    ];

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
            </div>
        </div>
    );
}
