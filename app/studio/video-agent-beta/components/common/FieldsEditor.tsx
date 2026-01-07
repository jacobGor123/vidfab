/**
 * Fields Editor - 通用多字段编辑组件
 * 用于分镜图和视频的字段编辑
 */

'use client'

import { useState } from 'react'
import { LucideIcon } from 'lucide-react'

export interface Field {
  name: string
  label: string
  value: string
  placeholder: string
  required?: boolean
  rows?: number
  maxLength?: number
  helpText?: string
  icon?: LucideIcon  // 🔥 改为 Lucide 图标类型
}

interface FieldsEditorProps {
  fields: Field[]
  onChange: (name: string, value: string) => void
  onReset: () => void
  // 🔥 移除 onPreview
  autoAddedInfo?: string
  className?: string
}

export function FieldsEditor({
  fields,
  onChange,
  onReset,
  // 🔥 移除 onPreview
  autoAddedInfo,
  className = ''
}: FieldsEditorProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  return (
    <div className={`space-y-3 pt-2 border-t ${className}`}>
      {fields.map(field => {
        const hasError = field.required && touched[field.name] && !field.value.trim()
        const charCount = field.value.length
        const maxChars = field.maxLength || 500

        return (
          <div key={field.name} className="space-y-1">
            {/* 标签 */}
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {field.icon && <field.icon className="w-3.5 h-3.5" />}
              <span>{field.label}</span>
              {field.required && <span className="text-red-400">*</span>}
            </label>

            {/* 输入框 */}
            <textarea
              value={field.value}
              onChange={(e) => onChange(field.name, e.target.value)}
              onBlur={() => handleBlur(field.name)}
              placeholder={field.placeholder}
              rows={field.rows || 2}
              maxLength={maxChars}
              className={`w-full text-xs p-2 bg-muted/50 border rounded resize-none focus:outline-none transition-colors ${
                hasError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-muted focus:border-primary'
              }`}
            />

            {/* 底部信息 */}
            <div className="flex items-center justify-between">
              {/* 左侧：错误提示或帮助文本 */}
              <div className="flex-1">
                {hasError ? (
                  <p className="text-xs text-red-400">This field is required</p>
                ) : field.helpText ? (
                  <p className="text-xs text-muted-foreground/60">{field.helpText}</p>
                ) : null}
              </div>

              {/* 右侧：字数统计 */}
              <div className={`text-xs tabular-nums ${
                charCount > maxChars * 0.9 ? 'text-orange-400' : 'text-muted-foreground/50'
              }`}>
                {charCount}/{maxChars}
              </div>
            </div>
          </div>
        )
      })}

      {/* 自动添加信息提示 */}
      {autoAddedInfo && (
        <div className="p-2.5 bg-primary/5 border border-primary/10 rounded text-xs text-muted-foreground leading-relaxed">
          {autoAddedInfo}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onReset}
          className="text-xs px-3 py-2 bg-muted/30 hover:bg-muted/60 text-muted-foreground rounded transition-colors font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
