/* ==========================================================================
   TASKFLOW – Student Productivity Web Application
   Vanilla JavaScript (Clean, beginner-friendly, and well-commented)
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. Application State (Global Variables)
// --------------------------------------------------------------------------
// Array to hold all tasks in memory
let tasks = [];

// Filter and search states
let currentStatus = "all";       // 'all', 'pending', or 'completed'
let currentCategory = "all";     // 'all', 'Study', 'Personal', or 'Project'
let searchQuery = "";            // text typed in the search bar
let currentSort = "newest";      // 'newest', 'due-date', or 'priority'
let currentStudent = null;

// Key name used for browser Local Storage
const STORAGE_KEY = "taskflow_student_tasks";

// --------------------------------------------------------------------------
// 2. DOM Elements (Connecting HTML with JavaScript)
// --------------------------------------------------------------------------
// Greeting and Date
const greetingText = document.getElementById("greetingText");
const currentDateText = document.getElementById("currentDateText");

// Statistics Elements
const statTotalTasks = document.getElementById("statTotalTasks");
const statPendingTasks = document.getElementById("statPendingTasks");
const statCompletedTasks = document.getElementById("statCompletedTasks");
const statCompletionRate = document.getElementById("statCompletionRate");
const statMiniProgressBar = document.getElementById("statMiniProgressBar");
const progressOverviewBar = document.getElementById("progressOverviewBar");
const progressBannerPercentage = document.getElementById("progressBannerPercentage");
const progressSummaryText = document.getElementById("progressSummaryText");

// Sidebar Nav Badges
const navPendingBadge = document.getElementById("navPendingBadge");
const navCompletedBadge = document.getElementById("navCompletedBadge");

// Navigation buttons
const navDashboard = document.getElementById("navDashboard");
const navMyTasks = document.getElementById("navMyTasks");
const navCompleted = document.getElementById("navCompleted");
const navCategories = document.getElementById("navCategories");
const sidebarCategorySection = document.getElementById("sidebarCategorySection");
const catPills = document.querySelectorAll(".cat-pill");

// Search and Filter Elements
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const statusButtons = document.querySelectorAll(".status-btn");
const categoryFilter = document.getElementById("categoryFilter");
const sortTasksSelect = document.getElementById("sortTasksSelect");

// Task List Container & Empty State
const taskListContainer = document.getElementById("taskListContainer");
const taskCounterText = document.getElementById("taskCounterText");
const emptyState = document.getElementById("emptyState");
const emptyStateTitle = document.getElementById("emptyStateTitle");
const emptyStateDesc = document.getElementById("emptyStateDesc");
const emptyStateActionBtn = document.getElementById("emptyStateActionBtn");

// Modal Elements
const taskModal = document.getElementById("taskModal");
const openAddTaskModalBtn = document.getElementById("openAddTaskModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskDescInput = document.getElementById("taskDescInput");
const taskCategorySelect = document.getElementById("taskCategorySelect");
const taskPrioritySelect = document.getElementById("taskPrioritySelect");
const taskDueDateInput = document.getElementById("taskDueDateInput");
const titleError = document.getElementById("titleError");

// Mobile Sidebar Controls
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

// Toast Notification Container
const toastContainer = document.getElementById("toastContainer");

// Login Elements
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginModeBtn = document.getElementById("loginModeBtn");
const registerModeBtn = document.getElementById("registerModeBtn");
const loginModalTitle = document.getElementById("loginModalTitle");
const registrationFields = document.getElementById("registrationFields");
const registrationCourseFields = document.getElementById("registrationCourseFields");
const loginNameInput = document.getElementById("loginNameInput");
const loginEmailInput = document.getElementById("loginEmailInput");
const loginCourseInput = document.getElementById("loginCourseInput");
const loginSemesterInput = document.getElementById("loginSemesterInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginError = document.getElementById("loginError");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
let authMode = "login";
const openLoginBtn = document.getElementById("openLoginBtn");
const headerLoginBtn = document.getElementById("headerLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const closeLoginModalBtn = document.getElementById("closeLoginModalBtn");
const cancelLoginBtn = document.getElementById("cancelLoginBtn");
const profileInitials = document.getElementById("profileInitials");
const profileName = document.getElementById("profileName");
const profileRole = document.getElementById("profileRole");

// --------------------------------------------------------------------------
// 3. Initialization (Runs when the page is loaded)
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  updateGreetingAndDate();
  loadTasks();
  setupEventListeners();
  setAuthMode("login");
  restoreLoginSession();
  renderTasks();
  updateStats();
});

// --------------------------------------------------------------------------
// 4. Greeting & Date Setup
// --------------------------------------------------------------------------
// Sets a dynamic friendly greeting based on the current hour of the day
function updateGreetingAndDate() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good evening";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  }

  const name = currentStudent ? currentStudent.name : "Student";
  greeting = `${greeting}, ${name}!`;

  if (greetingText) {
    greetingText.textContent = greeting;
  }

  // Format today's date nicely: e.g. "Friday, November 20, 2026"
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  if (currentDateText) {
    currentDateText.textContent = now.toLocaleDateString("en-US", options);
  }

  // Set the default date picker minimum to today so past dates aren't default
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayFormatted = `${year}-${month}-${day}`;
  if (taskDueDateInput) {
    taskDueDateInput.value = todayFormatted;
    taskDueDateInput.min = todayFormatted;
  }
}

// --------------------------------------------------------------------------
// 5. Local Storage Functions
// --------------------------------------------------------------------------
// Load tasks from browser Local Storage
function loadTasks() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (savedData) {
    try {
      const parsedTasks = JSON.parse(savedData);
      if (Array.isArray(parsedTasks)) {
        tasks = parsedTasks.filter(function (task) {
          return task &&
            typeof task === "object" &&
            typeof task.id === "string" &&
            typeof task.title === "string";
        }).map(function (task) {
          return {
            id: task.id,
            title: task.title,
            description: typeof task.description === "string" ? task.description : "",
            category: ["Study", "Personal", "Project"].includes(task.category) ? task.category : "Study",
            priority: ["High", "Medium", "Low"].includes(task.priority) ? task.priority : "Medium",
            dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
            completed: task.completed === true,
            createdAt: Number.isFinite(task.createdAt) ? task.createdAt : 0
          };
        });
      } else {
        console.error("Saved tasks data is not an array.");
        tasks = [];
      }
      saveTasks();
    } catch (e) {
      console.error("Error parsing saved tasks:", e);
      tasks = [];
      saveTasks();
    }
  } else {
    // Starter sample tasks for students if no data exists yet
    tasks = [
      {
        id: "task-1",
        title: "Submit Machine Learning Assignment #2",
        description: "Complete Python implementation of decision trees and submit via university portal.",
        category: "Study",
        priority: "High",
        dueDate: getRelativeDate(1),
        completed: false,
        createdAt: Date.now() - 3600000 * 5
      },
      {
        id: "task-2",
        title: "Prepare Capstone Presentation Slides",
        description: "Design 10 slides covering project architecture, system demo, and testing results.",
        category: "Project",
        priority: "High",
        dueDate: getRelativeDate(3),
        completed: false,
        createdAt: Date.now() - 3600000 * 12
      },
      {
        id: "task-3",
        title: "Return Library Reference Books",
        description: "Return 'Algorithms Explained' and 'Modern Operating Systems' to the central library.",
        category: "Personal",
        priority: "Low",
        dueDate: getRelativeDate(4),
        completed: false,
        createdAt: Date.now() - 3600000 * 24
      },
      {
        id: "task-4",
        title: "Read Chapter 4 of Database Systems",
        description: "Review relational algebra and normalization rules for Wednesday's quiz.",
        category: "Study",
        priority: "Medium",
        dueDate: getRelativeDate(0),
        completed: true,
        createdAt: Date.now() - 3600000 * 48
      }
    ];
    saveTasks();
  }
}

// Save current tasks array into browser Local Storage
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Helper to generate a date relative to today (e.g. +1 day, +3 days)
function getRelativeDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// --------------------------------------------------------------------------
// 6. Statistics Calculation
// --------------------------------------------------------------------------
// Recalculates and updates the four stats cards and progress bars
function updateStats() {
  const total = tasks.length;
  let completed = 0;
  let pending = 0;

  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].completed) {
      completed++;
    } else {
      pending++;
    }
  }

  // Calculate completion percentage (0 if total is 0)
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Update card numbers
  statTotalTasks.textContent = total;
  statPendingTasks.textContent = pending;
  statCompletedTasks.textContent = completed;
  statCompletionRate.textContent = rate + "%";

  // Update visual progress bars
  statMiniProgressBar.style.width = rate + "%";
  progressOverviewBar.style.width = rate + "%";
  progressBannerPercentage.textContent = rate + "%";

  // Update sidebar counter badges
  navPendingBadge.textContent = pending;
  navCompletedBadge.textContent = completed;

  // Update dynamic banner summary message
  if (total === 0) {
    progressSummaryText.textContent = "No tasks yet. Click '+ Add New Task' to begin organizing your studies!";
  } else if (rate === 100) {
    progressSummaryText.textContent = "Outstanding! You have completed all scheduled tasks. Enjoy your free time!";
  } else if (rate >= 50) {
    progressSummaryText.textContent = `Great momentum! You've finished ${completed} of ${total} tasks (${rate}% completed).`;
  } else {
    progressSummaryText.textContent = `You have completed ${completed} of ${total} tasks. Focus on high priority items!`;
  }
}

// --------------------------------------------------------------------------
// 7. Task Filtering and Sorting
// --------------------------------------------------------------------------
// Filters and sorts the tasks based on user selections
function getFilteredAndSortedTasks() {
  let filtered = tasks.filter(function (task) {
    // Filter by Status (all, pending, completed)
    if (currentStatus === "pending" && task.completed) {
      return false;
    }
    if (currentStatus === "completed" && !task.completed) {
      return false;
    }

    // Filter by Category (all, Study, Personal, Project)
    if (currentCategory !== "all" && task.category !== currentCategory) {
      return false;
    }

    // Filter by Search Title query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchDesc = task.description ? task.description.toLowerCase().includes(query) : false;
      if (!matchTitle && !matchDesc) {
        return false;
      }
    }

    return true;
  });

  // Sort tasks
  filtered.sort(function (a, b) {
    if (currentSort === "newest") {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else if (currentSort === "due-date") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    } else if (currentSort === "priority") {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    }
    return 0;
  });

  return filtered;
}

// --------------------------------------------------------------------------
// 8. Render Tasks to DOM
// --------------------------------------------------------------------------
// Renders the list of task cards in the task list container
function renderTasks() {
  const filteredTasks = getFilteredAndSortedTasks();

  // Update task count text
  const totalCount = filteredTasks.length;
  taskCounterText.textContent = `${totalCount} ${totalCount === 1 ? "task" : "tasks"}`;

  // Clear previous task cards
  taskListContainer.innerHTML = "";

  // If no tasks match the filter criteria, show empty state
  if (filteredTasks.length === 0) {
    emptyState.style.display = "block";
    updateEmptyStateMessage();
    return;
  }

  // Otherwise, hide empty state and build cards
  emptyState.style.display = "none";

  filteredTasks.forEach(function (task) {
    const card = createTaskCardElement(task);
    taskListContainer.appendChild(card);
  });
}

// Adjust empty state message based on active filters
function updateEmptyStateMessage() {
  if (searchQuery.trim() !== "") {
    emptyStateTitle.textContent = "No matching tasks";
    emptyStateDesc.textContent = `No tasks found matching "${searchQuery}". Try a different keyword or clear your search.`;
  } else if (currentStatus === "completed") {
    emptyStateTitle.textContent = "No completed tasks yet";
    emptyStateDesc.textContent = "Tasks you mark as completed will appear here. Keep working through your pending list!";
  } else if (currentCategory !== "all") {
    emptyStateTitle.textContent = `No ${currentCategory} tasks`;
    emptyStateDesc.textContent = `You have no tasks in the ${currentCategory} category. Click below to add one.`;
  } else {
    emptyStateTitle.textContent = "No tasks found";
    emptyStateDesc.textContent = "You're all caught up! Create a new task to stay organized and productive.";
  }
}

// Creates the DOM element for an individual task card
function createTaskCardElement(task) {
  const card = document.createElement("div");
  card.className = `task-card ${task.completed ? "is-completed" : ""}`;
  card.setAttribute("data-id", task.id);

  // Checkbox button with inline check SVG
  const checkBtn = document.createElement("button");
  checkBtn.className = "task-checkbox-btn";
  checkBtn.setAttribute("aria-label", task.completed ? "Mark task as incomplete" : "Mark task as complete");
  checkBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  checkBtn.addEventListener("click", function () {
    toggleTaskCompletion(task.id);
  });

  // Task Details
  const details = document.createElement("div");
  details.className = "task-details";

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  details.appendChild(title);

  // Task Description (if provided)
  if (task.description && task.description.trim() !== "") {
    const desc = document.createElement("p");
    desc.className = "task-desc";
    desc.textContent = task.description;
    details.appendChild(desc);
  }

  // Metadata Row (Category, Priority, Due Date)
  const metaRow = document.createElement("div");
  metaRow.className = "task-meta-row";

  // Category Badge
  const catBadge = document.createElement("span");
  catBadge.className = `badge badge-cat-${task.category.toLowerCase()}`;
  catBadge.textContent = task.category;
  metaRow.appendChild(catBadge);

  // Priority Badge
  const prioBadge = document.createElement("span");
  prioBadge.className = `badge badge-priority-${task.priority.toLowerCase()}`;
  prioBadge.textContent = `${task.priority} Priority`;
  metaRow.appendChild(prioBadge);

  // Due Date Badge
  if (task.dueDate) {
    const dueDateBadge = document.createElement("span");
    const dateStatus = getDueDateStatus(task.dueDate, task.completed);
    dueDateBadge.className = `badge badge-due-date ${dateStatus.className}`;
    dueDateBadge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span>${dateStatus.label}</span>
    `;
    metaRow.appendChild(dueDateBadge);
  }

  details.appendChild(metaRow);

  // Action buttons: Delete
  const actions = document.createElement("div");
  actions.className = "task-actions";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "task-btn-action";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.setAttribute("title", "Delete task");
  deleteBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  deleteBtn.addEventListener("click", function () {
    deleteTask(task.id);
  });

  actions.appendChild(deleteBtn);

  // Assemble Card
  card.appendChild(checkBtn);
  card.appendChild(details);
  card.appendChild(actions);

  return card;
}

// Determines if a date is Overdue, Due Today, or in the future
function getDueDateStatus(dateStr, isCompleted) {
  if (!dateStr) return { label: "", className: "" };

  const [y, m, d] = dateStr.split("-").map(Number);
  const dueDate = new Date(y, m - 1, d);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${monthNames[dueDate.getMonth()]} ${dueDate.getDate()}`;

  if (!isCompleted && diffDays < 0) {
    return { label: `Overdue (${formattedDate})`, className: "is-overdue" };
  } else if (!isCompleted && diffDays === 0) {
    return { label: "Due Today", className: "is-today" };
  } else if (!isCompleted && diffDays === 1) {
    return { label: "Due Tomorrow", className: "" };
  } else {
    return { label: formattedDate, className: "" };
  }
}

// --------------------------------------------------------------------------
// 9. Task Operations (Add, Toggle Complete, Delete)
// --------------------------------------------------------------------------
// Handles adding a new task from the form submission
function handleAddTaskFormSubmit(e) {
  e.preventDefault();

  const titleValue = taskTitleInput.value.trim();

  // Form Validation: Ensure title is not empty
  if (titleValue === "") {
    taskTitleInput.classList.add("is-invalid");
    titleError.style.display = "block";
    taskTitleInput.focus();
    return;
  }

  // Clear validation error if valid
  taskTitleInput.classList.remove("is-invalid");
  titleError.style.display = "none";

  // Build the new task object
  const newTask = {
    id: "task-" + Date.now(),
    title: titleValue,
    description: taskDescInput.value.trim(),
    category: taskCategorySelect.value,
    priority: taskPrioritySelect.value,
    dueDate: taskDueDateInput.value,
    completed: false,
    createdAt: Date.now()
  };

  // Add to top of tasks array
  tasks.unshift(newTask);

  // Persist to Local Storage and update UI
  saveTasks();
  updateStats();
  renderTasks();
  closeModal();

  showToast("Task added successfully!", "success");
}

// Toggle a task between completed and pending
function toggleTaskCompletion(taskId) {
  const task = tasks.find(function (item) {
    return item.id === taskId;
  });

  if (task) {
    task.completed = !task.completed;
    saveTasks();
    updateStats();
    renderTasks();

    if (task.completed) {
      showToast("Task marked as completed!", "success");
    } else {
      showToast("Task marked as pending.", "info");
    }
  }
}

// Delete a task by ID
function deleteTask(taskId) {
  const taskIndex = tasks.findIndex(function (item) {
    return item.id === taskId;
  });

  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
    saveTasks();
    updateStats();
    renderTasks();
    showToast("Task deleted.", "delete");
  }
}

// --------------------------------------------------------------------------
// 10. Modal Window Handlers
// --------------------------------------------------------------------------
function openModal() {
  taskModal.style.display = "flex";
  taskTitleInput.value = "";
  taskDescInput.value = "";
  taskCategorySelect.value = "Study";
  taskPrioritySelect.value = "Medium";

  // Reset to today's date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayFormatted = `${year}-${month}-${day}`;
  taskDueDateInput.value = todayFormatted;
  taskDueDateInput.min = todayFormatted;

  taskTitleInput.classList.remove("is-invalid");
  titleError.style.display = "none";

  setTimeout(function () {
    taskTitleInput.focus();
  }, 100);
}

function closeModal() {
  taskModal.style.display = "none";
}

// --------------------------------------------------------------------------
// 11. Toast Notifications
// --------------------------------------------------------------------------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconSvg = "";
  if (type === "success") {
    iconSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;
  } else if (type === "delete") {
    iconSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
  } else {
    iconSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Automatically remove toast element from DOM after animation completes (3 seconds)
  setTimeout(function () {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// --------------------------------------------------------------------------
// 12. Event Listeners Setup
// --------------------------------------------------------------------------
function setupEventListeners() {
  if (loginModeBtn) {
    loginModeBtn.addEventListener("click", function () {
      setAuthMode("login");
    });
  }
  if (registerModeBtn) {
    registerModeBtn.addEventListener("click", function () {
      setAuthMode("register");
    });
  }
  [openLoginBtn, headerLoginBtn].forEach(function (button) {
    if (button) {
      button.addEventListener("click", function () {
        if (!currentStudent) openLoginModal();
      });
    }
  });
  if (closeLoginModalBtn) closeLoginModalBtn.addEventListener("click", closeLoginModal);
  if (cancelLoginBtn) cancelLoginBtn.addEventListener("click", closeLoginModal);
  if (loginModal) {
    loginModal.addEventListener("click", function (event) {
      if (event.target === loginModal) closeLoginModal();
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      loginError.textContent = "";
      loginError.classList.remove("is-visible");
      const isRegistration = authMode === "register";
      try {
        const payload = {
          email: loginEmailInput.value,
          password: loginPasswordInput.value
        };
        if (isRegistration) {
          payload.name = loginNameInput.value;
          payload.course = loginCourseInput.value;
          payload.semester = loginSemesterInput.value;
        }
        const response = await fetch(isRegistration ? "/api/register" : "/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to sign in.");
        applyStudentSession(data.student);
        closeLoginModal();
        showToast(`${isRegistration ? "Account created" : "Welcome back"}, ${data.student.name}!`, "success");
      } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.add("is-visible");
      }
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "same-origin"
        });
        if (!response.ok) throw new Error("Unable to sign out.");
      } catch (error) {
        console.error(error);
        showToast("Unable to sign out. Please try again.", "info");
        return;
      }
      clearStudentSession();
      showToast("Signed out successfully.", "info");
    });
  }
  // Modal Open & Close Triggers
  if (openAddTaskModalBtn) {
    openAddTaskModalBtn.addEventListener("click", openModal);
  }
  if (emptyStateActionBtn) {
    emptyStateActionBtn.addEventListener("click", openModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }
  if (cancelModalBtn) {
    cancelModalBtn.addEventListener("click", closeModal);
  }

  // Close modal when clicking on the dimmed backdrop
  if (taskModal) {
    taskModal.addEventListener("click", function (e) {
      if (e.target === taskModal) {
        closeModal();
      }
    });
  }

  // Close modal with the 'Escape' key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && taskModal.style.display === "flex") {
      closeModal();
    }
    if (e.key === "Escape" && loginModal && loginModal.style.display === "flex") {
      closeLoginModal();
    }
  });

  // Form Submission
  if (taskForm) {
    taskForm.addEventListener("submit", handleAddTaskFormSubmit);
  }

  // Remove validation error on user input
  if (taskTitleInput) {
    taskTitleInput.addEventListener("input", function () {
      if (taskTitleInput.value.trim() !== "") {
        taskTitleInput.classList.remove("is-invalid");
        titleError.style.display = "none";
      }
    });
  }

  // Search Input Filter
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchQuery = searchInput.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery.length > 0 ? "flex" : "none";
      }
      renderTasks();
    });
  }

  // Clear Search Button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", function () {
      searchInput.value = "";
      searchQuery = "";
      clearSearchBtn.style.display = "none";
      searchInput.focus();
      renderTasks();
    });
  }

  // Status Filter Buttons (All, Pending, Completed)
  statusButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      statusButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      currentStatus = button.getAttribute("data-status");
      updateSidebarActiveNav();
      renderTasks();
    });
  });

  // Category Filter Select
  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      currentCategory = categoryFilter.value;
      syncSidebarCategoryPill(currentCategory);
      renderTasks();
    });
  }

  // Task Sorting Select
  if (sortTasksSelect) {
    sortTasksSelect.addEventListener("change", function () {
      currentSort = sortTasksSelect.value;
      renderTasks();
    });
  }

  // Sidebar Category Pills
  catPills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      const selectedCat = pill.getAttribute("data-category");
      currentCategory = selectedCat;
      if (categoryFilter) {
        categoryFilter.value = selectedCat;
      }
      syncSidebarCategoryPill(selectedCat);
      renderTasks();
      closeMobileSidebar();
    });
  });

  // Sidebar Nav Items (Dashboard, My Tasks, Completed Tasks, Categories)
  if (navDashboard) {
    navDashboard.addEventListener("click", function () {
      currentStatus = "all";
      currentCategory = "all";
      searchQuery = "";
      if (searchInput) searchInput.value = "";
      if (clearSearchBtn) clearSearchBtn.style.display = "none";
      if (categoryFilter) categoryFilter.value = "all";
      syncStatusButtons("all");
      syncSidebarCategoryPill("all");
      setActiveNav(navDashboard);
      renderTasks();
      closeMobileSidebar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (navMyTasks) {
    navMyTasks.addEventListener("click", function () {
      currentStatus = "pending";
      syncStatusButtons("pending");
      setActiveNav(navMyTasks);
      renderTasks();
      closeMobileSidebar();
    });
  }

  if (navCompleted) {
    navCompleted.addEventListener("click", function () {
      currentStatus = "completed";
      syncStatusButtons("completed");
      setActiveNav(navCompleted);
      renderTasks();
      closeMobileSidebar();
    });
  }

  if (navCategories) {
    navCategories.addEventListener("click", function () {
      if (sidebarCategorySection) {
        sidebarCategorySection.scrollIntoView({ behavior: "smooth" });
      }
      setActiveNav(navCategories);
    });
  }

  // Mobile Menu Drawer Controls
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", openMobileSidebar);
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", closeMobileSidebar);
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", closeMobileSidebar);
  }
}

// --------------------------------------------------------------------------
// 13. UI Synchronization Helpers
// --------------------------------------------------------------------------
function setActiveNav(activeElement) {
  const allNavs = document.querySelectorAll(".nav-item");
  allNavs.forEach(nav => nav.classList.remove("active"));
  if (activeElement) {
    activeElement.classList.add("active");
  }
}

function updateSidebarActiveNav() {
  if (currentStatus === "all") {
    setActiveNav(navDashboard);
  } else if (currentStatus === "pending") {
    setActiveNav(navMyTasks);
  } else if (currentStatus === "completed") {
    setActiveNav(navCompleted);
  }
}

function syncStatusButtons(status) {
  statusButtons.forEach(function (button) {
    if (button.getAttribute("data-status") === status) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

function syncSidebarCategoryPill(category) {
  catPills.forEach(function (pill) {
    if (pill.getAttribute("data-category") === category) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });
}

// Mobile sidebar drawer toggles
function openMobileSidebar() {
  if (sidebar) sidebar.classList.add("is-open");
  if (sidebarBackdrop) sidebarBackdrop.classList.add("is-active");
  document.body.style.overflow = "hidden";
}

function closeMobileSidebar() {
  if (sidebar) sidebar.classList.remove("is-open");
  if (sidebarBackdrop) sidebarBackdrop.classList.remove("is-active");
  document.body.style.overflow = "";
}

function openLoginModal() {
  if (!loginModal) return;
  loginModal.style.display = "flex";
  loginError.textContent = "";
  loginError.classList.remove("is-visible");
  setTimeout(() => (authMode === "register" ? loginNameInput : loginEmailInput).focus(), 100);
}

function closeLoginModal() {
  if (!loginModal) return;
  loginModal.style.display = "none";
  loginPasswordInput.value = "";
  loginError.textContent = "";
  loginError.classList.remove("is-visible");
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegistration = mode === "register";
  loginModeBtn.classList.toggle("active", !isRegistration);
  registerModeBtn.classList.toggle("active", isRegistration);
  loginModeBtn.setAttribute("aria-pressed", String(!isRegistration));
  registerModeBtn.setAttribute("aria-pressed", String(isRegistration));
  loginModalTitle.textContent = isRegistration ? "Create Student Account" : "Student Sign In";
  registrationFields.style.display = isRegistration ? "block" : "none";
  registrationCourseFields.style.display = isRegistration ? "block" : "none";
  loginNameInput.required = isRegistration;
  loginCourseInput.required = isRegistration;
  loginSemesterInput.required = isRegistration;
  loginPasswordInput.autocomplete = isRegistration ? "new-password" : "current-password";
  loginPasswordInput.placeholder = isRegistration ? "At least 8 characters" : "Enter your password";
  loginSubmitBtn.textContent = isRegistration ? "Create account" : "Sign in";
  loginError.textContent = "";
  loginError.classList.remove("is-visible");
}

function applyStudentSession(student) {
  currentStudent = student;
  const initials = student.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");

  profileInitials.textContent = initials || "ST";
  profileName.textContent = student.name;
  profileRole.textContent = `${student.course} \u2022 ${student.semester}`;
  openLoginBtn.style.display = "none";
  logoutBtn.style.display = "block";
  if (headerLoginBtn) headerLoginBtn.textContent = "Signed in";
  updateGreetingAndDate();
}

function clearStudentSession() {
  currentStudent = null;
  localStorage.removeItem("taskflow_auth_token");
  profileInitials.textContent = "ST";
  profileName.textContent = "Guest Student";
  profileRole.textContent = "Please sign in";
  openLoginBtn.style.display = "block";
  logoutBtn.style.display = "none";
  if (headerLoginBtn) headerLoginBtn.textContent = "Sign in";
  updateGreetingAndDate();
}

async function restoreLoginSession() {
  try {
    const response = await fetch("/api/me", { credentials: "same-origin" });
    if (response.status === 401) return;
    if (!response.ok) throw new Error("Session expired");
    const data = await response.json();
    applyStudentSession(data.student);
  } catch (error) {
    clearStudentSession();
  }
}
