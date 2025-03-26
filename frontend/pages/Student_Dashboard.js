export default {
  template: `
    <div class="container mt-4">
      <div class="d-flex flex-wrap gap-3 px-3">
        <div class="d-flex flex-wrap gap-3 flex-grow-1">
          <!-- Course Tiles -->
          <div
            v-for="course in my_courses"
            :key="course.course_id"
            @click="openCourseDetails(course.course_id)"
            class="card shadow-sm border-0 rounded cursor-pointer"
            style="width: 250px; transition: transform 0.2s;"
            @mouseover="e => e.currentTarget.style.transform = 'scale(1.05)'"
            @mouseleave="e => e.currentTarget.style.transform = 'scale(1)'"
          >
            <img src="/static/assets/card-03.jpeg" class="card-img-top" alt="Course Image" style="height: 150px; object-fit: cover;">
            <div class="card-body p-3">
              <h5 class="card-title text-dark fw-bold mb-2">{{ course.course_name }}</h5>
              <p class="card-text text-secondary mb-1">Credits: {{ course.credits }}</p>
              <p class="card-text text-secondary">Term: {{ course.term }}</p>
            </div>
          </div>

          <!-- Feedback Tile -->
          <div
            class="card shadow-sm border-0 rounded text-center d-flex flex-column align-items-center justify-content-center"
            style="width: 250px; height: 230px; transition: transform 0.2s; cursor: pointer;"
            @mouseover="e => e.currentTarget.style.transform = 'scale(1.05)'"
            @mouseleave="e => e.currentTarget.style.transform = 'scale(1)'"
            @click="openFeedbackModal"
          >
            <i class="bi bi-chat-left-text" style="font-size: 2rem; color: #007bff;"></i>
            <h5 class="mt-2">Give Feedback</h5>
          </div>
        </div>
      </div>

      <!-- Feedback Modal -->
      <div v-if="feedbackModalOpen" class="modal fade show" style="display: block;">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Submit Feedback</h5>
              <button type="button" class="btn-close" @click="closeFeedbackModal"></button>
            </div>
            <div class="modal-body">
              <label for="feedbackCourse" class="form-label">Select Course:</label>
              <select v-model="selectedCourse" class="form-select">
                <option v-for="course in my_courses" :value="course.course_id">{{ course.course_name }}</option>
              </select>

              <label for="feedbackText" class="form-label mt-3">Your Feedback:</label>
              <textarea v-model="feedbackText" class="form-control" rows="3" placeholder="Write your feedback here"></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeFeedbackModal">Close</button>
              <button type="button" class="btn btn-primary" @click="submitFeedback">Submit</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Overlay -->
      <div v-if="feedbackModalOpen" class="modal-backdrop fade show"></div>
    </div>
  `,
  data() {
      return {
          my_courses: [],
          auth_token: localStorage.getItem("auth_token"),
          feedbackModalOpen: false,
          selectedCourse: null,
          feedbackText: '',
      };
  },
  methods: {
      async get_usercourses() {
          const res = await fetch('/api/user_course', {
              method: 'GET',
              headers: {
                  "Authentication-Token": this.auth_token,
                  'Content-Type': 'application/json',
              },
          });
          const data = await res.json();
          if (res.ok) {
              this.my_courses = data;
          } else {
              alert(data.message);
          }
      },

      openCourseDetails(course_id) {
          window.open(`#/course_details/${course_id}`, "_blank");
      },

      openFeedbackModal() {
          this.feedbackModalOpen = true;
          this.selectedCourse = this.my_courses.length ? this.my_courses[0].course_id : null;
          this.feedbackText = '';
      },

      closeFeedbackModal() {
          this.feedbackModalOpen = false;
      },

      async submitFeedback() {
          if (!this.selectedCourse || !this.feedbackText.trim()) {
              alert("Please select a course and write feedback before submitting.");
              return;
          }

          const res = await fetch(`api/feedback/${this.selectedCourse}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authentication-Token': this.auth_token,
              },
              body: JSON.stringify({
                  student_id: 'current_student_id',  // Replace with actual student ID
                  feedback: this.feedbackText.trim(),
              }),
          });

          const data = await res.json();
          if (res.ok) {
              alert(data.message);
              this.closeFeedbackModal();
          } else {
              alert(data.message);
          }
      },
  },
  async mounted() {
      await this.get_usercourses();
  },
};
