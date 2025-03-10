import { spawn, stdout } from 'bun'

export const compressVideo = async (stream: ReadableStream<Uint8Array>) => {
  try {
    const ffmpegProcess = spawn([
      'ffmpeg',
      '-loglevel', 'verbose',
      '-i', 'pipe:0', // Input from stdin (Uint8Array)
      '-c:v', 'libx264', // H.264 video codec
      '-crf', '26', // Constant rate factor (0–51, 23 is default)
      '-preset', 'veryfast', // Encoding speed (medium is default, ref: https://trac.ffmpeg.org/wiki/Encode/H.264#a2.Chooseapresetandtune)
      '-b:v', '2000k', // Target bitrate for video, should be adjusted based on input
      '-maxrate', '2500k', // Maximum bitrate to prevent spikes
      '-bufsize', '2500k', // Buffer size for bitrate control
      '-c:a', 'aac', // Audio codec
      '-b:a', '96k', // Audio bitrate
      '-ar', '32000', // Audio sample rate
      '-threads', '4', // Use 4 threads for parallel processing
      '-movflags', 'frag_keyframe+empty_moov', // Fragmented MP4 for streaming
      '-f', 'mp4', // Output format (MP4)
      'pipe:1', // Output to stdout for streaming
      '-progress', 'pipe:2'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle input stream
    const inputPromise = (async () => {
      const reader = stream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            ffmpegProcess.stdin.end()
            break
          }

          ffmpegProcess.stdin.write(value)
          ffmpegProcess.stdin.flush()
        }
      } catch (error) {
        console.error("Input stream error: ", error)
      } finally {
        reader.releaseLock()
      }
    })();

    // Log stderr for debugging
    (async () => {
      const reader = ffmpegProcess.stderr.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break;

          console.log(new TextDecoder().decode(value))
        }
      } catch (error) {
        console.error("Stderr read error: ", error)
      } finally {
        reader.releaseLock()
      }
    })()

    // Create output stream
    return new ReadableStream({
      async start(controller) {
        const reader = ffmpegProcess.stdout.getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              controller.close()
              break;
            }

            controller.enqueue(value)
          }
        } catch (error) {
          console.error("Stdout read err: ", error)
          ffmpegProcess.kill()
        } finally {
          reader.releaseLock()

          await inputPromise
        }
      },
      cancel() {
        ffmpegProcess.kill()
      }
    })
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Error while compressing media: ${error}`)
  }
}
