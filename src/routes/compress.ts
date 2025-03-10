import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { compressVideo } from "../workers/ffmpeg.worker";

export default function() {
  const compress = new OpenAPIHono()

  compress.openapi(createRoute({
    method: 'post',
    path: "",
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              media: z.union([
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
            })
          }
        }
      }
    },
    responses: {
      200: {
        description: "200 ok response message.",
        content: {
          'video/mp4': {
            schema: {
              type: 'string',
              format: 'binary'
            }
          }
        }
      },
      400: {
        description: "400 error response message.",
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string()
            })
          }
        }
      }
    }
  }), async (c) => {
    const { media } = c.req.valid('form')

    try {
      const result = await compressVideo(media[0].stream())

      c.header('Content-Type', 'video/mp4');
      c.header('Transfer-Encoding', 'chunked');
      c.status(200);

      return new Response(result)
    } catch (error) {
      console.error(error)

      return c.json({
        success: false,
        message: error instanceof Error ? error.message : "Compression failed."
      })
    }
  })

  return compress
}
