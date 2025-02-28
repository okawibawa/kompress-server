import { spawn } from 'bun'

export const compressVideo = async (fileName: string) => {
  try {
    const ffmpegProcess = spawn([
      'ffmpeg',
      '-i', `tmp/${fileName}`,
      '-c:v', 'libx264',        // Video codec (H.264)
      '-crf', '23',             // Constant Rate Factor (lower = better quality, bigger file)
      '-preset', 'medium',      // Encoding speed vs compression tradeoff
      '-threads', '4',          // Use 4 threads for parallel processing
      '-y',                     // Overwrite output file if it exists
      `tmp/compressed/compressed_${fileName}` // Output file
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const stdout = await new Response(ffmpegProcess.stdout).text()
    const stderr = await new Response(ffmpegProcess.stderr).text()

    const exitCode = await ffmpegProcess.exited

    if (exitCode !== 0) {
      throw new Error(`FFmpeg failed with an exit code ${exitCode}: ${stderr}`)
    }

    return { success: true, message: stdout }
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Error while compressing media: ${error}`)
  }
}

export const convertToGif = async (fileName: string) => {
  try {
    const ffmpegProcess = spawn([
      'ffmpeg',
      '-i', `tmp/${fileName}`,
      '-vf', 'fps=60;width=320:-1', // Set fps to 60, width to 320px and height to auto
      '-loop', '0', // 0 loop indefinitely, 1 no loop
      '-y',
      `tmp/gif/${fileName}`
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const stdout = await new Response(ffmpegProcess.stdout).text()
    const stderr = await new Response(ffmpegProcess.stderr).text()

    const exitCode = await ffmpegProcess.exited

    if (exitCode !== 0) {
      throw new Error(`FFmpeg failed with exit code ${exitCode}: ${stderr}`)
    }

    return { success: true, message: stdout }
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Error whille converting media: ${error}`)
  }
}
