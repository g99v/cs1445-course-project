class ScheduleApiClient {
    async getMeta() {
        const response = await fetch('/schedule/meta');
        return response.json();
    }

    async getLectures() {
        const response = await fetch('/schedule/lectures');
        return response.json();
    }

    async createLecture(data) {
        const response = await fetch('/schedule/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async updateLecture(data) {
        const response = await fetch('/schedule/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async deleteLecture(lectureId) {
        const response = await fetch('/schedule/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lectureId })
        });
        return response.json();
    }
}

class ScheduleManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

        this.form = document.getElementById('lectureForm');
        this.lectureIdInput = document.getElementById('lectureId');
        this.courseIdInput = document.getElementById('courseId');
        this.dayInput = document.getElementById('dayOfWeek');
        this.typeInput = document.getElementById('type');
        this.startTimeInput = document.getElementById('startTime');
        this.endTimeInput = document.getElementById('endTime');
        this.roomInput = document.getElementById('room');
        this.instructorInput = document.getElementById('instructor');
        this.resetBtn = document.getElementById('resetBtn');
        this.messageBox = document.getElementById('messageBox');
        this.scheduleGrid = document.getElementById('scheduleGrid');
        this.lectureList = document.getElementById('lectureList');

        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        this.form.addEventListener('submit', (event) => this.handleSubmit(event));
        this.resetBtn.addEventListener('click', () => this.resetForm());
        this.lectureList.addEventListener('click', (event) => this.handleListActions(event));
    }

    async initialize() {
        await this.loadCourses();
        await this.loadLectures();
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

    async loadLectures() {
        const lectures = await this.apiClient.getLectures();
        this.renderGrid(lectures);
        this.renderLectureList(lectures);
    }

    async handleSubmit(event) {
        event.preventDefault();

        const payload = {
            lectureId: this.lectureIdInput.value,
            courseId: this.courseIdInput.value,
            dayOfWeek: this.dayInput.value,
            type: this.typeInput.value,
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value,
            room: this.roomInput.value.trim(),
            instructor: this.instructorInput.value.trim()
        };

        let result;

        if (payload.lectureId) {
            result = await this.apiClient.updateLecture(payload);
            this.showMessage(result.message || 'Lecture updated.', result.message?.includes('conflict') ? 'danger' : 'warning');
        } else {
            result = await this.apiClient.createLecture(payload);
            this.showMessage(result.message || 'Lecture created.', result.message?.includes('conflict') ? 'danger' : 'success');
        }

        if (!result.message || !result.message.toLowerCase().includes('failed')) {
            if (!result.message?.toLowerCase().includes('conflict') && !result.message?.toLowerCase().includes('required') && !result.message?.toLowerCase().includes('after')) {
                this.resetForm();
                await this.loadLectures();
            }
        }
    }

    async handleListActions(event) {
        const editButton = event.target.closest('[data-action="edit"]');
        const deleteButton = event.target.closest('[data-action="delete"]');

        if (editButton) {
            const lecture = JSON.parse(editButton.dataset.lecture);
            this.fillForm(lecture);
        }

        if (deleteButton) {
            const lectureId = deleteButton.dataset.id;
            const confirmed = window.confirm('Delete this lecture?');

            if (!confirmed) return;

            const result = await this.apiClient.deleteLecture(lectureId);
            this.showMessage(result.message || 'Lecture deleted.', 'danger');
            await this.loadLectures();
        }
    }

    fillForm(lecture) {
        this.lectureIdInput.value = lecture._id;
        this.courseIdInput.value = lecture.courseId?._id || lecture.courseId;
        this.dayInput.value = lecture.dayOfWeek;
        this.typeInput.value = lecture.type;
        this.startTimeInput.value = lecture.startTime;
        this.endTimeInput.value = lecture.endTime;
        this.roomInput.value = lecture.room || '';
        this.instructorInput.value = lecture.instructor || '';
    }

    resetForm() {
        this.form.reset();
        this.lectureIdInput.value = '';
        this.typeInput.value = 'Lecture';
        this.dayInput.value = 'Sunday';
    }

    renderGrid(lectures) {
        const dayStart = '07:00';
        const dayEnd = '23:00';
        const pxPerMinute = 1.2;

        const startMinutes = this.timeToMinutes(dayStart);
        const endMinutes = this.timeToMinutes(dayEnd);
        const totalMinutes = endMinutes - startMinutes;
        const boardHeight = totalMinutes * pxPerMinute;

        const hours = [];
        for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
            hours.push(minutes);
        }

        const boardHtml = `
    <div class="schedule-board">
      <div class="schedule-corner">Time</div>
      ${this.days.map((day) => `<div class="schedule-day-header">${day}</div>`).join('')}

      <div class="schedule-time-column" style="height:${boardHeight}px;">
        ${hours.map((minutes) => {
            const top = (minutes - startMinutes) * pxPerMinute;
            return `
            <div class="schedule-time-label" style="top:${top}px;">
              ${this.minutesToTime(minutes)}
            </div>
          `;
        }).join('')}
      </div>

      ${this.days.map((day) => {
            const dayLectures = lectures.filter((lecture) => lecture.dayOfWeek === day);

            return `
          <div class="schedule-day-column" style="height:${boardHeight}px;">
            ${hours.map((minutes) => {
                const top = (minutes - startMinutes) * pxPerMinute;
                return `<div class="schedule-hour-line" style="top:${top}px;"></div>`;
            }).join('')}

            ${dayLectures.map((lecture) => {
                const lectureStart = this.timeToMinutes(lecture.startTime);
                const lectureEnd = this.timeToMinutes(lecture.endTime);

                const top = (lectureStart - startMinutes) * pxPerMinute;
                const height = Math.max((lectureEnd - lectureStart) * pxPerMinute, 44);

                return `
                <article
                  class="schedule-event"
                  style="
                    --course-color: ${lecture.courseId?.color || '#0d6efd'};
                    top: ${top}px;
                    height: ${height}px;
                  "
                >
                  <strong>${lecture.courseId?.code || 'Course'}</strong>
                  <div class="schedule-event-meta">${lecture.type}</div>
                  <div class="schedule-event-meta">${lecture.startTime} - ${lecture.endTime}</div>
                  <div class="schedule-event-meta schedule-event-small">${lecture.room || 'No room'}</div>
                </article>
              `;
            }).join('')}
          </div>
        `;
        }).join('')}
    </div>
  `;

        this.scheduleGrid.innerHTML = boardHtml;
    }
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    minutesToTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    renderLectureList(lectures) {
        if (!lectures.length) {
            this.lectureList.innerHTML = `
        <div class="col-12">
          <div class="empty-state">No lectures added yet.</div>
        </div>
      `;
            return;
        }

        this.lectureList.innerHTML = lectures
            .map((lecture) => `
        <div class="col-md-6 col-lg-4">
          <article class="card lecture-card h-100" style="--course-color: ${lecture.courseId?.color || '#0d6efd'};">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="course-badge" style="--course-color: ${lecture.courseId?.color || '#0d6efd'};">
                  ${lecture.courseId?.code || 'Course'}
                </span>

                <div class="card-actions">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    data-action="edit"
                    data-lecture='${JSON.stringify(lecture).replace(/'/g, "&apos;")}'
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-action="delete"
                    data-id="${lecture._id}"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <h3 class="h5 mb-2">${lecture.courseId?.title || 'Untitled Course'}</h3>
              <ul class="meta-list small">
                <li><strong>Day:</strong> ${lecture.dayOfWeek}</li>
                <li><strong>Time:</strong> ${lecture.startTime} - ${lecture.endTime}</li>
                <li><strong>Type:</strong> ${lecture.type}</li>
                <li><strong>Room:</strong> ${lecture.room || 'Not set'}</li>
                <li><strong>Instructor:</strong> ${lecture.instructor || 'Not set'}</li>
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
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const apiClient = new ScheduleApiClient();
    new ScheduleManager(apiClient);
});