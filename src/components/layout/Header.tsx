import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import { changeLanguage } from '../../i18n';

export function Header() {
    const { t, i18n } = useTranslation();
    const { currentView, theme, setTheme } = useAppStore();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'zh' : 'en';
        changeLanguage(newLang);
    };

    const cycleTheme = () => {
        const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setTheme(nextTheme);
    };

    const getThemeIcon = () => {
        switch (theme) {
            case 'light':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                );
            case 'dark':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                );
            default:
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                );
        }
    };

    return (
        <header className="header">
            <h1 className="header-title">{t(`nav.${currentView}`)}</h1>
            <div className="header-actions">
                <button
                    className="btn-icon"
                    onClick={toggleLanguage}
                    title={t('settings.language')}
                >
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                        {i18n.language === 'en' ? '\u4e2d\u6587' : 'EN'}
                    </span>
                </button>
                <button
                    className="btn-icon"
                    onClick={cycleTheme}
                    title={t(`settings.theme_${theme}`)}
                >
                    {getThemeIcon()}
                </button>
            </div>
        </header>
    );
}
