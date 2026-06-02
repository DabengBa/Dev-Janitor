import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
    ChatHistoryFile,
    ProjectChatHistory,
    deleteChatFile,
    deleteMultipleChatFiles,
    scanChatHistory,
    scanGlobalChatHistory,
} from '../../ipc/commands';

type PendingChatDeleteAction =
    | {
        kind: 'selected';
        paths: string[];
        count: number;
        sizeDisplay: string;
        tab: 'projects' | 'global';
    }
    | {
        kind: 'single';
        file: ChatHistoryFile;
        tab: 'projects' | 'global';
    };

export function ChatHistoryView() {
    const { t } = useTranslation();

    // Local state (will migrate to global store if needed)
    const [projects, setProjects] = useState<ProjectChatHistory[]>([]);
    const [globalFiles, setGlobalFiles] = useState<ChatHistoryFile[]>([]);
    const [scanPath, setScanPath] = useState('');
    const [scanDepth, setScanDepth] = useState(3);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'global'>('projects');
    const [error, setError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<PendingChatDeleteAction | null>(null);

    const { totalProjectSize, totalGlobalSize, selectedFilesArray, selectedSize } = useMemo(() => {
        let nextTotalProjectSize = 0;
        let nextTotalGlobalSize = 0;
        let nextSelectedSize = 0;

        for (const project of projects) {
            nextTotalProjectSize += project.total_size;

            for (const file of project.chat_files) {
                if (selectedFiles.has(file.path)) {
                    nextSelectedSize += file.size;
                }
            }
        }

        for (const file of globalFiles) {
            nextTotalGlobalSize += file.size;

            if (selectedFiles.has(file.path)) {
                nextSelectedSize += file.size;
            }
        }

        return {
            totalProjectSize: nextTotalProjectSize,
            totalGlobalSize: nextTotalGlobalSize,
            selectedFilesArray: Array.from(selectedFiles),
            selectedSize: nextSelectedSize,
        };
    }, [projects, globalFiles, selectedFiles]);

    // Format size helper
    const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        }
        return `${bytes} B`;
    };

    // Scan for projects with chat history
    const handleScanProjects = async () => {
        if (!scanPath.trim()) {
            setError(t('chat_history.error_no_path'));
            return;
        }

        setIsScanning(true);
        setError(null);
        setSelectedFiles(new Set());
        setExpandedProjects(new Set());
        try {
            const result = await scanChatHistory(scanPath, scanDepth);
            setProjects(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    };

    // Scan global AI directories
    const handleScanGlobal = async () => {
        setIsScanning(true);
        setError(null);
        setSelectedFiles(new Set());
        try {
            const result = await scanGlobalChatHistory();
            setGlobalFiles(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsScanning(false);
        }
    };

    // Toggle project expansion
    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    // Toggle file selection
    const toggleFileSelection = (path: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    // Select all files in a project
    const selectAllInProject = (project: ProjectChatHistory) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            const allSelected = project.chat_files.every(f => prev.has(f.path));
            if (allSelected) {
                project.chat_files.forEach(f => next.delete(f.path));
            } else {
                project.chat_files.forEach(f => next.add(f.path));
            }
            return next;
        });
    };

    // Delete selected files
    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) {
            setError(t('chat_history.error_no_selection'));
            return;
        }

        setPendingDelete({
            kind: 'selected',
            paths: selectedFilesArray,
            count: selectedFiles.size,
            sizeDisplay: formatSize(selectedSize),
            tab: activeTab,
        });
    };

    const confirmDelete = async () => {
        if (!pendingDelete) {
            return;
        }

        const action = pendingDelete;
        setPendingDelete(null);
        setIsDeleting(true);
        setError(null);
        try {
            if (action.kind === 'selected') {
                const result = await deleteMultipleChatFiles(action.paths);
                const [success, fail, errors] = result;

                if (success > 0) {
                    if (action.tab === 'projects') {
                        await handleScanProjects();
                    } else {
                        await handleScanGlobal();
                    }
                    setSelectedFiles(new Set());
                }

                if (fail > 0) {
                    setError(t('chat_history.partial_failed', {
                        count: fail,
                        errors: errors.slice(0, 3).join('\n'),
                    }));
                }
            } else {
                await deleteChatFile(action.file.path);
                if (action.tab === 'projects') {
                    await handleScanProjects();
                } else {
                    await handleScanGlobal();
                }
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setIsDeleting(false);
        }
    };

    // Delete single file
    const handleDeleteFile = (file: ChatHistoryFile) => {
        setPendingDelete({
            kind: 'single',
            file,
            tab: activeTab,
        });
    };

    // Get file type badge color
    const getFileTypeBadgeClass = (fileType: string): string => {
        switch (fileType) {
            case 'chat_history':
                return 'badge-primary';
            case 'cache':
                return 'badge-warning';
            case 'debug':
                return 'badge-secondary';
            case 'global_config':
                return 'badge-info';
            default:
                return 'badge-secondary';
        }
    };

    // Get AI tool badge color
    const getToolBadgeClass = (tool: string): string => {
        const colors: Record<string, string> = {
            'Claude Code': 'badge-primary',
            'OpenAI Codex': 'badge-success',
            'OpenCode': 'badge-primary',
            'Gemini CLI': 'badge-warning',
            'Aider': 'badge-info',
            'Cursor': 'badge-secondary',
            'Continue': 'badge-primary',
            'Cody': 'badge-success',
        };
        return colors[tool] || 'badge-secondary';
    };

    return (
        <div className="view-container chat-history-view">
            <header className="view-header">
                <div>
                    <h1>{t('chat_history.title')}</h1>
                    <p className="view-description">{t('chat_history.description')}</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                >
                    {t('chat_history.tab_projects')}
                </button>
                <button
                    className={`tab ${activeTab === 'global' ? 'active' : ''}`}
                    onClick={() => setActiveTab('global')}
                >
                    {t('chat_history.tab_global')}
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="error-message" onClick={() => setError(null)}>
                    {error}
                </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
                <>
                    {/* Scan controls */}
                    <div className="scan-controls">
                        <input
                            type="text"
                            value={scanPath}
                            onChange={(e) => setScanPath(e.target.value)}
                            placeholder={t('chat_history.scan_placeholder')}
                            className="path-input"
                        />
                        <select
                            value={scanDepth}
                            onChange={(e) => setScanDepth(Number(e.target.value))}
                            className="select"
                        >
                            {[2, 3, 4, 5, 6].map(d => (
                                <option key={d} value={d}>
                                    {t('chat_history.depth_option', { depth: d })}
                                </option>
                            ))}
                        </select>
                        <button
                            className="btn btn-primary"
                            onClick={handleScanProjects}
                            disabled={isScanning || isDeleting}
                        >
                            {isScanning ? t('chat_history.scanning') : t('chat_history.scan')}
                        </button>
                    </div>

                    {/* Summary */}
                    {projects.length > 0 && (
                        <div className="summary-bar">
                            <span>{t('chat_history.found_summary', {
                                count: projects.length,
                                size: formatSize(totalProjectSize),
                            })}</span>
                            {selectedFiles.size > 0 && (
                                <span className="selected-info">
                                    {t('chat_history.selected_summary', {
                                        count: selectedFiles.size,
                                        size: formatSize(selectedSize),
                                    })}
                                </span>
                            )}
                            {selectedFiles.size > 0 && (
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteSelected}
                                    disabled={isDeleting}
                                >
                                    {t('chat_history.delete_selected')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Projects list */}
                    <div className="projects-list">
                        {projects.length === 0 && !isScanning && (
                            <div className="empty-state">
                                {t('chat_history.empty_result')}
                            </div>
                        )}

                        {projects.map(project => (
                            <div key={project.id} className="project-card">
                                <div
                                    className="project-header"
                                    onClick={() => toggleProject(project.id)}
                                >
                                    <div className="project-info">
                                        <span className="expand-icon">
                                            {expandedProjects.has(project.id) ? '-' : '+'}
                                        </span>
                                        <span className="project-name">{project.name}</span>
                                        <span className="project-size">{project.total_size_display}</span>
                                    </div>
                                    <div className="project-tools">
                                        {project.ai_tools_detected.map(tool => (
                                            <span
                                                key={tool}
                                                className={`badge ${getToolBadgeClass(tool)}`}
                                            >
                                                {tool}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        className="btn btn-small btn-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectAllInProject(project);
                                        }}
                                    >
                                        {project.chat_files.every(f => selectedFiles.has(f.path))
                                            ? t('common.deselect_all')
                                            : t('common.select_all')}
                                    </button>
                                </div>

                                {expandedProjects.has(project.id) && (
                                    <div className="project-files">
                                        <div className="project-path">{project.project_path}</div>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th className="col-w-40px"></th>
                                                    <th>{t('chat_history.filename')}</th>
                                                    <th>{t('chat_history.ai_tool')}</th>
                                                    <th>{t('chat_history.type')}</th>
                                                    <th>{t('chat_history.size')}</th>
                                                    <th className="col-w-80px"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {project.chat_files.map(file => (
                                                    <tr key={file.id}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFiles.has(file.path)}
                                                                onChange={() => toggleFileSelection(file.path)}
                                                            />
                                                        </td>
                                                        <td>
                                                            {file.is_directory ? '[DIR]' : '[FILE]'} {file.name}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getToolBadgeClass(file.ai_tool)}`}>
                                                                {file.ai_tool}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getFileTypeBadgeClass(file.file_type)}`}>
                                                                {t(`chat_history.file_types.${file.file_type}`)}
                                                            </span>
                                                        </td>
                                                        <td>{file.size_display}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-small btn-danger"
                                                                onClick={() => handleDeleteFile(file)}
                                                                disabled={isDeleting}
                                                            >
                                                                {t('chat_history.delete')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Global Tab */}
            {activeTab === 'global' && (
                <>
                    <div className="scan-controls">
                        <button
                            className="btn btn-primary"
                            onClick={handleScanGlobal}
                            disabled={isScanning || isDeleting}
                        >
                            {isScanning ? t('chat_history.scanning') : t('chat_history.scan_global')}
                        </button>
                    </div>

                    {/* Summary */}
                    {globalFiles.length > 0 && (
                        <div className="summary-bar">
                            <span>{t('chat_history.global_summary', {
                                count: globalFiles.length,
                                size: formatSize(totalGlobalSize),
                            })}</span>
                            {selectedFiles.size > 0 && (
                                <>
                                    <span className="selected-info">
                                        {t('chat_history.selected_summary', {
                                            count: selectedFiles.size,
                                            size: formatSize(selectedSize),
                                        })}
                                    </span>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDeleteSelected}
                                        disabled={isDeleting}
                                    >
                                        {t('chat_history.delete_selected')}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Global files table */}
                    {globalFiles.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="col-w-40px"></th>
                                    <th>{t('chat_history.filename')}</th>
                                    <th>{t('chat_history.ai_tool')}</th>
                                    <th>{t('chat_history.size')}</th>
                                    <th>{t('chat_history.path')}</th>
                                    <th className="col-w-80px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {globalFiles.map(file => (
                                    <tr key={file.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.has(file.path)}
                                                onChange={() => toggleFileSelection(file.path)}
                                            />
                                        </td>
                                        <td>{file.is_directory ? '[DIR]' : '[FILE]'} {file.name}</td>
                                        <td>
                                            <span className={`badge ${getToolBadgeClass(file.ai_tool)}`}>
                                                {file.ai_tool}
                                            </span>
                                        </td>
                                        <td>{file.size_display}</td>
                                        <td className="path-cell">{file.path}</td>
                                        <td>
                                            <button
                                                className="btn btn-small btn-danger"
                                                onClick={() => handleDeleteFile(file)}
                                                disabled={isDeleting}
                                            >
                                                {t('chat_history.delete')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            {isScanning ? t('chat_history.scanning') : t('chat_history.click_scan_global')}
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title={pendingDelete?.kind === 'single'
                    ? t('chat_history.confirm_delete_single_title', { defaultValue: 'Delete Chat History' })
                    : t('chat_history.confirm_delete_title', { defaultValue: 'Delete Chat History Files' })}
                description={pendingDelete
                    ? pendingDelete.kind === 'single'
                        ? t('chat_history.confirm_delete_single', {
                            name: pendingDelete.file.name,
                            size: pendingDelete.file.size_display,
                        })
                        : t('chat_history.confirm_delete', {
                            count: pendingDelete.count,
                            size: pendingDelete.sizeDisplay,
                        })
                    : ''}
                danger
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
