import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, Trash2, Bot, User, Users } from 'lucide-react'
import { ragApi, type RetrievedCandidate, type ChatSession } from '@/api/rag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  candidates?: RetrievedCandidate[]
}

export function ChatPage() {
  const { user } = useAuth()
  const isManager = user?.role?.toLowerCase() === 'manager'

  if (isManager) {
    return <Navigate to="/dashboard" replace />
  }

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => ragApi.getSessions().then((r) => r.data),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.content,
        candidates: data.retrieved_candidates,
      }])
      refetchSessions()
    } catch {
      toast.error('Chat failed')
      setMessages((prev) => prev.slice(0, -1))
      setInput(msg)
    } finally {
      setSending(false)
    }
  }

  const startNew = () => {
    setMessages([])
    setSessionId(undefined)
  }

  const loadSession = async (sid: string) => {
    try {
      const res = await ragApi.getSession(sid)
      const hist = res.data.messages
      setSessionId(sid)
      setMessages(hist.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })))
    } catch {
      toast.error('Failed to load session')
    }
  }

  const deleteSession = async (sid: string) => {
    try {
      await ragApi.deleteSession(sid)
      refetchSessions()
      if (sessionId === sid) startNew()
    } catch {
      toast.error('Failed to delete session')
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sidebar */}
      <div className="hidden lg:flex w-56 flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full" onClick={startNew}>New Chat</Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessionsData?.sessions.map((s: ChatSession) => (
            <div key={s.session_id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer hover:bg-gray-100 ${s.session_id === sessionId ? 'bg-blue-50' : ''}`}>
              <button type="button" className="flex-1 text-left min-w-0" onClick={() => loadSession(s.session_id)}>
                <p className="text-xs font-medium text-gray-700 truncate">{s.first_message ?? 'Chat'}</p>
                <p className="text-xs text-gray-400">{s.message_count} messages</p>
              </button>
              <button type="button" className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5" onClick={() => deleteSession(s.session_id)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <Bot className="h-14 w-14 text-blue-200 mx-auto mb-4" />
                <p className="font-medium text-gray-700">AI Candidate Search</p>
                <p className="text-sm text-gray-500 mt-1">Ask me to find candidates, compare profiles, or search by skills</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Find React developers with 5+ years',
                    'Who has AWS certifications?',
                    'Top Python candidates in Hyderabad',
                  ].map((q) => (
                    <button key={q} type="button" className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50" onClick={() => { setInput(q) }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-lg space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.candidates && msg.candidates.length > 0 && (
                  <div className="space-y-1.5 w-full">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" />{msg.candidates.length} matching candidates</p>
                    {msg.candidates.map((c) => (
                      <Card key={c.candidate_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Link to={`/candidates/${c.candidate_id}`} className="font-medium text-sm text-blue-600 hover:underline">{c.full_name}</Link>
                            <Badge variant="secondary" className="text-xs">{(c.similarity_score * 100).toFixed(0)}% match</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{c.total_experience_years}y exp · {c.location ?? 'Unknown'}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.skills.slice(0, 4).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-gray-200 pt-4">
          <Input
            placeholder="Ask about candidates… e.g. Find senior React developers"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
