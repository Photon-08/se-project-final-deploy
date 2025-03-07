export default {
  template: `
    <div>
      <h2>Course Content Management</h2>
      <div v-for="week in weeks" :key="\`week-\${week.weekIndex}\`">
        <h3>Week {{ week.weekIndex }}</h3>
        <button @click="toggleDropdown(week.weekIndex)">
          Manage Lectures & Assignments for Week {{ week.weekIndex }}
        </button>
        <div v-if="dropdownOpen === week.weekIndex">
          <h4>Lectures</h4>
          <div v-for="(lecture, lectureIndex) in week.lectures" :key="\`lecture-\${week.weekIndex}-\${lectureIndex}\`">
            <span>Lecture {{ week.weekIndex }}.{{ lectureIndex + 1 }}:</span>
            <input v-model="lecture.lecture_url" type="text" placeholder="Enter lecture URL" />
            <button v-if="!lecture.lecture_url.trim()" @click="removeLecture(week.weekIndex, lectureIndex)">Remove</button>
          </div>
          <button @click="addLectureToWeek(week.weekIndex)">Add Another Lecture</button>
          <h4>Assignments</h4>
          <div v-for="(assignment, assignmentIndex) in week.assignments" :key="\`assignment-\${week.weekIndex}-\${assignmentIndex}\`">
            <p>{{ assignment.title }}</p>
            <input v-model="assignment.description" type="text" placeholder="Description" />
            <input v-model="assignment.due_date" type="date" />
            <input v-model="assignment.max_marks" type="number" placeholder="Max Marks" />
            <select v-model="assignment.status">
              <option value="unpublished">Unpublished</option>
              <option value="published">Published</option>
            </select>
            <h5>Questions</h5>
            <div v-for="(question, qIndex) in assignment.questions" :key="\`question-\${assignmentIndex}-\${qIndex}\`">
              <input v-model="question.text" type="text" placeholder="Question" />
              <div v-for="(option, oIndex) in question.options" :key="\`option-\${qIndex}-\${oIndex}\`">
                <input v-model="question.options[oIndex]" type="text" placeholder="Option" />
              </div>
              <input v-model="question.correct_answer" type="text" placeholder="Correct Answer" />
              <button @click="addOption(question)">Add Option</button>
            </div>
            <button @click="addQuestion(assignment)">Add Question</button>
          </div>
          <button @click="addAssignment(week.weekIndex)">Add Assignment</button>
        </div>
      </div>
      <button @click="addNewWeek">Add Another Week</button>
      <button @click="submitContent">Submit</button>
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
  },
};
