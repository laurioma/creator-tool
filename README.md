# Creator Tool

A monorepo containing both the frontend React application and Firebase Cloud Functions for the Creator Tool platform.

## Project Structure

```
creator-tool/
├── creator-tool-frontend/    # React frontend application
│   ├── src/
│   │   ├── services/        # Frontend services
│   │   └── components/      # React components
│   └── package.json         # Frontend dependencies
├── functions/               # Firebase Cloud Functions
│   ├── src/                # Functions source code
│   │   └── utils/          # Utility functions
│   └── package.json        # Functions dependencies
├── package.json            # Root package.json with workspace config
└── firebase.json           # Firebase configuration
```

## Available Scripts

The project uses npm workspaces to manage both the frontend and Cloud Functions. All commands can be run from the root directory.

### Installation

```bash
# Install all dependencies (root, frontend, and functions)
npm run install:all

# Install only frontend dependencies
npm run install:frontend

# Install only functions dependencies
npm run install:functions
```

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

### Deployment

```bash
# Deploy everything (builds first)
npm run deploy

# Deploy only frontend
npm run deploy:frontend

# Deploy only functions
npm run deploy:functions
```

### Testing

```bash
# Run all tests
npm run test:all

# Test frontend
npm run test:frontend
# Run frontend tests in CI mode (no watch)
cd creator-tool-frontend && npm run test:ci

# Test functions
npm run test:functions
```

### Linting

```bash
# Lint everything
npm run lint:all

# Lint and fix frontend
npm run lint:frontend
cd creator-tool-frontend && npm run lint:fix

# Lint and fix functions
npm run lint:functions
cd functions && npm run lint:fix
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

### Additional Tools

#### Frontend

```bash
# Analyze bundle size
cd creator-tool-frontend && npm run analyze

# Eject from Create React App
cd creator-tool-frontend && npm run eject
```

#### Functions

```bash
# Watch for TypeScript changes
cd functions && npm run build:watch

# Access Firebase Functions shell
cd functions && npm run shell

# View Functions logs
cd functions && npm run logs
```

## Environment Setup

### Frontend (.env)

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Functions (.env)

```env
FIREBASE_PROJECT_ID=your_project_id
```

## Development Guidelines

1. **Code Organization**: Each project (frontend and functions) maintains its own codebase with appropriate separation of concerns.

2. **Type Safety**: Functions are written in TypeScript for better type safety and developer experience.

3. **Testing**: Both frontend and functions have their own test suites. Run tests before committing changes.

4. **Environment Variables**: Never commit .env files. Use .env.example to document required variables.

5. **Deployment**: The deploy script will automatically build both projects before deploying to ensure the latest code is deployed.

## Troubleshooting

1. **Clean Install**: If you encounter dependency issues, try:
   ```bash
   npm run clean
   npm run install:all
   ```

2. **Emulator Issues**: If functions emulator fails to start:
   ```bash
   cd functions
   npm run clean
   npm install
   npm run build
   npm run serve
   ```

3. **Build Errors**: For TypeScript errors in functions:
   ```bash
   cd functions
   npm run lint:fix
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