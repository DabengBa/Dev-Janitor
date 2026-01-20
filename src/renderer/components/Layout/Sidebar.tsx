/**
 * Sidebar Component
 *
 * Navigation sidebar with menu items for different views:
 * - Tools
 * - Packages
 * - Services
 * - Environment
 * - Settings
 *
 * Validates: Requirements 5.1, 5.2
 */

import React from 'react'
import { Layout, Menu, theme } from 'antd'
import {
  ToolOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  SettingOutlined,
  CodeOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import type { ViewType } from '@shared/types'

const { Sider } = Layout

interface SidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onCollapse }) => {
  const { t } = useTranslation()
  const { currentView, setCurrentView, themeMode } = useAppStore()
  const { token } = theme.useToken()

  const systemPrefersDark =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false

  const isDarkMode: boolean = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark)

  const menuItems = [
    {
      key: 'tools' as ViewType,
      icon: <ToolOutlined />,
      label: t('nav.tools'),
    },
    {
      key: 'packages' as ViewType,
      icon: <AppstoreOutlined />,
      label: t('nav.packages'),
    },
    {
      key: 'services' as ViewType,
      icon: <CloudServerOutlined />,
      label: t('nav.services'),
    },
    {
      key: 'environment' as ViewType,
      icon: <CodeOutlined />,
      label: t('nav.environment'),
    },
    {
      key: 'settings' as ViewType,
      icon: <SettingOutlined />,
      label: t('nav.settings'),
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    setCurrentView(key as ViewType)
  }

  const trigger = (
    <div
      className="flex items-center justify-center"
      style={{
        width: '100%',
        height: '100%',
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        color: token.colorTextSecondary,
      }}
    >
      {collapsed ? <RightOutlined /> : <LeftOutlined />}
    </div>
  )

  return (
    <Sider
      width={200}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      theme={isDarkMode ? 'dark' : 'light'}
      breakpoint="lg"
      collapsedWidth={80}
      trigger={trigger}
      style={{
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[currentView]}
        onClick={handleMenuClick}
        items={menuItems}
        className="h-full border-r-0 pt-4"
        style={{ height: '100%', background: 'transparent' }}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </Sider>
  )
}

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(Sidebar)
