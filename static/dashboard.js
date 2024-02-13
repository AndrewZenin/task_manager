function updateTasksList() {
    fetch('http://127.0.0.1:5000/get_tasks')
        .then(response => response.json())
        .then(data => {
            const notInWorkTasksList = document.getElementById('tasks-list not-in-work-tasks-list');
            const inWorkTasksList = document.getElementById('tasks-list in-work-tasks-list');
            const completeTasksList = document.getElementById('tasks-list complete-tasks-list');

            // Очищаем списки перед добавлением новых задач
            if (notInWorkTasksList.children.length > 0 || inWorkTasksList.children.length > 0 || completeTasksList.children.length > 0) {
                notInWorkTasksList.innerHTML = '';
                inWorkTasksList.innerHTML = '';
                completeTasksList.innerHTML = '';
            }
            data.forEach(task => {
                const li = document.createElement('li');

                if (task.due_date) {
                    const dateObj = new Date(task.due_date);
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // добавляем ноль в начало, если месяц < 10
                    const day = String(dateObj.getDate()).padStart(2, '0'); // добавляем ноль в начало, если день < 10
                    const formattedDate = `${year}-${month}-${day}`;
                    task.due_date = formattedDate
                    li.textContent = task.title + " Cрок: " + task.due_date;
                }
                else {
                    li.textContent = task.title;
                }
                li.setAttribute('data-task-id', task.id); // Добавление атрибута data-task-id 
                li.setAttribute('draggable', "True"); // Добавление атрибута data-task-id
                li.setAttribute('data-task-priority', task.priority)

                // Применение классов в зависимости от уровня приоритета
                if (task.priority === 1) {
                    li.classList.add('priority-low');
                    console.log("li.classList.add('priority-low');")
                } else if (task.priority === 2) {
                    li.classList.add('priority-medium');
                } else if (task.priority === 3) {
                    li.classList.add('priority-high');
                }

                if (task.status === '1') {
                    notInWorkTasksList.appendChild(li);
                } else if (task.status === '2') {
                    inWorkTasksList.appendChild(li);
                } else if (task.status === '3') {
                    completeTasksList.appendChild(li);
                }
            });
        });
};
updateTasksList();


document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('task-details-modal');
    const taskTitle = document.getElementById('task-title');
    const taskDescription = document.getElementById('task-description');
    const taskStatus = document.getElementById('task-status');
    const taskDueDate = document.getElementById('task-due-date');
    const taskPriority = document.getElementById('task-priority');

    // Функция для открытия модального окна с подробностями задачи
    function openTaskDetailsModal(title, description, status, due_date, priority, taskId) {
        taskTitle.value = title;
        taskDescription.value = description;
        taskStatus.value = status;
        taskPriority.value = priority;

        // Преобразование даты из формата 'Sun, 25 Feb 2024 00:00:00 GMT' в 'YYYY-MM-DD'
        if (due_date) {
            const dateObj = new Date(due_date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // добавляем ноль в начало, если месяц < 10
            const day = String(dateObj.getDate()).padStart(2, '0'); // добавляем ноль в начало, если день < 10
            const formattedDate = `${year}-${month}-${day}`;
            taskDueDate.value = formattedDate;
        }
        else {
            taskDueDate.value = ''; // Если due_date равно null, очищаем поле taskDueDate
        }


        taskTitle.setAttribute('data-task-id', taskId); // Добавление атрибута data-task-id
        modal.style.display = 'block';
    }

    document.addEventListener('click', function (event) {
        if (event.target.tagName === 'LI') {
            const taskId = event.target.getAttribute('data-task-id');
            fetch('http://127.0.0.1:5000/get_task_details/' + taskId)
                .then(response => response.json())
                .then(data => {
                    openTaskDetailsModal(data.title, data.description, data.status, data.due_date, data.priority, taskId);
                });
        }
    });


    // Получаем модальное окно
    // Закрытие модального окна при клике на крестик
    const closeBtn = document.querySelector('.close');
    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });
    // Закрытие модального окна при нажатии клавиши Esc
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            modal.style.display = 'none';
        }
    });

    // Закрытие модального окна при клике за его пределами
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Обработчик сохранения изменений
    const saveChangesBtn = document.getElementById('save-changes-btn');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskStatusSelect = document.getElementById('task-status');
    const taskPrioritySelect = document.getElementById('task-priority');
    saveChangesBtn.addEventListener('click', function (event) {
        const taskId = document.getElementById('task-title').getAttribute('data-task-id');
        const title = taskTitleInput.value;
        const description = taskDescriptionInput.value;
        const due_date = taskDueDateInput.value;
        const status = taskStatusSelect.value;
        const priority = taskPrioritySelect.value;

        // Отправка данных на сервер для сохранения
        fetch('http://127.0.0.1:5000/update_task/' + taskId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, due_date, status, priority })
        })
            .then(response => {
                if (response.ok) {
                    modal.style.display = 'none'; // Закрыть модальное окно после успешного сохранения
                    updateTasksList();
                    alert('Изменения применены успешно');
                    console.log(JSON.stringify({ title, description, due_date, status, priority }))

                } else {
                    alert('Произошла ошибка при сохранении изменений.');
                }
            })
            .catch(error => {
                alert('Произошла ошибка при сохранении изменений.');
            });
    });

    document.addEventListener('click', function (event) {
        if (event.target.id === 'delete-task-btn') {
            const taskId = document.getElementById('task-title').getAttribute('data-task-id');

            fetch('http://127.0.0.1:5000/delete_task/' + taskId, {
                method: 'DELETE'
            })
                .then(response => {
                    if (response.ok) {
                        alert('Задача удалена успешно');
                        modal.style.display = 'none'; // Закрыть модальное окно после успешного сохранения
                        updateTasksList();
                    } else {
                        alert('Произошла ошибка при удалении задачи');
                    }
                })
                .catch(error => {
                    alert('Произошла ошибка при удалении задачи');
                });
        }
    });
});

