import { spawn, stdout } from 'bun'

export const compressVideo = async (stream: ReadableStream<Uint8Array>) => {
  try {
    // const ffmpegProcess = spawn([
    //   'ffmpeg',
    //   '-i', 'pipe:0', // Input from stdin (Uint8Array)
    //   '-c:v', 'libx264', // H.264 video codec
    //   '-crf', '23', // Constant rate factor (0–51, 23 is default)
    //   '-preset', 'medium', // Encoding speed (medium is default, ref: https://trac.ffmpeg.org/wiki/Encode/H.264#a2.Chooseapresetandtune)
    //   '-b:v', '2500k', // Target bitrate for video, should be adjusted based on input
    //   '-maxrate', '3000k', // Maximum bitrate to prevent spikes
    //   '-bufsize', '3000k', // Buffer size for bitrate control
    //   '-c:a', 'aac', // Audio codec
    //   '-b:a', '128k', // Audio bitrate
    //   '-ar', '44100', // Audio sample rate
    //   '-threads', '4', // Use 4 threads for parallel processing
    //   '-movflags', 'frag_keyframe+empty_moov', // Fragmented MP4 for streaming
    //   '-f', 'mp4', // Output format (MP4)
    //   'pipe:1' // Output to stdout for streaming
    // ], {
    //   stdio: ['pipe', 'pipe', 'pipe']
    // });

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

    const stdinReader = stream.getReader()
    const stdoutReader = ffmpegProcess.stdout.getReader()
    const stderrReader = ffmpegProcess.stderr.getReader()

    // Feed ffmpeg worker input incrementally 
    try {
      while (true) {
        const { done, value } = await stdinReader.read()
        const { value: valueStderr } = await stderrReader.read()

        if (done) {
          ffmpegProcess.stdin.end()
          break
        }

        if (value) {
          ffmpegProcess.stdin.write(value)
          ffmpegProcess.stdin.flush()
        }

        // console.log(new TextDecoder().decode(valueStderr))
      }
    } finally {
      stdinReader.releaseLock()
    }

    const streamChunk = new ReadableStream({
      async start(controller) {
        const { done, value } = await stdoutReader.read()

        if (done) {
          console.log("streaming done", done)
          controller.close()
          return
        }

        controller.enqueue(value)
      }
    })

    return streamChunk
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Error while compressing media: ${error}`)
  }
}
