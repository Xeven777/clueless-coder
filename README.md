# Cluelessly Coder

A powerful desktop application that helps developers solve coding problems by analyzing screenshots of code and providing AI-powered solutions. Built with Electron, React, and TypeScript.

## Features

- 📸 Capture code screenshots and get instant solutions
- 🤖 AI-powered code analysis and problem-solving
- 📝 Multiple AI provider support (OpenAI, Google Gemini)
- 🎨 Clean, modern UI with dark/light themes
- ⚡ Fast and responsive performance
- 🔒 Local processing of sensitive data
- 🖥️ Cross-platform support (Windows, macOS, Linux)

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Prerequisites

- Node.js 18+ (Recommended: Latest LTS version)
- npm, yarn, or pnpm package manager
- Git (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/Xeven777/clueless-coder.git
cd clueless-coder

# Install dependencies
pnpm install
```

### Configuration

1. Create a `.env` file in the root directory
2. Add your API keys:

```env
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Development

```bash
pnpm dev
```

### Build

For Windows:

```bash
pnpm build:win
```

For macOS:

```bash
pnpm build:mac
```

For Linux:

```bash
pnpm build:linux
```

## Usage

1. Launch the application
2. Take a screenshot of your code problem
3. The app will analyze the code and provide solutions
4. Browse through different solution approaches
5. Copy the code solution or debug information

## Keyboard Shortcuts

- `Ctrl+Shift+S`: Take a screenshot
- `Esc`: Hide the application window
- `Ctrl+,`: Open settings

## Technologies Used

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- OpenAI API
- Google Gemini API
- React Query
- Zod

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron Vite](https://github.com/alex8088/electron-vite)
- Icons by [Lucide](https://lucide.dev/)
- UI components powered by [Radix UI](https://www.radix-ui.com/)
