from flask import Flask, render_template, redirect, url_for, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
import sqlite3
import os
import sys
from datetime import datetime


def resource_path(filename):
    # return way for pyinst
    try:
        # create temp _meipass if lounch from exe
        base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
    except:
        # set base_dir if lounch from terminal
        base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, filename)


app = Flask(__name__)
# Путь к файлу базы данных
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + \
    os.path.join(resource_path("db"), 'database.db')
app.secret_key = 'secret_key'  # Секретный ключ для сессий
db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = 'users'  # Указываем имя таблицы

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"


@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        if 'username' in request.form and 'password' in request.form:
            username = request.form['username']
            password = request.form['password']
            # Получаем значение email или None, если отсутствует
            email = request.form.get('email')

            if not username or not password:
                error = "Ошибкa: Необходимо заполнить все поля"
            else:
                existing_username = User.query.filter_by(
                    username=username).first()
                existing_email = User.query.filter_by(email=email).first()
                print(User.query.filter_by(username=username).first())
                if existing_username or existing_email:
                    if existing_username:
                        error = "Ошибкa: Такой пользователь уже зарегистрирован"
                    else:
                        error = "Ошибкa: Пользователь с таким email уже зарегистрирован"
                else:
                    new_user = User(username=username,
                                    email=email, password=password)
                    db.session.add(new_user)
                    db.session.commit()
                    return redirect(url_for('login'))
        else:
            error = "Ошибкa: Поля username и password обязательны"

    return render_template('register.html', error=error)


@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    error = None
    if request.method == 'POST':
        if 'username' in request.form and 'password' in request.form:
            username = request.form['username']
            new_password = request.form['password']

            if not username or not new_password:
                error = "Ошибка: Необходимо заполнить все поля"
            else:
                user = User.query.filter_by(username=username).first()
                if not user:
                    error = "Ошибка: Пользователь с таким логином не найден"
                else:
                    user.password = new_password
                    db.session.commit()
                    return redirect(url_for('login'))
        else:
            error = "Ошибка: Поля логин и новый пароль обязательны для ввода"

    return render_template('reset_password.html', error=error)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.password == password:
            # Вход выполнен успешно
            session['logged_in'] = True
            session['username'] = username
            return redirect(url_for('dashboard'))
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    return redirect(url_for('login'))


@app.route('/dashboard')
def dashboard():
    if session.get('logged_in'):
        return render_template('dashboard.html', username=session['username'])
    else:
        return redirect(url_for('login'))


class Task(db.Model):
    __tablename__ = 'tasks'  # Указываем имя таблицы

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=False)
    # Статус задачи: 1 - активная, 0 - завершенная
    status = db.Column(db.Integer, default=1)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    priority = db.Column(db.Integer, default=1)

    def __repr__(self):
        return f"Task('{self.title}', '{self.description}', '{self.due_date}')"


@app.route('/get_tasks', methods=['GET'])
def get_tasks():
    if session.get('logged_in'):
        username = session.get('username')
        user = User.query.filter_by(username=username).first()
        if user:
            user_id = user.id
            tasks = Task.query.filter_by(user_id=user_id).all()
            tasks_list = []
            for task in tasks:
                tasks_list.append({
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'due_date': task.due_date,
                    'status': task.status,
                    'priority': task.priority
                })
            return jsonify(tasks_list)
        else:
            return "User not found"
    else:
        return redirect(url_for('login'))


@app.route('/get_task_details/<int:task_id>', methods=['GET'])
def get_task_details(task_id):
    task = Task.query.get(task_id)
    if task:
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date,
            'status': task.status,
            'priority': task.priority
        })
    else:
        return jsonify({'error': 'Task not found'}), 404


@app.route('/update_task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get(task_id)
    if task:
        title = request.json.get('title')
        description = request.json.get('description')
        due_date = request.json.get('due_date')
        if due_date:
            due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
        else:
            due_date = None
        status = request.json.get('status')
        priority = request.json.get('priority')
        print(request.json.get('dueDate'))

        task.title = title
        task.description = description
        task.due_date = due_date
        task.status = status
        task.priority = priority

        db.session.commit()
        return jsonify({'message': 'Task updated successfully'})
    else:
        return jsonify({'error': 'Task not found'}), 404


@app.route('/add_task', methods=['POST'])
def add_task():
    if session.get('logged_in'):
        username = session.get('username')
        user = User.query.filter_by(username=username).first()
        if user:
            user_id = user.id
            title = request.json.get('title')
            description = request.json.get('description')
            due_date = request.json.get('dueDate')
            status = request.json.get('status')
            priority = request.json.get('priority')

            if due_date:
                due_date = datetime.strptime(
                    request.json.get('dueDate'), '%Y-%m-%d').date()

                new_task = Task(title=title, description=description,
                                due_date=due_date, status=status, user_id=user_id, priority=priority)
            else:
                new_task = Task(title=title, description=description,
                                status=status, user_id=user_id, priority=priority)

            db.session.add(new_task)
            db.session.commit()

            response_data = {
                'user_id': user_id,
                'id': new_task.id,
                'title': new_task.title,
                'description': new_task.description,
                'dueDate': new_task.due_date,
                'status': new_task.status,
                'priority': new_task.priority
            }

            return jsonify(response_data)
        else:
            return 404


@app.route('/delete_task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task:
        db.session.delete(task)
        db.session.commit()
        return jsonify({"message": "Task deleted successfully"})
    else:
        return jsonify({'error': 'Task not found'}), 404


@app.route('/move_task', methods=['PUT'])
def move_task():
    task_id = request.json.get('task_id')
    new_list_id = request.json.get('new_list_id')

    task = Task.query.get(task_id)
    if task:
        task.status = new_list_id
        db.session.commit()
        return jsonify({'message': 'Task moved successfully'})
    else:
        return jsonify({'error': 'Task not found'}), 404


if __name__ == '__main__':
    app.run(debug=True)
