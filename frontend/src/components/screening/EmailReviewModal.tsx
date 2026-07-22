import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { screeningApi } from '@/api/screening'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

interface EmailReviewModalProps {
  appId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EmailReviewModal({ appId, isOpen, onClose, onSuccess }: EmailReviewModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isDrafting, setIsDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (isOpen && appId) {
      const draftEmail = async () => {
        setIsDrafting(true)
        try {
          const res = await screeningApi.draftAutomatedEmail(appId)
          setSubject(res.data.subject)
          setBody(res.data.body)
        } catch (error: any) {
          toast.error(error.response?.data?.detail || "Failed to draft email. Please try again.")
          onClose()
        } finally {
          setIsDrafting(false)
        }
      }
      draftEmail()
    } else {
      setSubject('')
      setBody('')
    }
  }, [isOpen, appId, onClose])

  const handleSend = async () => {
    if (!appId || !subject.trim() || !body.trim()) {
      toast.error("Subject and body are required")
      return
    }

    setIsSending(true)
    try {
      await screeningApi.sendCustomEmail(appId, { subject, body })
      toast.success("Email sent successfully!")
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to send email")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Send className="w-5 h-5 text-indigo-600" />
            Review Automated Email
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            The AI has drafted the following email based on the candidate's current status. You can edit the subject and body before sending.
          </DialogDescription>
        </DialogHeader>

        {isDrafting ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse">Drafting email with AI...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Subject</label>
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2 flex-grow">
              <label className="text-sm font-semibold text-gray-700">Message Body</label>
              <textarea 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-sm resize-none text-gray-900"
              />
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={isSending || isDrafting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending || isDrafting || !subject.trim() || !body.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
