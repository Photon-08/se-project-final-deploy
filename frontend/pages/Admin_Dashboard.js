export default {
  template: `
<div class="container mt-4">
  <h2 class="mb-3 text-primary fw-bold">Admin Course Management</h2>

  <!-- Add Course Form -->
  <div class="card p-4 mb-4 shadow-sm">
    <h5 class="fw-bold text-dark mb-3">Add New Course</h5>
    <form @submit.prevent="addCourse">
      <div class="mb-3">
        <label class="form-label">Course Name</label>
        <input v-model="newCourse.course_name" type="text" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Credits</label>
        <input v-model="newCourse.credits" type="number" class="form-control" required />
      </div>
      <button type="submit" class="btn btn-primary">Add Course</button>
    </form>
  </div>

  <!-- Courses List -->
  <h5 class="fw-bold text-dark mb-3">Courses List</h5>
  <div class="d-flex flex-wrap gap-3 px-3">
    <div v-for="course in courses" :key="course.id" 
         class="card shadow-sm p-3 border-0 rounded cursor-pointer" 
         style="width: 250px; transition: transform 0.2s;" 
         @mouseover="e => e.currentTarget.style.transform='scale(1.05)'" 
         @mouseleave="e => e.currentTarget.style.transform='scale(1)'">
      
      <!-- Course Image -->
      <img :src="course.image || '/static/assets/card-03.jpeg'" 
           class="card-img-top rounded" alt="Course Image" 
           style="height: 140px; object-fit: cover;">

      <!-- Course Details -->
      <div class="mt-2">
        <h5 class="text-dark fw-bold mb-2">{{ course.course_name }}</h5>
        <p class="text-secondary mb-1">Credits: {{ course.credits }}</p>
        <p class="text-secondary">Instructor ID: {{ course.instructor_id || 'Not Assigned' }}</p>
      </div>

      <!-- Edit Button -->
      <button class="btn btn-sm btn-outline-primary mt-2" @click="openEditModal(course)">Edit</button>
    </div>
  </div>

  <!-- Edit Course Modal -->
  <div v-if="editModal" class="modal fade show d-block" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">Edit Course</h5>
          <button type="button" class="btn-close" @click="closeEditModal"></button>
        </div>
        <div class="modal-body">
          <label class="form-label">Course Name</label>
          <input v-model="editCourse.course_name" type="text" class="form-control" required />

          <label class="form-label mt-2">Credits</label>
          <input v-model="editCourse.credits" type="number" class="form-control" required />

          <label class="form-label mt-2">Instructor ID</label>
          <input v-model="editCourse.instructor_id" type="number" class="form-control" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeEditModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="updateCourse">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</div>
  `,

  data() {
    return {
      courses: [],
      newCourse: { course_name: '', credits: '' },
      editCourse: { id: '', course_name: '', credits: '', instructor_id: '' },
      auth_token: localStorage.getItem("auth_token"),
      editModal: false,
    };
  },

  methods: {
    // fetch all courses
    async getCourses() {
      const res = await fetch('/api/admin_course', {
        method: 'GET',
        headers: {
          "Authentication-Token": this.auth_token,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok) {
        this.courses = data;
      } else {
        alert(data.message);
      }
    },

    // add a new course
    async addCourse() {
      const res = await fetch('/api/admin_course', {
        method: 'POST',
        headers: {
          "Authentication-Token": this.auth_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.newCourse),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Course added successfully!");
        this.getCourses();
        this.newCourse.course_name = "";
        this.newCourse.credits = "";
      } else {
        alert(data.message);
      }
    },

    // open, edit and populate data
    openEditModal(course) {
      this.editCourse = { ...course };
      this.editModal = true;
    },

    // close edit modal
    closeEditModal() {
      this.editModal = false;
      this.editCourse = { id: '', course_name: '', credits: '', instructor_id: '' };
    },

    // update course details
    async updateCourse() {
      const res = await fetch('/api/admin_course', {
        method: 'PUT',
        headers: {
          "Authentication-Token": this.auth_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.editCourse),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Course updated successfully!");
        this.getCourses();
        this.closeEditModal();
      } else {
        alert(data.message);
      }
    },
  },

  async mounted() {
    await this.getCourses();
  },
};

