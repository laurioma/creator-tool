# Creator Tool

A platform connecting brands with creators for social media campaigns.

## Project Structure

```
creator-tool/
├── creator-tool-frontend/  # React frontend application
├── functions/             # Firebase Cloud Functions
└── firebase.json         # Firebase configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v7 or later)
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/creator-tool.git
cd creator-tool
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Create `.env` file in `creator-tool-frontend` directory
- Add necessary environment variables

### Development

Start the frontend development server:
```bash
npm run start:frontend
```

Start the Firebase Functions emulator:
```bash
npm run start:functions
```

### Deployment

Deploy everything:
```bash
npm run deploy
```

Or deploy specific parts:
```bash
npm run deploy:frontend  # Deploy only frontend
npm run deploy:functions # Deploy only functions
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