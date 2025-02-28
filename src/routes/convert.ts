import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

export default function() {
  const convert = new OpenAPIHono()

  convert.openapi(createRoute({
    method: 'post',
    path: '',
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: z.union([
              z.instanceof(File),
              z.array(z.instanceof(File))
            ])
              .transform((payload) => Array.isArray(payload) ? payload : [payload])
              .openapi({
                type: 'array',
                items: {
                  type: 'string',
                  format: 'binary'
                }
              })
          }
        }
      }
    },
    responses: {
      200: {
        description: 'response message',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
              success: z.boolean()
            })
          }
        }
      }
    }
  }), async (c) => {
    return c.json({ message: 'h', success: true })
  })

  return convert
}
