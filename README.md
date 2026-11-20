# TASKFLOW – Student Productivity Web Application

> **A modern, vibrant, and responsive task management platform built exclusively with HTML5, CSS3, and Vanilla JavaScript.**

---

## 1. Project Introduction

**TASKFLOW** is a student productivity dashboard engineered to help university and college students organize academic coursework, capstone projects, and personal routines. 

Designed with an energetic startup visual identity featuring **Electric Tangerine**, **Deep Midnight Navy**, and **Warm Ivory**, the web application provides a clean, distraction-free environment for students to track deadlines, monitor progress with dynamic visual analytics, and manage everyday deliverables without heavy frameworks or external dependencies.

---

## 2. Key Features

- **Dynamic Statistics & Progress Tracking**:
  - Automatically calculates **Total Tasks**, **Pending Tasks**, **Completed Tasks**, and real-time **Completion Rate (%)**.
  - Dynamic visual progress bars that reflect live task status changes.
  - Semester Productivity Goal banner with motivational status updates.
- **Full Task Lifecycle Management (CRUD)**:
  - Create tasks with Title, Description/Notes, Academic Category, Priority Level, and Due Date.
  - Interactive status toggling (complete / pending) with visual feedback.
  - Task deletion with instant confirmation toasts.
  - Form validation preventing empty or whitespace-only task submissions.
- **Category & Priority Tagging**:
  - Categorization into **Study**, **Project**, and **Personal**.
  - Priority levels (**High**, **Medium**, **Low**) with distinct visual indicator badges.
  - Smart due date tags with real-time indicators for *Due Today* and *Overdue* items.
- **Real-Time Search & Multi-Criteria Filtering**:
  - Instant search filter by task title or description.
  - Status filters (**All**, **Pending**, **Completed**).
  - Category dropdown filter synchronized with sidebar quick-filter pills.
  - Sorting by **Recently Added**, **Due Date**, or **Priority Level**.
- **Local Storage Persistence**:
  - All tasks, completion statuses, and changes are saved directly in the browser's `localStorage`.
  - Zero data loss on browser refresh, tab closing, or system restart.
  - Preloaded starter sample tasks for immediate testing on first launch.
- **Modern, Accessible UI/UX**:
  - Modal dialog with backdrop blur, keyboard navigation (`Escape` key support), and autofocus.
  - Non-intrusive floating toast notifications for user actions.
  - 100% responsive design adapting seamlessly to mobile phones, tablets, and desktop displays.

---

## 3. Technologies Used

