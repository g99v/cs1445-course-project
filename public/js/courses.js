class ApiClient {
    async getCourses() {
        const response = await fetch('/courses');
        return response.json();
    }

    async createCourse(courseData) {
        const response = await fetch('/courses/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseData)
        });
        return response.json();
    }

    async updateCourse(courseData) {
        const response = await fetch('/courses/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseData)
        });
        return response.json();
    }

    async deleteCourse(courseId) {
        const response = await fetch('/courses/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId })
        });
        return response.json();
    }
}

class CourseManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.form = document.getElementById('courseForm');
        this.courseIdInput = document.getElementById('courseId');
        this.titleInput = document.getElementById('title');
        this.codeInput = document.getElementById('code');
        this.semesterInput = document.getElementById('semester');
        this.colorInput = document.getElementById('color');
        this.resetBtn = document.getElementById('resetBtn');
        this.coursesContainer = document.getElementById('coursesContainer');
        this.messageBox = document.getElementById('messageBox');

        this.bindEvents();
        this.loadCourses();
    }

    bindEvents() {
        this.form.addEventListener('submit', (event) => this.handleSubmit(event));
        this.resetBtn.addEventListener('click', () => this.resetForm());
        this.coursesContainer.addEventListener('click', (event) => this.handleCardActions(event));
    }

    async loadCourses() {
        const courses = await this.apiClient.getCourses();
        this.renderCourses(courses);
    }

    async handleSubmit(event) {
        event.preventDefault();

        const courseData = {
            courseId: this.courseIdInput.value,
            title: this.titleInput.value.trim(),
            code: this.codeInput.value.trim(),
            semester: this.semesterInput.value.trim(),
            color: this.colorInput.value
        };

        let result;

        if (courseData.courseId) {
            result = await this.apiClient.updateCourse(courseData);
            this.showMessage(result.message || 'Course updated.', 'warning');
        } else {
            result = await this.apiClient.createCourse(courseData);
            this.showMessage(result.message || 'Course created.', 'success');
        }

        this.resetForm();
        this.loadCourses();
    }

    async handleCardActions(event) {
        const editButton = event.target.closest('[data-action="edit"]');
        const deleteButton = event.target.closest('[data-action="delete"]');

        if (editButton) {
            const course = JSON.parse(editButton.dataset.course);
            this.fillForm(course);
        }

        if (deleteButton) {
            const courseId = deleteButton.dataset.id;
            const confirmed = window.confirm('Are you sure you want to delete this course?');

            if (!confirmed) return;

            const result = await this.apiClient.deleteCourse(courseId);
            this.showMessage(result.message || 'Course deleted.', 'danger');
            this.loadCourses();
        }
    }

    fillForm(course) {
        this.courseIdInput.value = course._id;
        this.titleInput.value = course.title;
        this.codeInput.value = course.code;
        this.semesterInput.value = course.semester || '';
        this.colorInput.value = course.color || '#0d6efd';
    }

    resetForm() {
        this.form.reset();
        this.courseIdInput.value = '';
        this.colorInput.value = '#0d6efd';
        this.semesterInput.value = '2nd Semester, 2026';
    }

    renderCourses(courses) {
        if (!courses.length) {
            this.coursesContainer.innerHTML = `
      <div class="col-12">
        <div class="empty-state">No courses added yet.</div>
      </div>
    `;
            return;
        }

        this.coursesContainer.innerHTML = courses
            .map(
                (course) => `
        <div class="col-md-6 col-lg-4">
          <article class="course-card card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="course-badge" style="--course-color: ${course.color};">
                  ${course.code}
                </span>

                <div class="card-actions">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    data-action="edit"
                    data-course='${JSON.stringify(course).replace(/'/g, "&apos;")}'
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-action="delete"
                    data-id="${course._id}"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <h4 class="h5 course-title">${course.title}</h4>
              <p class="course-semester">${course.semester || 'No semester specified'}</p>
            </div>
          </article>
        </div>
      `
            )
            .join('');
    }

    showMessage(message, type) {
        this.messageBox.innerHTML = `
      <div class="alert alert-${type}" role="alert">
        ${message}
      </div>
    `;

        setTimeout(() => {
            this.messageBox.innerHTML = '';
        }, 2500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const apiClient = new ApiClient();
    new CourseManager(apiClient);
});