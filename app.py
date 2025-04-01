import os
from flask import Flask
from backend.config import LocalDevelopmentConfig
from backend.model import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore
from app_secrets import OPENAI_API_KEY, OPENROUTER_API_KEY
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["OPENROUTER_API_KEY"] = OPENROUTER_API_KEY
def createApp():
    app = Flask(
        __name__,
        template_folder='./frontend',
        static_folder='./frontend',
        static_url_path='/static/'
    )
    #app = Flask(__name__, template_folder='frontend', static_folder='frontend', static_url_path='/static')

    app.config.from_object(LocalDevelopmentConfig)

    db.init_app(app)
    #flask security
    datastore = SQLAlchemyUserDatastore(db, User, Role)

    app.security = Security(app, datastore=datastore, register_blueprint=False)
    app.app_context().push()
    from backend.api import api
    # flask-restful init
    api.init_app(app)
    return app

app = createApp()
import backend.create_initial_data
import backend.router
#print(app.url_map)

import os
#os.environ["OPENAI_API_KEY"] = "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"
#os.environ["OPENROUTER_API_KEY"] = "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"



"""
def load_env_variables(filename="config.env"):
    if os.path.exists(filename):
        with open(filename, "r") as f:
            for line in f:
                key, value = line.split("=", 1)
                value = value.strip()
                key = key.strip()
                #print(key, value)
                print(f"{key}={value}")



                os.environ[key] = value
load_env_variables()
"""

# Load environment variables from config.env file


if (__name__ == '__main__'):
    app.run()