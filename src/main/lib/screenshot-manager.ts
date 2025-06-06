import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import screenshot from 'screenshot-desktop'
import { v4 as uuidv4 } from 'uuid'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export class ScreenshotManager {
  private screenshotQueue: string[] = []
  private extraScreenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5

  private readonly screenshotDir: string
  private readonly extraScreenshotDir: string
  private readonly tempDir: string

  private view: 'queue' | 'solutions' | 'debug' = 'queue'

  constructor(view: 'queue' | 'solutions' | 'debug' = 'queue') {
    this.view = view

    this.screenshotDir = path.join(app.getPath('userData'), 'screenshots')
    this.extraScreenshotDir = path.join(app.getPath('userData'), 'extra_screenshots')
    this.tempDir = path.join(app.getPath('temp'), 'silent-coder-screenshots')

    this.ensureDirectoriesExist()
    this.cleanScreenshotDirectories()
  }

  private ensureDirectoriesExist(): void {
    const directories = [this.screenshotDir, this.extraScreenshotDir, this.tempDir]
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true })
          console.log(`Created directory: ${dir}`)
        } catch (error) {
          console.error(`Failed to create directory ${dir}:`, error)
        }
      }
    }
  }

  private cleanScreenshotDirectories(): void {
    try {
      if (fs.existsSync(this.screenshotDir)) {
        const files = fs
          .readdirSync(this.screenshotDir)
          .filter((file) => file.endsWith('.png'))
          .map((file) => path.join(this.screenshotDir, file))

        for (const file of files) {
          try {
            fs.unlinkSync(file)
            console.log(`Deleted screenshot file: ${file}`)
          } catch (error) {
            console.error(`Failed to delete file ${file}:`, error)
          }
        }
      }

      if (fs.existsSync(this.extraScreenshotDir)) {
        const files = fs
          .readdirSync(this.extraScreenshotDir)
          .filter((file) => file.endsWith('.png'))
          .map((file) => path.join(this.extraScreenshotDir, file))

        for (const file of files) {
          try {
            fs.unlinkSync(file)
            console.log(`Deleted extra screenshot file: ${file}`)
          } catch (error) {
            console.error(`Failed to delete file ${file}:`, error)
          }
        }
      }

      console.log('Screenshot directories cleaned successfully')
    } catch (error) {
      console.error('Failed to clean screenshot directories:', error)
    }
  }

  public getView(): 'queue' | 'solutions' | 'debug' {
    return this.view
  }

  public setView(view: 'queue' | 'solutions' | 'debug'): void {
    this.view = view
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue
  }

  public clearQueues(): void {
    this.screenshotQueue.forEach((file) => {
      try {
        fs.unlinkSync(file)
        console.log(`Deleted screenshot file: ${file}`)
      } catch (error) {
        console.error(`Failed to delete file ${file}:`, error)
      }
    })
    this.screenshotQueue = []

    this.extraScreenshotQueue.forEach((file) => {
      try {
        fs.unlinkSync(file)
        console.log(`Deleted extra screenshot file: ${file}`)
      } catch (error) {
        console.error(`Failed to delete file ${file}:`, error)
      }
    })
    this.extraScreenshotQueue = []

    console.log('Screenshot queues cleared successfully')
  }

  private async captureScreenshot(): Promise<Buffer> {
    try {
      console.log('Starting screenshot capture...')

      if (process.platform === 'win32') {
        return await this.captureWindowsScreenshot()
      }

      console.log('Taking screenshot on non-Windows platform...')
      const buffer = await screenshot({
        format: 'png'
      })

      console.log('Screenshot captured successfully')
      return buffer
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      throw error
    }
  }

  private async captureWindowsScreenshot(): Promise<Buffer> {
    try {
      console.log('Starting Windows screenshot capture...')

      const tempFilePath = path.join(this.tempDir, `temp-${uuidv4()}.png`)
      await screenshot({
        path: tempFilePath
      })

      if (fs.existsSync(tempFilePath)) {
        const buffer = await fs.promises.readFile(tempFilePath)

        try {
          await fs.promises.unlink(tempFilePath)
        } catch (error) {
          console.error('Failed to delete temp file:', error)
        }

        console.log('Screenshot captured successfully')
        return buffer
      } else {
        console.error('Failed to capture screenshot: Temp file not found')
        throw new Error('Failed to capture screenshot')
      }
    } catch (error) {
      console.error('Failed to capture Windows screenshot:', error)

      try {
        console.log('Trying powrshell method')
        const tempFilePath = path.join(this.tempDir, `temp-${uuidv4()}.png`)

        const psScript = `
         Add-Type -AssemblyName System.Windows.Forms,System.Drawing
         $screens = [System.Windows.Forms.Screen]::AllScreens
         $top = ($screens | ForEach-Object {$_.Bounds.Top} | Measure-Object -Minimum).Minimum
         $left = ($screens | ForEach-Object {$_.Bounds.Left} | Measure-Object -Minimum).Minimum
         $width = ($screens | ForEach-Object {$_.Bounds.Right} | Measure-Object -Maximum).Maximum
         $height = ($screens | ForEach-Object {$_.Bounds.Bottom} | Measure-Object -Maximum).Maximum
         $bounds = [System.Drawing.Rectangle]::FromLTRB($left, $top, $width, $height)
         $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
         $graphics = [System.Drawing.Graphics]::FromImage($bmp)
         $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)
         $bmp.Save('${tempFilePath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
         $graphics.Dispose()
         $bmp.Dispose()
         `

        await execFileAsync('powershell', [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          psScript
        ])

        if (fs.existsSync(tempFilePath)) {
          const buffer = await fs.promises.readFile(tempFilePath)

          try {
            await fs.promises.unlink(tempFilePath)
          } catch (error) {
            console.error('Failed to delete temp file:', error)
          }

          console.log('Screenshot captured successfully')
          return buffer
        } else {
          console.error('Failed to capture screenshot: Temp file not found')
          throw new Error('Failed to capture screenshot')
        }
      } catch (error) {
        console.error('Failed to capture screenshot using PowerShell:', error)
        throw error
      }
    }
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    console.log('Taking screenshot in view', this.view)
    hideMainWindow()

    const hideDelay = process.platform === 'win32' ? 500 : 300
    await new Promise((resolve) => setTimeout(resolve, hideDelay))

    let screenshotPath = ''
    try {
      const screenshotBuffer = await this.captureScreenshot()

      if (!screenshotBuffer || screenshotBuffer.length === 0) {
        throw new Error('Failed to capture screenshot')
      }

      if (this.view === 'queue') {
        screenshotPath = path.join(this.screenshotDir, `screenshot-${uuidv4()}.png`)
        await fs.promises.writeFile(screenshotPath, screenshotBuffer)
        console.log(`Screenshot saved to ${screenshotPath}`)
        this.screenshotQueue.push(screenshotPath)
        if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.screenshotQueue.shift()
          if (removedPath) {
            try {
              await fs.promises.unlink(removedPath)
              console.log(`Deleted old screenshot file: ${removedPath}`)
            } catch (error) {
              console.error(`Failed to delete file ${removedPath}:`, error)
            }
          }
        }
      } else {
        // solutions view
        screenshotPath = path.join(this.extraScreenshotDir, `screenshot-${uuidv4()}.png`)
        await fs.promises.writeFile(screenshotPath, screenshotBuffer)
        console.log(`Screenshot saved to ${screenshotPath}`)
        this.extraScreenshotQueue.push(screenshotPath)
        if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
          const removedPath = this.extraScreenshotQueue.shift()
          if (removedPath) {
            try {
              await fs.promises.unlink(removedPath)
              console.log(`Deleted old screenshot file: ${removedPath}`)
            } catch (error) {
              console.error(`Failed to delete file ${removedPath}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error)
      throw error
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 200))
      showMainWindow()
    }
    return screenshotPath
  }

  public async getImagePreview(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`File does not exist: ${filePath}`)
        return ''
      }

      const data = await fs.promises.readFile(filePath)
      const base64 = data.toString('base64')
      return `data:image/png;base64,${base64}`
    } catch (error) {
      console.error('Failed to get image preview:', error)
      return ''
    }
  }

  public async deleteScreenshot(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (fs.existsSync(path)) {
        await fs.promises.unlink(path)
      }
      if (this.view === 'queue') {
        this.screenshotQueue = this.screenshotQueue.filter((p) => p !== path)
      } else if (this.view === 'solutions') {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter((p) => p !== path)
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to delete screenshot:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  public clearExtraScreenshotQueue(): void {
    this.extraScreenshotQueue.forEach((path) => {
      if (fs.existsSync(path)) {
        fs.unlink(path, (err) => {
          if (err) {
            console.error(`Failed to delete extra screenshot file: ${path}`, err)
          }
        })
      }
    })

    this.extraScreenshotQueue = []
  }
}
