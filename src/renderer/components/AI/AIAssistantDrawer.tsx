/**
 * AI Assistant Drawer Component
 * 
 * Provides AI-powered analysis and suggestions for the development environment
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

import React, { useState, useEffect, useRef } from 'react'
import { Drawer, Button, Spin, Alert, Card, Tag, Space, Divider, Typography, Collapse, message, Tooltip, theme } from 'antd'
import { 
  RobotOutlined, 
  BulbOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  CopyOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { AnalysisResult, Issue, Suggestion } from '../../../shared/types'
import { MarkdownErrorBoundary } from './index'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

/**
 * Component to handle AI insight content with thinking folding and Markdown rendering
 */
const AIInsightContent: React.FC<{ content: string }> = ({ content }) => {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  
  // Robustly extract thinking content (supports streaming/unclosed tags)
  let thinking: string | null = null
  let mainContent = content

  // 1. Try to find complete <think>...</think> block
  const completeMatch = content.match(/<think>([\s\S]*?)<\/think>/)
  if (completeMatch) {
    thinking = completeMatch[1].trim()
    mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim()
  } else {
    // 2. If valid block not found, check for unclosed start tag (streaming)
    const startMatch = content.match(/<think>([\s\S]*)/)
    if (startMatch) {
      thinking = startMatch[1].trim()
      mainContent = content.substring(0, startMatch.index).trim()
    }
  }

  return (
    <div className="ai-insight-content">
      {thinking && (
        <Collapse 
          ghost 
          defaultActiveKey={[]} // Default collapsed
          style={{ marginBottom: 16, background: token.colorFillQuaternary, borderRadius: 8 }}
        >
          <Panel 
            header={
              <Space>
                <BulbOutlined style={{ color: token.colorWarning }} />
                <Text type="secondary">{t('ai.thinking', 'Thinking Process...')}</Text>
              </Space>
            } 
            key="thinking"
          >
            <div style={{ color: token.colorTextSecondary, fontStyle: 'italic', fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
              {thinking}
            </div>
          </Panel>
        </Collapse>
      )}
      {/* Wrap Markdown rendering with Error Boundary - Validates: Requirement 9.1 */}
      <div className="markdown-content">
        <MarkdownErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Markdown rendering error in AIAssistantDrawer:', error, errorInfo)
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              pre: ({ children }: { children?: React.ReactNode }) => (
                <div style={{ 
                  background: token.colorFillTertiary, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  overflow: 'auto',
                  margin: '12px 0'
                }}>
                  <pre style={{ margin: 0 }}>{children}</pre>
                </div>
              ),
              code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
                const inline = !className
                return inline ? (
                  <code style={{ 
                    background: token.colorFillSecondary, 
                    padding: '2px 4px', 
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}>{children}</code>
                ) : (
                  <code className={className}>{children}</code>
                )
              },
              table: ({ children }: { children?: React.ReactNode }) => (
                <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
                </div>
              ),
              tr: ({ children }: { children?: React.ReactNode }) => <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>{children}</tr>,
              th: ({ children }: { children?: React.ReactNode }) => <th style={{ padding: '8px', background: token.colorFillQuaternary, textAlign: 'left' }}>{children}</th>,
              td: ({ children }: { children?: React.ReactNode }) => <td style={{ padding: '8px' }}>{children}</td>,
              ul: ({ children }: { children?: React.ReactNode }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
              ol: ({ children }: { children?: React.ReactNode }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>,
              li: ({ children }: { children?: React.ReactNode }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
              p: ({ children }: { children?: React.ReactNode }) => <p style={{ marginBottom: '12px' }}>{children}</p>,
              h1: ({ children }: { children?: React.ReactNode }) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '16px 0 8px' }}>{children}</h1>,
              h2: ({ children }: { children?: React.ReactNode }) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '14px 0 8px' }}>{children}</h2>,
              h3: ({ children }: { children?: React.ReactNode }) => <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '12px 0 8px' }}>{children}</h3>,
              a: (props: { href?: string; children?: React.ReactNode }) => (
                <a 
                  href={props.href} 
                  onClick={(e) => {
                    e.preventDefault()
                    if (props.href) {
                      // 防御性检查：确保 electronAPI.shell 存在
                      if (window.electronAPI?.shell?.openExternal) {
                        window.electronAPI.shell.openExternal(props.href)
                      } else {
                        window.open(props.href, '_blank', 'noopener,noreferrer')
                      }
                    }
                  }}
                >
                  {props.children}
                </a>
              )
            }}
          >
            {mainContent}
          </ReactMarkdown>
        </MarkdownErrorBoundary>
      </div>
    </div>
  )
}

