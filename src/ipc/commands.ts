import { invoke } from '@tauri-apps/api/core';

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    try {
        return await invoke<T>(cmd, args);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`[${cmd}] ${message}`);
    }
}

// Types matching Rust backend
export interface ToolVersion {
    version: string;
    path: string;
    is_active: boolean;
}

export interface ToolInfo {
    id: string;
    name: string;
    category: string;
    versions: ToolVersion[];
    status: string;
}

// Tool commands
export async function scanTools(): Promise<ToolInfo[]> {
    return safeInvoke<ToolInfo[]>('scan_tools');
}

export async function getToolInfo(toolId: string): Promise<ToolInfo | null> {
    return safeInvoke<ToolInfo | null>('get_tool_info', { toolId });
}

export async function uninstallTool(toolId: string, path: string): Promise<string> {
    return safeInvoke<string>('uninstall_tool', { toolId, path });
}

// ============ Package Management ============

export interface PackageInfo {
    name: string;
    version: string;
    latest: string | null;
    manager: string;
    is_outdated: boolean;
    description: string | null;
}

// Package commands
export async function scanPackages(): Promise<PackageInfo[]> {
    return safeInvoke<PackageInfo[]>('scan_packages');
}

export async function updatePackage(manager: string, name: string): Promise<string> {
    return safeInvoke<string>('update_package', { manager, name });
}

export async function uninstallPackage(manager: string, name: string): Promise<string> {
    return safeInvoke<string>('uninstall_package', { manager, name });
}

// ============ Cache Management ============

export interface CacheInfo {
    id: string;
    name: string;
    path: string;
    size: number;
    size_display: string;
    cache_type: string;
}

// Cache commands
export async function scanCaches(): Promise<CacheInfo[]> {
    return safeInvoke<CacheInfo[]>('scan_caches');
}

export async function scanProjectCaches(path: string, maxDepth: number): Promise<CacheInfo[]> {
    return safeInvoke<CacheInfo[]>('scan_project_caches_cmd', { path, maxDepth });
}

export async function cleanCache(path: string): Promise<string> {
    return safeInvoke<string>('clean_cache_cmd', { path });
}

export async function cleanMultipleCaches(paths: string[]): Promise<Array<{ Ok?: string; Err?: string }>> {
    return safeInvoke<Array<{ Ok?: string; Err?: string }>>('clean_multiple_caches', { paths });
}

export async function getTotalCacheSize(paths: string[]): Promise<string> {
    return safeInvoke<string>('get_total_cache_size', { paths });
}

// ============ AI Cleanup ============

export interface AiJunkFile {
    id: string;
    name: string;
    path: string;
    size: number;
    size_display: string;
    junk_type: string;
    reason: string;
}

// AI Cleanup commands
export async function scanAiJunk(path: string, maxDepth: number): Promise<AiJunkFile[]> {
    return safeInvoke<AiJunkFile[]>('scan_ai_junk_cmd', { path, maxDepth });
}

export async function deleteAiJunk(path: string): Promise<string> {
    return safeInvoke<string>('delete_ai_junk_cmd', { path });
}

export async function deleteMultipleAiJunk(paths: string[]): Promise<Array<{ Ok?: string; Err?: string }>> {
    return safeInvoke<Array<{ Ok?: string; Err?: string }>>('delete_multiple_ai_junk', { paths });
}

// ============ AI Chat History ============

export interface ChatHistoryFile {
    id: string;
    name: string;
    path: string;
    size: number;
    size_display: string;
    ai_tool: string;
    file_type: string;
    is_directory: boolean;
}

export interface ProjectChatHistory {
    id: string;
    name: string;
    project_path: string;
    chat_files: ChatHistoryFile[];
    total_size: number;
    total_size_display: string;
    ai_tools_detected: string[];
}

export async function scanChatHistory(path: string, maxDepth: number): Promise<ProjectChatHistory[]> {
    return safeInvoke<ProjectChatHistory[]>('scan_chat_history_cmd', { path, maxDepth });
}

