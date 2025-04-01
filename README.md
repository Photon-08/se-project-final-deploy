# SE Project Directory Structure

## Project Overview
Seek Portal
## Folder Structure

### Root Directory

```plaintext
project/
│
├── backend/                        # Contains the backend application (Flask)
│   ├── api.py                      # Contains API routes 
│   ├── config.py                   # Configuration file 
│   ├── create_initial_data.py      # Creating initial data (Admin , Student , Instructor)
│   ├── model.py                    # Contains database models for the application
│   └── router.py                   # Route handlers for the backend (Login , Student_Register)
│
├── frontend/                       # Frontend application (Vue.js)
│   ├── assets/                     # Static files 
│   ├── components/                 # Reusable Vue components
│   │   └── Navbar.js               # NavBar
│   ├── pages/                      # Pages
│   │   ├── Admin_dashboard.js      # Admin dashboard 
│   │   ├── Instructor_dashboard.js # Instructor dashboard 
│   │   ├── Login.js                # Login page
│   │   ├── Student_dashboard.js    # Student dashboard 
│   │   └── Student_registration.js # Student registration 
│   ├── utils/                      # Utility functions for the frontend
│   │   └── router.js               # Utility file for managing routing
│   ├── app.js                      # Main Vue.js app entry file
│   └── index.html                  # Main HTML file 
│
├── instance/                       # Contains environment-specific data
│   └── database.sqlite3            # SQLite database file
│
├── app.py                          # Entry point 
├── req.txt                         # Dependencies 


## Python Version

* **Required:** Python 3.9 or Python 3.10  

Please ensure you are using one of these versions to maintain compatibility.  

## Running the Application  

Follow these steps to run the application:  
```bash
# Navigate to the project directory
cd soft-engg-project-jan-2025-se-Jan-22

# Install dependencies (if any)
pip install -r final_requirements.txt

# Run the main application script
python main.py
```

To run the AI Chatbot:
```
How to get the OPENAI_API_KEY?
Please go to `https://openrouter.ai/` and create your free OPENAI compatiable api key

Step 2:
Inside the `app_secrets.py` file, paste your api keys 
OPENAI_API_KEY = your_api_key
OPENROUTER_API_KEY = your_api_key
```