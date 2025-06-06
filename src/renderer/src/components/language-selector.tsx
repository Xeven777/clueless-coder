import React from 'react'
import { languageOptions } from '@renderer/lib/languages'

interface LanguageSelectorProps {
  currentLanguage: string
  setLanguage: (language: string) => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  setLanguage
}) => {
  const handleRadioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLanguage = e.target.value

    try {
      await window.electronAPI.updateConfig({ language: newLanguage })
      window.__LANGUAGE__ = newLanguage
      setLanguage(newLanguage)
      console.log('Language updated to:', newLanguage)
    } catch (error) {
      console.error('Error updating language:', error)
    }
  }

  return (
    <div className="mb-3 px-2 space-y-2">
      <span className="block text-[13px] font-medium text-white/90 mb-1">Language</span>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
        {languageOptions.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              type="radio"
              id={`lang-${option.value}`}
              name="language-selector"
              value={option.value}
              checked={currentLanguage === option.value}
              onChange={handleRadioChange}
              className="mr-2 h-3 w-3 cursor-pointer accent-blue-500"
            />
            <label
              htmlFor={`lang-${option.value}`}
              className="text-sm text-white/80 cursor-pointer hover:text-white"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
