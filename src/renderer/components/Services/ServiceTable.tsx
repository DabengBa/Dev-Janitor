/**
 * ServiceTable Component
 * 
 * Table component for displaying running services:
 * - Process name, PID, port
 * - Command
 * - CPU and memory usage
 * - Stop/kill action
 * 
 * Validates: Requirements 11.3, 11.5
 * Property 19: Running Service Information
 * Property 20: Service Stop Action Availability
 */

import React from 'react'
import { Table, Button, Popconfirm, Typography, Tooltip, Tag } from 'antd'
import {
  StopOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { RunningService } from '@shared/types'
import type { ColumnsType } from 'antd/es/table'

const { Text, Paragraph } = Typography

export interface ServiceTableProps {
  services: RunningService[]
  loading: boolean
  onKill: (pid: number) => void
  autoRefresh: boolean
}

const ServiceTable: React.FC<ServiceTableProps> = ({
  services,
  loading,
  onKill,
}) => {
  const { t } = useTranslation()

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command)
  }

  // Format memory size
  const formatMemory = (memory?: number): string => {
    if (memory === undefined) return '-'
    if (memory < 1024) return `${memory.toFixed(1)} MB`
    return `${(memory / 1024).toFixed(2)} GB`
  }

  // Format CPU percentage
  const formatCpu = (cpu?: number): string => {
    if (cpu === undefined) return '-'
    return `${cpu.toFixed(1)}%`
  }

  // Table columns - Validates: Property 19 (Running Service Information)
  const columns: ColumnsType<RunningService> = [
    {
      title: t('services.name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string) => (
        <Text strong className="font-mono">{name}</Text>
      ),
    },
    {
      title: t('services.pid'),
      dataIndex: 'pid',
      key: 'pid',
      width: 100,
      sorter: (a, b) => a.pid - b.pid,
      render: (pid: number) => (
        <Tag color="blue" className="font-mono">{pid}</Tag>
      ),
    },
    {
      title: t('services.port'),
      dataIndex: 'port',
      key: 'port',
      width: 100,
      sorter: (a, b) => (a.port || 0) - (b.port || 0),
      render: (port?: number) => (
        port ? (
          <Tag color="green" className="font-mono">{port}</Tag>
        ) : (
          <Text type="secondary">{t('services.noPort')}</Text>
        )
      ),
    },
    {
      title: t('services.command'),
      dataIndex: 'command',
      key: 'command',
      ellipsis: true,
      render: (command: string) => (
        <div className="flex items-center gap-2">
          <Tooltip title={command}>
            <Paragraph
              className="font-mono text-xs m-0 flex-1"
              ellipsis={{ rows: 1 }}
            >
              {command}
            </Paragraph>
          </Tooltip>
          <Tooltip title={t('common.copy')}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyCommand(command)}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: t('services.cpu'),
      dataIndex: 'cpu',
      key: 'cpu',
      width: 80,
      sorter: (a, b) => (a.cpu || 0) - (b.cpu || 0),
      render: (cpu?: number) => (
        <Text className="font-mono text-sm">{formatCpu(cpu)}</Text>
      ),
    },
    {
      title: t('services.memory'),
      dataIndex: 'memory',
      key: 'memory',
      width: 100,
      sorter: (a, b) => (a.memory || 0) - (b.memory || 0),
      render: (memory?: number) => (
        <Text className="font-mono text-sm">{formatMemory(memory)}</Text>
      ),
    },
    {
      // Validates: Property 20 (Service Stop Action Availability)
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title={t('services.stopTitle')}
          description={t('services.stopConfirm')}
          onConfirm={() => onKill(record.pid)}
          okText={t('common.yes')}
          cancelText={t('common.no')}
          okButtonProps={{ danger: true }}
        >
          <Tooltip title={t('services.stop')}>
            <Button
              type="text"
              danger
              icon={<StopOutlined />}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={services}
      loading={loading}
      rowKey={(record) => `${record.pid}-${record.port ?? 'na'}`}
      size="middle"
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `${total} ${t('services.title').toLowerCase()}`,
      }}
      locale={{
        emptyText: t('services.noServices'),
      }}
    />
  )
}

export default ServiceTable
