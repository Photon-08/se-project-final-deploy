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

# Global registry to store agent instances by user_id
_agent_registry = {}

class ProgrammingAssistant:
    def __init__(self, user_id):
        self.user_id = user_id
        self.agent_key = f"programming_{user_id}"
        
        # Check if an agent already exists for this user
        if self.agent_key in _agent_registry:
            current_app.logger.info(f"Using existing programming agent for user {user_id}")
            self.agent = _agent_registry[self.agent_key]
            self.knowledge_base = self.agent.knowledge
            return
            
        # If no existing agent, create a new one
        current_app.logger.info(f"Creating new programming agent for user {user_id}")
        
        # Define the lancedb directory path
        self.lancedb_dir = "tmp/lancedb"
        os.makedirs(self.lancedb_dir, exist_ok=True)

        # Initialize knowledge base
        resources_dir = "backend/ai/programming_resources"
        if not os.path.exists(resources_dir):
            os.makedirs(resources_dir, exist_ok=True)
            raise Exception("Programming resources directory not found")

        pdf_files = [f for f in os.listdir(resources_dir) if f.endswith('.pdf')]
        if not pdf_files:
            raise Exception("No programming resources found")

        try:
            # Create knowledge base from local PDFs
            self.knowledge_base = PDFKnowledgeBase(
                path=resources_dir,
                vector_db=LanceDb(
                    table_name="programming_docs",
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
                    table_name="programming_assistant_sessions", 
                    db_file="tmp/agent_storage.db",
                ),
                # Set the session_id at the Agent level
                session_id=f"programming_user_{user_id}",
                # Add history to messages
                add_history_to_messages=True,
                num_history_responses=25,
                system_prompt="""You are an AI Programming Assistant. Your role is to:
                1. Use the programming knowledge base to explain concepts
                2. Guide students through problem-solving approaches
                3. Suggest debugging strategies
                4. Explain code patterns and best practices
                
                Remember:
                - Never write complete solutions
                - Focus on teaching programming concepts
                - Use examples from the knowledge base
                - Encourage good coding practices
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