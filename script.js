// Основной класс приложения
class PalletTrackerApp {
    constructor() {
        this.workStartTime = null;
        this.workEndTime = null;
        this.isWorkingDay = false;
        this.currentPalletCheck = null;
        this.palletsChecked = 0;
        this.totalPalletsToCheck = 15;
        this.todayChecks = [];
        this.allDaysHistory = {};
        this.tempErrors = [];
        
        this.init();
    }
    
    init() {
        this.setupDate();
        this.setupEventListeners();
        this.loadFromStorage();
        this.updateDisplay();
    }
    
    setupDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = 
            now.toLocaleDateString('ru-RU', options);
    }
    
    setupEventListeners() {
        // Кнопки рабочего времени
        document.getElementById('startWorkDay').addEventListener('click', () => this.startWorkDay());
        document.getElementById('endWorkDay').addEventListener('click', () => this.showEndWorkDayModal());
        document.getElementById('showHistory').addEventListener('click', () => this.showHistory());
        document.getElementById('saveData').addEventListener('click', () => this.saveToStorage());
        
        // Кнопки проверки паллетов
        document.getElementById('startPalletCheck').addEventListener('click', () => this.startPalletCheck());
        document.getElementById('endPalletCheck').addEventListener('click', () => this.askAboutErrors());
        
        // Ввод D-кода по Enter
        document.getElementById('palletCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startPalletCheck();
        });
        
        // Обработчики модальных окон
        document.getElementById('noErrors').addEventListener('click', () => this.endPalletCheckWithErrors([]));
        document.getElementById('yesErrors').addEventListener('click', () => this.showErrorForm());
        
        // Форма ошибок
        document.getElementById('addAnotherError').addEventListener('click', () => this.addError());
        document.getElementById('finishErrors').addEventListener('click', () => this.finishErrors());
        document.getElementById('cancelErrors').addEventListener('click', () => this.cancelErrors());
        
        // Обновление видимости полей в форме ошибок
        document.querySelectorAll('input[name="errorType"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateErrorFormVisibility());
        });
        
        // Закрытие модальных окон
        document.getElementById('closeViewErrors').addEventListener('click', () => this.hideModal('viewErrorsModal'));
        document.getElementById('closeHistory').addEventListener('click', () => this.hideModal('historyModal'));
        document.getElementById('closeDayDetails').addEventListener('click', () => this.hideModal('dayDetailsModal'));
        document.getElementById('closeConfirmModal').addEventListener('click', () => this.hideModal('confirmModal'));
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideModal('confirmModal'));
        
        // Клик по фону для закрытия модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal.id);
            });
        });
    }
    
    // ============ МОДАЛЬНЫЕ ОКНА ПОДТВЕРЖДЕНИЯ ============
    showConfirmModal(message, callback) {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
        this.pendingConfirmCallback = callback;
    }
    
    confirmAction() {
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
        }
        this.hideModal('confirmModal');
        this.pendingConfirmCallback = null;
    }
    
    showEndWorkDayModal() {
        if (this.palletsChecked < this.totalPalletsToCheck) {
            this.showConfirmModal(
                `Проверено только ${this.palletsChecked} из ${this.totalPalletsToCheck} паллетов. Завершить рабочий день?`,
                () => this.endWorkDay()
            );
        } else {
            this.showConfirmModal('Завершить рабочий день?', () => this.endWorkDay());
        }
    }
    
    // ============ РАБОЧИЙ ДЕНЬ ============
    startWorkDay() {
        this.workStartTime = new Date();
        this.isWorkingDay = true;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        this.currentPalletCheck = null; // Сброс текущей проверки
        
        this.updateDisplay();
        this.enablePalletControls();
        this.showNotification('Рабочий день начат', 'success');
    }
    
    endWorkDay() {
        this.workEndTime = new Date();
        this.isWorkingDay = false;
        
        this.saveTodayToHistory();
        this.updateDisplay();
        this.disablePalletControls();
        this.showNotification('Рабочий день завершен', 'success');
    }
    
    // ============ ПРОВЕРКА ПАЛЛЕТОВ ============
    startPalletCheck() {
        console.log('Начало проверки паллета:', {
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck
        });
        
        if (!this.isWorkingDay) {
            this.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }
        
        const code = document.getElementById('palletCode').value.trim().toUpperCase();
        
        if (!code.startsWith('D') || code.length < 2 || !/^D\d+$/.test(code)) {
            this.showNotification('Неверный формат D-кода! Пример: D40505050', 'error');
            return;
        }
        
        if (this.currentPalletCheck) {
            this.showNotification('Завершите текущую проверку паллета!', 'error');
            return;
        }
        
        // Сбрасываем временные ошибки перед началом новой проверки
        this.tempErrors = [];
        
        // Показываем модальное окно вместо confirm()
        this.showConfirmModal(`Начать проверку паллета:\n${code}?`, () => {
            this.currentPalletCheck = {
                code: code,
                start: new Date(),
                end: null,
                duration: null,
                errors: []
            };
            
            document.getElementById('palletCode').value = '';
            this.updateCurrentCheckDisplay();
            this.updateButtonStates();
            this.showNotification(`Проверка паллета ${code} начата`, 'success');
        });
    }
    
    askAboutErrors() {
        if (!this.currentPalletCheck) {
            this.showNotification('Нет активной проверки!', 'error');
            return;
        }
        
        // Сбрасываем временные ошибки перед показом формы
        this.tempErrors = [];
        this.showModal('errorModal');
    }
    
    showErrorForm() {
        this.hideModal('errorModal');
        this.resetErrorForm(); // Сбрасываем форму перед показом
        this.updateErrorFormVisibility();
        this.showModal('errorDetailsModal');
    }
    
    resetErrorForm() {
        // Сбрасываем все поля формы
        document.querySelector('input[name="errorType"][value="недостача"]').checked = true;
        
        document.getElementById('productPLU').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('productUnit').value = 'шт';
        document.getElementById('errorComment').value = '';
        
        // Очищаем список добавленных ошибок
        document.getElementById('addedErrorsList').innerHTML = '';
    }
    
    updateErrorFormVisibility() {
        const errorType = document.querySelector('input[name="errorType"]:checked').value;
        const productDetails = document.getElementById('productDetails');
        
        if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
            productDetails.style.display = 'block';
        } else {
            productDetails.style.display = 'none';
        }
    }
    
    addError() {
        const errorType = document.querySelector('input[name="errorType"]:checked').value;
        const comment = document.getElementById('errorComment').value.trim();
        
        if (!comment) {
            this.showNotification('Введите комментарий', 'error');
            return;
        }
        
        const errorData = {
            type: errorType,
            comment: comment
        };
        
        if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
            errorData.plu = document.getElementById('productPLU').value;
            errorData.productName = document.getElementById('productName').value;
            errorData.quantity = document.getElementById('productQuantity').value;
            errorData.unit = document.getElementById('productUnit').value;
        }
        
        this.tempErrors.push(errorData);
        this.updateAddedErrorsList();
        
        // Очистить форму для следующей ошибки
        document.getElementById('productPLU').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('errorComment').value = '';
        
        // Сбросить тип ошибки на стандартный
        document.querySelector('input[name="errorType"][value="недостача"]').checked = true;
        this.updateErrorFormVisibility();
        
        this.showNotification('Ошибка добавлена', 'success');
    }
    
    updateAddedErrorsList() {
        const list = document.getElementById('addedErrorsList');
        list.innerHTML = '';
        
        this.tempErrors.forEach((error, index) => {
            const li = document.createElement('li');
            let text = `${index + 1}. ${error.type}`;
            
            if (error.productName) {
                text += ` - ${error.productName}`;
            }
            if (error.comment) {
                text += ` (${error.comment.length > 20 ? error.comment.substring(0, 20) + '...' : error.comment})`;
            }
            
            li.innerHTML = `
                <span>${text}</span>
                <button class="remove-error" data-index="${index}">×</button>
            `;
            
            list.appendChild(li);
        });
        
        // Добавить обработчики для кнопок удаления
        document.querySelectorAll('.remove-error').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-error').dataset.index);
                this.tempErrors.splice(index, 1);
                this.updateAddedErrorsList();
            });
        });
    }
    
    finishErrors() {
        if (this.tempErrors.length === 0) {
            this.showNotification('Не добавлено ни одной ошибки!', 'error');
            return;
        }
        
        this.endPalletCheckWithErrors([...this.tempErrors]);
    }
    
    cancelErrors() {
        this.showConfirmModal('Отменить добавление ошибок?', () => {
            this.tempErrors = [];
            this.hideModal('errorDetailsModal');
            this.askAboutErrors();
        });
    }
    
    endPalletCheckWithErrors(errors) {
        if (!this.currentPalletCheck) return;
        
        this.hideModal('errorModal');
        this.hideModal('errorDetailsModal');
        
        const endTime = new Date();
        const duration = Math.round((endTime - this.currentPalletCheck.start) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        this.currentPalletCheck.end = endTime;
        this.currentPalletCheck.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.currentPalletCheck.errors = [...errors];
        
        this.todayChecks.push({...this.currentPalletCheck});
        this.palletsChecked++;
        
        this.updateTodayChecksTable();
        this.updateDisplay();
        
        // Вместо alert() показываем уведомление
        let message = `Паллет ${this.currentPalletCheck.code} проверен!\n`;
        message += `Длительность: ${this.currentPalletCheck.duration}\n`;
        message += `Проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
        
        if (errors.length > 0) {
            message += `\nОшибок: ${errors.length}`;
        }
        
        if (this.palletsChecked === this.totalPalletsToCheck) {
            message += '\n✅ Все 15 паллетов проверены!';
            this.enableEndWorkDay();
        }
        
        this.showNotification(message, 'success');
        
        // Полностью сбрасываем состояние для следующей проверки
        this.currentPalletCheck = null;
        this.tempErrors = [];
        this.updateCurrentCheckDisplay();
        this.updateButtonStates();
        
        // Сбрасываем форму ошибок
        this.resetErrorForm();
    }
    
    // ============ ОТОБРАЖЕНИЕ ДАННЫХ ============
    updateDisplay() {
        this.updateWorkTimeDisplay();
        this.updatePalletCounter();
        this.updateProgressBar();
        this.updateButtonStates();
        this.updateTodayChecksTable();
        this.updateCurrentCheckDisplay();
    }
    
    updateWorkTimeDisplay() {
        const display = document.getElementById('workTimeDisplay');
        
        if (this.workStartTime) {
            const startStr = this.formatTime(this.workStartTime);
            
            if (this.workEndTime) {
                const endStr = this.formatTime(this.workEndTime);
                const duration = Math.round((this.workEndTime - this.workStartTime) / 1000 / 60);
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                
                display.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Начало: ${startStr} | Конец: ${endStr} | 
                    Время: ${hours}ч ${minutes}мин
                `;
            } else {
                display.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Начало: ${startStr} | Рабочий день идет...
                `;
            }
        } else {
            display.innerHTML = `
                <i class="fas fa-clock"></i> 
                Рабочий день не начат
            `;
        }
    }
    
    updatePalletCounter() {
        document.getElementById('palletCounter').textContent = 
            `Паллетов проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
    }
    
    updateProgressBar() {
        const progress = (this.palletsChecked / this.totalPalletsToCheck) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }
    
    updateCurrentCheckDisplay() {
        const display = document.getElementById('currentCheckDisplay');
        
        if (this.currentPalletCheck) {
            const startStr = this.formatTime(this.currentPalletCheck.start);
            display.innerHTML = `
                <i class="fas fa-sync-alt fa-spin"></i>
                Проверяется: ${this.currentPalletCheck.code} (начато в ${startStr})
            `;
        } else {
            display.innerHTML = '';
        }
    }
    
    updateButtonStates() {
        const startWorkBtn = document.getElementById('startWorkDay');
        const endWorkBtn = document.getElementById('endWorkDay');
        const startCheckBtn = document.getElementById('startPalletCheck');
        const endCheckBtn = document.getElementById('endPalletCheck');
        
        // Блокируем кнопку "Начать рабочий день", если день уже начат
        startWorkBtn.disabled = this.isWorkingDay;
        
        // Блокируем кнопку "Конец рабочего дня", если день не начат
        endWorkBtn.disabled = !this.isWorkingDay;
        
        // Блокируем кнопку "Начать проверку паллета", если:
        // 1. Рабочий день не начат ИЛИ
        // 2. Уже есть активная проверка
        startCheckBtn.disabled = !this.isWorkingDay || this.currentPalletCheck !== null;
        
        // Блокируем кнопку "Завершить проверку паллета", если нет активной проверки
        endCheckBtn.disabled = this.currentPalletCheck === null;
    }
    
    enablePalletControls() {
        document.getElementById('startPalletCheck').disabled = false;
        document.getElementById('endPalletCheck').disabled = true;
        document.getElementById('startWorkDay').disabled = true;
        document.getElementById('endWorkDay').disabled = false;
        this.updateButtonStates();
    }
    
    disablePalletControls() {
        document.getElementById('startPalletCheck').disabled = true;
        document.getElementById('endPalletCheck').disabled = true;
        document.getElementById('startWorkDay').disabled = false;
        document.getElementById('endWorkDay').disabled = true;
        this.updateButtonStates();
    }
    
    enableEndWorkDay() {
        document.getElementById('endWorkDay').disabled = false;
        this.updateButtonStates();
    }
    
    // ============ ТАБЛИЦА СЕГОДНЯШНИХ ПРОВЕРОК ============
    updateTodayChecksTable() {
        const tbody = document.getElementById('todayChecksBody');
        tbody.innerHTML = '';
        
        this.todayChecks.forEach((check, index) => {
            const row = document.createElement('tr');
            const startStr = this.formatTime(check.start);
            const endStr = this.formatTime(check.end);
            const hasErrors = check.errors && check.errors.length > 0;
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${check.code}</strong></td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>${check.duration}</td>
                <td>
                    <span class="status-badge ${hasErrors ? 'status-warning' : 'status-success'}">
                        ${hasErrors ? 'Есть' : 'Нет'}
                    </span>
                </td>
                <td>
                    ${hasErrors ? 
                        `<button class="btn btn-small btn-primary view-errors-btn" data-index="${index}">
                            <i class="fas fa-eye"></i> Просмотреть
                        </button>` : 
                        '-'
                    }
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Добавить обработчики для кнопок просмотра ошибок
        document.querySelectorAll('.view-errors-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.view-errors-btn').dataset.index);
                this.showPalletErrors(index);
            });
        });
    }
    
    // ============ ИСТОРИЯ ============
    showHistory() {
        this.loadFromStorage();
        this.updateHistoryTable();
        this.showModal('historyModal');
    }
    
    updateHistoryTable() {
        const tbody = document.getElementById('historyBody');
        tbody.innerHTML = '';
        
        const dates = Object.keys(this.allDaysHistory).sort((a, b) => b.localeCompare(a));
        
        dates.forEach(dateStr => {
            const dayData = this.allDaysHistory[dateStr];
            
            if (dayData.work_start) {
                const date = new Date(dateStr);
                const dateDisplay = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                const startTime = new Date(dayData.work_start);
                const startStr = startTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let endStr = '-';
                let totalTime = '-';
                let pallets = dayData.pallets_checked || 0;
                
                if (dayData.work_end) {
                    const endTime = new Date(dayData.work_end);
                    endStr = endTime.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const duration = (endTime - startTime) / 1000 / 60; // в минутах
                    const hours = Math.floor(duration / 60);
                    const minutes = Math.round(duration % 60);
                    totalTime = `${hours}ч ${minutes}м`;
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dateDisplay}</td>
                    <td>${startStr}</td>
                    <td>${endStr}</td>
                    <td>${pallets}</td>
                    <td>${totalTime}</td>
                    <td>
                        <button class="btn btn-small btn-primary view-day-btn" data-date="${dateStr}">
                            <i class="fas fa-search"></i> Подробнее
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            }
        });
        
        // Добавить обработчики для кнопок просмотра дня
        document.querySelectorAll('.view-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dateStr = e.target.closest('.view-day-btn').dataset.date;
                this.showDayDetails(dateStr);
            });
        });
    }
    
    showDayDetails(dateStr) {
        const dayData = this.allDaysHistory[dateStr];
        if (!dayData || !dayData.checks) {
            this.showNotification('Нет данных за этот день', 'error');
            return;
        }
        
        const date = new Date(dateStr);
        const dateDisplay = date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        
        document.getElementById('dayDetailsTitle').textContent = 
            `Проверки за ${dateDisplay}`;
        
        // Информация о дне
        const dayInfo = document.getElementById('dayInfo');
        let infoHtml = '';
        
        if (dayData.work_start) {
            const startTime = new Date(dayData.work_start);
            const startStr = startTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            infoHtml += `<p><strong>Начало работы:</strong> ${startStr}</p>`;
            
            if (dayData.work_end) {
                const endTime = new Date(dayData.work_end);
                const endStr = endTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                const duration = (endTime - startTime) / 1000 / 60;
                const hours = Math.floor(duration / 60);
                const minutes = Math.round(duration % 60);
                
                infoHtml += `<p><strong>Конец работы:</strong> ${endStr}</p>`;
                infoHtml += `<p><strong>Время работы:</strong> ${hours}ч ${minutes}м</p>`;
            }
            
            infoHtml += `<p><strong>Паллетов проверено:</strong> ${dayData.pallets_checked || 0}</p>`;
        }
        
        dayInfo.innerHTML = infoHtml;
        
        // Таблица проверок за день
        const tbody = document.getElementById('dayChecksBody');
        tbody.innerHTML = '';
        
        dayData.checks.forEach((check, index) => {
            const startTime = new Date(check.start);
            const endTime = new Date(check.end);
            
            const startStr = startTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const endStr = endTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const hasErrors = check.errors && check.errors.length > 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${check.code}</strong></td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>${check.duration}</td>
                <td>
                    <span class="status-badge ${hasErrors ? 'status-warning' : 'status-success'}">
                        ${hasErrors ? 'Есть' : 'Нет'}
                    </span>
                </td>
                <td>
                    ${hasErrors ? 
                        `<button class="btn btn-small btn-primary view-day-error-btn" 
                                data-date="${dateStr}" data-index="${index}">
                            <i class="fas fa-eye"></i> Ошибки
                        </button>` : 
                        '-'
                    }
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Добавить обработчики для кнопок просмотра ошибок
        document.querySelectorAll('.view-day-error-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dateStr = e.target.closest('.view-day-error-btn').dataset.date;
                const index = parseInt(e.target.closest('.view-day-error-btn').dataset.index);
                const check = this.allDaysHistory[dateStr].checks[index];
                this.showPalletErrorsFromHistory(check, index + 1);
            });
        });
        
        this.showModal('dayDetailsModal');
    }
    
    // ============ ПОКАЗ ОШИБОК ============
    showPalletErrors(index) {
        const check = this.todayChecks[index];
        this.showPalletErrorsModal(check, index + 1);
    }
    
    showPalletErrorsFromHistory(check, number) {
        this.showPalletErrorsModal(check, number, true);
    }
    
    showPalletErrorsModal(check, number, fromHistory = false) {
        document.getElementById('viewErrorsTitle').textContent = 
            `Ошибки паллета ${check.code} (№${number})`;
        
        const container = document.getElementById('errorsListContainer');
        
        if (!check.errors || check.errors.length === 0) {
            container.innerHTML = `
                <div class="error-item">
                    <h4>✅ Ошибок не обнаружено</h4>
                </div>
            `;
        } else {
            let errorsHtml = '';
            
            check.errors.forEach((error, i) => {
                errorsHtml += `
                    <div class="error-item">
                        <h4>${i + 1}. ${error.type}</h4>
                        <div class="error-details">
                `;
                
                if (['недостача', 'излишки', 'качество товара'].includes(error.type)) {
                    if (error.productName) {
                        errorsHtml += `<p><strong>Товар:</strong> ${error.productName}</p>`;
                    }
                    if (error.plu) {
                        errorsHtml += `<p><strong>PLU:</strong> ${error.plu}</p>`;
                    }
                    if (error.quantity) {
                        errorsHtml += `<p><strong>Количество:</strong> ${error.quantity}${error.unit || ''}</p>`;
                    }
                } else if (['высота паллета', 'не предоставлен паллет'].includes(error.type)) {
                    if (error.comment) {
                        errorsHtml += `<p>${error.comment}</p>`;
                    }
                }
                
                if (error.comment && !(['высота паллета', 'не предоставлен паллет'].includes(error.type) && error.comment)) {
                    errorsHtml += `<p><strong>Комментарий:</strong> ${error.comment}</p>`;
                }
                
                errorsHtml += `
                        </div>
                    </div>
                `;
            });
            
            errorsHtml += `<p><strong>Всего ошибок:</strong> ${check.errors.length}</p>`;
            container.innerHTML = errorsHtml;
        }
        
        if (fromHistory) {
            // Добавляем информацию о времени
            const startTime = new Date(check.start);
            const endTime = new Date(check.end);
            
            const startStr = startTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const endStr = endTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const timeInfo = `
                <div class="error-item">
                    <p><strong>Начало:</strong> ${startStr}</p>
                    <p><strong>Окончание:</strong> ${endStr}</p>
                    <p><strong>Длительность:</strong> ${check.duration}</p>
                </div>
            `;
            
            container.insertAdjacentHTML('afterbegin', timeInfo);
        }
        
        this.showModal('viewErrorsModal');
    }
    
    // ============ СОХРАНЕНИЕ ДАННЫХ ============
    saveTodayToHistory() {
        const today = new Date().toISOString().split('T')[0];
        
        this.allDaysHistory[today] = {
            work_start: this.workStartTime ? this.workStartTime.toISOString() : null,
            work_end: this.workEndTime ? this.workEndTime.toISOString() : null,
            pallets_checked: this.palletsChecked,
            checks: this.todayChecks.map(check => ({
                ...check,
                start: check.start.toISOString(),
                end: check.end.toISOString()
            }))
        };
        
        this.saveToStorage();
    }
    
    saveToStorage() {
        const data = {
            allDaysHistory: this.allDaysHistory,
            todayChecks: this.todayChecks.map(check => ({
                ...check,
                start: check.start.toISOString(),
                end: check.end ? check.end.toISOString() : null
            })),
            workStartTime: this.workStartTime ? this.workStartTime.toISOString() : null,
            workEndTime: this.workEndTime ? this.workEndTime.toISOString() : null,
            palletsChecked: this.palletsChecked,
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck ? {
                ...this.currentPalletCheck,
                start: this.currentPalletCheck.start.toISOString(),
                end: this.currentPalletCheck.end ? this.currentPalletCheck.end.toISOString() : null
            } : null
        };
        
        localStorage.setItem('palletTrackerData', JSON.stringify(data));
        this.showNotification('Данные сохранены', 'success');
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('palletTrackerData');
            if (!saved) return;
            
            const data = JSON.parse(saved);
            
            this.allDaysHistory = data.allDaysHistory || {};
            
            this.todayChecks = (data.todayChecks || []).map(check => ({
                ...check,
                start: new Date(check.start),
                end: check.end ? new Date(check.end) : null
            }));
            
            this.workStartTime = data.workStartTime ? new Date(data.workStartTime) : null;
            this.workEndTime = data.workEndTime ? new Date(data.workEndTime) : null;
            this.palletsChecked = data.palletsChecked || 0;
            this.isWorkingDay = data.isWorkingDay || false;
            
            // Восстанавливаем текущую проверку
            if (data.currentPalletCheck) {
                this.currentPalletCheck = {
                    ...data.currentPalletCheck,
                    start: new Date(data.currentPalletCheck.start),
                    end: data.currentPalletCheck.end ? new Date(data.currentPalletCheck.end) : null
                };
            }
            
            // Проверяем, не закончился ли рабочий день (если прошло больше 12 часов)
            if (this.isWorkingDay && this.workStartTime) {
                const hoursSinceStart = (new Date() - this.workStartTime) / 1000 / 60 / 60;
                if (hoursSinceStart > 12) {
                    this.isWorkingDay = false;
                    this.workEndTime = new Date(this.workStartTime.getTime() + (8 * 60 * 60 * 1000));
                }
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.allDaysHistory = {};
            this.todayChecks = [];
            this.currentPalletCheck = null;
        }
    }
    
    // ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
    formatTime(date) {
        if (!date) return '-';
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PalletTrackerApp();
    console.log('Приложение Pallet Tracker запущено');
});
