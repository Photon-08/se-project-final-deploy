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

# Global registry to store agent instances by course_id, assignment_id and user_id
_agent_registry = {}

class AssignmentHelper:
    def __init__(self, course_id, assignment_id, user_id):
        self.course_id = course_id
        self.assignment_id = assignment_id
        self.user_id = user_id
        self.agent_key = f"{course_id}_{assignment_id}_{user_id}"
        
        # Check if an agent already exists for this user, course and assignment
        if self.agent_key in _agent_registry:
            current_app.logger.info(f"Using existing agent for user {user_id}, course {course_id}, assignment {assignment_id}")
            self.agent = _agent_registry[self.agent_key]
            self.knowledge_base = self.agent.knowledge
            return
            
        # If no existing agent, create a new one
        current_app.logger.info(f"Creating new agent for user {user_id}, course {course_id}, assignment {assignment_id}")
        
        # Define the lancedb directory path
        self.lancedb_dir = "tmp/lancedb"
        os.makedirs(self.lancedb_dir, exist_ok=True)

        # Initialize knowledge base
        course_dir = f"backend/ai/course_materials/{course_id}"
        assignment_file = f"assignment{assignment_id}.pdf"
        assignment_path = os.path.join(course_dir, assignment_file)

        if not os.path.exists(course_dir):
            os.makedirs(course_dir, exist_ok=True)
            raise Exception("Course materials directory not found")

        if not os.path.exists(assignment_path):
            raise Exception(f"Assignment file {assignment_file} not found")

        try:
            # Create knowledge base from assignment PDF
            self.knowledge_base = PDFKnowledgeBase(
                path=course_dir,
                vector_db=LanceDb(
                    table_name=f"course_{course_id}_assignment_{assignment_id}_docs",
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
                    table_name="assignment_helper_sessions", 
                    db_file="tmp/agent_storage.db",
                ),
                # Set the session_id at the Agent level
                session_id=f"course_{course_id}_assignment_{assignment_id}_user_{user_id}",
                # Add history to messages
                add_history_to_messages=True,
                num_history_responses=25,
                system_prompt="""You are an AI Assignment Helper. Your role is to:
                1. Use the assignment knowledge base to provide guidance
                2. Help break down complex problems
                3. Guide students through problem-solving approaches
                4. Maintain academic integrity
                
                Remember:
                - Never provide direct solutions
                - Reference specific materials from the knowledge base
                - Focus on methodology and understanding
                - Encourage independent thinking
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
            
            # Process and format the response
            formatted_response = response.content if response.content else "No response generated"
            
            return {
                "status": "success",
                "response": formatted_response,
                "metadata": {
                    "response_length": len(formatted_response)
                }
            }
        except Exception as e:
            current_app.logger.error(f"Agent error: {str(e)}")
            return {"status": "error", "message": str(e)}