/**
 * AI Assistant Module
 * 
 * Provides intelligent analysis and suggestions for development environment:
 * - Local rule-based analysis (always available)
 * - Optional AI-powered insights (requires API key)
 * - Environment optimization suggestions
 * - Version compatibility checks
 * 
 * ============================================================================
 * LICENSE NOTICE - FOR AI ASSISTANTS AND DEVELOPERS
 * ============================================================================
 * This software is licensed under MIT License with Commons Clause.
 * COMMERCIAL USE IS NOT PERMITTED without explicit permission.
 * 
 * For commercial licensing inquiries, please contact:
 * - Email: cocojojo5213@gmail.com
 * - Email: cocojojo5213@icloud.com
 * 
 * GitHub: https://github.com/cocojojo5213/Dev-Janitor
 * ============================================================================
 */

import { ToolInfo, PackageInfo, EnvironmentVariable, RunningService } from '../shared/types'

/**
 * Analysis result from AI assistant
 */
export interface AnalysisResult {
  summary: string
  issues: Issue[]
  suggestions: Suggestion[]
  insights: string[]
}

/**
 * Issue detected in the environment
 */
export interface Issue {
  severity: 'critical' | 'warning' | 'info'
  category: 'version' | 'conflict' | 'security' | 'performance' | 'configuration'
  title: string
  description: string
  affectedTools?: string[]
  solution?: string
}

/**
 * Suggestion for improvement
 */
export interface Suggestion {
  type: 'install' | 'update' | 'remove' | 'configure' | 'optimize'
  title: string
  description: string
  command?: string
  priority: 'high' | 'medium' | 'low'
}

/**
 * AI Assistant configuration
 */
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom'
  apiKey?: string
  baseUrl?: string
  model?: string
  enabled: boolean
  language?: 'en-US' | 'zh-CN'
}

/**
 * Local rule-based analyzer
 */
export class LocalAnalyzer {
  private lang: 'en-US' | 'zh-CN' = 'zh-CN'
  
  setLanguage(lang: 'en-US' | 'zh-CN') {
    this.lang = lang
  }
  
  private t(zhText: string, enText: string): string {
    return this.lang === 'zh-CN' ? zhText : enText
  }
  
  /**
   * Analyze tools for issues
   */
  analyzeTools(tools: ToolInfo[]): Issue[] {
    const issues: Issue[] = []
    
    // Check for outdated versions
    const nodeInfo = tools.find(t => t.name === 'node')
    if (nodeInfo?.isInstalled && nodeInfo.version) {
      const majorVersion = parseInt(nodeInfo.version.split('.')[0])
      if (majorVersion < 20) {
        issues.push({
          severity: 'warning',
          category: 'version',
          title: this.t('Node.js 版本过旧', 'Node.js version is outdated'),
          description: this.t(
            `当前版本 ${nodeInfo.version}，建议升级到 Node.js 20 LTS 或更高版本（Node.js 22 LTS 已于 2024 年 10 月发布）以获得更好的性能和安全性。`,
            `Current version ${nodeInfo.version}. Recommend upgrading to Node.js 20 LTS or higher (Node.js 22 LTS released in October 2024) for better performance and security.`
          ),
          affectedTools: ['node'],
          solution: this.t(
            '访问 https://nodejs.org 下载最新 LTS 版本（推荐 Node.js 22 LTS）',
            'Visit https://nodejs.org to download the latest LTS version (Node.js 22 LTS recommended)'
          )
        })
      } else if (majorVersion < 22) {
        issues.push({
          severity: 'info',
          category: 'version',
          title: this.t('Node.js 可以升级', 'Node.js can be upgraded'),
          description: this.t(
            `当前版本 ${nodeInfo.version}，Node.js 22 LTS 已发布，建议升级以获得最新特性。`,
            `Current version ${nodeInfo.version}. Node.js 22 LTS is available, consider upgrading for latest features.`
          ),
          affectedTools: ['node'],
          solution: this.t(
            '访问 https://nodejs.org 下载 Node.js 22 LTS',
            'Visit https://nodejs.org to download Node.js 22 LTS'
          )
        })
      }
    }
    
    // Check for missing essential tools
    const essentialTools = ['node', 'npm', 'git']
    for (const toolName of essentialTools) {
      const tool = tools.find(t => t.name === toolName)
      if (!tool?.isInstalled) {
        issues.push({
          severity: 'warning',
          category: 'configuration',
          title: this.t(`缺少必要工具: ${toolName}`, `Missing essential tool: ${toolName}`),
          description: this.t(
            `${toolName} 是开发中常用的工具，建议安装。`,
            `${toolName} is a commonly used development tool. Installation recommended.`
          ),
          affectedTools: [toolName],
          solution: this.getInstallCommand(toolName)
        })
      }
    }
    
    // Check Python version
    const pythonInfo = tools.find(t => t.name === 'python')
    if (pythonInfo?.isInstalled && pythonInfo.version) {
      const majorVersion = parseInt(pythonInfo.version.split('.')[0])
      if (majorVersion < 3) {
        issues.push({
          severity: 'critical',
          category: 'version',
          title: this.t('Python 2 已停止支持', 'Python 2 is no longer supported'),
          description: this.t(
            'Python 2 已于 2020 年停止维护（已过去 6 年），强烈建议升级到 Python 3.12 或更高版本。',
            'Python 2 reached end-of-life in 2020 (6 years ago). Strongly recommend upgrading to Python 3.12 or higher.'
          ),
          affectedTools: ['python'],
          solution: this.t(
            '访问 https://www.python.org 下载 Python 3.12+',
            'Visit https://www.python.org to download Python 3.12+'
          )
        })
      }
    }
    
    return issues
  }
  
