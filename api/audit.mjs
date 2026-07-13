import { auditPayload } from './_core.mjs'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    return response.status(200).json(await auditPayload(payload))
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || 'Audit failed.' })
  }
}
