import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 5173)
const llmKey = process.env.LLM_API_KEY || ''
const llmUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const llmModel = process.env.LLM_MODEL || 'gpt-4o-mini'
const cogneeUrl = (process.env.COGNEE_BASE_URL || 'http://localhost:8011').replace(/\/$/, '')
const cogneeKey = process.env.COGNEE_API_KEY || ''
const cogneeDataset = process.env.COGNEE_DATASET || 'proof_execution'

let vite
if (!production) {
  const { createServer: createViteServer } = await import('vite')
  vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 100_000) throw new Error('Request is too large.')
  }
  return JSON.parse(raw || '{}')
}

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

  const user = JSON.stringify({ goal, tasks, relevant_previous_patterns: memory })
  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llmKey}` },
    body: JSON.stringify({
      model: llmModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
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

async function handleAudit(request, response) {
  try {
    const { goal, tasks, useMemory = true } = await readJson(request)
    if (!goal?.trim() || !Array.isArray(tasks) || tasks.length !== 5 || tasks.some((task) => !task?.trim())) {
      return sendJson(response, 400, { error: 'Provide one goal and exactly five tasks.' })
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
    return sendJson(response, 200, {
      ...audit,
      meta: { mode, cognee: memory.connected, remembered, model: mode === 'ai' ? llmModel : null, warning },
    })
  } catch (error) {
    return sendJson(response, 500, { error: error.message || 'Audit failed.' })
  }
}

async function serveStatic(request, response) {
  const requestPath = new URL(request.url, `http://${request.headers.host}`).pathname
  const relative = requestPath.replace(/^\/one-good-week\/?/, '/').replace(/^\//, '')
  let filePath = join(root, 'dist', relative || 'index.html')
  try {
    const data = await readFile(filePath)
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' })
    response.end(data)
  } catch {
    const data = await readFile(join(root, 'dist', 'index.html'))
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(data)
  }
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, `http://${request.headers.host}`).pathname
  if (request.method === 'POST' && (path === '/api/audit' || path === '/one-good-week/api/audit')) {
    return handleAudit(request, response)
  }
  if (request.method === 'GET' && (path === '/api/status' || path === '/one-good-week/api/status')) {
    const memory = await cogneeRecall('connection check')
    return sendJson(response, 200, { ai: Boolean(llmKey), cognee: memory.connected, model: llmKey ? llmModel : null })
  }
  if (vite) return vite.middlewares(request, response)
  return serveStatic(request, response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`PROOF is running at http://127.0.0.1:${port}`)
})
