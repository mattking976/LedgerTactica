import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from './app.ts'

describe('GET /health', () => {
  it('returns the service health and version', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      status: 'ok',
      service: 'ledger-tactica-api',
      version: '0.1.0',
    })
  })

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Route not found' })
  })
})
