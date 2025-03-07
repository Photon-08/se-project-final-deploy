export default {
    template: `
    <div :style="containerStyle">
        <!-- Sidebar (side box) -->
        <div :style="sidebarStyle">
            <ul :style="listStyle">
                <li v-for="(week, index) in weeks" :key="index">
                    <!-- Week Header: Clickable to toggle content visibility -->
                    <div @click="toggleDropdown(index)" :style="weekHeaderStyle">
                        Week {{ index + 1 }}
                    </div>
                    <!-- Week Content (Lecture URLs) -->
                    <ul v-if="week.isOpen" :style="nestedListStyle">
                        <li v-for="(content, i) in week.content" :key="i">
                            <a href="javascript:void(0);" @click="selectLecture(content.lecture_url)" :style="linkStyle">
                                Lecture {{ content.lecture_no }}
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>

        <!-- Main Content Area -->
        <div :style="mainContentStyle">
            <div v-if="courseDetails">
                <h4>Course Content</h4>
                <p>Select a week from the sidebar to view the lectures.</p>
                
                <!-- Iframe Player for Video -->
                <div v-if="selectedLectureUrl" :style="iframeWrapperStyle">
                    <iframe :src="selectedLectureUrl" frameborder="0" width="100%" height="100%" allowfullscreen></iframe>
                </div>
            </div>
            <div v-else>
                <p v-if="loading">Loading course details...</p>
                <p v-else>Error fetching course details. Please try again later.</p>
            </div>
        </div>

        <!-- Help Button -->
        <button @click="toggleHelpWindow" :style="helpButtonStyle">Help</button>

        <!-- Help Window -->
        <div v-if="showHelp" :style="helpWindowStyle">
            <div :style="helpHeaderStyle">
                <input v-model="helpQuery" @keyup.enter="fetchAIResponse" placeholder="Ask about this course..." :style="helpInputStyle" />
                <button @click="fetchAIResponse" :style="helpSendButtonStyle">Send</button>
            </div>
            <div :style="helpResponseStyle">
                <p v-if="loadingHelpResponse">Loading response...</p>
                <!-- Render Markdown Response -->
                <div v-else v-html="helpResponse"></div>

                <!-- Display previous questions and responses -->
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
            weeks: [],  // Will hold the week data (each week contains its lectures)
            selectedLectureUrl: null,  // Holds the URL of the selected lecture to play in the iframe
            showHelp: false,  // Controls visibility of the help window
            helpQuery: '',  // Stores user input query
            helpResponse: '',  // Stores AI response
            loadingHelpResponse: false,  // Loading state for help response
            previousInteractions: [],  // Store previous interactions (questions & responses)
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
                    console.log(data);
                    // Convert the response markdown to HTML
                    this.helpResponse = this.convertMarkdownToHtml(data.response || "No relevant information found.");
                    
                    // Store the current question and response
                    this.previousInteractions.push({
                        question: this.helpQuery,
                        response: this.helpResponse,
                    });

                    // Clear the query input field
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
            data.content.forEach(content => {
                const weekNumber = content.lecture_no.split('.')[0];  
                if (!weeks[weekNumber - 1]) {
                    weeks[weekNumber - 1] = { isOpen: false, content: [] };
                }
                weeks[weekNumber - 1].content.push(content);
            });
            this.weeks = weeks;
        },

        toggleDropdown(index) {
            this.weeks[index].isOpen = !this.weeks[index].isOpen;
        },

        selectLecture(lectureUrl) {
            this.selectedLectureUrl = lectureUrl;
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