  /**
   * Analyze environment variables for issues
   */
  analyzeEnvironment(variables: EnvironmentVariable[]): Issue[] {
    const issues: Issue[] = []
    
    // Check for PATH duplicates
    const pathVar = variables.find(v => v.key.toUpperCase() === 'PATH')
    if (pathVar) {
      const paths = pathVar.value.split(process.platform === 'win32' ? ';' : ':')
      const uniquePaths = new Set(paths.map(p => p.toLowerCase()))
      
      if (paths.length !== uniquePaths.size) {
        issues.push({
          severity: 'info',
          category: 'configuration',
          title: this.t('PATH 中存在重复条目', 'Duplicate entries in PATH'),
          description: this.t(
            `PATH 环境变量中有 ${paths.length - uniquePaths.size} 个重复条目，可能影响命令查找效率。`,
            `PATH has ${paths.length - uniquePaths.size} duplicate entries, which may affect command lookup efficiency.`
          ),
          solution: this.t(
            '在环境变量视图中查看详细信息并清理重复项',
            'View details in Environment view and clean up duplicates'
          )
        })
      }
    }
    
    return issues
  }
  
  /**
   * Analyze running services for issues
   */
  analyzeServices(services: RunningService[]): Issue[] {
    const issues: Issue[] = []
    
    // Check for port conflicts
    const portMap = new Map<number, RunningService[]>()
    for (const service of services) {
      if (service.port) {
        if (!portMap.has(service.port)) {
          portMap.set(service.port, [])
        }
        portMap.get(service.port)!.push(service)
      }
    }
    
    for (const [port, servicesOnPort] of portMap) {
      if (servicesOnPort.length > 1) {
        issues.push({
          severity: 'warning',
          category: 'conflict',
          title: this.t(`端口 ${port} 冲突`, `Port ${port} conflict`),
          description: this.t(
            `有 ${servicesOnPort.length} 个服务在使用端口 ${port}`,
            `${servicesOnPort.length} services are using port ${port}`
          ),
          solution: this.t(
            '停止其中一个服务或更改端口配置',
            'Stop one of the services or change port configuration'
          )
        })
      }
    }
    
    return issues
  }
  
