export default {
    template: `
        <div :style="containerStyle">
            <div :style="sidebarStyle">
                <ul :style="listStyle">
                    <li v-for="(week, index) in weeks" :key="index">
                        <div @click="toggleDropdown(index)" :style="weekHeaderStyle">
                            Week {{ index + 1 }}
                        </div>
                        <ul v-if="week.isOpen" :style="nestedListStyle">
                            <li v-for="(content, i) in week.content" :key="i">
                                <a href="javascript:void(0);" @click="selectLecture(content.lecture_url)" :style="linkStyle">
                                    Lecture {{ content.lecture_no }}
                                </a>
                            </li>
                            <li v-if="week.assignments && week.assignments.length" :style="assignmentHeaderStyle">
                                Assignments:
                                <ul :style="assignmentListStyle">
                                    <li v-for="assignment in week.assignments" :key="assignment.id">
                                        <a href="javascript:void(0);" @click="selectAssignment(assignment)" :style="linkStyle">
                                            {{ assignment.title }}
                                        </a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </li>
                    <li @click="showProgrammingAssignment" style="cursor: pointer; padding: 10px; background-color: #ddd; text-align: center; margin-top: 10px;">
                        Programming Assignment
                    </li>
                </ul>
            </div>

            <div :style="mainContentStyle">
                <div v-if="courseDetails">
                    <h4>Course Content</h4>
                    <p>Select a week from the sidebar to view the lectures and assignments.</p>

                    <div v-if="selectedLectureUrl" :style="iframeWrapperStyle">
                        <iframe :src="selectedLectureUrl" frameborder="0" width="100%" height="100%" allowfullscreen></iframe>
                    </div>
                    
                    <div v-if="showAssignment" class="mt-3">
                        <h4>Programming Assignment</h4>
                        <p>Write a Python function to find the factorial of a given number.</p>
                        <textarea v-model="assignmentCode" class="form-control mb-2" rows="5" placeholder="Enter your Python code here..."></textarea>
                        <button @click="runAssignmentCode" class="btn btn-success">Run Code</button>
                        <div v-if="assignmentResult" class="mt-2 p-2 border rounded bg-light">
                            <strong>Result:</strong>
                            <pre>{{ assignmentResult }}</pre>
                        </div>
                    </div>
                    <div v-if="selectedAssignment" :style="assignmentDetailStyle">
                        <h3>{{ selectedAssignment.title }}</h3>
                        <p><strong>Description:</strong> {{ selectedAssignment.description }}</p>
                        <p><strong>Due Date:</strong> {{ selectedAssignment.due_date ? new Date(selectedAssignment.due_date).toLocaleDateString() : 'Not set' }}</p>
                        <p><strong>Max Marks:</strong> {{ selectedAssignment.max_marks }}</p>
                        <p><strong>Status:</strong> {{ selectedAssignment.status }}</p>
                        <div v-if="selectedAssignment.questions && selectedAssignment.questions.length">
                            <h4>Questions:</h4>
                            <ol>
                                <li v-for="(question, index) in selectedAssignment.questions" :key="index">
                                    {{ question }}
                                    <ul v-if="selectedAssignment.options && selectedAssignment.options[index]">
                                        <li v-for="option in selectedAssignment.options[index]" :key="option">
                                            <label>
                                                <input type="radio" :name="'question-' + index" :value="option" @change="updateResponse(index, option)" />
                                                {{ option }}
                                            </label>
                                        </li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                        <button @click="submitAssignment" :style="submitButtonStyle">Submit Assignment</button>
                        <p v-if="submissionMessage">{{ submissionMessage }}</p>
                    </div>
                </div>
                
                <div v-else>
                    <p v-if="loading">Loading course details...</p>
                    <p v-else>Error fetching course details. Please try again later.</p>
                </div>
            </div>

            <button @click="toggleHelpWindow" :style="helpButtonStyle">Help</button>

            <div v-if="showHelp" :style="helpWindowStyle">
                <div :style="helpHeaderStyle">
                    <input v-model="helpQuery" @keyup.enter="fetchAIResponse" placeholder="Ask about this course..." :style="helpInputStyle" />
                    <button @click="fetchAIResponse" :style="helpSendButtonStyle">Send</button>
                </div>
                <div :style="helpResponseStyle">
                    <p v-if="loadingHelpResponse">Loading response...</p>
                    <div v-else v-html="helpResponse"></div>

                    <div v-if="previousInteractions.length" :style="previousInteractionsStyle">
                        <h4>Previous Interactions:</h4>
                        <div v-for="(interaction, index) in previousInteractions" :key="index" :style="interactionStyle">
                            <strong>Q:</strong> <span>{{ interaction.question }}</span><br>
                            <strong>A:</strong> <span v-html="interaction.response"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            courseDetails: null,
            loading: true,
            auth_token: localStorage.getItem("auth_token"),
            weeks: [],
            selectedLectureUrl: null,
            showHelp: false,
            helpQuery: '',
            helpResponse: '',
            loadingHelpResponse: false,
            previousInteractions: [],
            selectedAssignment: null,
            userResponses: {},
            submissionMessage: '',
            showAssignment: false,
            assignmentCode: '',
            assignmentResult: null,
        };
    },
    methods: {
        async get_course_details(course_id) {
            try {
                const res = await fetch(`/api/course_details/${course_id}`, {
                    method: 'GET',
                    headers: {
                        "Authentication-Token": this.auth_token,
                        'Content-Type': 'application/json',
                    },
                });
                const data = await res.json();
                console.log("API Response:", data);
                if (res.ok) {
                    this.courseDetails = data;
                    this.processCourseData(data);
                    this.loading = false;
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                this.loading = false;
                console.error(error);
                alert("There was an issue fetching the course details.");
            }
        },
        showProgrammingAssignment() {
            this.selectedAssignment = null;
            this.selectedLectureUrl = null;
            this.showAssignment = true;
        },
        async runAssignmentCode() {
            try {
                const result = eval(`(function() { return ${this.assignmentCode}; })()`);
                this.assignmentResult = result;
            } catch (error) {
                this.assignmentResult = `Error: ${error.message}`;
            }
        },
        selectAssignment(assignment) {
            this.selectedAssignment = assignment;
            this.selectedLectureUrl = null;
            this.showAssignment = false;
        },
        async fetchAIResponse() {
            if (!this.helpQuery.trim()) return;
            this.loadingHelpResponse = true;
            this.helpResponse = "";
            const course_id = this.$route.params.course_id;
            try {
                const res = await fetch(`/api/ai/course/${course_id}/content`, {
                    method: "POST",
                    headers: {
                        "Authentication-Token": this.auth_token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ question: this.helpQuery })
                });
                const data = await res.json();
                if (res.ok) {
                    this.helpResponse = this.convertMarkdownToHtml(data.response || "No relevant information found.");
                    this.previousInteractions.push({
                        question: this.helpQuery,
                        response: this.helpResponse,
                    });
                    this.helpQuery = "";
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                console.error("Error fetching AI response:", error);
                this.helpResponse = "Failed to fetch response. Please try again.";
            } finally {
                this.loadingHelpResponse = false;
            }
        },
        processCourseData(data) {
            let weeks = [];
            data.content.forEach(weekData => { // Iterate through week objects
                if (weekData && weekData.lectures && Array.isArray(weekData.lectures)) {
                    weekData.lectures.forEach(lecture => { // Iterate through lectures
                        if (lecture && lecture.lecture_no && typeof lecture.lecture_no === 'number' && lecture.lecture_url) {
                            const weekNumber = weekData.week;
                            if (!weeks[weekNumber - 1]) {
                                weeks[weekNumber - 1] = { isOpen: false, content: [], assignments: [] };
                            }
                            weeks[weekNumber - 1].content.push({
                                lecture_no: weekData.week + "." + lecture.lecture_no,
                                lecture_url: lecture.lecture_url
                            });
                        } else {
                            console.warn("Lecture object missing lecture_no or invalid:", lecture);
                        }
                    });
                } else {
                    console.warn("Week object missing lectures or invalid:", weekData);
                }
            });
        
            if (data.assignments) {
                data.assignments.forEach(week => {
                    if (weeks[week.week - 1]) {
                        weeks[week.week - 1].assignments = week.assignments;
                    }
                });
            }
        
            this.weeks = weeks;
        },

        updateResponse(questionIndex, selectedOption) {
            this.userResponses[questionIndex] = selectedOption;
        },
        submitAssignment() {
            this.submissionMessage = 'Assignment submitted successfully.';
            this.clearSubmissionMessage(); // Clear the message after a delay
        },

        clearSubmissionMessage() {
            setTimeout(() => {
                this.submissionMessage = '';
            }, 5000);
        },
        toggleDropdown(index) {
            this.weeks[index].isOpen = !this.weeks[index].isOpen;
        },

        selectLecture(lectureUrl) {
            this.selectedLectureUrl = lectureUrl;
            this.selectedAssignment = null; 
            this.showAssignment = false; 
        },

        toggleHelpWindow() {
            this.showHelp = !this.showHelp;
        },

        // Convert Markdown to HTML
        convertMarkdownToHtml(markdown) {
            if (!markdown) return "";

            return markdown
                .replace(/(?:\r\n|\r|\n)/g, "<br>") // Line breaks
                .replace(/###### (.*?)\n/g, "<h6>$1</h6>") // H6
                .replace(/##### (.*?)\n/g, "<h5>$1</h5>") // H5
                .replace(/#### (.*?)\n/g, "<h4>$1</h4>") // H4
                .replace(/### (.*?)\n/g, "<h3>$1</h3>") // H3
                .replace(/## (.*?)\n/g, "<h2>$1</h2>") // H2
                .replace(/# (.*?)\n/g, "<h1>$1</h1>") // H1
                .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
                .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italic
                .replace(/__(.*?)__/g, "<b>$1</b>") // Bold (alt)
                .replace(/_(.*?)_/g, "<i>$1</i>") // Italic (alt)
                .replace(/~~(.*?)~~/g, "<del>$1</del>") // Strikethrough
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Links
                .replace(/`([^`]+)`/g, "<code>$1</code>") // Inline code
                .replace(/^\- (.*)/gm, "<li>$1</li>") // Lists
                .replace(/^> (.*)/gm, "<blockquote>$1</blockquote>"); // Blockquote
        }
    },
    async mounted() {
        const course_id = this.$route.params.course_id;
        await this.get_course_details(course_id);
    },
    computed: {


        submitButtonStyle() {
            return {
                marginTop: '20px',
                padding: '10px 20px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
            };
        },

        containerStyle() {
            return { display: 'flex', height: '100vh' };
        },
        sidebarStyle() {
            return { width: '250px', backgroundColor: '#f4f4f4', borderRight: '1px solid #ccc', padding: '20px', overflowY: 'auto' };
        },
        listStyle() {
            return { listStyleType: 'none', paddingLeft: '0' };
        },
        weekHeaderStyle() {
            return { fontWeight: 'bold',                              
                cursor: 'pointer',
                marginBottom: '10px',
                padding: '8px',
                backgroundColor: '#007bff',
                borderRadius: '4px',
                textAlign: 'center',
                color: 'white', };
        },

        assignmentHeaderStyle() {
            return {
                fontWeight: 'bold',
                marginTop: '10px',
                marginBottom: '5px'
            };
        },

        assignmentDetailStyle() {
            return {
                marginTop: '20px',
                border: '1px solid #ddd',
                padding: '20px',
            };
        },
        assignmentListStyle() {
            return {
                listStyleType: 'none',
                paddingLeft: '10px'
            };
        },
        nestedListStyle() {
            return { paddingLeft: '10px', listStyleType: 'none' };
        },
        linkStyle() {
            return { textDecoration: 'none', color: '#007bff', fontSize: '14px' };
        },
        mainContentStyle() {
            return { flex: '1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: 'calc(100% - 250px)' };
        },
        iframeWrapperStyle() {
            return { marginTop: '20px', width: '70%', height: '400px', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden' };
        },
        helpButtonStyle() {
            return { position: 'fixed', bottom: '20px', right: '20px', background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '50px', cursor: 'pointer' };
        },
        helpWindowStyle() {
            return { position: 'fixed', bottom: '70px', right: '20px', width: '25%', height: '75%', background: '#fff', border: '1px solid #ccc', boxShadow: '0px 0px 10px rgba(0,0,0,0.1)', padding: '10px', display: 'flex', flexDirection: 'column' };
        },
        helpHeaderStyle() {
            return { display: 'flex', marginBottom: '10px' };
        },
        helpInputStyle() {
            return { flex: '1', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
        },
        helpSendButtonStyle() {
            return { padding: '8px', marginLeft: '5px', background: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' };
        },
        helpResponseStyle() {
            return { flex: '1', overflowY: 'auto', background: '#f9f9f9', padding: '10px', borderRadius: '4px' };
        },

        previousInteractionsStyle() {
            return { marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' };
        },

        interactionStyle() {
            return { marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '10px' };
        }
    }
};

// export default {
//     template: `
//     <div :style="containerStyle">
//         <!-- Sidebar (side box) -->
//         <div :style="sidebarStyle">
//             <ul :style="listStyle">
//                 <li v-for="(week, index) in weeks" :key="index">
//                     <!-- Week Header: Clickable to toggle content visibility -->
//                     <div @click="toggleDropdown(index)" :style="weekHeaderStyle">
//                         Week {{ index + 1 }}
//                     </div>
//                     <!-- Week Content (Lecture URLs) -->
//                     <ul v-if="week.isOpen" :style="nestedListStyle">
//                         <li v-for="(content, i) in week.content" :key="i">
//                             <a href="javascript:void(0);" @click="selectLecture(content.lecture_url)" :style="linkStyle">
//                                 Lecture {{ content.lecture_no }}
//                             </a>
//                         </li>
//                     </ul>
//                 </li>
//             </ul>
//         </div>

//         <!-- Main Content Area -->
//         <div :style="mainContentStyle">
//             <div v-if="courseDetails">
//                 <h4>Course Content</h4>
//                 <p>Select a week from the sidebar to view the lectures.</p>
                
//                 <!-- Iframe Player for Video -->
//                 <div v-if="selectedLectureUrl" :style="iframeWrapperStyle">
//                     <iframe :src="selectedLectureUrl" frameborder="0" width="100%" height="100%" allowfullscreen></iframe>
//                 </div>
//             </div>
//             <div v-else>
//                 <p v-if="loading">Loading course details...</p>
//                 <p v-else>Error fetching course details. Please try again later.</p>
//             </div>
//         </div>

//         <!-- Help Button -->
//         <button @click="toggleHelpWindow" :style="helpButtonStyle">Help</button>

//         <!-- Help Window -->
//         <div v-if="showHelp" :style="helpWindowStyle">
//             <div :style="helpHeaderStyle">
//                 <input v-model="helpQuery" @keyup.enter="fetchAIResponse" placeholder="Ask about this course..." :style="helpInputStyle" />
//                 <button @click="fetchAIResponse" :style="helpSendButtonStyle">Send</button>
//             </div>
//             <div :style="helpResponseStyle">
//                 <p v-if="loadingHelpResponse">Loading response...</p>
//                 <!-- Render Markdown Response -->
//                 <div v-else v-html="helpResponse"></div>
//             </div>
//         </div>
//     </div>
//     `,
//     data() {
//         return {
//             courseDetails: null,
//             loading: true,
//             auth_token: localStorage.getItem("auth_token"),
//             weeks: [],  // Will hold the week data (each week contains its lectures)
//             selectedLectureUrl: null,  // Holds the URL of the selected lecture to play in the iframe
//             showHelp: false,  // Controls visibility of the help window
//             helpQuery: '',  // Stores user input query
//             helpResponse: '',  // Stores AI response
//             loadingHelpResponse: false,  // Loading state for help response
//         };
//     },
//     methods: {
//         async get_course_details(course_id) {
//             try {
//                 const res = await fetch(`/api/course_details/${course_id}`, {
//                     method: 'GET',
//                     headers: {
//                         "Authentication-Token": this.auth_token,
//                         'Content-Type': 'application/json',
//                     },
//                 });
//                 const data = await res.json();
//                 if (res.ok) {
//                     this.courseDetails = data;
//                     this.processCourseData(data);
//                     this.loading = false;
//                 } else {
//                     throw new Error(data.message);
//                 }
//             } catch (error) {
//                 this.loading = false;
//                 console.error(error);
//                 alert("There was an issue fetching the course details.");
//             }
//         },

//         async fetchAIResponse() {
//             if (!this.helpQuery.trim()) return;
//             this.loadingHelpResponse = true;
//             this.helpResponse = "";

//             const course_id = this.$route.params.course_id;
//             try {
//                 const res = await fetch(`/api/ai/course/${course_id}/content`, {
//                     method: "POST",
//                     headers: {
//                         "Authentication-Token": this.auth_token,
//                         "Content-Type": "application/json"
//                     },
//                     body: JSON.stringify({ question: this.helpQuery })
//                 });

//                 const data = await res.json();
//                 if (res.ok) {
//                     console.log(data);
//                     // Convert the response markdown to HTML
//                     this.helpResponse = this.convertMarkdownToHtml(data.response || "No relevant information found.");
//                     console.log(this.helpResponse);
//                 } else {
//                     throw new Error(data.message);
//                 }
//             } catch (error) {
//                 console.error("Error fetching AI response:", error);
//                 this.helpResponse = "Failed to fetch response. Please try again.";
//             } finally {
//                 this.loadingHelpResponse = false;
//             }
//         },

//         processCourseData(data) {
//             let weeks = [];
//             data.content.forEach(content => {
//                 const weekNumber = content.lecture_no.split('.')[0];  
//                 if (!weeks[weekNumber - 1]) {
//                     weeks[weekNumber - 1] = { isOpen: false, content: [] };
//                 }
//                 weeks[weekNumber - 1].content.push(content);
//             });
//             this.weeks = weeks;
//         },

//         toggleDropdown(index) {
//             this.weeks[index].isOpen = !this.weeks[index].isOpen;
//         },

//         selectLecture(lectureUrl) {
//             this.selectedLectureUrl = lectureUrl;
//         },

//         toggleHelpWindow() {
//             this.showHelp = !this.showHelp;
//         },

//         // Convert Markdown to HTML
//         convertMarkdownToHtml(markdown) {
//             if (!markdown) return "";

//             return markdown
//                 .replace(/(?:\r\n|\r|\n)/g, "<br>") // Line breaks
//                 .replace(/###### (.*?)\n/g, "<h6>$1</h6>") // H6
//                 .replace(/##### (.*?)\n/g, "<h5>$1</h5>") // H5
//                 .replace(/#### (.*?)\n/g, "<h4>$1</h4>") // H4
//                 .replace(/### (.*?)\n/g, "<h3>$1</h3>") // H3
//                 .replace(/## (.*?)\n/g, "<h2>$1</h2>") // H2
//                 .replace(/# (.*?)\n/g, "<h1>$1</h1>") // H1
//                 .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
//                 .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italic
//                 .replace(/__(.*?)__/g, "<b>$1</b>") // Bold (alt)
//                 .replace(/_(.*?)_/g, "<i>$1</i>") // Italic (alt)
//                 .replace(/~~(.*?)~~/g, "<del>$1</del>") // Strikethrough
//                 .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Links
//                 .replace(/`([^`]+)`/g, "<code>$1</code>") // Inline code
//                 .replace(/^\- (.*)/gm, "<li>$1</li>") // Lists
//                 .replace(/^> (.*)/gm, "<blockquote>$1</blockquote>"); // Blockquote
//         }
//     },
//     async mounted() {
//         const course_id = this.$route.params.course_id;
//         await this.get_course_details(course_id);
//     },
//     computed: {
//         containerStyle() {
//             return { display: 'flex', height: '100vh' };
//         },
//         sidebarStyle() {
//             return { width: '250px', backgroundColor: '#f4f4f4', borderRight: '1px solid #ccc', padding: '20px', overflowY: 'auto' };
//         },
//         listStyle() {
//             return { listStyleType: 'none', paddingLeft: '0' };
//         },
//         weekHeaderStyle() {
//             return { fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', padding: '8px', backgroundColor: '#e1e1e1', borderRadius: '4px', textAlign: 'center' };
//         },
//         nestedListStyle() {
//             return { paddingLeft: '10px', listStyleType: 'none' };
//         },
//         linkStyle() {
//             return { textDecoration: 'none', color: '#007bff', fontSize: '14px' };
//         },
//         mainContentStyle() {
//             return { flex: '1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: 'calc(100% - 250px)' };
//         },
//         iframeWrapperStyle() {
//             return { marginTop: '20px', width: '70%', height: '400px', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden' };
//         },
//         helpButtonStyle() {
//             return { position: 'fixed', bottom: '20px', right: '20px', background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '50px', cursor: 'pointer' };
//         },
//         helpWindowStyle() {
//             return { position: 'fixed', bottom: '70px', right: '20px', width: '25%', height: '75%', background: '#fff', border: '1px solid #ccc', boxShadow: '0px 0px 10px rgba(0,0,0,0.1)', padding: '10px', display: 'flex', flexDirection: 'column' };
//         },
//         helpHeaderStyle() {
//             return { display: 'flex', marginBottom: '10px' };
//         },
//         helpInputStyle() {
//             return { flex: '1', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
//         },
//         helpSendButtonStyle() {
//             return { padding: '8px', marginLeft: '5px', background: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' };
//         },
//         helpResponseStyle() {
//             return { flex: '1', overflowY: 'auto', background: '#f9f9f9', padding: '10px', borderRadius: '4px' };
//         }
//     }
// };