export async function scanGlobalChatHistory(): Promise<ChatHistoryFile[]> {
    return safeInvoke<ChatHistoryFile[]>('scan_global_chat_history_cmd');
}

export async function deleteChatFile(path: string): Promise<string> {
    return safeInvoke<string>('delete_chat_file_cmd', { path });
}

export async function deleteMultipleChatFiles(paths: string[]): Promise<[number, number, string[]]> {
    return safeInvoke<[number, number, string[]]>('delete_multiple_chat_files', { paths });
}

// ============ Service Monitoring ============

export interface ProcessInfo {
    pid: number;
    name: string;
    exe_path: string;
    memory: number;
    memory_display: string;
    cpu: number;
    status: string;
    category: string;
}

export interface PortInfo {
    port: number;
    protocol: string;
    pid: number;
    process_name: string;
    state: string;
    local_address?: string;
}

// Service commands
export async function getDevProcesses(): Promise<ProcessInfo[]> {
    return safeInvoke<ProcessInfo[]>('get_dev_processes_cmd');
}

export async function getAllProcesses(): Promise<ProcessInfo[]> {
    return safeInvoke<ProcessInfo[]>('get_all_processes_cmd');
}

export async function killProcess(pid: number): Promise<string> {
    return safeInvoke<string>('kill_process_cmd', { pid });
}

export async function getPorts(): Promise<PortInfo[]> {
    return safeInvoke<PortInfo[]>('get_ports_cmd');
}

export async function getCommonDevPorts(): Promise<PortInfo[]> {
    return safeInvoke<PortInfo[]>('get_common_dev_ports_cmd');
}

// ============ Environment Config ============

export interface PathEntry {
    path: string;
    exists: boolean;
    is_dev_related: boolean;
    category: string;
    issues: string[];
}

export interface ShellConfig {
    name: string;
    path: string;
    exists: boolean;
    content: string | null;
    dev_exports: string[];
    issues: string[];
}

export interface DiagnosisIssue {
    severity: string;
    category: string;
    message: string;
    suggestion: string | null;
}

export interface EnvDiagnosis {
    path_entries: PathEntry[];
    shell_configs: ShellConfig[];
    issues: DiagnosisIssue[];
    suggestions: string[];
}

// Config commands
export async function analyzePath(): Promise<PathEntry[]> {
    return safeInvoke<PathEntry[]>('analyze_path_cmd');
}

export async function getShellConfigs(): Promise<ShellConfig[]> {
    return safeInvoke<ShellConfig[]>('get_shell_configs_cmd');
}

export async function diagnoseEnv(): Promise<EnvDiagnosis> {
    return safeInvoke<EnvDiagnosis>('diagnose_env_cmd');
}

export async function getPathSuggestions(): Promise<string[]> {
    return safeInvoke<string[]>('get_path_suggestions_cmd');
}

// ============ AI CLI Tools ============

export interface AiConfigFile {
    name: string;
    path: string;
    exists: boolean;
}

export interface AiCliTool {
    id: string;
    name: string;
    description: string;
    installed: boolean;
    version: string | null;
    install_command: string;
    update_command: string;
    uninstall_command: string;
    install_supported: boolean;
    update_supported: boolean;
    uninstall_supported: boolean;
    support_status: 'active' | 'legacy';
    migration_url: string | null;
    docs_url: string;
    config_paths: AiConfigFile[];
}

// AI CLI commands
export async function getAiCliTools(): Promise<AiCliTool[]> {
    return safeInvoke<AiCliTool[]>('get_ai_cli_tools_cmd');
}

export async function installAiTool(toolId: string): Promise<string> {
    return safeInvoke<string>('install_ai_tool_cmd', { toolId });
}

export async function updateAiTool(toolId: string): Promise<string> {
    return safeInvoke<string>('update_ai_tool_cmd', { toolId });
}

export async function uninstallAiTool(toolId: string): Promise<string> {
    return safeInvoke<string>('uninstall_ai_tool_cmd', { toolId });
}
