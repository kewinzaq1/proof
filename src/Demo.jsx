import { useEffect, useState } from 'react'
import './demo.css'
import { ArrowRight, Brain, Check, Circle, Database, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react'

const demoGoal = 'Launch PROOF and get 100 active users by October 1.'
const demoTasks = [
  'Work on the landing page',
  'Research competitors',
  'Send the demo to 10 potential users',
  'Fix the onboarding bug reported by testers',
  'Post about the product',
]

function Logo() {
  return <a className="logo" href={import.meta.env.BASE_URL} aria-label="Back to PROOF landing page"><span><Check size={16} strokeWidth={3} /></span><strong>PROOF</strong></a>
}

function App() {
  const [goal, setGoal] = useState(demoGoal)
  const [tasks, setTasks] = useState(demoTasks)
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useMemory, setUseMemory] = useState(true)
  const [status, setStatus] = useState({ ai: false, cognee: false, loading: true })

  useEffect(() => {
    fetch('/api/status')
      .then((response) => response.json())
      .then((data) => setStatus({ ...data, loading: false }))
      .catch(() => setStatus({ ai: false, cognee: false, loading: false }))
  }, [])

  const updateTask = (index, value) => {
    setTasks((current) => current.map((task, taskIndex) => taskIndex === index ? value : task))
  }

  const runAudit = async () => {
    setLoading(true)
    setError('')
    setAudit(null)
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, tasks, useMemory }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Audit failed.')
      setAudit(data)
      setStatus((current) => ({ ...current, ai: data.meta.mode === 'ai', cognee: data.meta.cognee }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setGoal(demoGoal)
    setTasks(demoTasks)
    setAudit(null)
    setError('')
  }

  const complete = goal.trim() && tasks.every((task) => task.trim())

  return (
    <main>
      <header>
        <Logo />
        <div className="system-status">
          <span className={status.ai ? 'online' : ''}><Brain size={13} /> AI {status.ai ? 'LIVE' : 'NOT CONFIGURED'}</span>
          <span className={status.cognee ? 'online' : ''}><Database size={13} /> COGNEE {status.cognee ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>
      </header>

      <section className="intro">
        <span className="eyebrow">FIVE TASKS. ONE HONEST AUDIT.</span>
        <h1>Does your list<br /><em>hold up?</em></h1>
        <p>PROOF rejects vague work, comfortable busywork, and tasks that don’t move your actual goal.</p>
      </section>

      <section className="demo-shell">
        <div className="input-panel">
          <div className="panel-heading">
            <div><span>01</span><h2>Write today’s five.</h2></div>
            <button className="reset" onClick={reset}><RotateCcw size={13} /> Reset demo</button>
          </div>

          <label className="goal-field">
            <span>THE TARGET</span>
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows="2" />
          </label>

          <div className="task-fields">
            <span className="field-label">TODAY’S CRITICAL TASKS</span>
            {tasks.map((task, index) => (
              <label key={index}>
                <span>{index + 1}</span>
                <input value={task} onChange={(event) => updateTask(index, event.target.value)} aria-label={`Critical task ${index + 1}`} />
              </label>
            ))}
          </div>

          <label className="memory-toggle">
            <input type="checkbox" checked={useMemory} onChange={(event) => setUseMemory(event.target.checked)} />
            <span className="fake-check">{useMemory && <Check size={12} />}</span>
            <span><strong>Use Cognee memory</strong><small>Recall and remember execution patterns</small></span>
          </label>

          <button className="audit-button" disabled={!complete || loading} onClick={runAudit}>
            {loading ? <><Loader2 size={17} className="spinner" /> Auditing the list…</> : <>Audit my list <ArrowRight size={17} /></>}
          </button>
          {error && <p className="error"><X size={14} /> {error}</p>}
        </div>

        <div className={`result-panel ${audit ? 'has-results' : ''}`}>
          {!audit && !loading && (
            <div className="empty-state">
              <span><ShieldCheck size={31} /></span>
              <h2>No score yet.</h2>
              <p>Run the audit. PROOF will evaluate all five tasks against the target.</p>
              <div><Circle size={11} /> Nothing is sent until you click Audit.</div>
            </div>
          )}
          {loading && (
            <div className="analyzing-state">
              <span className="scan-line" />
              <Loader2 size={28} className="spinner" />
              <h2>Checking for fake progress.</h2>
              <p>Testing specificity, finish lines, and connection to the target.</p>
            </div>
          )}
          {audit && (
            <div className="audit-results">
              <div className="result-top">
                <span>02 · AUDIT COMPLETE</span>
                <div className={audit.meta.mode === 'ai' ? 'real-ai' : 'rules-mode'}>{audit.meta.mode === 'ai' ? `${audit.meta.model} · LIVE AI` : 'LOCAL RULES'}</div>
              </div>
              <h2>{audit.summary}</h2>
              {audit.meta.warning && <p className="warning">{audit.meta.warning}</p>}
              <div className="results-list">
                {audit.tasks.map((task, index) => (
                  <article key={`${task.original}-${index}`} className={task.status === 'PASSED' ? 'passed' : 'rejected'}>
                    <span className="result-icon">{task.status === 'PASSED' ? <Check size={14} /> : <X size={14} />}</span>
                    <div>
                      <div className="task-verdict"><strong>{task.original}</strong><small>{task.status}</small></div>
                      <p>{task.reason}</p>
                      {task.rewrite && <div className="rewrite"><span>REWRITE</span>{task.rewrite}</div>}
                    </div>
                  </article>
                ))}
              </div>
              <div className="pattern"><span>PATTERN</span><p>{audit.pattern}</p></div>
              <div className="memory-result"><Database size={14} /><span>{audit.meta.remembered ? 'This audit was remembered by Cognee.' : audit.meta.cognee ? 'Cognee connected; memory write is processing.' : 'Cognee is offline. Audit was not stored.'}</span></div>
            </div>
          )}
        </div>
      </section>

      <footer>
        <Logo />
        <p>AI audits the list. You still have to do the work.</p>
      </footer>
    </main>
  )
}

export default App
