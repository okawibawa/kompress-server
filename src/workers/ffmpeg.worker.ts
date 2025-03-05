import { spawn } from 'bun'

export const compressVideo = async (arrayBuffer: Uint8Array) => {
  try {
    const ffmpegProcess = spawn([
      'ffmpeg',
      '-i', 'pipe:0', // Input from stdin (Uint8Array)
      '-c:v', 'libx264', // H.264 video codec
      '-crf', '23', // Constant rate factor (0–51, 23 is default)
      '-preset', 'medium', // Encoding speed (medium is default, ref: https://trac.ffmpeg.org/wiki/Encode/H.264#a2.Chooseapresetandtune)
      '-b:v', '2500k', // Target bitrate for video, should be adjusted based on input
      '-maxrate', '3000k', // Maximum bitrate to prevent spikes
      '-bufsize', '3000k', // Buffer size for bitrate control
      '-c:a', 'aac', // Audio codec
      '-b:a', '128k', // Audio bitrate
      '-ar', '44100', // Audio sample rate
      '-threads', '4', // Use 4 threads for parallel processing
      '-movflags', 'frag_keyframe+empty_moov', // Fragmented MP4 for streaming
      '-f', 'mp4', // Output format (MP4)
      'pipe:1' // Output to stdout for streaming
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    ffmpegProcess.stdin.write(arrayBuffer)
    ffmpegProcess.stdin.end()

    const outputChunks: Uint8Array[] = []
    const stdoutReader = ffmpegProcess.stdout.getReader()

    while (true) {
      const { done, value } = await stdoutReader.read()

      if (done) break

      if (value) {
        outputChunks.push(value)
      }
    }

    const stderr = await new Response(ffmpegProcess.stderr).text()

    const exitCode = await ffmpegProcess.exited

    if (exitCode !== 0) {
      throw new Error(`FFmpeg failed with an exit code ${exitCode}: ${stderr}`)
    }

    return { success: true, message: "Processing complete.", output: outputChunks }
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Error while compressing media: ${error}`)
  }
}
