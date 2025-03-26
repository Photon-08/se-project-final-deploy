export default {
  template: `<div class="container mt-4">

  <h3 class="text-center mb-4">Feedback Analysis</h3>

<!-- Sentiment Distribution & Word Cloud Side by Side -->
<div class="row mb-5">
  <!-- Sentiment Distribution -->
  <div class="col-md-6 d-flex flex-column align-items-center">
    <h4>Sentiment Distribution</h4>
    <canvas 
      ref="sentimentChart" 
      class="chart-canvas"
      width="500"
      height="400"
    ></canvas>
  </div>

  <!-- Word Cloud -->
  <div class="col-md-6 d-flex flex-column align-items-center">
    <h4>Word Cloud</h4>
    <canvas 
      id="wordcloud-canvas"
      class="chart-canvas"
      width="500"
      height="400"
    ></canvas>
  </div>
</div>

<!-- CSS -->
<style>
  .chart-canvas {
    display: block;
    width: 100% !important;
    height: auto;
    border: 2px solid #ddd;  /* Restores the border */
    border-radius: 8px;
    background-color: white;
  },
  .wordcloud-canvas {
  border: 2px solid #ddd !important;  /* Adds a border */
  border-radius: 8px !important;      /* Optional: rounded edges */
  background-color: white !important; /* Ensures visibility */
}
</style>


<div class="course-container">

  <h2 class="text-center mb-4">Course Content Management</h2>


  


  <div v-for="week in weeks" :key="\`week-\${week.weekIndex}\`" class="mb-4">
    <h3>Week {{ week.weekIndex }}</h3>

    <!-- Button to manage lectures & assignments -->
    <button @click="toggleDropdown(week.weekIndex)" class="btn btn-outline-primary mb-3">
      Manage Lectures & Assignments for Week {{ week.weekIndex }}
    </button>

    <!-- Dropdown content for lectures & assignments -->
    <div v-if="dropdownOpen === week.weekIndex" class="border p-3">
      <h4>Lectures</h4>
      <div v-for="(lecture, lectureIndex) in week.lectures" :key="\`lecture-\${week.weekIndex}-\${lectureIndex}\`" class="mb-3">
        <span>Lecture {{ week.weekIndex }}.{{ lectureIndex + 1 }}:</span>
        <input v-model="lecture.lecture_url" type="text" class="form-control" placeholder="Enter lecture URL" />
        <button v-if="!lecture.lecture_url.trim()" @click="removeLecture(week.weekIndex, lectureIndex)" class="btn btn-danger mt-2">Remove</button>
      </div>
      <button @click="addLectureToWeek(week.weekIndex)" class="btn btn-outline-warning mt-3">Add Another Lecture</button>

      <h4 class="mt-4">Assignments</h4>
      <div v-for="(assignment, assignmentIndex) in week.assignments" :key="\`assignment-\${week.weekIndex}-\${assignmentIndex}\`
" class="mb-4">
        <p><strong>{{ assignment.title }}</strong></p>
        <input v-model="assignment.description" type="text" class="form-control mb-2" placeholder="Description" />
        <input v-model="assignment.due_date" type="date" class="form-control mb-2" />
        <input v-model="assignment.max_marks" type="number" class="form-control mb-2" placeholder="Max Marks" />
        
        <select v-model="assignment.status" class="form-select mb-3">
          <option value="unpublished">Unpublished</option>
          <option value="published">Published</option>
        </select>

        <h5>Questions</h5>
        <div v-for="(question, qIndex) in assignment.questions" :key="\`question-\${assignmentIndex}-\${qIndex}\`" class="mb-3">
          <input v-model="question.text" type="text" class="form-control mb-2" placeholder="Question" />
          <div v-for="(option, oIndex) in question.options" :key="\`option-\${qIndex}-\${oIndex}\`" class="mb-2">
            <input v-model="question.options[oIndex]" type="text" class="form-control" placeholder="Option" />
          </div>
          <input v-model="question.correct_answer" type="text" class="form-control mb-2" placeholder="Correct Answer" />
          
        </div>
        <button @click="addQuestion(assignment)" class="btn btn-outline-warning mt-3">Add Question</button>
      </div>

      <button @click="addAssignment(week.weekIndex)" class="btn btn-primary mt-3">Add Assignment</button>
    </div>
  </div>

  <!-- Buttons to add new week and submit content -->
  <button @click="addNewWeek" class="btn btn-outline-success mt-3">Add Another Week</button>
  <button @click="submitContent" class="btn btn-success mt-4">Submit</button>

</div>

<style>
  .course-container {
    max-width: 900px;
    margin: auto;
    padding: 20px;
    border-radius: 10px;
    background: #f8f9fa;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }
</style>

  
</div>

  `,

  data() {
    return {
      weeks: [],
      message: "",
      messageType: "",
      dropdownOpen: null,
      course_id: null,
      loading: false,
      feedback: "",
      sentimentData: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      wordCloudData: {},
      chartInstance: null,
      
    };
    
  },

  methods: {
    toggleDropdown(weekIndex) {
      this.dropdownOpen = this.dropdownOpen === weekIndex ? null : weekIndex;
    },
    addLectureToWeek(weekIndex) {
      const week = this.weeks.find(w => w.weekIndex === weekIndex);
      week.lectures.push({ lecture_url: "" });
    },
    removeLecture(weekIndex, lectureIndex) {
      const week = this.weeks.find(w => w.weekIndex === weekIndex);
      week.lectures.splice(lectureIndex, 1);
    },
    addNewWeek() {
      const newWeekIndex = this.weeks.length + 1;
      this.weeks.push({ weekIndex: newWeekIndex, lectures: [], assignments: [] });
    },
    addAssignment(weekIndex) {
      const week = this.weeks.find(w => w.weekIndex === weekIndex);
      const assignmentNumber = week.assignments.length + 1;
      week.assignments.push({
        title: `Graded Assignment ${weekIndex}.${assignmentNumber}`,
        description: "",
        due_date: "",
        max_marks: "",
        status: "unpublished",
        questions: [],
      });
    },
    addQuestion(assignment) {
      assignment.questions.push({
        text: "",
        options: ["", "", "", ""],
        correct_answer: "",
      });
    },
    addOption(question) {
      if (question.options.length < 4) {
        question.options.push("");
      }
    },
    formatDate(dateString) {
      if (!dateString) return '';
      return dateString.split('T')[0];
    },
    async submitContent() {
      // Prepare payload for assignments
      const assignmentsPayload = this.weeks.map(week => {
        return week.assignments.map(assignment => {
          return {
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.due_date,
            max_marks: assignment.max_marks,
            status: assignment.status,
            questions: assignment.questions.map(q => q.text),
            options: assignment.questions.map(q => q.options),
            correct_answers: assignment.questions.map(q => q.correct_answer),
          };
        });
      }).flat();

      // Prepare payload for lectures
      const lecturesPayload = this.weeks.map(week => {
        return week.lectures.map((lecture, index) => {
          return {
            lecture_no: `${week.weekIndex}.${index + 1}`,
            lecture_url: lecture.lecture_url
          };
        });
      }).flat();

      // Send assignments payload
      const assignmentsResponse = await fetch(`/api/instructor_assignment/${this.course_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authentication-Token": localStorage.getItem("auth_token"),
        },
        body: JSON.stringify({ assignments: assignmentsPayload }),
      });

      // Send lectures payload
      const lecturesResponse = await fetch(`/api/course_content/${this.course_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authentication-Token": localStorage.getItem("auth_token"),
        },
        body: JSON.stringify({ content: lecturesPayload }),
      });

      if (assignmentsResponse.ok && lecturesResponse.ok) {
        alert("Course content updated successfully!");
      }
    },

    async get_course_details(course_id) {
      this.loading = true;
      const res = await fetch(`/api/course_content/${course_id}`, {
        headers: { "Authentication-Token": localStorage.getItem("auth_token") },
      });
      const assignmentsRes = await fetch(`/api/instructor_assignment/${course_id}`, {
        headers: { "Authentication-Token": localStorage.getItem("auth_token") },
      });
      this.loading = false;
      const data = await res.json();
      const assignmentsData = await assignmentsRes.json();
      if (res.ok && assignmentsRes.ok) {
        // Create a map to ensure all weeks are included
        const weeksMap = {};
        data.course_content.forEach(week => {
          weeksMap[week.week] = {
            weekIndex: week.week,
            lectures: week.lectures.map(lecture => ({ lecture_url: lecture.lecture_url })),
            assignments: []
          };
        });

        assignmentsData.assignments.forEach(weekData => {
          if (!weeksMap[weekData.week]) {
            weeksMap[weekData.week] = {
              weekIndex: weekData.week,
              lectures: [],
              assignments: []
            };
          }
          weeksMap[weekData.week].assignments = weekData.assignments.map(assignment => ({
            title: assignment.title,
            description: assignment.description,
            due_date: this.formatDate(assignment.due_date),
            max_marks: assignment.max_marks,
            status: assignment.status,
            questions: assignment.questions.map((question, qIndex) => ({
              text: question,
              options: assignment.options[qIndex] || ["", "", "", ""],
              correct_answer: assignment.correct_answers[qIndex] || "",
            })),
          }));
        });

        this.weeks = Object.values(weeksMap).sort((a, b) => a.weekIndex - b.weekIndex);
      } else {
        this.message = data.message || "Error fetching content.";
        this.messageType = "error";
      }
    },



    async submitFeedback() {
      if (!this.feedback.trim()) {
        alert("Please enter feedback before submitting.");
        return;
      }
    
      const response = await fetch(`/api/feedback/${this.course_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authentication-Token": localStorage.getItem("auth_token"),
        },
        body: JSON.stringify({
          student_id: localStorage.getItem("student_id"),
          feedback: this.feedback,
        }),
      });
    
      if (response.ok) {
        alert("Feedback submitted successfully!");
        this.feedback = "";
      } else {
        alert("Failed to submit feedback.");
      }
    },



    async fetchFeedbackAnalysis() {
      try {
        const response = await fetch(`/api/feedback-analytics/${this.course_id}`, {
          headers: { "Authentication-Token": localStorage.getItem("auth_token") }
        });
        const data = await response.json();
        if (data.status === "success") {
          this.sentimentData = data.sentiment_counts;
          this.wordCloudData = data.word_cloud;
          console.log('Word cloud data:', this.wordCloudData);
          this.$nextTick(() => this.renderChart());


          
        const canvas = document.getElementById('wordcloud-canvas');
        
        if (canvas) {
          window.WordCloud(canvas, { list: Object.entries(this.wordCloudData),
          gridSize: 10,
          weightFactor: 20,
          shape: "square" });
        }
        
        
        }
      } catch (error) {
        console.error('Error fetching feedback analysis:', error);
      }
    },
  
    calculateWordSize(count) {
      const maxCount = Math.max(...Object.values(this.wordCloudData));
      return 10 + (count / maxCount) * 30;
    },
  
    renderChart() {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }
  
      const ctx = this.$refs.sentimentChart.getContext('2d');
      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Positive', 'Mixed', 'Negative'],
          datasets: [{
            label: 'Feedback Sentiment',
            data: [this.sentimentData.positive, this.sentimentData.neutral, this.sentimentData.negative],
            backgroundColor: [
              'rgba(75, 192, 87, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(255, 99, 132, 0.6)'
            ],
            borderColor: [
              'rgb(89, 192, 75)',
              'rgba(255, 206, 86, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    }
  },



  

  mounted() {
    const course_id = this.$route.params.course_id;
    if (!course_id) {
      this.message = "Course ID is missing.";
      this.messageType = "error";
      return;
    }
    this.course_id = course_id;
    this.get_course_details(course_id);
    this.fetchFeedbackAnalysis();
  },
};
