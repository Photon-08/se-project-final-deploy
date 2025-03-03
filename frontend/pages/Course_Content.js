export default {
  template: `
    <div class="container mt-4">
      <h2 class="text-center text-primary mb-4">Course Content Management</h2>
      
      <!-- Display Weeks and Lectures -->
      <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="card mb-3 p-3">
        <h3 class="text-secondary">Week {{ weekIndex + 1 }}</h3>
        
        <button class="btn btn-info my-2" @click="toggleDropdown(weekIndex)">
          Manage Lectures for Week {{ weekIndex + 1 }}
        </button>
        
        <div v-if="dropdownOpen === weekIndex" class="mt-2">
          <!-- Lectures in the Week -->
          <div v-for="(lecture, lectureIndex) in week" :key="lectureIndex" class="input-group mb-2">
            <span class="input-group-text">Lecture {{ weekIndex + 1 }}.{{ lectureIndex + 1 }}</span>
            <input v-model="lecture.lecture_url" type="text" class="form-control" placeholder="Enter lecture URL" />
            <button v-if="!lecture.lecture_url.trim()" @click="removeLecture(weekIndex, lectureIndex)" class="btn btn-danger">
              Remove
            </button>
          </div>
          
          <button class="btn btn-success" @click="addLectureToWeek(weekIndex)">
            Add Another Lecture
          </button>
        </div>
      </div>
      
      <!-- Add Week Button -->
      <button class="btn btn-primary mb-3" @click="addNewWeek">Add Another Week</button>
      
      <!-- Submit Button -->
      <div class="text-center">
        <button class="btn btn-success" @click="submitContent">Submit Content</button>
      </div>
      
      <!-- Error/Success Messages -->
      <p v-if="message" class="mt-3 text-center" :class="messageType === 'error' ? 'text-danger' : 'text-success'">
        {{ message }}
      </p>
      
      <!-- Loading Indicator -->
      <div v-if="loading" class="text-center mt-2">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  `,
  
    data() {
      return {
        weeks: [], // Initialize as an empty array, populated with fetched data
        message: "",
        messageType: "",
        dropdownOpen: null, // Track which dropdown is open
        course_id: null, // Will get the course_id from the route params
        loading: false, // For loading indicator
      };
    },
  
    methods: {
      toggleDropdown(weekIndex) {
        this.dropdownOpen = this.dropdownOpen === weekIndex ? null : weekIndex;
      },
  
      addLectureToWeek(weekIndex) {
        this.weeks[weekIndex].push({ lecture_url: "" });
      },
  
      addNewWeek() {
        this.weeks.push([{ lecture_url: "" }]);
      },
  
      removeLecture(weekIndex, lectureIndex) {
        this.weeks[weekIndex].splice(lectureIndex, 1);
      },
  
      async get_course_details(course_id) {
        console.log("Fetching content for course ID:", course_id); // Debug log
        this.loading = true; // Start loading
  
        const res = await fetch(`/api/course_content/${course_id}`, {
          headers: {
            "Authentication-Token": localStorage.getItem("auth_token"),
          },
        });
  
        this.loading = false; // Stop loading
  
        const data = await res.json();
        console.log("Fetched data:", data); // Debug log
  
        if (res.ok) {
          if (data.course_content.length > 0) {
            const groupedContent = data.course_content.map((week) => {
              return {
                weekNumber: week.week,
                lectures: week.lectures.map((lecture) => ({
                  lecture_no: lecture.lecture_no,
                  lecture_url: lecture.lecture_url,
                })),
              };
            });
  
            this.weeks = groupedContent.map((week) =>
              week.lectures.map((lecture) => ({
                lecture_url: lecture.lecture_url,
              }))
            );
          } else {
            this.weeks = [[{ lecture_url: "" }]]; // Initialize if no content
          }
        } else {
          this.message = data.message || "An error occurred while fetching course content.";
          this.messageType = "error";
        }
      },
  
      async submitContent() {
        this.message = ""; // Clear previous messages
        this.messageType = "";
  
        const payload = [];
  
        this.weeks.forEach((week, weekIndex) => {
          week.forEach((lecture, lectureIndex) => {
            payload.push({
              lecture_no: `${weekIndex + 1}.${lectureIndex + 1}`,
              lecture_url: lecture.lecture_url,
            });
          });
        });
  
        if (payload.some((lecture) => !lecture.lecture_url.trim())) {
          this.message = "Please ensure all lecture URLs are filled.";
          this.messageType = "error";
          return;
        }
  
        this.loading = true; // Start loading
  
        const res = await fetch(`/api/course_content/${this.course_id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authentication-Token": localStorage.getItem("auth_token"),
          },
          body: JSON.stringify({ content: payload }),
        });
  
        this.loading = false; // Stop loading
  
        const data = await res.json();
        if (res.ok) {
          this.message = data.message || "Content updated successfully!";
          this.messageType = "success";
        } else {
          this.message = data.message || "An error occurred.";
          this.messageType = "error";
        }
      },
    },
  
    mounted() {
      const course_id = this.$route.params.course_id; // Get the course ID from the route parameters
      if (!course_id) {
        this.message = "Course ID is missing.";
        this.messageType = "error";
        return;
      }
      this.course_id = course_id;
      this.get_course_details(course_id); // Fetch the course details using the course ID
    },
  };
  