function addNewTask() {
    const addTaskForm = document.getElementById('add-task-form');
    const title = document.getElementById('new-task-title').value;
    const description = document.getElementById('new-task-description').value;
    const due_date = document.getElementById('new-task-due-date').value;
    const status = document.getElementById('new-task-status').value;
    const priority = document.getElementById('new-task-priority').value;
    // Добавьте здесь код для отправки данных на сервер, например, с использованием fetch или XMLHttpRequest
    // Замените URL на адрес вашего сервера и обработчик для добавления задачи

    fetch('http://127.0.0.1:5000/add_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description, due_date, status, priority })
    })
        .then(response => response.json())
        .then(data => {
            addTaskForm.style.display = 'none'; // Закрыть модальное окно после успешного сохранения
            updateTasksList();
            alert('Задача добавлена успешно');
            // Сброс значений полей формы
            document.getElementById('new-task-title').value = '';
            document.getElementById('new-task-description').value = '';
            document.getElementById('new-task-due-date').value = '';
            document.getElementById('new-task-status').value = '1';
            document.getElementById('new-task-priority').value = '1';
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('При добавлении задачи произошла ошибка (смотрите консоль)');

        });

}

function showAddTaskForm() {
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm.style.display === 'none') {
        addTaskForm.style.display = 'block';
    } else {
        addTaskForm.style.display = 'none';
    }

    const closeBtn = document.querySelector('.add-task-form-close');
    closeBtn.addEventListener('click', function () {
        addTaskForm.style.display = 'none';
    });
    // Закрытие модального окна при нажатии клавиши Esc
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            addTaskForm.style.display = 'none';
        }
    });

    // Закрытие модального окна при клике за его пределами
    window.addEventListener('click', function (event) {
        if (event.target === addTaskForm) {
            addTaskForm.style.display = 'none';
        }
    });
}

document.addEventListener('dragstart', function (event) {
    event.dataTransfer.setData('task_id', event.target.dataset.taskId);
});

document.addEventListener('drop', function (event) {
    event.preventDefault();
    var task_id = event.dataTransfer.getData('task_id');
    var new_list_id = event.target.closest('.list_of_tasks').dataset.listId;

    fetch('/move_task', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: task_id, new_list_id: new_list_id })
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            updateTasksList();
        });
});

document.addEventListener('dragover', function (event) {
    event.preventDefault();
});
