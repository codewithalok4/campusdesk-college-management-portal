# CampusDesk — College Management Portal

CampusDesk is a college management portal mini project built for a BCA college submission. It provides a simple interface for managing student and faculty records, courses, departments, attendance, and announcements.

## Features

- Dashboard overview
- Student records: add, view, edit, and delete
- Faculty records: add, view, edit, and delete
- Course and department listings
- Attendance marking and viewing
- Announcements and events
- Optional Gemini AI assistant for questions about college information

## Technology

- HTML, CSS, and JavaScript
- Node.js and Express
- SQLite with `better-sqlite3`
- Google Gemini API for the optional AI assistant

## Run locally

1. Install [Node.js](https://nodejs.org/).
2. Open a terminal in the project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

The SQLite database is created locally when the app runs.

## Optional Gemini assistant

The Gemini assistant requires a Gemini API key. Copy `.env.example` to `.env`, add your key to the `GEMINI_API_KEY` setting, then restart the app. Keep `.env` private and never commit your API key.

## Project documentation

See the `docs/` folder for the project report and viva questions.

## Note

This is an educational mini project and may need additional security and deployment work before being used with real college data.
