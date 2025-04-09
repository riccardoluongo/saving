from flask import *
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from django_http import url_has_allowed_host_and_scheme
from db import *
from datetime import timedelta
from logging.handlers import RotatingFileHandler
import json
import sys
import logging
import os
import atexit
from dotenv import load_dotenv

os.system("./logrotate.sh")
load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY')

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite"
app.config["SECRET_KEY"] = SECRET_KEY
app.config["SESSION_COOKIE_SAMESITE"] = "Strict"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['DEBUG'] = False
app.json.sort_keys = False
db = SQLAlchemy()

handler = RotatingFileHandler('log/main/main.log', maxBytes=1000000, backupCount=10)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('[%(levelname)s] [%(asctime)s] - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)
logger = app.logger

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "/login?lang=eng"
login_manager.login_message = None

eng = json.load(open("lang/en.json"))
ita = json.load(open("lang/it.json"))
eng_login = json.load(open("lang/login_eng.json"))
ita_login = json.load(open("lang/login_ita.json"))

app.logger.info("App started")

class Users(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(250), unique=True, nullable=False)
    password = db.Column(db.String(250), nullable=False)
    lang = db.Column(db.String(250), default="eng", nullable=False)
    def remove(self):
        db.session.delete(self)

db.init_app(app)

with app.app_context():
    db.create_all()

@atexit.register
def goodbye():
    app.logger.info("Exiting...")

@login_manager.user_loader
def loader_user(user_id):
    return Users.query.get(user_id)

@app.route('/register', methods=["GET", "POST"])
def register():
    lang = request.args["lang"]
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        password_confirm = request.form.get("password-confirm")

        client_ip = request.headers.get('X-Real-IP')
    
        if not client_ip:
            client_ip = request.headers.get('X-Forwarded-For')
            if client_ip:
                client_ip = client_ip.split(',')[0]
        if not client_ip:
            client_ip = request.remote_addr

        user = Users.query.filter_by(username=username).first()
        if user:
            flash(ita["user_exists"] if lang == "ita" else eng["user_exists"])
            app.logger.warning(f"Failed registration attempt from {client_ip}: user '{user.username}' already exists")
            return redirect(url_for('login'))
        if password != password_confirm:
            flash(ita["password_not_matching"] if lang == "ita" else eng["password_not_matching"])
            app.logger.warning(f"Failed registration attempt from {client_ip}: passwords do not match")
            return redirect(url_for("register"))

        user = Users(username=username, password=password)
        db.session.add(user)
        db.session.commit()
        initialize_db(user.username)
        app.logger.info(f"Registered user '{username}', request from {client_ip}")
        return redirect(f"/login?lang={lang}")
        
    return render_template("register.html", lang = lang, translation = (ita_login if lang == "ita" else eng_login))

@app.route("/login", methods=["GET", "POST"])
def login():
    lang = request.args["lang"]
    if request.method == "POST":
        username=request.form.get("username")
        user = Users.query.filter_by(username=username).first()

        client_ip = request.headers.get('X-Real-IP')
    
        if not client_ip:
            client_ip = request.headers.get('X-Forwarded-For')
            if client_ip:
                client_ip = client_ip.split(',')[0]
        if not client_ip:
            client_ip = request.remote_addr

        if user:
            if user.password == request.form.get("password"):
                remember = True if request.form.get('remember') else False
                login_user(user, remember=remember)

                next = request.args.get('next', url_for('index'))
                if not url_has_allowed_host_and_scheme(next, request.host, require_https=False):
                    return abort(400)

                initialize_db(user.username)
                app.logger.info(f"User '{username}' at {client_ip} logged in")
                return redirect(url_for("index"))
            else:
                flash(ita["wrong_password"] if lang == "ita" else eng["wrong_password"])
                app.logger.warning(f"Failed login attempt from '{username}' at {client_ip}: wrong password.")
        else:
            app.logger.warning(f"Failed login attempt from '{username}' at {client_ip}: user does not exist.")
            flash(ita["user_not_exists"] if lang == "ita" else eng["user_not_exists"])
            return redirect(f"/login?lang={lang}")

    return render_template("login.html", lang = lang, translation = (ita_login if lang == "ita" else eng_login))

@app.route("/delete_user", methods=["GET", "POST"])
@login_required
def del_user():
    if request.method == "POST":
        username = current_user.username
        password = request.form.get("del-password")
        confirm = True if request.form.get('confirm-del-checkbox') else False
        
        client_ip = request.headers.get('X-Real-IP')
    
        if not client_ip:
            client_ip = request.headers.get('X-Forwarded-For')
            if client_ip:
                client_ip = client_ip.split(',')[0]
        if not client_ip:
            client_ip = request.remote_addr

        if password == current_user.password and confirm:
            current_user.remove()
            db.session.commit()
            os.remove(f"database/{username}.db")
            flash(ita["account_deleted"] if current_user.lang == "ita" else eng["account_deleted"])
            app.logger.info(f"Removed account '{username}', request from {client_ip}")
            return redirect(url_for('login'))
        else:
            flash(ita["wrong_password"] if current_user.lang == "ita" else eng["wrong_password"])
            app.logger.warning(f"Failed attempt to delete account '{username}' by {client_ip}: wrong password")
            return redirect(url_for('del_user'))
    return render_template("delete_user.html", translation = (ita if current_user.lang == "ita" else eng))

@app.route("/change_password", methods=["GET", "POST"])
@login_required
def change_psw():
    if request.method == "POST":
        current_psw = request.form.get("current-password")
        new_psw = request.form.get("new-password")
        confirm_psw = request.form.get("confirm-new-password")

        client_ip = request.headers.get('X-Real-IP')
    
        if not client_ip:
            client_ip = request.headers.get('X-Forwarded-For')
            if client_ip:
                client_ip = client_ip.split(',')[0]
        if not client_ip:
            client_ip = request.remote_addr

        if current_psw == current_user.password:
            if new_psw == confirm_psw:
                current_user.password = new_psw
                db.session.commit()
                app.logger.info(f"Changed password for user '{current_user.username}', request from {client_ip}")
                return redirect(url_for("logout"))
            else:
                flash(ita["password_not_matching"] if current_user.lang == "ita" else eng["password_not_matching"])
                app.logger.warning(f"Failed attempt to change password for user '{current_user.username}' by {client_ip}: passwords do not match")
                return redirect(url_for("change_psw"))
        else:
            flash(ita["wrong_password"] if current_user.lang == "ita" else eng["wrong_password"])
            app.logger.warning(f"Failed attempt to change password for user '{current_user.username}' by {client_ip}: wrong password")
            return redirect(url_for("change_psw"))
    return render_template("changepsw.html", translation = (ita if current_user.lang == "ita" else eng))

@app.route("/logout")
@login_required
def logout():
    app.logger.info(f"Logged out user '{current_user.username}'")
    logout_user()
    return redirect(url_for("index"))

@app.route('/')
@login_required
def index():
    current_username = current_user.username
    return render_template("index.html", text = current_username, translation = (ita if current_user.lang == "ita" else eng))
    
@app.route('/balance')
@login_required
def balance():
    wallet = request.args['wallet']
    return jsonify(get_balance(wallet, current_user.username))

@app.route('/edit_wallets')
@login_required
def show_wallets():
    current_username = current_user.username
    return render_template(f"edit_wallets.html", text = current_username, translation = (ita if current_user.lang == "ita" else eng))

@app.route('/wallets')
@login_required
def wallets():
    return jsonify(get_wallets(current_user.username))

@app.route('/new_wallet')
@login_required
def new_wallet():
    name = request.args['name']
    initial_value = request.args['start_value']

    if name in get_wallets(current_user.username):
        app.logger.warning(f"Cannot create wallet '{name}' for user '{current_user.username}': wallet already exists")
        return Response(
            f"Error: wallet '{name}' already exists",
            status = 500
        )
    else:
        create_wallet(name, initial_value, current_user.username)
        app.logger.info(f"Created wallet '{name}' for user '{current_user.username}' with starting balance: {initial_value}")
        return Response(
            f"Success! Created wallet '{name}' for user '{current_user.username}'",
            status = 200
        )

@app.route('/delete_all_wallets')
@login_required
def del_all():
    delete_all(current_user.username)
    app.logger.info(f"Deleted all wallets for user '{current_user.username}'")
    return redirect("/")

@app.route('/delete_wallet')
@login_required
def del_wallet():
    wallet = request.args['wallet']
    
    delete_wallet(wallet, current_user.username)
    app.logger.info(f"Deleted wallet '{wallet}' for user '{current_user.username}'")
    return redirect('/edit_wallets')

@app.route('/add')
@login_required
def add_money():
    name = request.args['name']
    wallet = request.args['wallet']
    value = request.args['value']
    username = current_user.username

    code = add_transaction(name, wallet, value, username)
    if code == 0:
        app.logger.info(f"User '{username}' added {value}$ to wallet '{wallet}'")
        return Response(
            f"Success! Processed '{name}' transaction.",
            status=200
        )
    else:
        return Response(
            f"Error! Couldn't process '{name}' transaction.",
            status=500
        )

@app.route('/pay')
@login_required
def pay():
    name = request.args['name']
    wallet = request.args['wallet']
    value = request.args['value']
    username = current_user.username

    code = pay_transaction(name, wallet, value, username)
    if code == 0:
        app.logger.info(f"User '{username}' took {value}$ off wallet '{wallet}'")
        return Response(
            f"Success! Processed '{name}' transaction.",
            status=200
        )
    else:
        return Response(
            f"Error! Couldn't process '{name}' transaction.",
            status=500
        )

@app.route('/get_transactions')
@login_required
def transactions():
    wallet = request.args['wallet']
    offset = request.args['offset']
    limit = request.args['limit']
    return jsonify(get_transactions(wallet, current_user.username, offset, limit))

@app.route('/summary')
@login_required
def summary():
    current_username = current_user.username
    return render_template(f'summary.html', text = current_username, translation = (ita if current_user.lang == "ita" else eng))

@app.route('/all_transactions')
@login_required
def all_transactions():
    return jsonify(get_all_transactions(current_user.username))

@app.route('/transactions_list')
@login_required
def transactions_list():
    offset = request.args['offset']
    limit = request.args['limit']
    return jsonify(get_transactions_list(current_user.username, offset, limit))

@app.route('/total_balance')
@login_required
def total_balance():
    return jsonify(get_total_balance(current_user.username))

@app.route('/delete_transaction')
@login_required
def del_trans():
    wallet = request.args['wallet']
    id = request.args['id']
    username = current_user.username

    delete_transaction(wallet, id, username)
    app.logger.info(f"User '{username}' deleted transaction #{id}")
    return redirect('/')

@app.route('/switch_lang')
@login_required
def switch_lang():
    lang = request.args["lang"]

    if lang == "eng" or lang == "ita":
        if lang != current_user.lang:
            current_user.lang = lang
            db.session.commit()
    else:
        app.logger.error("Invalid language provided! No changes made.")
    return redirect(request.referrer)

@app.route('/current_lang')
@login_required
def get_current_lang():
    return jsonify(current_user.lang)

@app.route('/login_translations')
def get_login_translations():
    lang = request.args['lang']
    if lang == "ita":
        return jsonify(ita_login)
    else:
        return jsonify(eng_login)

@app.route('/translations')
def get_translations():
    lang = request.args['lang']
    if lang == "ita":
        return jsonify(ita)
    else:
        return jsonify(eng)
#By Riccardo Luongo, 09/04/2025