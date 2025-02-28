import os
from phi.agent import Agent
from phi.knowledge.pdf import PDFKnowledgeBase
from phi.vectordb.lancedb import LanceDb, SearchType
from phi.embedder.sentence_transformer import SentenceTransformerEmbedder
from flask import current_app
from phi.model.openrouter import OpenRouter
from phi.storage.agent.sqlite import SqlAgentStorage
from phi.tools.python import PythonTools
from phi.tools.duckduckgo import DuckDuckGo

# Global registry to store agent instances by course_id and instructor_id
_agent_registry = {}

class GradingAssistant:
    def __init__(self, course_id, instructor_id):
        self.course_id = course_id
        self.instructor_id = instructor_id
        self.agent_key = f"grading_assistant_{course_id}_{instructor_id}"
        
        # Check if an agent already exists for this instructor and course
        if self.agent_key in _agent_registry:
            current_app.logger.info(f"Using existing grading assistant for instructor {instructor_id} and course {course_id}")
            self.agent = _agent_registry[self.agent_key]
            self.knowledge_base = self.agent.knowledge
            return
            
        # If no existing agent, create a new one
        current_app.logger.info(f"Creating new grading assistant for instructor {instructor_id} and course {course_id}")
        
        # Define the lancedb directory path
        self.lancedb_dir = "tmp/lancedb"
        os.makedirs(self.lancedb_dir, exist_ok=True)

        # Initialize knowledge base - specifically looking for rubric materials
        course_dir = f"backend/ai/course_materials/{course_id}"
        if not os.path.exists(course_dir):
            raise Exception("Course materials directory not found")

        # Check for rubrics in course materials
        pdf_files = [f for f in os.listdir(course_dir) if f.endswith('rubric.pdf')]
        if not pdf_files:
            raise Exception("No PDF files found in course materials")

        try:
            # Create knowledge base from local PDFs (focus on rubrics)
            self.knowledge_base = PDFKnowledgeBase(
                path=course_dir,
                vector_db=LanceDb(
                    table_name=f"grading_assistant_{course_id}",
                    uri=self.lancedb_dir,
                    search_type=SearchType.hybrid,
                    embedder=SentenceTransformerEmbedder(model_name="all-MiniLM-L6-v2"),
                ),
            )

            # Load the knowledge base
            self.knowledge_base.load(recreate=False)

            # Create storage directory if it doesn't exist
            os.makedirs("tmp", exist_ok=True)

            # Initialize agent with knowledge base
            self.agent = Agent(
                model=OpenRouter(
                    id="google/gemini-2.0-pro-exp-02-05:free",
                    max_tokens=4096,
                ),
                tools=[
                    PythonTools(),
                    DuckDuckGo(),
                ],
                show_tool_calls=True,
                # Use SQLite storage for persistence
                storage=SqlAgentStorage(
                    table_name="grading_assistant_sessions", 
                    db_file="tmp/agent_storage.db",
                ),
                # Set the session_id at the Agent level
                session_id=f"grading_assistant_course_{course_id}_instructor_{instructor_id}",
                # Add history to messages
                add_history_to_messages=True,
                num_history_responses=25,
                system_prompt="""You are an AI Grading Assistant for instructors. Your role is to:
                1. Analyze student subjective responses against grading rubrics
                2. Provide a concise summary of the student's response
                3. Identify which points from the rubric were covered
                4. Highlight strengths and weaknesses in the response
                5. Suggest fair grades based on rubric criteria
                
                Remember:
                - Reference specific points from the grading rubrics
                - Be objective and fair in your assessment
                - Provide constructive feedback that can be shared with students
                - Structure your response in a clear, organized format
                - Consider both content knowledge and communication skills
                
                Format your output as follows:
                
                ## Summary
                [Brief summary of student's response]
                
                ## Rubric Points Covered
                [List which rubric points were addressed]
                
                ## Suggested Grade Justification
                [Explanation based on rubric criteria]
                """,
                knowledge=self.knowledge_base,
                search_knowledge=True,
                markdown=True
            )
            
            # Store the agent in the registry
            _agent_registry[self.agent_key] = self.agent

        except Exception as e:
            current_app.logger.error(f"Error initializing knowledge base: {str(e)}")
            raise Exception(f"Failed to initialize knowledge base: {str(e)}")

    def get_response(self, student_response, rubric_name=None):
        """
        Analyze a student's subjective response against grading rubrics
        
        Args:
            student_response (str): The student's written response to analyze
            rubric_name (str, optional): Specific rubric to use (if multiple exist)
            
        Returns:
            dict: Result containing analysis summary and rubric points coverage
        """
        try:
            # Format the prompt to include student response and rubric focus
            prompt = f"""
            Please analyze the following student response against the grading rubrics 
            {f'(focusing on the rubric named {rubric_name})' if rubric_name else 'found in the course materials'}.
            
            STUDENT RESPONSE:
            {student_response}
            
            Analyze this response and provide:
            1. A concise summary of the response
            2. Which specific points from the rubric were covered
            3. Suggestions for fair grading based on the rubric criteria
            """
            
            response = self.agent.run(prompt)
            return {
                "status": "success",
                "response": response.content,
            }
        except Exception as e:
            current_app.logger.error(f"Grading Assistant error: {str(e)}")
            return {"status": "error", "message": str(e)} 