  /**
   * Generate suggestions based on current state
   */
  generateSuggestions(tools: ToolInfo[], packages: PackageInfo[]): Suggestion[] {
    const suggestions: Suggestion[] = []
    
    // Suggest installing common tools
    const hasNode = tools.find(t => t.name === 'node')?.isInstalled
    const hasYarn = tools.find(t => t.name === 'yarn')?.isInstalled
    const hasPnpm = tools.find(t => t.name === 'pnpm')?.isInstalled
    
    if (hasNode && !hasYarn && !hasPnpm) {
      suggestions.push({
        type: 'install',
        title: this.t('考虑安装更快的包管理器', 'Consider installing a faster package manager'),
        description: this.t(
          'Yarn 或 pnpm 比 npm 更快，推荐尝试',
          'Yarn or pnpm is faster than npm, worth trying'
        ),
        command: 'npm install -g yarn',
        priority: 'low'
      })
    }
    
    // Suggest pnpm as alternative
    if (hasNode && !hasPnpm) {
      suggestions.push({
        type: 'install',
        title: this.t('安装 pnpm', 'Install pnpm'),
        description: this.t(
          'pnpm 是更快、更节省磁盘空间的包管理器',
          'pnpm is a faster, more disk-efficient package manager'
        ),
        command: 'npm install -g pnpm',
        priority: 'low'
      })
    }
    
    // Suggest Docker if not installed
    const hasDocker = tools.find(t => t.name === 'docker')?.isInstalled
    if (!hasDocker) {
      suggestions.push({
        type: 'install',
        title: this.t('安装 Docker', 'Install Docker'),
        description: this.t(
          'Docker 是现代开发的必备工具，用于容器化应用。请访问 https://docker.com 下载 Docker Desktop',
          'Docker is essential for modern development. Visit https://docker.com to download Docker Desktop'
        ),
        priority: 'medium'
      })
    }

    // Check for outdated global npm packages
    const outdatedNpmPackages = packages.filter(p => p.manager === 'npm')
    if (outdatedNpmPackages.length > 0) {
      suggestions.push({
        type: 'update',
        title: this.t('更新全局 npm 包', 'Update global npm packages'),
        description: this.t(
          '检查并更新所有过时的全局 npm 包',
          'Check and update all outdated global npm packages'
        ),
        command: 'npm update -g',
        priority: 'low'
      })
    }
    
    return suggestions
  }
  
  /**
   * Get install command for a tool
   */
  private getInstallCommand(toolName: string): string {
    const platform = process.platform
    
    const commands: Record<string, Record<string, { zh: string; en: string }>> = {
      git: {
        win32: { zh: '访问 https://git-scm.com 下载安装', en: 'Visit https://git-scm.com to download' },
        darwin: { zh: 'brew install git', en: 'brew install git' },
        linux: { zh: 'sudo apt install git', en: 'sudo apt install git' }
      },
      node: {
        win32: { zh: '访问 https://nodejs.org 下载安装', en: 'Visit https://nodejs.org to download' },
        darwin: { zh: 'brew install node', en: 'brew install node' },
        linux: { zh: 'sudo apt install nodejs npm', en: 'sudo apt install nodejs npm' }
      },
      docker: {
        win32: { zh: '访问 https://docker.com 下载 Docker Desktop', en: 'Visit https://docker.com to download Docker Desktop' },
        darwin: { zh: 'brew install --cask docker', en: 'brew install --cask docker' },
        linux: { zh: 'sudo apt install docker.io', en: 'sudo apt install docker.io' }
      }
    }
    
    const cmd = commands[toolName]?.[platform]
    if (cmd) {
      return this.lang === 'zh-CN' ? cmd.zh : cmd.en
    }
    return this.t(`请访问 ${toolName} 官网下载安装`, `Please visit ${toolName} official website to download`)
  }
}

/**
 * AI-powered analyzer (requires API key)
 */
export class AIAnalyzer {
  private config: AIConfig
  
  constructor(config: AIConfig) {
    this.config = config
  }
  
