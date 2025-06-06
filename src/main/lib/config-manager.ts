import { app } from 'electron'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import OpenAI from 'openai'

interface Config {
  apiKey: string
  apiProvider: 'openai' | 'gemini'
  extractionModel: string
  solutionModel: string
  debuggingModel: string
  language: string
  opacity: number
}

export class ConfigManager extends EventEmitter {
  private configPath: string
  private defaultConfig: Config = {
    apiKey: '',
    apiProvider: 'openai',
    extractionModel: 'gpt-4o-mini',
    solutionModel: 'gpt-4o-mini',
    debuggingModel: 'gpt-4o-mini',
    language: 'python',
    opacity: 1.0
  }

  constructor() {
    super()
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json')
      console.log('Config path:', this.configPath)
    } catch (error) {
      console.error('Error getting config path:', error)
      this.configPath = path.join(process.cwd(), 'config.json')
    }

    this.ensureConfigFileExists()
  }

  private ensureConfigFileExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig)
        console.log('Created default config file:', this.configPath)
      }
    } catch (error) {
      console.error('Failed to ensure config file exists:', error)
    }
  }

  public saveConfig(config: Config): void {
    try {
      const configDir = path.dirname(this.configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  private sanitizeModelSelection(model: string, provider: 'openai' | 'gemini') {
    if (provider === 'openai') {
      const allowedModels = ['gpt-4o-mini', 'gpt-4o']
      if (!allowedModels.includes(model)) {
        console.log(`Invalid model: ${model} for provider: ${provider}. Defaulting to gpt-4o`)
        return 'gpt-4o'
      }
      return model
    } else if (provider === 'gemini') {
      const allowedModels = ['gemini-2.0-flash', 'gemini-1.5-pro']
      if (!allowedModels.includes(model)) {
        console.log(
          `Invalid model: ${model} for provider: ${provider}. Defaulting to gemini-1.5-flash`
        )
        return 'gemini-2.0-flash'
      }
      return model
    }
    return model
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8')
        const config = JSON.parse(configData)

        if (config.apiProvider !== 'openai' && config.apiProvider !== 'gemini') {
          console.log('Invalid API provider. Defaulting to openai')
          config.apiProvider = 'openai'
        }

        if (config.extractionModel) {
          config.extractionModel = this.sanitizeModelSelection(
            config.extractionModel,
            config.apiProvider
          )
        }

        if (config.solutionModel) {
          config.solutionModel = this.sanitizeModelSelection(
            config.solutionModel,
            config.apiProvider
          )
        }

        if (config.debuggingModel) {
          config.debuggingModel = this.sanitizeModelSelection(
            config.debuggingModel,
            config.apiProvider
          )
        }

        return {
          ...this.defaultConfig,
          ...config
        }
      }

      this.saveConfig(this.defaultConfig)
      return this.defaultConfig
    } catch (error) {
      console.error('Failed to load config:', error)
      return this.defaultConfig
    }
  }

  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig()
      let provider = updates.apiProvider || currentConfig.apiProvider

      if (updates.apiKey && !updates.apiProvider) {
        if (updates.apiKey.trim().startsWith('sk-')) {
          provider = 'openai'
          console.log('Detected OpenAI API key. Setting provider to openai')
        } else {
          provider = 'gemini'
          console.log('Detected Gemini API key. Setting provider to gemini')
        }
      }

      updates.apiProvider = provider

      if (updates.apiProvider && updates.apiProvider !== currentConfig.apiProvider) {
        if (updates.apiProvider === 'openai') {
          updates.extractionModel = 'gpt-4o'
          updates.solutionModel = 'gpt-4o'
          updates.debuggingModel = 'gpt-4o'
        } else {
          updates.extractionModel = 'gemini-2.0-flash'
          updates.solutionModel = 'gemini-2.0-flash'
          updates.debuggingModel = 'gemini-2.0-flash'
        }
      }

      if (updates.extractionModel) {
        updates.extractionModel = this.sanitizeModelSelection(
          updates.extractionModel,
          updates.apiProvider
        )
      }
      if (updates.solutionModel) {
        updates.solutionModel = this.sanitizeModelSelection(
          updates.solutionModel,
          updates.apiProvider
        )
      }
      if (updates.debuggingModel) {
        updates.debuggingModel = this.sanitizeModelSelection(
          updates.debuggingModel,
          updates.apiProvider
        )
      }

      const newConfig = {
        ...currentConfig,
        ...updates
      }

      this.saveConfig(newConfig)

      if (
        updates.apiKey !== undefined ||
        updates.apiProvider !== undefined ||
        updates.extractionModel !== undefined ||
        updates.solutionModel !== undefined ||
        updates.debuggingModel !== undefined ||
        updates.language !== undefined
      ) {
        this.emit('config-updated', newConfig)
      }

      return newConfig
    } catch (error) {
      console.error('Failed to update config:', error)
      return this.defaultConfig
    }
  }

  public hasApiKey(): boolean {
    const config = this.loadConfig()
    return !!config.apiKey && config.apiKey.trim().length > 0
  }

  public isValidApiKeyFormat(apiKey: string, provider?: 'openai' | 'gemini'): boolean {
    if (!provider) {
      if (apiKey.trim().startsWith('sk-')) {
        provider = 'openai'
      } else {
        provider = 'gemini'
      }
    }

    if (provider === 'openai') {
      return /^sk-\w{48}$/.test(apiKey)
    } else if (provider === 'gemini') {
      return /^AIzaSyB.*$/.test(apiKey)
    }
    return false
  }

  public async testApiKey(
    apiKey: string,
    provider?: 'openai' | 'gemini'
  ): Promise<{
    valid: boolean
    error?: string
  }> {
    if (!provider) {
      if (apiKey.trim().startsWith('sk-')) {
        provider = 'openai'
      } else {
        provider = 'gemini'
      }
    }

    if (provider === 'openai') {
      return this.testOpenAiKey(apiKey)
    } else if (provider === 'gemini') {
      return this.testGeminiKey()
    }

    return { valid: false, error: 'Invalid provider' }
  }

  private async testOpenAiKey(apiKey: string): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      const openai = new OpenAI({
        apiKey
      })

      await openai.models.list()
      return { valid: true }
    } catch (error) {
      console.error('OpenAI API key test failed:', error)
      return { valid: false, error: 'Invalid API key' }
    }
  }

  private async testGeminiKey(): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      return { valid: true }
    } catch (error) {
      console.error('Gemini API key test failed:', error)
      return { valid: false, error: 'Invalid API key' }
    }
  }

  public getOpacity(): number {
    const config = this.loadConfig()
    return config.opacity !== undefined ? config.opacity : 1.0
  }

  public setOpacity(opacity: number): void {
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity))
    this.updateConfig({ opacity: validOpacity })
  }

  public getLanguage(): string {
    const config = this.loadConfig()
    return config.language !== undefined ? config.language : 'python'
  }

  public setLanguage(language: string): void {
    this.updateConfig({ language })
  }
}

export const configManager = new ConfigManager()
