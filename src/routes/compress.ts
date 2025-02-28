import { Hono } from "hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

import { spawn } from 'bun'

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
        description: "response message",
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

    const fileName = media[0].name;

    await Bun.write(`tmp/${fileName}`, Buffer.from(await media[0].arrayBuffer()))

    try {
      await compressVideo(fileName)

      return c.json({ success: true, message: "File successfully compressed." })
    } catch (error) {
      console.error(error)

      return c.json({
        success: false,
        message: error instanceof Error ? error.message : "Compression failed."
      })
    } finally {
      await Bun.file(`tmp/${fileName}`).delete()
    }
  })

  return compress
}
