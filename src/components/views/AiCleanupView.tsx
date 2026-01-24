import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { scanAiJunk, deleteAiJunk, deleteMultipleAiJunk, AiJunkFile } from '../../ipc/commands';

export function AiCleanupView() {
    const { t } = useTranslation();
    const [junkFiles, setJunkFiles] = useState<AiJunkFile[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [scanPath, setScanPath] = useState('');
    const [scanDepth, setScanDepth] = useState(5);
    const [filterType, setFilterType] = useState<string>('all');

    const handleScan = useCallback(async () => {
        if (!scanPath.trim()) {
            setError(t('ai_cleanup.error_no_path'));
            return;
        }

        setIsScanning(true);
        setError(null);
        setSuccess(null);
        setSelectedFiles(new Set());

        try {
            const files = await scanAiJunk(scanPath, scanDepth);
            setJunkFiles(files);
            if (files.length === 0) {
                setSuccess(t('ai_cleanup.empty_result'));
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    }, [scanPath, scanDepth]);

    const toggleFileSelection = (path: string) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedFiles(newSelected);
    };

    const selectAll = () => {
        setSelectedFiles(new Set(filteredFiles.map(f => f.path)));
    };

    const deselectAll = () => {
        setSelectedFiles(new Set());
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            setError(t('ai_cleanup.error_no_selection'));
            return;
        }

        if (!confirm(t('ai_cleanup.confirm_delete', { count: selectedFiles.size }))) {
            return;
        }

        setIsDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            const results = await deleteMultipleAiJunk([...selectedFiles]);
            const successCount = results.filter(r => r.Ok).length;
            const failCount = results.filter(r => r.Err).length;

            if (failCount > 0) {
                const errors = results.filter(r => r.Err).map(r => r.Err).slice(0, 3).join('\n');
                setError(t('ai_cleanup.partial_failed', { count: failCount, errors }));
            }

            if (successCount > 0) {
                setSuccess(t('ai_cleanup.success_deleted', { count: successCount }));
            }

            // Refresh
            setSelectedFiles(new Set());
            await handleScan();
        } catch (e) {
            setError(String(e));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteSingle = async (file: AiJunkFile) => {
        if (!confirm(t('ai_cleanup.confirm_delete_single', { name: file.name }))) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await deleteAiJunk(file.path);
            setSuccess(t('ai_cleanup.success_deleted_single', { name: file.name, size: file.size_display }));
            await handleScan();
        } catch (e) {
            setError(String(e));
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter files
    const filteredFiles = junkFiles.filter(f => {
        if (filterType === 'all') return true;
        return f.junk_type === filterType;
    });

    // Group by type
    const typeStats = junkFiles.reduce((acc, f) => {
        acc[f.junk_type] = (acc[f.junk_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalSize = filteredFiles.reduce((sum, f) => sum + f.size, 0);
    const selectedSize = filteredFiles
        .filter(f => selectedFiles.has(f.path))
        .reduce((sum, f) => sum + f.size, 0);

    const formatSize = (bytes: number): string => {
        const KB = 1024;
        const MB = KB * 1024;
        const GB = MB * 1024;
        if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
        if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
        if (bytes >= KB) return `${(bytes / KB).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    const typeLabels: Record<string, string> = {
        ai_tool: t('ai_cleanup.type_ai_tool'),
        temp_file: t('ai_cleanup.type_temp_file'),
        anomalous: t('ai_cleanup.type_anomalous'),
    };

    const reasonDetails: Record<string, string> = {
        'Aider AI assistant cache': t('ai_cleanup.reasons.aider_cache'),
        'Aider chat history': t('ai_cleanup.reasons.aider_chat_history'),
        'Aider input history': t('ai_cleanup.reasons.aider_input_history'),
        'Aider tags cache': t('ai_cleanup.reasons.aider_tags_cache'),
        'Claude AI cache directory': t('ai_cleanup.reasons.claude_cache'),
        'Claude configuration': t('ai_cleanup.reasons.claude_config'),
        'Claude config backup': t('ai_cleanup.reasons.claude_config_backup'),
        'Claude output directory': t('ai_cleanup.reasons.claude_output'),
        'Cursor AI cache': t('ai_cleanup.reasons.cursor_cache'),
        'Cursor ignore file': t('ai_cleanup.reasons.cursor_ignore'),
        'Cursor rules file': t('ai_cleanup.reasons.cursor_rules'),
        'GitHub Copilot cache': t('ai_cleanup.reasons.copilot_cache'),
        'Codeium AI cache': t('ai_cleanup.reasons.codeium_cache'),
        'Tabnine AI cache': t('ai_cleanup.reasons.tabnine_cache'),
        'OpenAI Codex cache': t('ai_cleanup.reasons.codex_cache'),
        'Continue AI cache': t('ai_cleanup.reasons.continue_cache'),
        'Amazon Q cache': t('ai_cleanup.reasons.amazonq_cache'),
        'CodeWhisperer cache': t('ai_cleanup.reasons.codewhisperer_cache'),
        'Windows NUL file (often created by AI tools)': t('ai_cleanup.reasons.windows_nul'),
        'Generic AI cache': t('ai_cleanup.reasons.generic_ai_cache'),
        'LLM cache directory': t('ai_cleanup.reasons.llm_cache'),
        'Temporary file': t('ai_cleanup.reasons.temp_file'),
        'Backup file': t('ai_cleanup.reasons.backup_file'),
        'Original file backup': t('ai_cleanup.reasons.original_backup'),
        'Old file': t('ai_cleanup.reasons.old_file'),
        'Editor temporary file': t('ai_cleanup.reasons.editor_temp'),
        'Vim swap file': t('ai_cleanup.reasons.vim_swap'),
        'macOS metadata': t('ai_cleanup.reasons.macos_metadata'),
        'Windows thumbnail cache': t('ai_cleanup.reasons.windows_thumbs'),
        'Windows desktop config': t('ai_cleanup.reasons.windows_desktop'),
        'Zero-byte file': t('ai_cleanup.reasons.zero_byte'),
        'Suspicious single-character name': t('ai_cleanup.reasons.suspicious_char'),
        'Name contains only special characters': t('ai_cleanup.reasons.special_chars'),
    };

    const reasonPrefixes: Record<string, string> = {
        'AI Tool': t('ai_cleanup.reason_prefix_ai_tool'),
        'Temp': t('ai_cleanup.reason_prefix_temp'),
    };

    const translateReason = (reason: string) => {
        const match = reason.match(/^(AI Tool|Temp):\\s*(.+?)\\s*-\\s*(.+)$/);
        if (match) {
            const [, prefix, pattern, detail] = match;
            const prefixLabel = reasonPrefixes[prefix] || `${prefix}:`;
            const detailLabel = reasonDetails[detail] || detail;
            return `${prefixLabel} ${pattern} - ${detailLabel}`;
        }

        return reasonDetails[reason] || reason;
    };

    return (
        <div className="view-container">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('ai_cleanup.description')}</p>
                    {junkFiles.length > 0 && (
                        <p className="text-tertiary" style={{ marginTop: 4 }}>
                            {t('ai_cleanup.found_summary', {
                                count: junkFiles.length,
                                size: formatSize(totalSize),
                            })}
                            {selectedFiles.size > 0 && (
                                <span className="badge badge-primary" style={{ marginLeft: 8 }}>
                                    {t('ai_cleanup.selected_summary', {
                                        count: selectedFiles.size,
                                        size: formatSize(selectedSize),
                                    })}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                {selectedFiles.size > 0 && (
                    <button
                        className="btn btn-danger"
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                        ) : (
                            t('ai_cleanup.delete_selected')
                        )}
                    </button>
                )}
            </div>

            {/* Scan Controls */}
            <div className="card scan-controls">
                <div className="scan-row">
                    <input
                        type="text"
                        className="path-input"
                        placeholder={t('ai_cleanup.scan_placeholder')}
                        value={scanPath}
                        onChange={(e) => setScanPath(e.target.value)}
                    />
                    <select
                        className="depth-select"
                        value={scanDepth}
                        onChange={(e) => setScanDepth(Number(e.target.value))}
                    >
                        <option value={3}>{t('ai_cleanup.depth_option', { depth: 3 })}</option>
                        <option value={5}>{t('ai_cleanup.depth_option', { depth: 5 })}</option>
                        <option value={10}>{t('ai_cleanup.depth_option', { depth: 10 })}</option>
                        <option value={20}>{t('ai_cleanup.depth_option', { depth: 20 })}</option>
                    </select>
                    <button
                        className="btn btn-primary"
                        onClick={handleScan}
                        disabled={isScanning || !scanPath.trim()}
                    >
                        {isScanning ? (
                            <>
                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                {t('ai_cleanup.scanning')}
                            </>
                        ) : (
                            t('ai_cleanup.scan')
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="card message-card error-card">
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="card message-card success-card">
                    <p>{success}</p>
                </div>
            )}

            {/* Filters */}
            {junkFiles.length > 0 && (
                <div className="filter-bar">
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterType('all')}
                        >
                            {t('ai_cleanup.filter_all')} ({junkFiles.length})
                        </button>
                        {Object.entries(typeStats).map(([type, count]) => (
                            <button
                                key={type}
                                className={`filter-btn ${filterType === type ? 'active' : ''}`}
                                onClick={() => setFilterType(type)}
                            >
                                {typeLabels[type] || type} ({count})
                            </button>
                        ))}
                    </div>
                    <div className="select-actions">
                        <button className="btn btn-secondary btn-small" onClick={selectAll}>
                            {t('common.select_all')}
                        </button>
                        <button className="btn btn-secondary btn-small" onClick={deselectAll}>
                            {t('common.deselect_all')}
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            {filteredFiles.length > 0 && (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}></th>
                                    <th style={{ width: '20%' }}>{t('ai_cleanup.filename')}</th>
                                    <th style={{ width: '35%' }}>{t('ai_cleanup.path')}</th>
                                    <th style={{ width: '10%' }}>{t('ai_cleanup.size')}</th>
                                    <th style={{ width: '20%' }}>{t('ai_cleanup.reason')}</th>
                                    <th style={{ width: '10%' }}>{t('tools.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.map((file) => (
                                    <tr key={file.id} className={selectedFiles.has(file.path) ? 'selected-row' : ''}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.has(file.path)}
                                                onChange={() => toggleFileSelection(file.path)}
                                            />
                                        </td>
                                        <td>
                                            <strong>{file.name}</strong>
                                            <span className={`type-badge ${file.junk_type}`}>
                                                {typeLabels[file.junk_type] || file.junk_type}
                                            </span>
                                        </td>
                                        <td className="path-cell">{file.path}</td>
                                        <td className="size-cell">{file.size_display}</td>
                                        <td className="reason-cell">{translateReason(file.reason)}</td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-small"
                                                onClick={() => handleDeleteSingle(file)}
                                                disabled={isDeleting}
                                            >
                                                {t('ai_cleanup.delete')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
        .scan-controls {
          padding: var(--spacing-md);
        }
        .scan-row {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          flex-wrap: wrap;
        }
        .path-input {
          flex: 1;
          min-width: 300px;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font-size: var(--font-size-sm);
        }
        .depth-select {
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
        }
        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }
        .filter-buttons {
          display: flex;
          gap: var(--spacing-xs);
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-sm);
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          cursor: pointer;
          font-size: var(--font-size-sm);
        }
        .filter-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .select-actions {
          display: flex;
          gap: var(--spacing-sm);
        }
        .path-cell {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 11px;
          color: var(--color-text-secondary);
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .size-cell {
          font-weight: 600;
          color: var(--color-warning);
        }
        .reason-cell {
          font-size: 12px;
          color: var(--color-text-tertiary);
        }
        .type-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          text-transform: uppercase;
        }
        .type-badge.ai_tool {
          background: rgba(114, 46, 209, 0.2);
          color: #722ed1;
        }
        .type-badge.temp_file {
          background: rgba(250, 173, 20, 0.2);
          color: #faad14;
        }
        .type-badge.anomalous {
          background: rgba(255, 77, 79, 0.2);
          color: #ff4d4f;
        }
        .selected-row {
          background: rgba(24, 144, 255, 0.1) !important;
        }
        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }
        .btn-danger {
          background: var(--color-danger);
          color: white;
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
