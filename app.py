from flask import Flask
from backend.config import LocalDevelopmentConfig
from backend.model import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore

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
os.environ["OPENAI_API_KEY"] = "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"
if (__name__ == '__main__'):
    app.run()