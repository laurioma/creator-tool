# Creator Tool

A monorepo containing both the frontend React application and Firebase Cloud Functions for the Creator Tool platform.

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/creator-tool.git
   cd creator-tool
   npm install
   ```

2. **Deploy to Firebase**
   ```bash
   # Deploy everything (builds first)
   npm run deploy
   
   # Or deploy specific parts
   npm run deploy:frontend  # Deploy only frontend
   npm run deploy:functions # Deploy only functions
   ```

## Local Development

1. **Start development servers**
   ```bash
   npm run dev
   ```
   This will start both the frontend (http://localhost:3000) and functions emulator.

2. **Available development commands**
   ```bash
   # Start only frontend
   npm run start:frontend
   
   # Start only functions emulator
   npm run start:functions
   
   # Build for development
   npm run build
   
   # Run tests
   npm run test:all
   ```

## Project Structure

```
creator-tool/
├── creator-tool-frontend/    # React frontend application
│   ├── src/
│   │   ├── services/        # Frontend services
│   │   └── components/      # React components
│   ├── public/             # Static assets
│   ├── .env               # Frontend environment variables
│   └── package.json       # Frontend dependencies
├── functions/             # Firebase Cloud Functions
│   ├── src/              # Functions source code
│   │   └── utils/        # Utility functions
│   └── package.json      # Functions dependencies
├── .firebaserc          # Firebase project configuration
├── firebase.json        # Firebase hosting and functions config
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── package.json         # Root package.json with workspace config
└── .gitignore          # Git ignore rules
```

## Available Scripts

The project uses npm workspaces to manage both the frontend and Cloud Functions. All commands can be run from the root directory.

### Development
```bash
# Start both frontend and functions in development mode
npm run dev
# or
npm run start:all

# Start only frontend (http://localhost:3000)
npm run start:frontend

# Start only functions emulator
npm run start:functions
```

### Building
```bash
# Build everything
npm run build
# or
npm run build:all

# Build only frontend
npm run build:frontend

# Build only functions
npm run build:functions
```

### Testing
```bash
# Run all tests
npm run test:all

# Test frontend
npm run test:frontend

# Test functions
npm run test:functions
```

### Linting
```bash
# Lint everything
npm run lint:all

# Lint frontend
npm run lint:frontend

# Lint functions
npm run lint:functions
```

### Cleaning
```bash
# Clean everything (removes node_modules and build artifacts)
npm run clean

# Clean only frontend
npm run clean:frontend

# Clean only functions
npm run clean:functions
```

## Development Guidelines

1. **Code Organization**: Each project (frontend and functions) maintains its own codebase with appropriate separation of concerns.

2. **Type Safety**: Both frontend and functions are written in TypeScript for better type safety and developer experience.

3. **Testing**: Both frontend and functions have their own test suites. Run tests before committing changes.

4. **Environment Variables**: Never commit .env files. Use .env.example to document required variables.

5. **Deployment**: The deploy script will automatically build both projects before deploying to ensure the latest code is deployed.

## Troubleshooting

1. **Clean Install**: If you encounter dependency issues, try:
   ```bash
   npm run clean
   npm install
   ```

2. **Emulator Issues**: If functions emulator fails to start:
   ```bash
   cd functions
   npm run clean
   npm install
   npm run build
   npm run serve
   ```

3. **Build Errors**: For TypeScript errors:
   ```bash
   npm run lint:all
   npm run build
   ```

## Features

- Brand dashboard for campaign management
- Creator dashboard for joining campaigns
- Automatic social media stats tracking
- Real-time updates and notifications

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request 