| Technology | Purpose |
| :--- | :--- |
| **HTML5** | Semantic structure (`<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, forms, and accessible ARIA attributes). |
| **CSS3** | Custom variables, Flexbox, CSS Grid layouts, clean transitions, and media queries (No Bootstrap, Tailwind, or libraries). |
| **Vanilla JavaScript (ES6)** | DOM manipulation, state management, event listeners, array methods, and Local Storage API (No React, Vue, or jQuery). |
| **Google Fonts** | `Plus Jakarta Sans` for clean, high-legibility typography. |
| **Inline SVGs** | Scalable, crisp iconography with zero HTTP request overhead. |

---

## 4. Design & Color Palette

TASKFLOW follows a single, cohesive, premium color system:

- **Deep Midnight Navy (`#0b1120`, `#152037`, `#0f172a`)**: Primary backdrop and surface cards, providing an ergonomic dark mode optimized for late-night study sessions.
- **Electric Tangerine (`#ff6b35`)**: High-contrast primary accent used for actionable buttons, active navigation, progress indicators, and key highlights.
- **Warm Ivory (`#faf7f0`, `#e2ddd5`)**: Crisp typography ensuring high readability and reducing eye strain.
- **Muted Slate (`#94a3b8`, `#64748b`)**: Secondary labels, metadata timestamps, and placeholder elements.

---

## 5. Project Structure

```
TASKFLOW/
├── index.html       # Application markup and semantic layout
├── style.css        # Custom styles, responsive grid, theme variables
├── script.js        # Beginner-friendly Vanilla JS logic and Local Storage handling
├── server.js        # Node.js static server and student profile API
├── package.json     # Start command
└── README.md        # Comprehensive documentation and project guide
```

---

## 6. How to Run the Project

TASKFLOW uses a small Node.js server for the student profile API. From the project folder run:

```bash
npm start
```

Then open `http://localhost:8080`. No third-party npm packages are required. Opening `index.html` directly or serving it with Live Server/Python will not provide the login API.

## 7. Student Accounts and Authentication

Students create an account with their name, email, course/program, semester/year, and a password of at least 8 characters. Returning students sign in with email and password.

- `POST /api/register` — create a student account and sign in.
- `POST /api/login` — authenticate an existing account.
- `GET /api/me` — restore the current session from its HttpOnly cookie.
- `POST /api/logout` — end the current session.

Passwords are stored as salted scrypt hashes, never as plaintext. Account records are saved outside the public project files in `~/.taskflow/students.json`; sessions use HttpOnly, SameSite cookies and expire after 8 hours.

Example request:

```json
{
  "name": "Sam Lee",
  "email": "sam@example.edu",
  "course": "Information Technology",
  "semester": "Semester 3",
  "password": "choose-a-password"
}
```

Email ownership is not verified, so this local demo should not be used for production accounts. Sessions are held in server memory and require signing in again after a server restart. Production deployment also needs HTTPS, email verification, rate limiting, and a managed database.

---

## 8. How Local Storage Works (College Presentation Guide)

During a viva or project evaluation, college judges frequently ask about data persistence. Here is an easy explanation you can give:

### What is `localStorage`?
`localStorage` is a built-in Web Storage API in modern web browsers that allows web applications to store key-value pairs (up to ~5MB) directly inside the user's browser with **no expiration date**. The data persists even after the browser window is closed or refreshed.

### How TASKFLOW Uses `localStorage`:

1. **Saving Data (`saveTasks`)**:
   JavaScript arrays and objects cannot be stored as raw objects in `localStorage`—they must be converted to a text string using `JSON.stringify()`.
   ```javascript
   function saveTasks() {
     localStorage.setItem("taskflow_student_tasks", JSON.stringify(tasks));
   }
   ```

2. **Loading Data (`loadTasks`)**:
   When the webpage loads, we retrieve the stored JSON string with `localStorage.getItem()` and parse it back into a JavaScript array using `JSON.parse()`.
   ```javascript
   function loadTasks() {
     const savedData = localStorage.getItem("taskflow_student_tasks");
     if (savedData) {
       tasks = JSON.parse(savedData);
     } else {
       // Provide default starter tasks if empty
     }
   }
   ```

3. **Data Flow Diagram**:
   ```
   [User Action: Add / Toggle / Delete Task]
                     │
                     ▼
             [Update tasks Array]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   [saveTasks()]          [renderTasks()]
         │                       │
   (JSON.stringify)       (DOM Manipulation)
         │                       │
         ▼                       ▼
   [localStorage]           [User Screen]
   ```

---

## 9. Code Architecture & Key Functions

The JavaScript file (`script.js`) is organized into logical, beginner-friendly blocks:

- `updateGreetingAndDate()`: Detects system hour to output `"Good morning"`, `"Good afternoon"`, or `"Good evening"`, and formats the current calendar date.
- `updateStats()`: Loops through the `tasks` array, counts completed vs pending items, calculates the percentage, and updates the DOM stats cards and progress bars.
- `getFilteredAndSortedTasks()`: Pure filtering algorithm that checks search keyword, category selection, and completion status.
- `renderTasks()`: Clears the container and dynamically generates task card elements, or displays the friendly empty state when no items match.
- `handleAddTaskFormSubmit()`: Validates that the title input is not blank, instantiates a task object, prepends it to the list, updates storage, and triggers a toast notification.
- `toggleTaskCompletion()`: Inverts the boolean `completed` property on the selected task and updates all UI metrics.
- `deleteTask()`: Removes the selected task from the array by ID and updates storage.

---

## 10. Future Improvements

Possible additions for future iterations include:
1. **Pomodoro Study Timer**: A built-in 25-minute focus session timer linked to selected tasks.
2. **Weekly Calendar View**: Visual drag-and-drop calendar for assignment due dates.
3. **Data Export & Import**: Ability to download tasks as a `.json` or `.csv` backup file and import them across devices.
4. **Subtasks / Checklist**: Allowing complex project tasks to have smaller sub-checklists.
