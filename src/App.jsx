import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Crosshair,
  FileCheck2,
  Flag,
  Lock,
  Menu,
  ShieldCheck,
  Target,
  X,
  Zap,
} from 'lucide-react'


const audits = [
  {
    task: 'Work on the landing page',
    verdict: 'REJECTED',
    reason: '“Work on” has no finish line.',
    rewrite: 'Publish the landing page by 1 PM.',
  },
  {
    task: 'Research competitors',
    verdict: 'REJECTED',
    reason: 'Research can become avoidance.',
    rewrite: 'Interview 3 competitor users and record their unresolved problems.',
  },
  {
    task: 'Post about the product',
    verdict: 'REJECTED',
    reason: 'Activity is not an outcome.',
    rewrite: 'Send the demo directly to 10 qualified people.',
  },
]

const steps = [
  {
    number: '01',
    icon: Target,
    title: 'Declare the target.',
    copy: 'One measurable result. One deadline. If the target is vague, everything beneath it will be vague too.',
  },
  {
    number: '02',
    icon: Crosshair,
    title: 'Write your five.',
    copy: 'You choose five critical actions that move the target forward today. The AI does not build your life for you.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Pass the audit.',
    copy: 'PROOF rejects vague work, comfortable busywork, and tasks with no finish line. Rewrite until every task holds up.',
  },
  {
    number: '04',
    icon: FileCheck2,
    title: 'Show the receipts.',
    copy: 'Complete all five and win the day. Miss one and take the loss. Your weekly audit finds the pattern.',
  },
]

function Wordmark() {
  return (
    <a className="wordmark" href="#top" aria-label="PROOF home">
      <span className="proof-mark"><Check size={15} strokeWidth={3} /></span>
      <strong>PROOF</strong>
    </a>
  )
}

