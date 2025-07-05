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

## 📥 Download

- [**Latest Release**](https://github.com/Xeven777/clueless-coder/releases/latest)
- [**Windows (x64)**](https://github.com/Xeven777/clueless-coder/releases/download/v1.0.3/cluelessly-1.0.3-setup.exe)
- [**Linux (AppImage)**](https://github.com/Xeven777/clueless-coder/releases/download/v1.0.3/cluelessly-1.0.3.AppImage)
- [**Linux (deb)**](https://github.com/Xeven777/clueless-coder/releases/download/v1.0.3/cluelessly_1.0.3_amd64.deb)
- [**Linux (snap)**](https://github.com/Xeven777/clueless-coder/releases/download/v1.0.3/cluelessly_1.0.3_amd64.snap)

## ✨ Features

### 🖥️ Multi-Platform Support

- Works seamlessly on Windows, macOS, and Linux
- Native performance with Electron

### 🤖 AI-Powered Coding

- **Multiple AI Providers**:
  - Google Gemini (2.5 Flash, 2.0 Flash, 1.5 Pro, and more)
  - Groq (Llama 4 and Llama 3 models)
  - Deepseek (R1 Distill Llama 70B)
  - Mistral (Saba 24B)
  - Qwen (Qwen3 32B and Qwen QWQ 32B)
  - OpenAI (GPT-4o, GPT-4o Mini)
- **Smart Model Selection**:
  - Adaptive model selection based on task complexity
  - Balance between speed and accuracy
- **Dual Interaction Modes**:
  - **Coder Mode**: Analyze code from screenshots and get structured solutions
  - **Question Mode**: Ask conversational questions with optional screenshot context

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

### Coder Mode (Default)

1. Launch the application
2. Capture code using `Ctrl+H` (or Cmd+H on Mac)
3. Let the AI analyze your code `Ctrl+Enter`
4. Browse through solutions and explanations
5. Copy the code or debug information

### Question Mode

1. Switch to Question Mode using the "Question Mode" button or `Ctrl+M` / `Cmd+M`
2. Type your question in the text area
3. Optionally attach screenshots for context using "📷 Attach Screenshot"
4. Submit your question with `Ctrl+Enter` / `Cmd+Enter`
5. Get conversational AI responses with helpful explanations

### Mode Switching

- **Toggle between modes**: `Ctrl+M` / `Cmd+M`
- **Coder Mode**: Best for analyzing code problems and getting structured solutions
- **Question Mode**: Perfect for asking general programming questions, getting explanations, or seeking advice

## ⌨️ Keyboard Shortcuts

| Action                 | Shortcut                   | Description                                  |
| ---------------------- | -------------------------- | -------------------------------------------- |
| Toggle Visibility      | `Ctrl+B` / `Cmd+B`         | Show/hide the application window             |
| Take Screenshot        | `Ctrl+H` / `Cmd+H`         | Capture a screenshot for analysis            |
| Process/Submit         | `Ctrl+Enter` / `Cmd+Enter` | Process screenshots or submit questions      |
| Toggle Mode            | `Ctrl+M` / `Cmd+M`         | Switch between Screenshot and Question modes |
| Delete Last Screenshot | `Ctrl+L` / `Cmd+L`         | Remove the most recent screenshot            |
| Reset View             | `Ctrl+R` / `Cmd+R`         | Reset to initial state                       |
| Quit Application       | `Ctrl+Q` / `Cmd+Q`         | Exit the application                         |
| Move Window            | `Ctrl+Arrow Keys`          | Reposition the window                        |
| Decrease Opacity       | `Ctrl+[` / `Cmd+[`         | Make window more transparent                 |
| Increase Opacity       | `Ctrl+]` / `Cmd+]`         | Make window more opaque                      |
| Zoom Out               | `Ctrl+-` / `Cmd+-`         | Decrease interface size                      |
| Zoom In                | `Ctrl+=` / `Cmd+=`         | Increase interface size                      |
| Reset Zoom             | `Ctrl+0` / `Cmd+0`         | Reset interface to default size              |

## 💬 Question Mode Features

The new Question Mode transforms Cluelessly Coder into a conversational AI assistant for developers:

### Key Features

- **Natural Language Queries**: Ask questions in plain English about programming concepts, debugging, or code optimization
- **Multimodal Support**: Combine text questions with screenshot context for better understanding
- **Conversational Responses**: Get detailed explanations, not just code snippets
- **Context-Aware**: Attach screenshots to provide visual context for your questions

### Example Use Cases

- **Learning**: "Can you explain how async/await works in JavaScript?"
- **Debugging**: "Why is my React component not re-rendering?" (with screenshot)
- **Best Practices**: "What's the best way to handle errors in Python?"
- **Code Review**: "Is there a more efficient way to write this algorithm?" (with code screenshot)
- **Architecture**: "Should I use Redux or Context API for this use case?"

### How It Works

1. **Switch to Question Mode** using the button or `Ctrl+M` / `Cmd+M`
2. **Type your question** in natural language
3. **Optionally attach screenshots** for visual context
4. **Get detailed explanations** tailored to your specific needs

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
- **Llama 4**: Scout and Maverick
- **Llama 3**: Another Open-source alternative
- **Deepseek**: R1 Distill Llama 70B
- **Mistral**: Saba 24B
- **Qwen**: Qwen3 32B , Qwen QWQ 32B

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
  Made with ❤️ by <a href="https://anish7.me">Xeven</a>
</div>
