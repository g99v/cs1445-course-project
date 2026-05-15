class ApiClient {
    async getMeta() {
        const response = await fetch('/tasks/meta');
        return response.json();
    }

    async getTasks() {
        const response = await fetch('/tasks');
        return response.json();
    }

    async createTask(taskData) {
        const response = await fetch('/tasks/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        return response.json();
    }

    async updateTask(taskData) {
        const response = await fetch('/tasks/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        return response.json();
    }

    async deleteTask(taskId) {
        const response = await fetch('/tasks/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId })
        });
        return response.json();
    }
}

class TaskManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.form = document.getElementById('taskForm');
        this.taskIdInput = document.getElementById('taskId');
        this.courseIdInput = document.getElementById('courseId');
        this.titleInput = document.getElementById('title');
        this.descriptionInput = document.getElementById('description');
        this.dueDateInput = document.getElementById('dueDate');
        this.priorityInput = document.getElementById('priority');
        this.statusInput = document.getElementById('status');
        this.estimatedHoursInput = document.getElementById('estimatedHours');
        this.resetBtn = document.getElementById('resetBtn');
        this.tasksContainer = document.getElementById('tasksContainer');
        this.messageBox = document.getElementById('messageBox');

        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        this.form.addEventListener('submit', (event) => this.handleSubmit(event));
        this.resetBtn.addEventListener('click', () => this.resetForm());
        this.tasksContainer.addEventListener('click', (event) => this.handleCardActions(event));
    }

    async initialize() {
        await this.loadCourses();
        await this.loadTasks();
    }

    async loadCourses() {
        const data = await this.apiClient.getMeta();
        const courses = data.courses || [];

        if (!courses.length) {
            this.courseIdInput.innerHTML = '<option value="">Add a course first</option>';
            return;
        }

        this.courseIdInput.innerHTML = courses
            .map((course) => `<option value="${course._id}">${course.code} - ${course.title}</option>`)
            .join('');
    }

    async loadTasks() {
        const tasks = await this.apiClient.getTasks();
        this.renderTasks(tasks);
    }

    async handleSubmit(event) {
        event.preventDefault();

        const taskData = {
            taskId: this.taskIdInput.value,
            courseId: this.courseIdInput.value,
            title: this.titleInput.value.trim(),
            description: this.descriptionInput.value.trim(),
            dueDate: this.dueDateInput.value,
            priority: this.priorityInput.value,
            status: this.statusInput.value,
            estimatedHours: Number(this.estimatedHoursInput.value)
        };

        let result;

        if (taskData.taskId) {
            result = await this.apiClient.updateTask(taskData);
            this.showMessage(result.message || 'Task updated.', 'warning');
        } else {
            result = await this.apiClient.createTask(taskData);
            this.showMessage(result.message || 'Task created.', 'success');
        }

        this.resetForm();
        await this.loadTasks();
        document.dispatchEvent(new CustomEvent('task:changed'));
    }

    async handleCardActions(event) {
        const editButton = event.target.closest('[data-action="edit"]');
        const deleteButton = event.target.closest('[data-action="delete"]');

        if (editButton) {
            const task = JSON.parse(editButton.dataset.task);
            this.fillForm(task);
        }

        if (deleteButton) {
            const taskId = deleteButton.dataset.id;
            const confirmed = window.confirm('Delete this task?');

            if (!confirmed) return;

            const result = await this.apiClient.deleteTask(taskId);
            this.showMessage(result.message || 'Task deleted.', 'danger');
            await this.loadTasks();
            document.dispatchEvent(new CustomEvent('task:changed'));
        }
    }

    fillForm(task) {
        this.taskIdInput.value = task._id;
        this.courseIdInput.value = task.courseId?._id || task.courseId;
        this.titleInput.value = task.title;
        this.descriptionInput.value = task.description || '';
        this.dueDateInput.value = new Date(task.dueDate).toISOString().split('T')[0];
        this.priorityInput.value = task.priority;
        this.statusInput.value = task.status;
        this.estimatedHoursInput.value = task.estimatedHours || 1;
    }

    resetForm() {
        this.form.reset();
        this.taskIdInput.value = '';
        this.priorityInput.value = 'Medium';
        this.statusInput.value = 'Pending';
        this.estimatedHoursInput.value = 1;
    }

    renderTasks(tasks) {
        if (!tasks.length) {
            this.tasksContainer.innerHTML = `
      <div class="col-12">
        <div class="empty-state">No tasks added yet.</div>
      </div>
    `;
            return;
        }

        this.tasksContainer.innerHTML = tasks
            .map((task) => `
      <div class="col-md-6 col-lg-4">
        <article class="task-card card" style="--course-color: ${task.courseId?.color || '#0d6efd'};">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-dark">${task.urgencyBucket}</span>

              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  data-action="edit"
                  data-task='${JSON.stringify(task).replace(/'/g, "&apos;")}'
                >
                  Edit
                </button>

                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  data-action="delete"
                  data-id="${task._id}"
                >
                  Delete
                </button>
              </div>
            </div>

            <h3 class="h5">${task.title}</h3>

            <p class="task-course d-flex align-items-center gap-2">
              <span class="course-dot" style="--course-color: ${task.courseId?.color || '#0d6efd'};"></span>
              ${task.courseId?.code || 'No course'}
            </p>

            <p class="task-description clamp-2">
              ${task.description || 'No description provided.'}
            </p>

            <ul class="meta-list small">
              <li><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</li>
              <li><strong>Priority:</strong> ${task.priority}</li>
              <li><strong>Status:</strong> ${task.status}</li>
              <li><strong>Hours:</strong> ${task.estimatedHours}</li>
            </ul>
          </div>
        </article>
      </div>
    `)
            .join('');
    }

    showMessage(message, type) {
        this.messageBox.innerHTML = `
      <div class="alert alert-${type}" role="alert">${message}</div>
    `;

        setTimeout(() => {
            this.messageBox.innerHTML = '';
        }, 2500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const apiClient = new ApiClient();
    new TaskManager(apiClient);
});