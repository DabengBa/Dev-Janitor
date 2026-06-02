import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { scanAiJunk, deleteAiJunk, deleteMultipleAiJunk, AiJunkFile } from '../../ipc/commands';
import { useAppStore } from '../../store';
import { ConfirmDialog } from '../shared/ConfirmDialog';

type PendingAiCleanupDeleteAction =
    | { kind: 'selected'; paths: string[]; count: number }
    | { kind: 'single'; file: AiJunkFile };

export function AiCleanupView() {
    const { t } = useTranslation();

    // Use global store for state that should persist across page switches
    const junkFiles = useAppStore((state) => state.aiCleanupJunkFiles);
    const setJunkFiles = useAppStore((state) => state.setAiCleanupJunkFiles);
    const selectedFilesArray = useAppStore((state) => state.aiCleanupSelectedFiles);
    const setSelectedFilesArray = useAppStore((state) => state.setAiCleanupSelectedFiles);
    const scanPath = useAppStore((state) => state.aiCleanupScanPath);
    const setScanPath = useAppStore((state) => state.setAiCleanupScanPath);
    const scanDepth = useAppStore((state) => state.aiCleanupScanDepth);
    const setScanDepth = useAppStore((state) => state.setAiCleanupScanDepth);
    const filterType = useAppStore((state) => state.aiCleanupFilterType);
    const setFilterType = useAppStore((state) => state.setAiCleanupFilterType);

    // Local state for transient UI states
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<PendingAiCleanupDeleteAction | null>(null);

    // Convert array to Set for easier manipulation
    const selectedFiles = useMemo(() => new Set(selectedFilesArray), [selectedFilesArray]);
    const setSelectedFiles = useCallback((newSet: Set<string>) => {
        setSelectedFilesArray([...newSet]);
    }, [setSelectedFilesArray]);

    const scanJunkFiles = useCallback(async ({ preserveMessages = false }: { preserveMessages?: boolean } = {}) => {
        if (!scanPath.trim()) {
            setError(t('ai_cleanup.error_no_path'));
            return;
        }

        setIsScanning(true);
        if (!preserveMessages) {
            setError(null);
            setSuccess(null);
        }
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
    }, [scanPath, scanDepth, t, setJunkFiles]);

    const handleScan = useCallback(() => {
        void scanJunkFiles();
    }, [scanJunkFiles]);

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

        setPendingDelete({
            kind: 'selected',
            paths: [...selectedFiles],
            count: selectedFiles.size,
        });
    };

    const handleDeleteSingle = (file: AiJunkFile) => {
        setPendingDelete({ kind: 'single', file });
    };

    const confirmDelete = async () => {
        if (!pendingDelete) {
            return;
        }

        const action = pendingDelete;
        setPendingDelete(null);
        setIsDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            if (action.kind === 'selected') {
                const results = await deleteMultipleAiJunk(action.paths);
                const successCount = results.filter(r => r.Ok).length;
                const failCount = results.filter(r => r.Err).length;

                if (failCount > 0) {
                    const errors = results.filter(r => r.Err).map(r => r.Err).slice(0, 3).join('\n');
                    setError(t('ai_cleanup.partial_failed', { count: failCount, errors }));
                }

                if (successCount > 0) {
                    setSuccess(t('ai_cleanup.success_deleted', { count: successCount }));
                }
            } else {
                await deleteAiJunk(action.file.path);
                setSuccess(t('ai_cleanup.success_deleted_single', {
                    name: action.file.name,
                    size: action.file.size_display,
                }));
            }

            // Refresh
            setSelectedFiles(new Set());
            await scanJunkFiles({ preserveMessages: true });
        } catch (e) {
            setError(String(e));
        } finally {
            setIsDeleting(false);
        }
    };

    const { filteredFiles, typeStats, totalSize, selectedSize } = useMemo(() => {
        const nextFilteredFiles: AiJunkFile[] = [];
        const nextTypeStats: Record<string, number> = {};
        let nextTotalSize = 0;
        let nextSelectedSize = 0;

        for (const file of junkFiles) {
            nextTypeStats[file.junk_type] = (nextTypeStats[file.junk_type] || 0) + 1;

            if (filterType !== 'all' && file.junk_type !== filterType) {
                continue;
            }

            nextFilteredFiles.push(file);
            nextTotalSize += file.size;

            if (selectedFiles.has(file.path)) {
                nextSelectedSize += file.size;
            }
        }

        return {
            filteredFiles: nextFilteredFiles,
            typeStats: nextTypeStats,
            totalSize: nextTotalSize,
            selectedSize: nextSelectedSize,
        };
    }, [junkFiles, filterType, selectedFiles]);

    const formatSize = (bytes: number): string => {
        const KB = 1024;
        const MB = KB * 1024;
        const GB = MB * 1024;
        if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
        if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
        if (bytes >= KB) return `${(bytes / KB).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    const typeLabels = useMemo<Record<string, string>>(() => ({
        ai_tool: t('ai_cleanup.type_ai_tool'),
        temp_file: t('ai_cleanup.type_temp_file'),
        anomalous: t('ai_cleanup.type_anomalous'),
    }), [t]);

    const reasonDetails = useMemo<Record<string, string>>(() => ({
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
        'Cline cache': t('ai_cleanup.reasons.cline_cache'),
        'Cline history': t('ai_cleanup.reasons.cline_history'),
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
    }), [t]);

    const reasonPrefixes = useMemo<Record<string, string>>(() => ({
        'AI Tool': t('ai_cleanup.reason_prefix_ai_tool'),
        'Temp': t('ai_cleanup.reason_prefix_temp'),
    }), [t]);

    const translateReason = useCallback((reason: string) => {
        const match = reason.match(/^(AI Tool|Temp):\s*(.+?)\s*-\s*(.+)$/);
        if (match) {
            const [, prefix, pattern, detail] = match;
            const prefixLabel = reasonPrefixes[prefix] || `${prefix}:`;
            const detailLabel = reasonDetails[detail] || detail;
            return `${prefixLabel} ${pattern} - ${detailLabel}`;
        }

        return reasonDetails[reason] || reason;
    }, [reasonDetails, reasonPrefixes]);

    return (
        <div className="view-container ai-cleanup-view">
            <div className="view-header">
                <div>
                    <p className="text-secondary">{t('ai_cleanup.description')}</p>
                    {junkFiles.length > 0 && (
                        <p className="text-tertiary mt-4">
                            {t('ai_cleanup.found_summary', {
                                count: junkFiles.length,
                                size: formatSize(totalSize),
                            })}
                            {selectedFiles.size > 0 && (
                                <span className="badge badge-primary ml-8">
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
                            <span className="spinner spinner-sm" />
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
                                <span className="spinner spinner-sm" />
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
                                    <th className="col-w-5"></th>
                                    <th className="col-w-20">{t('ai_cleanup.filename')}</th>
                                    <th className="col-w-35">{t('ai_cleanup.path')}</th>
                                    <th className="col-w-10">{t('ai_cleanup.size')}</th>
                                    <th className="col-w-20">{t('ai_cleanup.reason')}</th>
                                    <th className="col-w-10">{t('tools.actions')}</th>
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

            <ConfirmDialog
                open={pendingDelete !== null}
                title={pendingDelete?.kind === 'single'
                    ? t('ai_cleanup.confirm_delete_single_title', { defaultValue: 'Delete File' })
                    : t('ai_cleanup.confirm_delete_title', { defaultValue: 'Delete Files' })}
                description={pendingDelete
                    ? pendingDelete.kind === 'single'
                        ? t('ai_cleanup.confirm_delete_single', { name: pendingDelete.file.name })
                        : t('ai_cleanup.confirm_delete', { count: pendingDelete.count })
                    : ''}
                danger
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
