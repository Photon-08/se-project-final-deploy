export default {
    template: `
      <div class="container mt-4">
        <div class="d-flex flex-wrap gap-3 px-3">
          <div class="d-flex flex-wrap gap-3 flex-grow-1">
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
          </div>
        </div>
      </div>
    `,
    data() {
        return {
            my_courses: [],  
            auth_token: localStorage.getItem("auth_token"),
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
        }
    },
    async mounted() {
        await this.get_usercourses(); 
    },
};
