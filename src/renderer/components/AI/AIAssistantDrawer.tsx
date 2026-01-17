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

import React, { useState, useEffect } from 'react'
import { Drawer, Button, Spin, Alert, Card, Tag, Space, Divider, Typography, Collapse, message, Tooltip } from 'antd'
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
import type { AnalysisResult, Issue, Suggestion } from '../../../shared/types'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

/**
 * Component to handle AI insight content with thinking folding and Markdown rendering
 */
const AIInsightContent: React.FC<{ content: string }> = ({ content }) => {
  const { t } = useTranslation()
  
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
          style={{ marginBottom: 16, background: 'rgba(0, 0, 0, 0.02)', borderRadius: 8 }}
        >
          <Panel 
            header={
              <Space>
                <BulbOutlined style={{ color: '#faad14' }} />
                <Text type="secondary">{t('ai.thinking', 'Thinking Process...')}</Text>
              </Space>
            } 
            key="thinking"
          >
            <div style={{ color: '#8c8c8c', fontStyle: 'italic', fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
              {thinking}
            </div>
          </Panel>
        </Collapse>
      )}
      <div className="markdown-content">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }) => (
              <div style={{ 
                background: '#f6f8fa', 
                padding: '12px', 
                borderRadius: '8px', 
                overflow: 'auto',
                margin: '12px 0'
              }}>
                <pre style={{ margin: 0 }}>{children}</pre>
              </div>
            ),
            code: ({ children, className }) => {
              const inline = !className
              return inline ? (
                <code style={{ 
                  background: 'rgba(0, 0, 0, 0.06)', 
                  padding: '2px 4px', 
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}>{children}</code>
              ) : (
                <code className={className}>{children}</code>
              )
            },
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
              </div>
            ),
            tr: ({ children }) => <tr style={{ borderBottom: '1px solid #f0f0f0' }}>{children}</tr>,
            th: ({ children }) => <th style={{ padding: '8px', background: '#fafafa', textAlign: 'left' }}>{children}</th>,
            td: ({ children }) => <td style={{ padding: '8px' }}>{children}</td>,
            ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
            p: ({ children }) => <p style={{ marginBottom: '12px' }}>{children}</p>,
            h1: ({ children }) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '16px 0 8px' }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '14px 0 8px' }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '12px 0 8px' }}>{children}</h3>,
            a: (props: { href?: string; children?: React.ReactNode }) => (
              <a 
                href={props.href} 
                onClick={(e) => {
                  e.preventDefault()
                  if (props.href) window.electronAPI.shell.openExternal(props.href)
                }}
              >
                {props.children}
              </a>
            )
          }}
        >
          {mainContent}
        </ReactMarkdown>
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
  const [loading, setLoading] = useState(false)
  const [refreshingAI, setRefreshingAI] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  // Listen for streaming tokens
  useEffect(() => {
    const cleanup = window.electronAPI.ai.onStreamToken((token) => {
      setAnalysis(prev => {
        if (!prev) return prev
        const newInsights = [...prev.insights]
        if (newInsights.length === 0) newInsights.push('')
        newInsights[0] += token
        return { ...prev, insights: newInsights }
      })
    })
    return cleanup
  }, [])

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      // Pass current language to the analyzer
      const result = await window.electronAPI.ai.analyze(i18n.language as 'en-US' | 'zh-CN')
      setAnalysis(result)
    } catch {
      console.error('Analysis failed')
      message.error(t('errors.unknown', 'Analysis failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshAI = async () => {
    if (!analysis) return
    setRefreshingAI(true)
    try {
      // Pass true for useCache to skip scanning
      const result = await window.electronAPI.ai.analyze(i18n.language as 'en-US' | 'zh-CN', true)
      setAnalysis(result)
      message.success(t('ai.refreshed', 'AI recommendations refreshed'))
    } catch {
      console.error('Refresh failed')
      message.error(t('errors.unknown', 'Refresh failed'))
    } finally {
      setRefreshingAI(false)
    }
  }

  // Open a URL in browser
  const handleOpenUrl = async (url: string) => {
    try {
      await window.electronAPI.shell.openExternal(url)
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
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
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
                                  background: '#f5f5f5', 
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
