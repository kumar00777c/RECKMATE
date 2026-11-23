# RECKMATE — REC Chess Arena

RECKMATE is an online chess arena platform designed for the college chess community.

## Features
- **Chess Engine & Game Modes:** Local chess, bots, and interactive puzzles using `chess.js`.
- **Authentication & Profiles:** Supabase Auth integration, persistent sessions, ratings, and stats.
- **Admin Management:** Student onboarding, profile management, and rating adjustments.
- **Password Security:** Forced password reset on first login and full email recovery flow with Resend.

## Tech Stack
- Frontend: Vanilla HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database & Auth: Supabase (PostgreSQL & GoTrue)
- Email Service: Resend

## Local Setup
1. Clone the repository.
2. Navigate to `backend` and install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Create `backend/.env` with:
   ```env
   PORT=3000
   APP_URL=http://localhost:3000
   SUPABASE_URL=your_supabase_url
   SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   SUPABASE_SECRET_KEY=your_supabase_secret_key
   RESEND_API_KEY=your_resend_api_key
   ```
4. Start the server:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.
