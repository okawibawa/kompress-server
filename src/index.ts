import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { routes } from './routes'
import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'

const app = new OpenAPIHono()

app.use(cors())

routes(app)

app.onError((error, c) => {
  return c.json({ message: error.message || "Internal server error" }, 500)
})

app.notFound((c) => {
  return c.json({ message: "Not found!" })
})

export default {
  port: 3010,
  fetch: app.fetch
}
