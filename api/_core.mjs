const llmKey = process.env.LLM_API_KEY || ''
const llmUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const llmModel = process.env.LLM_MODEL || 'gpt-4o-mini'
const cogneeUrl = (process.env.COGNEE_BASE_URL || 'http://localhost:8011').replace(/\/$/, '')
const cogneeKey = process.env.COGNEE_API_KEY || ''
const cogneeDataset = process.env.COGNEE_DATASET || 'proof_execution'

async function cogneeRecall(goal) {
  try {
    const response = await fetch(`${cogneeUrl}/api/v1/recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cogneeKey ? { 'X-Api-Key': cogneeKey } : {}),
      },
      body: JSON.stringify({
        query: `What execution patterns, repeated avoidance, or task preferences are relevant to this goal: ${goal}`,
        datasets: [cogneeDataset],
        top_k: 5,
        only_context: true,
        scope: ['graph'],
      }),
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return { connected: false, context: [] }
    const data = await response.json()
    return { connected: true, context: Array.isArray(data) ? data : [data] }
  } catch {
    return { connected: false, context: [] }
  }
}

async function cogneeRemember(goal, audit) {
  const content = [
    `Goal: ${goal}`,
    `Audit date: ${new Date().toISOString().slice(0, 10)}`,
    ...audit.tasks.map((task) => `${task.status}: ${task.original}. Reason: ${task.reason}. Rewrite: ${task.rewrite || 'none'}`),
    `Pattern: ${audit.pattern}`,
  ].join('\n')

  const form = new FormData()
  form.append('datasetName', cogneeDataset)
  form.append('node_set', 'execution_patterns')
  form.append('run_in_background', 'true')
  form.append('data', new Blob([content], { type: 'text/plain' }), 'proof-audit.txt')

  try {
    const response = await fetch(`${cogneeUrl}/api/v1/remember`, {
      method: 'POST',
      headers: cogneeKey ? { 'X-Api-Key': cogneeKey } : {},
      body: form,
      signal: AbortSignal.timeout(3500),
    })
    return response.ok
  } catch {
    return false
  }
}

function rulesAudit(goal, tasks) {
  const vague = /^(work on|research|think about|plan|improve|focus on|start|continue|do)\b/i
  const measurable = /\b(\d+|publish|send|ship|finish|record|submit|call|interview|fix|deliver|by\s+\d)\b/i
  const reviewed = tasks.map((original) => {
    const trimmed = original.trim()
    if (vague.test(trimmed) || !measurable.test(trimmed)) {
      const rewrite = trimmed.toLowerCase().includes('research')
        ? 'Interview 3 people affected by the problem and record what they still struggle with.'
        : `Define one visible deliverable for “${trimmed}” and a deadline today.`
      return { original: trimmed, status: 'REJECTED', reason: 'No objective finish line or measurable output.', rewrite }
    }
    return { original: trimmed, status: 'PASSED', reason: 'Concrete action with a visible result.', rewrite: '' }
  })
  return {
    summary: `${reviewed.filter((task) => task.status === 'PASSED').length} of 5 tasks hold up against “${goal.replace(/[.!?]+$/, '')}.”`,
    tasks: reviewed,
    pattern: 'The list favors activity unless each task produces a visible result.',
  }
}

async function aiAudit(goal, tasks, memory) {
  const system = `You are PROOF, a severe but fair execution auditor. Audit exactly five daily tasks against one goal.
Reject vague activity, maintenance disguised as progress, comfortable avoidance, and tasks without an objective finish line.
Do not motivate, praise, insult, diagnose, or use macho language. Be terse and factual.
Return valid JSON only with this shape:
{"summary":"string","tasks":[{"original":"string","status":"PASSED or REJECTED","reason":"string","rewrite":"string, empty when passed"}],"pattern":"string"}
Each rewrite must be achievable today, measurable, and directly connected to the goal.`

  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llmKey}` },
    body: JSON.stringify({
      model: llmModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify({ goal, tasks, relevant_previous_patterns: memory }) },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) throw new Error(`Model provider returned ${response.status}.`)
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Model returned no audit.')
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length !== 5) throw new Error('Model returned an invalid task audit.')
  return parsed
}

export async function getStatus() {
  const memory = await cogneeRecall('connection check')
  return { ai: Boolean(llmKey), cognee: memory.connected, model: llmKey ? llmModel : null }
}

export async function auditPayload(payload = {}) {
  const { goal, tasks, useMemory = true } = payload
  if (!goal?.trim() || !Array.isArray(tasks) || tasks.length !== 5 || tasks.some((task) => !task?.trim())) {
    const error = new Error('Provide one goal and exactly five tasks.')
    error.status = 400
    throw error
  }

  const memory = useMemory ? await cogneeRecall(goal) : { connected: false, context: [] }
  let audit
  let mode = 'rules'
  let warning = ''
  if (llmKey) {
    try {
      audit = await aiAudit(goal, tasks, memory.context)
      mode = 'ai'
    } catch (error) {
      audit = rulesAudit(goal, tasks)
      warning = `${error.message} Showing the local audit instead.`
    }
  } else {
    audit = rulesAudit(goal, tasks)
    warning = 'LLM_API_KEY is not configured. Showing the transparent local audit.'
  }

  const remembered = useMemory && memory.connected ? await cogneeRemember(goal, audit) : false
  return {
    ...audit,
    meta: { mode, cognee: memory.connected, remembered, model: mode === 'ai' ? llmModel : null, warning },
  }
}
