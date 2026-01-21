/**
 * AppLayout Component
 * 
 * Main application layout with:
 * - Header (Logo, Language Switcher, Refresh Button)
 * - Sidebar (Navigation Menu)
 * - Content area (dynamic view based on current selection)
 * 
 * Validates: Requirements 5.1, 5.4, 5.6, 7.1, 7.2, 7.3
 */

import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Layout, message, FloatButton, theme, Spin } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import Header from './Header'
import Sidebar from './Sidebar'

// Lazy load views for better startup performance
const ToolsView = lazy(() => import('../Tools/ToolsView'))
const PackagesView = lazy(() => import('../Packages/PackagesView'))
const ServicesView = lazy(() => import('../Services/ServicesView'))
const EnvironmentView = lazy(() => import('../Environment/EnvironmentView'))
const SettingsView = lazy(() => import('../Settings/SettingsView'))
const AIAssistantDrawer = lazy(() => import('../AI/AIAssistantDrawer'))
const AICLIView = lazy(() => import('../AICli/AICLIView'))
const CacheCleanerView = lazy(() => import('../CacheCleaner/CacheCleanerView'))

const { Content } = Layout

// Loading fallback component
const ViewLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <Spin size="large" />
  </div>
)

const AppLayout: React.FC = () => {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const {
    currentView,
    toolsLoading,
    packagesLoading,
    servicesLoading,
    envLoading,
    refreshAll,
    initializeLanguage,
  } = useAppStore()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)

  // Initialize language on mount
  useEffect(() => {
    initializeLanguage()
  }, [initializeLanguage])

  // Calculate overall loading state
  const isLoading = toolsLoading || packagesLoading || servicesLoading || envLoading

  // Handle refresh all - Validates: Requirements 7.1, 7.2, 7.3
  const handleRefresh = async () => {
    try {
      await refreshAll()
      message.success(t('notifications.refreshSuccess'))
    } catch (error) {
      message.error(t('notifications.refreshFailed'))
    }
  }

  // Render current view based on navigation selection
  const renderContent = () => {
    switch (currentView) {
      case 'tools':
        return <ToolsView />
      case 'packages':
        return <PackagesView />
      case 'services':
        return <ServicesView />
      case 'environment':
        return <EnvironmentView />
      case 'settings':
        return <SettingsView />
      case 'ai-cli':
        return <AICLIView />
      case 'cache-cleaner':
        return <CacheCleanerView />
      default:
        return <ToolsView />
    }
  }

  return (
    <Layout className="min-h-screen" style={{ background: token.colorBgLayout }}>
      {/* Header - Validates: Requirement 5.1 */}
      <Header onRefresh={handleRefresh} loading={isLoading} />
      
      <Layout style={{ background: token.colorBgLayout }}>
        {/* Sidebar - Validates: Requirement 5.1 */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
        
        {/* Content - Validates: Requirement 5.4 (responsive) */}
        <Content className="overflow-auto" style={{ background: token.colorBgLayout }}>
          <Suspense fallback={<ViewLoading />}>
            {renderContent()}
          </Suspense>
        </Content>
      </Layout>

      {/* AI Assistant Floating Button */}
      <FloatButton
        icon={<RobotOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={() => setAiDrawerOpen(true)}
        tooltip={t('ai.title', 'AI 助手')}
      />

      {/* AI Assistant Drawer */}
      <Suspense fallback={null}>
        <AIAssistantDrawer
          open={aiDrawerOpen}
          onClose={() => setAiDrawerOpen(false)}
        />
      </Suspense>
    </Layout>
  )
}

export default AppLayout
