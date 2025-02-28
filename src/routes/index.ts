import { Hono } from "hono";
import { swaggerUI } from '@hono/swagger-ui'
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import compress from "./compress";
import convert from './convert'

export const routes = (routes: OpenAPIHono) => {
  routes.openapi(createRoute({
    method: 'get',
    path: "/health-check",
    responses: {
      200: {
        description: "Health check endpoint.",
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
              status: z.number()
            })
          }
        }
      }
    }
  }), (c) => {
    return c.json({ message: "Ok", status: 200 })
  })

  routes.route("/v1/compress", compress())
  routes.route("/v1/convert", convert())

  routes.doc("/doc", {
    info: {
      title: "Kompress API",
      version: "v1"
    }, openapi: "3.0.0"
  })

  routes.get("/ui", swaggerUI({ url: "/doc" }))
}

