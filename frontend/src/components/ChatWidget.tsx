import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, X, ChevronDown, Bot, Trash2 } from 'lucide-react'
import { ragApi, type RetrievedCandidate } from '@/api/rag'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  candidates?: RetrievedCandidate[]
}

const SUGGESTIONS = [
  'Find React developers with 5+ years',
  'Who has AWS certifications?',
  'Show full-stack candidates',
]

export function ChatWidget() {
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isHR) return null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const clearChat = async () => {
    if (sessionId) {
      try { await ragApi.deleteSession(sessionId) } catch { /* ignore */ }
    }
    setMessages([])
    setSessionId(undefined)
    setInput('')
  }

  const send = async () => {
    const msg = input.trim()
    if (!msg || sending) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setSending(true)
    try {
      const res = await ragApi.chat(msg, sessionId)
      const data = res.data
      if (!sessionId) setSessionId(data.session_id)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content, candidates: data.retrieved_candidates },
      ])
    } catch {
      toast.error('Chat failed')
      setMessages((prev) => prev.slice(0, -1))
      setInput(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative flex flex-col items-end">
      {open && (
        <div className="absolute bottom-16 right-0 w-[360px] h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-none">AI Candidate Search</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Powered by TalentScout AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  disabled={sending}
                  title="Clear chat"
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-5 pb-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">How can I help you today?</p>
                  <p className="text-xs text-slate-400 mt-1">Search your candidate pool with natural language</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-xs text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.candidates && msg.candidates.length > 0 && (
                  <div className="w-full space-y-1.5 max-w-[90%]">
                    {msg.candidates.map((c) => (
                      <div key={c.candidate_id} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/candidates/${c.candidate_id}`}
                            className="text-xs font-semibold text-indigo-600 hover:underline truncate"
                          >
                            {c.full_name}
                          </Link>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                            {(c.similarity_score * 100).toFixed(0)}% match
                          </span>
                        </div>
                        {c.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.skills.slice(0, 4).map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-start gap-2">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                placeholder="Ask about candidates..."
                disabled={sending}
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400 py-1"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        title="AI Candidate Search"
        className="flex items-center gap-2.5 px-4 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <div className="relative">
              <Bot className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-indigo-600" />
            </div>
          </>
        )}
      </button>
    </div>
  )
}