interface AIAssistantDrawerProps {
  open: boolean
  onClose: () => void
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ open, onClose }) => {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(false)
  const [refreshingAI, setRefreshingAI] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  
  // Refs for memory leak prevention (Requirements 4.1, 4.2, 4.3, 4.4)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Listen for streaming tokens with proper cleanup
  useEffect(() => {
    isMountedRef.current = true
    
    // 防御性检查：确保 electronAPI.ai 存在
    if (!window.electronAPI?.ai?.onStreamToken) {
      console.warn('electronAPI.ai not available, skipping stream token listener')
      return
    }
    
    const cleanup = window.electronAPI.ai.onStreamToken((token) => {
      // Don't update state if component is unmounted (Requirement 4.1)
      if (!isMountedRef.current) return
      setAnalysis(prev => {
        if (!prev) return prev
        const newInsights = [...prev.insights]
        if (newInsights.length === 0) newInsights.push('')
        newInsights[0] += token
        return { ...prev, insights: newInsights }
      })
    })
    
    return () => {
      isMountedRef.current = false
      cleanup() // Remove event listener (Requirement 4.4)
    }
  }, [])
  
  // Cleanup AbortController on unmount (Requirement 4.2, 4.3)
  useEffect(() => {
    return () => {
      // Abort any ongoing requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleAnalyze = async () => {
    // Cancel any previous request (Requirement 4.2)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    try {
      // 防御性检查：确保 electronAPI.ai 存在
      if (!window.electronAPI?.ai?.analyze) {
        throw new Error('AI API not available')
      }
      // Pass current language to the analyzer
      const result = await window.electronAPI.ai.analyze(i18n.language as 'en-US' | 'zh-CN')
      // Don't update state if component is unmounted (Requirement 4.1)
      if (!isMountedRef.current) return
      setAnalysis(result)
    } catch (error) {
      // Don't update state if component is unmounted
      if (!isMountedRef.current) return
      // Ignore AbortError (Requirement 4.3)
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Analysis failed')
      // Only show message if component is still mounted
      if (isMountedRef.current) {
        message.error(t('errors.unknown', 'Analysis failed'))
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleRefreshAI = async () => {
    if (!analysis) return
    
    // Cancel any previous request (Requirement 4.2)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    setRefreshingAI(true)
    try {
      // 防御性检查：确保 electronAPI.ai 存在
      if (!window.electronAPI?.ai?.analyze) {
        throw new Error('AI API not available')
      }
      // Pass true for useCache to skip scanning
      const result = await window.electronAPI.ai.analyze(i18n.language as 'en-US' | 'zh-CN', true)
      // Don't update state if component is unmounted (Requirement 4.1)
      if (!isMountedRef.current) return
      setAnalysis(result)
      // Only show message if component is still mounted
      if (isMountedRef.current) {
        message.success(t('ai.refreshed', 'AI recommendations refreshed'))
      }
    } catch (error) {
      // Don't update state if component is unmounted
      if (!isMountedRef.current) return
      // Ignore AbortError (Requirement 4.3)
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Refresh failed')
      // Only show message if component is still mounted
      if (isMountedRef.current) {
        message.error(t('errors.unknown', 'Refresh failed'))
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshingAI(false)
      }
    }
  }

  // Open a URL in browser
  const handleOpenUrl = async (url: string) => {
    try {
      // 防御性检查：确保 electronAPI.shell 存在
      if (window.electronAPI?.shell?.openExternal) {
        await window.electronAPI.shell.openExternal(url)
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Copy text to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success(t('notifications.copySuccess', 'Copied to clipboard')))
      .catch(() => message.error(t('notifications.copyFailed', 'Copy failed')))
  }

  const getSeverityIcon = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return <CloseCircleOutlined style={{ color: token.colorError }} />
      case 'warning':
        return <WarningOutlined style={{ color: token.colorWarning }} />
      case 'info':
        return <InfoCircleOutlined style={{ color: token.colorInfo }} />
    }
  }

  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
    }
  }

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'red'
      case 'medium':
        return 'orange'
      case 'low':
        return 'blue'
    }
  }

  // Check if solution contains a URL
  const extractUrl = (text: string): string | null => {
    const urlMatch = text.match(/https?:\/\/[^\s]+/)
    return urlMatch ? urlMatch[0] : null
  }

  // Render action buttons for solution
  const renderSolutionActions = (solution: string) => {
    const url = extractUrl(solution)
    return (
      <Space style={{ marginTop: 8 }}>
        {url && (
          <Button 
            type="primary" 
            size="small" 
            icon={<LinkOutlined />}
            onClick={() => handleOpenUrl(url)}
          >
            {t('tooltips.openExternal', 'Open Link')}
          </Button>
        )}
      </Space>
    )
  }

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined />
          <span>{t('ai.title', 'AI Assistant')}</span>
        </Space>
      }
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Analyze Button */}
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={handleAnalyze}
          loading={loading}
          block
          size="large"
        >
          {t('ai.analyze', 'Analyze Environment')}
        </Button>

        {/* Loading State */}
        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                {t('ai.analyzing', 'Analyzing your development environment...')}
              </Paragraph>
            </div>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <>
            {/* Summary */}
            <Alert
              message={t('ai.summary', 'Environment Overview')}
              description={analysis.summary}
              type="info"
              showIcon
            />

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <Card
                title={
                  <Space>
                    <WarningOutlined />
                    <span>{t('ai.issues', 'Issues Found')} ({analysis.issues.length})</span>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {analysis.issues.map((issue, index) => (
                    <Card key={index} size="small" type="inner">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          {getSeverityIcon(issue.severity)}
                          <Text strong>{issue.title}</Text>
                          <Tag color={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Tag>
                          <Tag>{issue.category}</Tag>
                        </Space>
                        <Text type="secondary">{issue.description}</Text>
                        {issue.solution && (
                          <Alert
                            message={t('ai.solution', 'Solution')}
                            description={
                              <div>
                                <div>{issue.solution}</div>
                                {renderSolutionActions(issue.solution)}
                              </div>
                            }
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                          />
                        )}
                        {issue.affectedTools && issue.affectedTools.length > 0 && (
                          <div>
                            <Text type="secondary">{t('ai.affectedTools', 'Affected Tools')}: </Text>
                            {issue.affectedTools.map(tool => (
                              <Tag key={tool}>{tool}</Tag>
                            ))}
                          </div>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <Card
                title={
                  <Space>
                    <BulbOutlined />
                    <span>{t('ai.suggestions', 'Optimization Suggestions')} ({analysis.suggestions.length})</span>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {analysis.suggestions.map((suggestion, index) => (
                    <Card key={index} size="small" type="inner">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{suggestion.title}</Text>
                          <Tag color={getPriorityColor(suggestion.priority)}>
                            {suggestion.priority}
                          </Tag>
                          <Tag>{suggestion.type}</Tag>
                        </Space>
                        <Text type="secondary">{suggestion.description}</Text>
                        {suggestion.command && (
                          <Alert
                            message={t('ai.command', 'Command')}
                            description={
                              <div>
                                <code style={{ 
                                  background: token.colorFillTertiary, 
                                  padding: '4px 8px', 
                                  borderRadius: 4,
                                  display: 'block',
                                  marginBottom: 8
                                }}>
                                  {suggestion.command}
                                </code>
                                <Tooltip title={t('common.copy', 'Copy')}>
                                  <Button
                                    size="small"
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopy(suggestion.command!)}
                                  >
                                    {t('common.copy', 'Copy')}
                                  </Button>
                                </Tooltip>
                              </div>
                            }
                            type="info"
                          />
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}

            {/* AI Insights */}
            {analysis.insights.length > 0 && (
              <Card
                title={
                  <Space>
                    <RobotOutlined />
                    <span>{t('ai.insights', 'AI Deep Analysis')}</span>
                  </Space>
                }
                extra={
                  <Tooltip title={t('ai.refresh', 'Regenerate Suggestions')}>
                    <Button 
                      type="text" 
                      icon={<ReloadOutlined spin={refreshingAI} />} 
                      onClick={handleRefreshAI} 
                      disabled={refreshingAI}
                    />
                  </Tooltip>
                }
                size="small"
              >
                <Collapse ghost defaultActiveKey={['0']}>
                  {analysis.insights.map((insight, index) => (
                    <Panel 
                      header={`${t('ai.insightDetail', 'Analysis')} ${index + 1}`} 
                      key={index}
                    >
                      <AIInsightContent content={insight} />
                    </Panel>
                  ))}
                </Collapse>
              </Card>
            )}

            {/* No Issues */}
            {analysis.issues.length === 0 && analysis.suggestions.length === 0 && (
              <Alert
                message={t('ai.allGood', 'Environment is Healthy')}
                description={t('ai.allGoodDesc', 'No obvious issues found. Your development environment is well configured!')}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}
          </>
        )}

        {/* Help Text */}
        {!analysis && !loading && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>{t('ai.helpTitle', 'What can AI Assistant do?')}</Title>
              <ul style={{ paddingLeft: 20 }}>
                <li>{t('ai.help1', 'Detect outdated or incompatible tools')}</li>
                <li>{t('ai.help2', 'Find environment configuration issues')}</li>
                <li>{t('ai.help3', 'Provide optimization suggestions')}</li>
                <li>{t('ai.help4', 'Recommend common tools to install')}</li>
              </ul>
              <Divider />
              <Text type="secondary">
                {t('ai.helpNote', 'Click "Analyze Environment" button to start intelligent analysis')}
              </Text>
            </Space>
          </Card>
        )}
      </Space>
    </Drawer>
  )
}
