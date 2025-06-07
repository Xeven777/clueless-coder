<div align="center">
  <h1>🤖 Cluelessly Coder</h1>
  <p>A powerful desktop application that helps developers solve coding problems by analyzing screenshots of code and providing AI-powered solutions.</p>
  
<img src="https://i.postimg.cc/cdqKxKyy/700-1x-shots-so.jpg" alt="">

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![GitHub stars](https://img.shields.io/github/stars/Xeven777/clueless-coder?style=social)](https://github.com/Xeven777/clueless-coder/stargazers)

  <img src="https://img.shields.io/badge/Electron-2C2E3A?style=for-the-badge&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS">
</div>

## ✨ Features

### 🖥️ Multi-Platform Support

- Works seamlessly on Windows, macOS, and Linux
- Native performance with Electron
- System tray integration for quick access

### 🤖 AI-Powered Coding

- **Multiple AI Providers**:
  - Google Gemini (2.5 Flash, 2.0 Flash, 1.5 Pro, and more)
  - OpenAI (GPT-4o, GPT-4o Mini)
  - Groq (Llama 3 models)
- **Smart Model Selection**:
  - Adaptive model selection based on task complexity
  - Balance between speed and accuracy

### 🛠️ Developer Experience

- **Code Analysis**:
  - Syntax highlighting
  - Error detection
  - Performance optimization suggestions
- **Debugging Tools**:
  - Step-by-step debugging
  - Variable inspection
  - Runtime analysis

### 🎨 Beautiful UI/UX

- Responsive design
- Intuitive keyboard shortcuts

### 🔒 Privacy Focused

- Local processing of sensitive data
- Optional cloud sync
- No data collection

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, yarn, or pnpm
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Xeven777/clueless-coder.git
   cd clueless-coder
   ```

2. **Install dependencies**

   ```bash
   # Using bun (recommended)
   bun i

   # Or using pnpm
   pnpm install

   # Or using yarn
   yarn install
   ```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm dev  # or bun run dev / yarn dev
```

### Production Build

```bash
# For Windows
npm build:win

# For macOS
npm build:mac

# For Linux
npm build:linux
```

## 🎯 Usage Guide

### Basic Workflow

1. Launch the application
2. Capture code using `Ctrl+H` (or Cmd+Shift+S on Mac)
3. Let the AI analyze your code `Ctrl+Enter`
4. Browse through solutions and explanations
5. Copy the code or debug information

## ⌨️ Keyboard Shortcuts

| Action                 | Shortcut                   |
| ---------------------- | -------------------------- |
| Toggle Visibility      | `Ctrl+B` / `Cmd+B`         |
| Take Screenshot        | `Ctrl+H` / `Cmd+H`         |
| Process Screenshot     | `Ctrl+Enter` / `Cmd+Enter` |
| Delete Last Screenshot | `Ctrl+L` / `Cmd+L`         |
| Reset View             | `Ctrl+R` / `Cmd+R`         |
| Quit Application       | `Ctrl+Q` / `Cmd+Q`         |
| Move Window            | `Ctrl+Arrow Keys`          |
| Decrease Opacity       | `Ctrl+[` / `Cmd+[`         |
| Increase Opacity       | `Ctrl+]` / `Cmd+]`         |
| Zoom Out               | `Ctrl+-` / `Cmd+-`         |
| Zoom In                | `Ctrl+=` / `Cmd+=`         |
| Reset Zoom             | `Ctrl+0` / `Cmd+0`         |

### Supported File Types

- JavaScript/TypeScript
- Python
- Java
- C/C++
- C#
- Go
- Ruby
- And more...

## 🛠️ Configuration

### Model Selection

Choose different models based on your needs:

- **Gemini 2.5 Flash**: Best for complex problems
- **Gemini 2.0 Flash**: Balanced performance
- **Gemini 1.5 Pro**: Advanced reasoning
- **GPT-4o**: OpenAI's most capable model
- **Llama 3**: Open-source alternative

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
bun install

# Run linter
bun lint

# Run tests
bun test

# Build the application
bun build
```

## 🙏 Acknowledgments

- Built with [Electron Vite](https://github.com/alex8088/electron-vite)
- Icons by [Lucide](https://lucide.dev/)
- UI components powered by [Radix UI](https://www.radix-ui.com/)
- Special thanks to all contributors and the open-source community

## 📬 Contact

Have questions or suggestions? Feel free to open an issue or reach out to us!

---

<div align="center">
  Made with ❤️ by XEVEN777
</div>
