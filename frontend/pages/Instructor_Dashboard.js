export default {
  template: `
  <div class="container mt-4">
      <h2 class="mb-3 text-secondary fw-bold">Current Assigned Courses</h2>
  
      <!-- Courses Section -->
      <div class="d-flex flex-wrap gap-3 px-3">
          <div v-for="course in assigned_course" :key="course.course_id" 
               @click="openCourseContent(course.course_id)" 
               class="card shadow-sm p-3 border-0 rounded cursor-pointer" 
               style="width: 220px; transition: transform 0.2s; cursor: pointer;"
               @mouseover="e => e.currentTarget.style.transform='scale(1.05)'"
               @mouseleave="e => e.currentTarget.style.transform='scale(1)'">
               
              <!-- Course Image -->
              <img :src="course.image || '/static/assets/card-03.jpeg'" class="card-img-top rounded" alt="Course Image" style="height: 140px; object-fit: cover;">
              
              <!-- Course Details -->
              <div class="mt-2">
                  <h5 class="text-dark fw-bold mb-2">{{ course.course_name }}</h5>
                  <p class="text-secondary">Credits: {{ course.credits }}</p>
              </div>
          </div>
      </div>
  </div>
  `,

  data() {
    return {
      assigned_course: [],
      auth_token: localStorage.getItem("auth_token"),
    };
  },

  methods: {
    openCourseContent(course_id) {
      if (course_id) {
        window.location.hash = `#/course_content/${course_id}`;
      } else {
        console.error("Course ID is undefined");
      }
    },

    async getAssignedCourses() {
      const res = await fetch('/api/instructor_assigned_course', {
        method: 'GET',
        headers: {
          "Authentication-Token": this.auth_token,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        this.assigned_course = data;
      } else {
        alert(data.message);
      }
    },
  },

  async mounted() {
    await this.getAssignedCourses();
  },
};
