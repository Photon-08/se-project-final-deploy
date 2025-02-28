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

# Global registry to store agent instances by course_id and user_id
_agent_registry = {}

class StudyPlanner:
    def __init__(self, course_id, user_id):
        self.course_id = course_id
        self.user_id = user_id
        self.agent_key = f"study_planner_{course_id}_{user_id}"
        
        # Check if an agent already exists for this user and course
        if self.agent_key in _agent_registry:
            current_app.logger.info(f"Using existing study planner agent for user {user_id} and course {course_id}")
            self.agent = _agent_registry[self.agent_key]
            self.knowledge_base = self.agent.knowledge
            return
            
        # If no existing agent, create a new one
        current_app.logger.info(f"Creating new study planner agent for user {user_id} and course {course_id}")
        
        # Define the lancedb directory path
        self.lancedb_dir = "tmp/lancedb"
        os.makedirs(self.lancedb_dir, exist_ok=True)

        # Initialize knowledge base
        course_dir = f"backend/ai/course_materials/{course_id}"
        if not os.path.exists(course_dir):
            # os.makedirs(course_dir, exist_ok=True)
            raise Exception("Study resources directory not found")

        pdf_files = [f for f in os.listdir(course_dir) if f.endswith('.pdf')]
        if not pdf_files:
            raise Exception("No PDF files found in study resources")

        try:
            # Create knowledge base from local PDFs
            self.knowledge_base = PDFKnowledgeBase(
                path=course_dir,
                vector_db=LanceDb(
                    table_name=f"study_planner_{course_id}",
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
                    table_name="study_planner_sessions", 
                    db_file="tmp/agent_storage.db",
                ),
                # Set the session_id at the Agent level
                session_id=f"study_planner_course_{course_id}_user_{user_id}",
                # Add history to messages
                add_history_to_messages=True,
                num_history_responses=25,
                system_prompt="""You are an AI Study Planner. Your role is to:
                1. Create study plans based on course materials
                2. Suggest optimal learning sequences
                3. Help manage assignment deadlines
                4. Recommend revision strategies
                
                Remember:
                - Reference course materials from the knowledge base
                - Consider assignment deadlines
                - Adapt to student's learning pace
                - Suggest specific resources
                - Use maximum 5-6 lines in your response
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

    def get_response(self, question):
        try:
            response = self.agent.run(question)
            return {
                "status": "success",
                "response": response.content,
            }
        except Exception as e:
            current_app.logger.error(f"Agent error: {str(e)}")
            return {"status": "error", "message": str(e)} 