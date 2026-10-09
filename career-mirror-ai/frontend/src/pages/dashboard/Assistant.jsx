import { useEffect, useRef, useState } from 'react'
import { Bot, Cpu, SendHorizonal, User } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Avatar, PageHead, SkeletonCard } from '../../components/ui'

const SUGGESTIONS = [
  'What skills am I missing?',
  'Why is my score low?',
  'How can I improve my React skills?',
  'What should I learn first?',
  'What projects should I build?',
  'How can I prepare for this role?',
]

export default function Assistant() {
  const toast = useToast()
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hi! I'm your AI career coach 🤖 I've read your latest analysis, so ask me anything about your skills, gaps, roadmap or interview prep.",
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState(null) // 'ollama' | 'local'
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: message }])
    setSending(true)
    try {
      const res = await api.post('/chat', { message })
      setMessages((m) => [...m, { role: 'bot', text: res.data.reply }])
      setMode(res.data.mode)
      if (res.data.notice) toast.info('Assistant', res.data.notice)
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: `⚠️ ${errMsg(err)}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-enter">
      <PageHead
        title="AI Career Assistant"
        sub="Answers grounded in your actual analysis — local AI, no API bills"
        actions={
          mode ? (
            <span className="badge badge-violet">
              <Cpu size={11} /> {mode === 'ollama' ? 'Ollama (local model)' : 'Local answer engine'}
            </span>
          ) : null
        }
      />

      <div className="card chat-shell">
        <div className="chat-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={sending}>{s}</button>
          ))}
        </div>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className="chat-row">
              {m.role === 'bot' ? (
                <span className="avatar sm" style={{ background: 'linear-gradient(135deg,#6d5ae0,#1d4ed8)' }}><Bot size={15} /></span>
              ) : (
                <span style={{ width: 34 }} />
              )}
              <div className={`chat-bubble ${m.role}`}>{m.text}</div>
              {m.role === 'user' && <span className="avatar sm" style={{ background: 'linear-gradient(135deg,#0d7a5c,#1d4ed8)' }}><User size={15} /></span>}
            </div>
          ))}
          {sending && (
            <div className="chat-row">
              <span className="avatar sm" style={{ background: 'linear-gradient(135deg,#6d5ae0,#1d4ed8)' }}><Bot size={15} /></span>
              <div className="chat-bubble bot">
                <span className="chat-typing"><span /><span /><span /></span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chat-input-row">
          <input
            className="input"
            placeholder="Ask about your skills, gaps, roadmap or interview prep…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            aria-label="Message the career assistant"
          />
          <button className="btn btn-royal" onClick={() => send()} disabled={sending || !input.trim()} aria-label="Send message">
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
