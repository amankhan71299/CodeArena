# CodeArena

CodeArena is a comprehensive platform for coding contests and competitive programming. It provides a real-time coding environment where users can solve problems, participate in contests, and get their code evaluated instantly.

## Features

- **Interactive Code Editor**: Built with Monaco Editor (the same editor that powers VS Code) for a rich coding experience.
- **Real-time Collaboration & Updates**: Powered by Socket.IO for live contest leaderboards, notifications, and real-time event broadcasting.
- **Robust Code Evaluation**: Utilizes BullMQ and Redis for scalable and reliable asynchronous code execution and evaluation.
- **Secure Authentication**: JWT-based authentication system with bcrypt for secure password hashing.
- **Modern UI/UX**: Frontend built with Next.js and styled using Tailwind CSS v4 for a responsive and beautiful user interface.
- **AI Integration**: Leverages Google GenAI for advanced features (e.g., problem generation, hints, or code analysis).

## Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
- **Real-time**: `socket.io-client`
- **Markdown Rendering**: `react-markdown` & `@tailwindcss/typography`

### Backend
- **Framework**: [Express.js](https://expressjs.com/) (Node.js)
- **Database**: [MongoDB](https://www.mongodb.com/) (via Mongoose)
- **Queue System**: [BullMQ](https://docs.bullmq.io/) with [Redis](https://redis.io/)
- **Real-time**: [Socket.IO](https://socket.io/)
- **Authentication**: JWT (`jsonwebtoken`) & `bcrypt`
- **AI**: Google GenAI (`@google/genai`)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a MongoDB Atlas URI)
- [Redis](https://redis.io/download) (required for BullMQ queue processing)

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd CodeArena
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Variables

You will need to set up environment variables for both the frontend and backend.

**Backend (`backend/.env`)**:
Create a `.env` file in the `backend` directory and add the necessary variables (e.g., MongoDB URI, Redis connection details, JWT Secret, Google GenAI API key).
```env
PORT=...
MONGODB_URI=...
REDIS_URL=...
JWT_SECRET=...
GENAI_API_KEY=...
```

### Running the Application

You will need to run the backend server, the backend worker (for code execution queues), and the frontend development server.

1. **Start the Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Backend Worker** (in a new terminal):
   ```bash
   cd backend
   npm run dev:worker
   ```

3. **Start the Frontend Application** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

The frontend will typically be accessible at `http://localhost:3000` and the backend API at the port specified in your `.env` file.

## Project Structure

```
CodeArena/
├── backend/          # Node.js/Express backend, models, routes, controllers, and worker scripts
├── frontend/         # Next.js React frontend, pages, components, and styles
├── DEPLOYMENT.md     # Deployment guidelines and instructions
└── README.md         # Project documentation (this file)
```
