# Plain Onboarding 🎬

> Gamified onboarding system that turns workflow recordings into searchable, TikTok-style learning clips

## Problem Solved

Reading through Confluence docs and lengthy documentation is inefficient for onboarding. New team members need:
- **Quick, digestible content** instead of walls of text
- **Role-specific guidance** tailored to their position
- **Visual walkthroughs** showing how things actually work
- **Gamification** to stay motivated and track progress

## Solution

Plain Onboarding records screen + mic workflows, automatically chunks them into short clips (~30s each), transcribes and tags them with AI, then serves them in an engaging, searchable library with gamification features.

### Key Features

#### 🎥 **Workflow Recorder**
- Record screen + microphone simultaneously
- Browser-based recording (no installation needed)
- Automatic upload and processing

#### ✂️ **Auto-Chunking**
- Automatically splits long recordings into 30-second clips
- Smart scene detection for natural break points
- Generates thumbnail previews

#### 🤖 **AI-Powered Tagging**
- Speech-to-text transcription using OpenAI Whisper
- Automatic tag generation from content
- Role categorization (frontend, backend, devops, etc.)

#### 📚 **TikTok-Style Library**
- Swipeable clip interface
- Search by keywords, tags, or transcript
- Filter by role
- Track views and likes

#### 🎫 **Starter Tickets**
- Role-based onboarding tasks
- Link tickets to relevant video clips
- Kanban-style board (Available → In Progress → Completed)

#### 🎮 **Gamification**
- Points for completing tickets and watching clips
- Level progression system
- Badge achievements
- Leaderboard

## Tech Stack

**Frontend:**
- Vanilla JavaScript (no framework overhead)
- MediaRecorder API for screen capture
- CSS Grid/Flexbox for responsive layout

**Backend:**
- Node.js + Express
- SQLite for data storage
- FFmpeg for video processing
- OpenAI API for transcription and tagging

## Installation

### Prerequisites

- Node.js 18+ and npm
- FFmpeg installed on your system
  ```bash
  # macOS
  brew install ffmpeg
  
  # Ubuntu/Debian
  sudo apt install ffmpeg
  
  # Windows (via Chocolatey)
  choco install ffmpeg
  ```

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Plain-2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
   
   > **Note:** The system works without OpenAI, but transcription and auto-tagging will be disabled.

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   This starts both the backend (port 3000) and serves the frontend.

5. **Access the application**
   - Open your browser to `http://localhost:3000`

## Usage Guide

### Recording a Workflow

1. Navigate to the **Recorder** page
2. Click **Start Recording**
3. Select the screen/window to share
4. Enable system audio and microphone
5. Perform your workflow demonstration
6. Click **Stop Recording**
7. Add a title and description
8. Click **Upload & Process**

### Processing Videos

After upload, run the video processor to chunk and tag clips:

```bash
node server/processors/videoProcessor.js <recording-id>
```

Or integrate it into your backend to process automatically after uploads.

### Browsing Clips

1. Go to the **Library** page
2. Use the search bar to find specific content
3. Filter by role (Frontend, Backend, DevOps, etc.)
4. Click any clip to view in fullscreen
5. Navigate between clips with arrow keys or buttons

### Creating Starter Tickets

1. Navigate to **Tickets** page
2. Click **+ Create New Ticket**
3. Fill in:
   - Title and description
   - Role (who should do this)
   - Difficulty level
   - Points reward
4. Optionally link related video clips

### Managing Profile

1. Go to **Profile** page
2. View your stats: points, level, badges
3. Edit your profile to set username and role
4. Check the leaderboard to see how you rank

## Architecture

