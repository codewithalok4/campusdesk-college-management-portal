# CampusDesk · College Management Portal

A small, local-first college portal mini project for a BCA submission. It provides a dashboard, student and faculty record management, a course and department catalogue, daily class attendance, and a campus notices board.

## Run it locally

1. Install **Node.js 22.5 or newer** (Node 24 LTS is a good choice). SQLite is included in Node; a separate database installation is not needed.
2. Open a terminal in this folder.
3. Start the app:

   ```bash
   npm start
   ```

   Or run `node server.js` directly. There are no npm packages to install.

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
5. Leave the terminal running while you demo the portal. Press **Ctrl+C** to stop it.

The database file is created at `data/campusdesk.sqlite` on first start. The first launch inserts sample departments, courses, faculty, students, today's attendance, and notices. Later launches keep your edits and do not add duplicate sample rows. To reset to the original demo data, stop the app and delete `data/campusdesk.sqlite`; the next start will recreate it. This removes all records you added.

If port 3000 is busy, start it with `PORT=3001 npm start` on macOS/Linux, or `$env:PORT=3001; npm start` in PowerShell, then visit port 3001.

## What is included

- **Overview:** summary cards, department enrolment bars, campus bulletin, recent student records, and quick links.
- **Students:** add, search, edit, and delete student records. Roll numbers are unique.
- **Faculty:** add, search, edit, and delete faculty records. Employee IDs are unique.
- **Academics:** browse seeded departments, department heads, courses, semesters, and credits.
- **Attendance:** choose a course and date, mark each student Present, Absent, or Late, mark the class Present in one click, and save or revise marks.
- **Notices & events:** publish campus announcements, events, and academic updates; optionally set an event date; remove an update.
- **Sample data:** 3 departments, 3 courses, 10 students, 4 faculty members, attendance marks, and 3 notices.

## Project structure

```text
college-management-portal/
├── data/                 # Created on first run; local SQLite database
├── docs/
│   ├── ER-Diagram.svg
│   ├── PROJECT-REPORT.md
│   ├── schema.sql
│   └── VIVA-QA.md
├── public/
│   ├── app.js             # Browser navigation, rendering, and interactions
│   ├── index.html
│   └── styles.css
├── .gitignore
├── package.json
├── README.md
└── server.js              # Native Node HTTP server, JSON API, and SQLite setup
```

## Demo walkthrough (about 5 minutes)

1. Start on **Overview** and explain the summary cards and department comparison.
2. Open **Students**, search for `Aarav`, add a record, edit it, then show the unique roll number rule.
3. Open **Faculty** and show the department directory and edit controls.
4. Open **Academics** to explain the department-to-course relationship.
5. Open **Attendance**, select BCA and today's date, change a status, mark all present, then save. Re-open the same course and date to show the marks persisted.
6. Open **Notices & events**, publish a dated event, and show it in the bulletin.
7. Explain that records persist in a local SQLite file and name the tables in `docs/schema.sql`.

## Notes for the submission team

The report, schema, ER diagram, and viva preparation are in [`docs/`](docs/). The app is intentionally scoped as a classroom prototype. It has no login, role permissions, hosted deployment, or student-facing accounts; use fictional data for a presentation. The UI uses a Google Fonts stylesheet when the computer is online and falls back to system fonts offline.
