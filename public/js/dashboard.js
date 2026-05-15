class DashboardApiClient {
    async getDashboardData() {
        const response = await fetch('/tasks/dashboard-data');
        return response.json();
    }

    async getLectures() {
        const response = await fetch('/schedule/lectures');
        return response.json();
    }
}

class DashboardManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.summaryCards = document.getElementById('summaryCards');
        this.dashboardColumns = document.getElementById('dashboardColumns');
        this.schedulePreview = document.getElementById('dashboardSchedulePreview');
        this.sections = ['Today', 'Soon', 'Overdue', 'Completed'];
        this.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

        this.load();
        document.addEventListener('task:changed', () => this.load());
    }

    async load() {
        const [taskData, lectures] = await Promise.all([
            this.apiClient.getDashboardData(),
            this.apiClient.getLectures()
        ]);

        this.renderSummary(taskData);
        this.renderColumns(taskData);
        this.renderSchedulePreview(lectures);
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

    renderSchedulePreview(lectures) {
        if (!this.schedulePreview) return;

        if (!lectures.length) {
            this.schedulePreview.innerHTML = `<div class="empty-state">No lectures added yet.</div>`;
            return;
        }

        const dayStart = '07:00';
        const dayEnd = '23:00';
        const pxPerMinute = 1.2;

        const startMinutes = this.timeToMinutes(dayStart);
        const endMinutes = this.timeToMinutes(dayEnd);
        const boardHeight = (endMinutes - startMinutes) * pxPerMinute;

        const hours = [];
        for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
            hours.push(minutes);
        }

        this.schedulePreview.innerHTML = `
    <div class="schedule-board dashboard-schedule-board">
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
          <div class="schedule-day-column dashboard-day-column" style="height:${boardHeight}px;">
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
                  class="schedule-event dashboard-schedule-event"
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
    }
    renderSummary(data) {
        this.summaryCards.innerHTML = this.sections
            .map(
                (section) => `
          <div class="col-md-3">
            <article class="summary-card card h-100">
              <div class="card-body">
                <h3 class="h6 text-muted mb-2">${section}</h3>
                <p class="summary-number">${data[section]?.length || 0}</p>
              </div>
            </article>
          </div>
        `
            )
            .join('');
    }

    renderColumns(data) {
        this.dashboardColumns.innerHTML = this.sections
            .map((section) => {
                const tasks = data[section] || [];

                return `
          <div class="col-lg-3 col-md-6">
            <section class="board-card card h-100">
              <div class="card-body">
                <h3 class="h5 board-section-title">${section}</h3>
                ${tasks.length
                        ? tasks
                            .map(
                                (task) => `
                            <article class="board-task">
                              <strong>${task.title}</strong>
                              <div class="small text-muted">${task.courseId?.code || 'No course'}</div>
                              <div class="small">Due: ${new Date(task.dueDate).toLocaleDateString()}</div>
                              <div class="small">Status: ${task.status}</div>
                            </article>
                          `
                            )
                            .join('')
                        : '<p class="text-muted mb-0">No tasks here.</p>'
                    }
              </div>
            </section>
          </div>
        `;
            })
            .join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const apiClient = new DashboardApiClient();
    new DashboardManager(apiClient);
});