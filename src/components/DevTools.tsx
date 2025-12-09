import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Database, Server, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export const DevTools = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [useMock] = useState(import.meta.env.VITE_USE_MOCK_API === 'true')

  // Only show in development
  if (import.meta.env.PROD) return null

  const handleToggle = (checked: boolean) => {
    toast.success(
      checked
        ? '🔵 Switching to Mock API (reloading...)'
        : '🟢 Switching to Real API (reloading...)',
      { duration: 2000 }
    )

    // In a real implementation, you would update the env var
    // For now, we'll just reload the page and let the user change .env manually
    setTimeout(() => {
      toast.error(
        'Please update VITE_USE_MOCK_API in .env.development and reload manually',
        { duration: 5000 }
      )
    }, 2000)
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-4 right-4 z-50 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsOpen(!isOpen)}
        title="Developer Tools"
      >
        <Database className="w-5 h-5" />
      </motion.button>

      {/* Dev Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-20 right-4 z-50"
            >
              <Card className="p-4 w-80 bg-gray-900 text-white border-gray-700 shadow-2xl">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Developer Tools</h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="hover:bg-gray-800 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* API Mode */}
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {useMock ? (
                        <Database className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Server className="w-5 h-5 text-green-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {useMock ? 'Mock Data (MSW)' : 'Backend Server'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {useMock ? 'Offline development' : 'Connected to API'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={useMock ? 'default' : 'outline'} className="ml-2">
                      {useMock ? 'Mock' : 'Real'}
                    </Badge>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-sm">Enable Mock API</span>
                    <Switch checked={useMock} onCheckedChange={handleToggle} />
                  </div>

                  {/* Info */}
                  <div className="text-xs text-gray-400 space-y-1.5 p-3 bg-gray-800/30 rounded-lg">
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Mock: Full offline functionality
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      Real: Requires backend running
                    </p>
                    <p className="flex items-center gap-2 text-yellow-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                      Update .env.development to switch
                    </p>
                  </div>

                  {/* Mock Credentials */}
                  {useMock && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs space-y-2"
                    >
                      <p className="font-medium text-blue-300">Test Credentials:</p>
                      <div className="space-y-1 font-mono bg-gray-800 p-2 rounded">
                        <p>admin@bunyodkor.uz / admin123</p>
                        <p>teacher@bunyodkor.uz / teacher123</p>
                        <p>manager@bunyodkor.uz / manager123</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