```
Plain-2/
├── server/
│   ├── index.js              # Express server
│   ├── database/
│   │   └── db.js             # SQLite setup
│   ├── routes/
│   │   ├── recordings.js     # Recording uploads
│   │   ├── clips.js          # Clip management
│   │   ├── tickets.js        # Ticket CRUD
│   │   └── gamification.js   # Points, badges, leaderboard
│   └── processors/
│       ├── videoProcessor.js # Video chunking
│       └── aiProcessor.js    # Transcription & tagging
├── public/
│   ├── index.html            # Recorder page
│   ├── library.html          # Clip library
│   ├── tickets.html          # Tickets board
│   ├── profile.html          # User profile
│   ├── recorder.js           # Recording logic
│   ├── library.js            # Clip browsing
│   ├── tickets.js            # Ticket management
│   ├── profile.js            # Profile & gamification
│   └── styles.css            # All styles
├── uploads/
│   ├── recordings/           # Original recordings
│   └── clips/                # Processed clips
└── database/
    └── onboarding.db         # SQLite database
```

## API Endpoints

### Recordings
- `POST /api/recordings/upload` - Upload recording
- `GET /api/recordings` - List all recordings
- `GET /api/recordings/:id` - Get recording details
- `PATCH /api/recordings/:id/processed` - Mark as processed

### Clips
- `GET /api/clips` - List clips (with filters)
- `GET /api/clips/:id` - Get clip details
- `POST /api/clips` - Create clip
- `POST /api/clips/:id/view` - Increment view count
- `POST /api/clips/:id/like` - Increment like count
- `PATCH /api/clips/:id/tags` - Update tags

### Tickets
- `GET /api/tickets` - List tickets
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id/assign` - Assign to user
- `PATCH /api/tickets/:id/complete` - Mark complete
- `GET /api/tickets/role/:role/starters` - Get starter tickets for role

### Gamification
- `GET /api/gamification/user/:id` - Get user profile
- `PATCH /api/gamification/user/:id` - Update profile
- `GET /api/gamification/user/:id/stats` - Get user stats
- `POST /api/gamification/user/:id/badge` - Award badge
- `POST /api/gamification/user/:id/watched/:clipId` - Track clip watched
- `GET /api/gamification/leaderboard` - Get top users

## Gamification System

### Points
- **Watch a clip (first time):** 5 points
- **Complete a ticket:** Variable (set per ticket, default 10)
- **Level up:** Every 100 points

### Badges
- **Eager Learner** 🎓 - Watch 5 clips
- **Knowledge Seeker** 📚 - Watch 10 clips
- **Onboarding Master** 🏆 - Watch 25 clips
- **Century Club** 💯 - Earn 100 points
- **Point Machine** ⚡ - Earn 500 points

Custom badges can be awarded via the API.

## Customization

### Clip Duration
Edit `CLIP_DURATION` in `server/processors/videoProcessor.js`:
```javascript
const CLIP_DURATION = 30; // seconds per clip
```

### Point Values
Edit point awards in:
- `server/routes/gamification.js` - Clip watching points
- `server/routes/tickets.js` - Ticket completion points

### Roles
Add/modify roles in:
- Database schema (`db.js`)
- Frontend dropdowns (HTML files)
- Role filters (JavaScript files)

## Production Deployment

1. **Set environment to production**
   ```bash
   export NODE_ENV=production
   ```

2. **Build frontend** (if using a bundler)
   ```bash
   npm run build
   ```

3. **Use a process manager**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name plain-onboarding
   ```

4. **Set up reverse proxy** (nginx example)
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Configure HTTPS** (recommended)
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

## Future Enhancements

- [ ] **Real-time collaboration** - Multiple users can annotate clips
- [ ] **Clip editing** - Trim, merge, or split clips in-browser
- [ ] **Auto-linking** - Automatically suggest related clips for tickets
- [ ] **Analytics dashboard** - Track most-viewed clips, completion rates
- [ ] **Mobile app** - Native iOS/Android for on-the-go learning
- [ ] **Integration with Slack/Teams** - Share clips directly in chat
- [ ] **Custom workflows** - Define onboarding paths per role
- [ ] **Quiz generation** - Auto-generate quizzes from clip transcripts

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Credits

Built with ❤️ for Aces Pair

Powered by:
- [OpenAI Whisper](https://openai.com/research/whisper) for transcription
- [FFmpeg](https://ffmpeg.org/) for video processing
- [Express](https://expressjs.com/) for the backend
- [SQLite](https://www.sqlite.org/) for data storage

---

**Questions?** Open an issue or reach out!
