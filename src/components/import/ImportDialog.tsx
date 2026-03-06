import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react'
import type { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { useLanguageStore } from '@/store/languageStore'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  endpoint: string
  title: string
  description: string
  acceptedFormats?: string[]
}

export const ImportDialog = ({
  open,
  onOpenChange,
  onSuccess,
  endpoint,
  title,
  description,
  acceptedFormats = ['.xlsx', '.xls', '.csv'],
}: ImportDialogProps) => {
  const { t } = useLanguageStore()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase()

    if (!acceptedFormats.includes(fileExtension)) {
      toast.error(`Invalid file format. Accepted formats: ${acceptedFormats.join(', ')}`)
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error(t('pleaseSelectFile'))
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success(t('importCompleted'))
      onSuccess?.()
      handleClose()
    } catch (error: unknown) {
      const message =
        (error as AxiosError<{ detail?: string }>).response?.data?.detail ||
        'Failed to import file'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setUploading(false)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9997]"
        onClick={handleClose}
      />

      {/* Dialog Container - Centered */}
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* File Upload Area */}
            <div
              className={cn(
                'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                uploading && 'opacity-50 pointer-events-none'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats.join(',')}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {!file ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Drop your file here, or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supported formats: {acceptedFormats.join(', ')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                      <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Info Message */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Important
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                  Make sure your file follows the correct format. Invalid data may be skipped.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
      </div>
    </>
  )
}