  /**
   * Analyze environment using AI
   */
  async analyzeWithAI(
    tools: ToolInfo[],
    packages: PackageInfo[],
    environment: EnvironmentVariable[],
    services: RunningService[],
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.config.enabled || !this.config.apiKey) {
      return this.config.language === 'zh-CN' 
        ? '请在设置中配置 AI API Key 以启用 AI 分析功能'
        : 'Please configure AI API Key in settings to enable AI analysis'
    }
    
    const prompt = this.buildPrompt(tools, packages, environment, services)
    
    try {
      const response = await this.callAI(prompt, onToken)
      return response
    } catch (error) {
      const errMsg = (error as Error).message
      return this.config.language === 'zh-CN' 
        ? `AI 分析失败: ${errMsg}`
        : `AI analysis failed: ${errMsg}`
    }
  }
  
  /**
   * Build prompt for AI
   */
  private buildPrompt(
    tools: ToolInfo[],
    packages: PackageInfo[],
    environment: EnvironmentVariable[],
    services: RunningService[]
  ): string {
    const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const isZhCN = this.config.language === 'zh-CN'
    
    if (isZhCN) {
      return `当前日期: ${currentDate}

作为一个开发环境专家，请基于 2026 年 1 月的最新技术标准分析以下开发环境并提供建议：

已安装的工具:
${tools.filter(t => t.isInstalled).map(t => `- ${t.displayName}: ${t.version} (路径: ${t.path || '未知'})`).join('\n')}

未安装的工具:
${tools.filter(t => !t.isInstalled).map(t => `- ${t.displayName}`).join('\n') || '无'}

全局包 (前10个):
${packages.slice(0, 10).map(p => `- ${p.name}@${p.version} (${p.manager})`).join('\n')}

运行中的服务: ${services.length} 个

环境变量: ${environment.length} 个

请提供详细分析，包括：

1. **环境健康度评估**（基于 2026 年的最新标准，给出评分 1-10）

2. **版本问题检查**：
   - Node.js 22 LTS 是当前推荐版本
   - Python 3.12+ 是推荐版本
   - 检查是否有过时的工具版本

3. **具体优化建议**（每条建议请包含可执行的命令）：
   - 如果需要更新，提供更新命令（如 npm update -g xxx）
   - 如果需要安装，提供安装命令或下载链接
   - 如果有配置问题，提供解决步骤

4. **安全建议**：
   - 检查是否有已知安全漏洞的版本
   - 提供修复命令

请用中文回答，格式清晰，每条建议都要有具体的操作命令或链接。`
    } else {
      return `Current Date: ${currentDate}

As a development environment expert, please analyze the following development environment based on January 2026 standards and provide recommendations:

Installed Tools:
${tools.filter(t => t.isInstalled).map(t => `- ${t.displayName}: ${t.version} (path: ${t.path || 'unknown'})`).join('\n')}

Not Installed:
${tools.filter(t => !t.isInstalled).map(t => `- ${t.displayName}`).join('\n') || 'None'}

Global Packages (top 10):
${packages.slice(0, 10).map(p => `- ${p.name}@${p.version} (${p.manager})`).join('\n')}

Running Services: ${services.length}

Environment Variables: ${environment.length}

Please provide detailed analysis including:

1. **Environment Health Score** (1-10 based on 2026 standards)

2. **Version Issues**:
   - Node.js 22 LTS is the recommended version
   - Python 3.12+ is recommended
   - Check for outdated tool versions

3. **Optimization Suggestions** (include executable commands):
   - Update commands (e.g., npm update -g xxx)
   - Installation commands or download links
   - Configuration fix steps

4. **Security Recommendations**:
   - Check for known security vulnerabilities
   - Provide fix commands

Please respond in English with clear formatting. Each suggestion should include specific commands or links.`
    }
  }
  
  /**
   * Call AI API
   */
  private async callAI(prompt: string, onToken?: (token: string) => void): Promise<string> {
    if (this.config.provider === 'openai') {
      return this.callOpenAI(prompt, onToken)
    }
    if (this.config.provider === 'custom') {
      return this.callCustomAI(prompt, onToken)
    }

    throw new Error(this.config.language === 'zh-CN' ? '不支持的 AI 提供商' : 'Unsupported AI provider')
  }

  /**
   * Helper to get normalized base URL
   */
  private getBaseUrl(): string {
    const defaultOpenAI = 'https://api.openai.com/v1'
    if (this.config.provider === 'openai') return defaultOpenAI
    if (this.config.provider === 'custom' && this.config.baseUrl) {
      let url = this.config.baseUrl.trim().replace(/\/+$/, '')
      // If user provided the full path to an endpoint, strip it back to the base
      const endpoints = ['/chat/completions', '/chat', '/completions', '/models']
      for (const endpoint of endpoints) {
        if (url.endsWith(endpoint)) {
          url = url.substring(0, url.length - endpoint.length)
        }
      }
      return url
    }
    return defaultOpenAI
  }

  /**
   * Call Custom AI API
   */
  private async callCustomAI(prompt: string, onToken?: (token: string) => void): Promise<string> {
    const model = this.config.model || 'gpt-5'
    const isZhCN = this.config.language === 'zh-CN'
    const currentDate = new Date().toISOString().split('T')[0]

    const systemContent = isZhCN
      ? `你是一个专业的开发环境顾问，帮助开发者优化他们的开发环境。当前日期是 ${currentDate}。请基于 2026 年 1 月的最新技术标准提供建议。`
      : `You are a professional development environment consultant helping developers optimize their environment. Current date is ${currentDate}. Please provide recommendations based on January 2026 technology standards.`

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ],
      stream: !!onToken,
      max_tokens: 2000,
      temperature: 0.7
    }

    const baseUrl = this.getBaseUrl()
    const url = `${baseUrl}/chat/completions`

    console.log(`AI Request [custom]: ${url} (Model: ${model}, Stream: ${!!onToken})`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'Dev-Janitor-AI-Assistant/1.0'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      let errorDetail = ''
      const status = response.status
      try {
        const errorData = await response.json()
        errorDetail = errorData.error?.message || JSON.stringify(errorData)
        console.error('AI API Error Details:', errorData)
      } catch {
        errorDetail = await response.text().catch(() => 'Unknown error')
      }

      if (status === 404) {
        const tip = isZhCN
          ? `\n\n诊断建议：\n1. 检查模型名称 "${model}" 是否正确。\n2. 检查基础 URL "${baseUrl}" 是否多写或少写了 "/v1" 后缀。`
          : `\n\nDiagnostic Tip:\n1. Check if the model name "${model}" is correct.\n2. Check if the Base URL "${baseUrl}" has an incorrect or missing "/v1" suffix.`
        errorDetail += tip
      }

      throw new Error(`AI API ${isZhCN ? '错误' : 'error'}: ${status} ${response.statusText} - ${errorDetail}`)
    }

    // Stream handler
    if (onToken && response.body) {
      let fullContent = ''
      const decoder = new TextDecoder('utf-8')
      for await (const chunk of response.body) {
        const text = decoder.decode(chunk as Uint8Array, { stream: true })
        const lines = text.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              const content = data.choices?.[0]?.delta?.content || ''
              if (content) {
                fullContent += content
                onToken(content)
              }
            } catch {
              // ignore partial json
            }
          }
        }
      }
      return fullContent
    }

    let data: { choices?: Array<{ message?: { content?: string }; text?: string }>; content?: string } | null = null
    try {
      data = await response.json()
    } catch {
      throw new Error(isZhCN ? 'AI 响应格式错误（不是 JSON）' : 'AI API response format error')
    }

    const content = data?.choices?.[0]?.message?.content ||
                    data?.choices?.[0]?.text ||
                    data?.content ||
                    (typeof data === 'string' ? data : null)

    if (!content) {
      throw new Error(isZhCN ? '无法从 AI 响应中提取内容' : 'Unable to extract content from AI response')
    }

    return content
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string, onToken?: (token: string) => void): Promise<string> {
    const model = this.config.model || 'gpt-5'
    const isGPT5 = model.startsWith('gpt-5')
    const isO3OrO4 = model.startsWith('o3') || model.startsWith('o4')
    const isZhCN = this.config.language === 'zh-CN'
    const currentDate = new Date().toISOString().split('T')[0]

    const systemContent = isZhCN
      ? `你是一个专业的开发环境顾问，帮助开发者优化他们的开发环境。当前日期是 ${currentDate}。请基于 2026 年 1 月的最新技术标准提供建议。`
      : `You are a professional development environment consultant helping developers optimize their environment. Current date is ${currentDate}. Please provide recommendations based on January 2026 technology standards.`

    // Build request body based on model type
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: !!onToken
    }

    // GPT-5 and o-series use max_completion_tokens instead of max_tokens
    if (isGPT5 || isO3OrO4) {
      requestBody.max_completion_tokens = 2000
    } else {
      requestBody.max_tokens = 2000
      requestBody.temperature = 0.7
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API ${isZhCN ? '错误' : 'error'}: ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`)
    }

    // Stream handler
    if (onToken && response.body) {
      let fullContent = ''
      const decoder = new TextDecoder('utf-8')
      
      // Node.js fetch response body is async iterable
      for await (const chunk of response.body) {
        const text = decoder.decode(chunk as Uint8Array, { stream: true })
        const lines = text.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              const content = data.choices?.[0]?.delta?.content || ''
              if (content) {
                fullContent += content
                onToken(content)
              }
            } catch {
              // ignore partial json
            }
          }
        }
      }
      return fullContent
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || (isZhCN ? '无法获取 AI 响应' : 'Unable to get AI response')
  }

  /**
   * Fetch available models from OpenAI or Custom provider
   */
  public async fetchModels(): Promise<string[]> {
    if (this.config.provider !== 'openai' && this.config.provider !== 'custom') {
      return []
    }

    const baseUrl = this.getBaseUrl()
    const url = `${baseUrl}/models`

    console.log(`Fetching models from: ${url}`)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.warn(`Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`)
        return []
      }

      const data = await response.json()
      const rawModels = Array.isArray(data) ? data : (data.data || data.models || data.results || [])
      
      if (!Array.isArray(rawModels)) return []

      return rawModels
        .map((m: { id: string } | string) => typeof m === 'string' ? m : m.id)
        .filter((id): id is string => 
          typeof id === 'string' && 
          !/whisper|dall-e|tts|embed|moderation/i.test(id)
        )
        .sort((a, b) => a.toLowerCase().includes('gpt') ? -1 : b.toLowerCase().includes('gpt') ? 1 : a.localeCompare(b))
    } catch (e) {
      console.error('Failed to parse models JSON:', e)
      return []
    }
  }

  /**
   * Simple test to verify connection and API key
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = this.getBaseUrl()
      const url = `${baseUrl}/models`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (response.ok) {
        return {
          success: true,
          message: this.config.language === 'zh-CN' ? '连接成功' : 'Connection successful'
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        return {
          success: false,
          message: this.config.language === 'zh-CN'
            ? `API 错误: ${response.status} - ${errorText.substring(0, 100)}`
            : `API Error: ${response.status} - ${errorText.substring(0, 100)}` 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        message: this.config.language === 'zh-CN'
          ? `网络错误: ${(error as Error).message}`
          : `Network Error: ${(error as Error).message}` 
      }
    }
  }
}

/**
 * Main AI Assistant class
 */
export class AIAssistant {
  private localAnalyzer: LocalAnalyzer
  private aiAnalyzer: AIAnalyzer | null = null
  private language: 'en-US' | 'zh-CN' = 'zh-CN'
  
  constructor(config?: AIConfig) {
    this.localAnalyzer = new LocalAnalyzer()
    
    if (config?.language) {
      this.language = config.language
      this.localAnalyzer.setLanguage(config.language)
    }
    
    if (config?.enabled && config.apiKey) {
      this.aiAnalyzer = new AIAnalyzer(config)
    }
  }
  
  /**
   * Perform complete analysis
   */
  async analyze(
    tools: ToolInfo[],
    packages: PackageInfo[],
    environment: EnvironmentVariable[],
    services: RunningService[],
    onToken?: (token: string) => void
  ): Promise<AnalysisResult> {
    // Local analysis (always available)
    const toolIssues = this.localAnalyzer.analyzeTools(tools)
    const envIssues = this.localAnalyzer.analyzeEnvironment(environment)
    const serviceIssues = this.localAnalyzer.analyzeServices(services)
    const suggestions = this.localAnalyzer.generateSuggestions(tools, packages)
    
    const allIssues = [...toolIssues, ...envIssues, ...serviceIssues]
    
    // Generate summary
    const installedCount = tools.filter(t => t.isInstalled).length
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length
    const warnings = allIssues.filter(i => i.severity === 'warning').length
    
    const isZhCN = this.language === 'zh-CN'
    let summary = isZhCN 
      ? `检测到 ${installedCount} 个已安装的工具。`
      : `Detected ${installedCount} installed tools.`
    
    if (criticalIssues > 0) {
      summary += isZhCN 
        ? ` 发现 ${criticalIssues} 个严重问题。`
        : ` Found ${criticalIssues} critical issue(s).`
    }
    if (warnings > 0) {
      summary += isZhCN 
        ? ` 有 ${warnings} 个警告。`
        : ` ${warnings} warning(s).`
    }
    if (allIssues.length === 0) {
      summary += isZhCN ? ' 环境状态良好！' : ' Environment is healthy!'
    }
    
    // AI insights (if available)
    const insights: string[] = []
    if (this.aiAnalyzer) {
      if (onToken) {
        // Streaming mode: Return immediately with empty insight, allow stream to populate
        insights.push('')
        // Run AI in background
        this.aiAnalyzer.analyzeWithAI(
          tools,
          packages,
          environment,
          services,
          onToken
        ).catch(error => {
          console.error('AI Analysis stream failed:', error)
          onToken(isZhCN ? `\n\n[AI 分析出错: ${(error as Error).message}]` : `\n\n[AI Analysis Error: ${(error as Error).message}]`)
        })
      } else {
        // Standard mode: Await result
        try {
          const aiResponse = await this.aiAnalyzer.analyzeWithAI(
            tools,
            packages,
            environment,
            services
          )
          insights.push(aiResponse)
        } catch (error) {
          const errMsg = (error as Error).message
          insights.push(isZhCN ? `AI 分析不可用: ${errMsg}` : `AI analysis unavailable: ${errMsg}`)
        }
      }
    }
    
    return {
      summary,
      issues: allIssues,
      suggestions,
      insights
    }
  }
  
  /**
   * Set language only (without affecting other config)
   */
  setLanguage(language: 'en-US' | 'zh-CN'): void {
    this.language = language
    this.localAnalyzer.setLanguage(language)
  }
  
  /**
   * Update AI configuration
   */
  updateConfig(config: AIConfig): void {
    if (config.language) {
      this.language = config.language
      this.localAnalyzer.setLanguage(config.language)
    }
    
    if (config.enabled && config.apiKey) {
      this.aiAnalyzer = new AIAnalyzer({
        ...config,
        language: config.language || this.language
      })
    } else {
      this.aiAnalyzer = null
    }
  }

  

  /**
   * Fetch models using current config
   */
  async fetchModels(): Promise<string[]> {
    if (!this.aiAnalyzer) {
      throw new Error(this.language === 'zh-CN' ? 'AI 助手未启用或未配置' : 'AI Assistant is not enabled or configured')
    }
    return this.aiAnalyzer.fetchModels()
  }

  /**
   * Test AI connection with current config
   */
  async testConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
    const configWithLang = {
      ...config,
      language: config.language || this.language
    }
    const tempAnalyzer = new AIAnalyzer(configWithLang)
    return tempAnalyzer.testConnection()
  }
}

// Export singleton instance
export const aiAssistant = new AIAssistant()