function App() {
  const [activeAudit, setActiveAudit] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const audit = audits[activeAudit]

  const submitEmail = (event) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <main id="top">
      <nav className="top-nav">
        <Wordmark />
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#product" onClick={() => setMenuOpen(false)}>Product</a>
          <a href="#method" onClick={() => setMenuOpen(false)}>Method</a>
          <a href="#standards" onClick={() => setMenuOpen(false)}>Standards</a>
          <a className="nav-cta" href="#access" onClick={() => setMenuOpen(false)}>Request access <ArrowRight size={15} /></a>
        </div>
        <button className="menu-toggle" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>

      <section className="hero" id="product">
        <div className="hero-content">
          <div className="kicker"><span /> The execution system for people who mean it</div>
          <h1>Your plan<br />is lying <em>to you.</em></h1>
          <p className="hero-lede">
            Five critical tasks. An AI that calls out vague work, comfortable busywork, and fake progress. One honest scoreboard.
          </p>
          <div className="hero-actions">
            <a className="solid-button" href="#access">Get early access <ArrowRight size={17} /></a>
            <a className="underlined-link" href="#audit">See the audit <ArrowDown size={15} /></a>
          </div>
          <div className="hero-proof">
            <span><Check size={14} /> No motivational feed</span>
            <span><Check size={14} /> No streak repair</span>
            <span><Check size={14} /> No excuses</span>
          </div>
        </div>

        <div className="product-frame" aria-label="PROOF product preview">
          <div className="frame-topbar">
            <span className="mini-wordmark"><span className="proof-mark small"><Check size={10} strokeWidth={3} /></span> PROOF</span>
            <span>JUL 13 · DAY 08</span>
          </div>
          <div className="frame-target">
            <span>12-WEEK TARGET</span>
            <p>Launch PROOF and reach 100 active users by October 1.</p>
          </div>
          <div className="frame-list">
            <div className="list-heading"><span>TODAY’S FIVE</span><strong>3 / 5</strong></div>
            {[
              ['Publish landing page by 1 PM', true],
              ['Interview 3 competitor users', true],
              ['Send demo to 10 qualified people', true],
              ['Fix the onboarding blocker', false],
              ['Contact 15 potential users', false],
            ].map(([text, done], index) => (
              <div className={`frame-task ${done ? 'done' : ''}`} key={text}>
                <span>{done ? <Check size={12} /> : index + 1}</span>
                <p>{text}</p>
                {done && <small>VERIFIED</small>}
              </div>
            ))}
          </div>
          <div className="frame-lock"><Lock size={12} /> LIST LOCKED UNTIL 12:00 AM</div>
          <div className="frame-stamp">NO EDITS</div>
        </div>
      </section>

      <section className="hard-line">
        <div><span>NOT A TO-DO LIST</span><i /></div>
        <strong>DO THE WORK.</strong>
        <div><i /><span>SHOW THE PROOF</span></div>
      </section>

      <section className="audit-section" id="audit">
        <div className="section-copy">
          <span className="section-number">[ 01 — THE AUDIT ]</span>
          <h2>AI that doesn’t<br /><em>cheerlead.</em></h2>
          <p>
            Most productivity apps reward you for writing things down. PROOF makes sure the things you wrote down are worth doing.
          </p>
          <div className="audit-selectors">
            {audits.map((item, index) => (
              <button key={item.task} className={activeAudit === index ? 'active' : ''} onClick={() => setActiveAudit(index)}>
                <span>0{index + 1}</span>{item.task}<ChevronRight size={15} />
              </button>
            ))}
          </div>
        </div>

        <div className="audit-console">
          <div className="console-header"><span>PROOF / TASK AUDIT</span><span className="live-dot">LIVE</span></div>
          <div className="submitted-task"><small>YOU SUBMITTED</small><p>“{audit.task}”</p></div>
          <div className="verdict-line"><X size={18} /><strong>{audit.verdict}</strong></div>
          <div className="audit-reason"><small>WHY IT FAILED</small><p>{audit.reason}</p></div>
          <div className="audit-rewrite"><small>MAKE IT HOLD UP</small><p>{audit.rewrite}</p><button>Accept rewrite <ArrowRight size={14} /></button></div>
          <div className="console-footer"><Zap size={12} /> Analyzed against your target, history, and available time.</div>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-header">
          <span className="section-number light">[ 02 — THE METHOD ]</span>
          <h2>Simple enough<br />to execute.</h2>
          <p>No dashboards to maintain. No system to obsess over. Four moves, repeated daily.</p>
        </div>
        <div className="steps-grid">
          {steps.map(({ number, icon: Icon, title, copy }) => (
            <article key={number}>
              <div className="step-top"><span>{number}</span><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="score-section" id="standards">
        <div className="score-board">
          <div className="score-head"><Flag size={19} /><span>WEEK 08</span></div>
          <div className="day-score-row">
            {[
              ['M', 'W'], ['T', 'W'], ['W', 'L'], ['T', 'W'], ['F', 'W'], ['S', 'L'], ['S', '—'],
            ].map(([day, result], index) => (
              <div key={`${day}-${index}`} className={result === 'W' ? 'win' : result === 'L' ? 'loss' : ''}>
                <small>{day}</small><strong>{result}</strong>
              </div>
            ))}
          </div>
          <div className="score-summary"><strong>4–2</strong><span>THIS WEEK</span></div>
          <div className="pattern-alert">
            <span><Zap size={14} /> PATTERN DETECTED</span>
            <p>You complete product tasks. You avoid direct customer contact.</p>
          </div>
        </div>
        <div className="score-copy">
          <span className="section-number">[ 03 — THE STANDARD ]</span>
          <h2>The record<br />doesn’t care.</h2>
          <p>Complete all five and win the day. Miss one and take the loss. PROOF studies the record—not the story you tell yourself about it.</p>
          <ul>
            <li><Check size={15} /> Detect comfortable task selection</li>
            <li><Check size={15} /> Expose repeated avoidance patterns</li>
            <li><Check size={15} /> Raise the standard when tasks become habits</li>
          </ul>
        </div>
      </section>

      <section className="manifesto">
        <span className="manifesto-label">THE OPERATING PRINCIPLE</span>
        <blockquote>“Toughness isn’t noise.<br />It’s keeping the promise<br />when nobody is watching.”</blockquote>
        <p>No shame. No performance. Just an honest commitment and an honest result.</p>
      </section>

      <section className="access-section" id="access">
        <div>
          <span className="section-number light">[ PRIVATE BETA ]</span>
          <h2>Ready to stop<br />negotiating?</h2>
        </div>
        {submitted ? (
          <div className="success-message"><span><Check size={18} /></span><div><strong>You’re on the list.</strong><p>Now get back to the work.</p></div></div>
        ) : (
          <form onSubmit={submitEmail}>
            <label htmlFor="email">YOUR EMAIL</label>
            <div><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@domain.com" required /><button type="submit">Request access <ArrowRight size={16} /></button></div>
            <p>No newsletter. One email when the beta opens.</p>
          </form>
        )}
      </section>

      <footer>
        <Wordmark />
        <p>Built for disciplined people. Not affiliated with or endorsed by any public figure.</p>
        <span>© 2026 PROOF</span>
      </footer>
    </main>
  )
}

export default App
