# Voting Topics

A lightweight, open-source project for building and sharing **transferable sample ballots**.  
Users can define their values and priorities as a set of topics, then export or share them.  
The goal is to empower individuals to think critically about their preferences and compare them against candidates transparently — without ever storing PII.

---

## ✨ Features

- **Topic Builder UI**  
  - Add topics, assign importance (STAR-style 0–5), write directions (select/freeform), and add notes/sources.
- **Anonymous by design**  
  - No accounts, no IP storage, no tracking.
- **Export**  
  - Download as JSON, PDF, or JPEG share card.
- **Immutable publishing**  
  - Templates are stored with content hashes; forks create new immutable links.
- **Topic Library (Wiki-like)**  
  - Topics curated in JSON files in this repo. Community can propose changes via PR.
- **Future goals**  
  - Abuse resistance (proof-of-work, token bucket), integrations with VOTE411/BallotReady, GitHub-driven transparency.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/uncomposed/voting-topics.git
cd voting-topics

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open in your browser at `http://localhost:3000`.

### Build for Production

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

---

## 🏗️ Project Structure

The project has been refactored from a monolithic HTML file into a modern React TypeScript application:

```
src/
├── components/          # React components
│   ├── Stars.tsx       # Star rating component
│   ├── TopicCard.tsx   # Individual topic card
│   └── TopicList.tsx   # List of topics
├── schema.ts           # Zod schema definitions
├── store.ts            # Zustand state management
├── utils.ts            # Utility functions
├── exporters.ts        # Export functionality (PDF, JPEG, JSON)
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

### Key Technologies

- **React 18** - Modern React with hooks
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **Zustand** - Lightweight state management
- **Zod** - Schema validation
- **html2canvas** - Screenshot generation for JPEG export
- **jsPDF** - PDF generation

---

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Code Style

The project uses ESLint with TypeScript and React rules. Run `npm run lint:fix` to automatically fix formatting issues.

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 Acknowledgments

- Built with modern web technologies for performance and maintainability
- Designed with accessibility and user experience in mind
- Open source and community-driven development