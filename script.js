// Класс для управления авторизацией
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.users = {
            // Базовые пользователи (в реальном приложении нужно хранить на сервере)
            'admin': { password: 'admin123', name: 'Администратор', role: 'admin' },
            'operator': { password: 'operator123', name: 'Оператор', role: 'operator' },
            'user': { password: 'user123', name: 'Пользователь', role: 'user' }
        };
        
        this.pendingConfirmCallback = null;
    }
    
    init() {
        this.setupEventListeners();
        this.checkAutoLogin();
    }
    
    setupEventListeners() {
        // Кнопка входа
        document.getElementById('loginButton').addEventListener('click', () => this.login());
        
        // Кнопка показа/скрытия пароля
        const togglePasswordBtn = document.getElementById('togglePassword');
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }
        
        // Ввод по Enter в полях формы
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }
    
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('togglePassword');
        
        if (!passwordInput || !toggleButton) return;
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
            toggleButton.setAttribute('title', 'Скрыть пароль');
        } else {
            passwordInput.type = 'password';
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
            toggleButton.setAttribute('title', 'Показать пароль');
        }
    }
    
    login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        console.log('Попытка входа:', { username, password, rememberMe });
        
        if (!username || !password) {
            this.showNotification('Введите имя пользователя и пароль', 'error');
            return;
        }
        
        // Проверка учетных данных
        if (this.users[username] && this.users[username].password === password) {
            this.currentUser = {
                username: username,
                name: this.users[username].name,
                role: this.users[username].role
            };
            this.isAuthenticated = true;
            
            // Сохраняем данные для автоматического входа
            if (rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify({
                    username: username,
                    rememberMe: true
                }));
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            // Сохраняем сессию
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.showApp();
            this.showNotification(`Добро пожаловать, ${this.currentUser.name}!`, 'success');
        } else {
            this.showNotification('Неверное имя пользователя или пароль', 'error');
            // Очищаем поле пароля при ошибке
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }
    
    logout() {
        this.showConfirmModal('Вы уверены, что хотите выйти?', () => {
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Очищаем сессию
            sessionStorage.removeItem('currentUser');
            
            this.showLogin();
            this.showNotification('Вы успешно вышли из системы', 'info');
            
            // Очищаем форму
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('rememberMe').checked = false;
        });
    }
    
    checkAutoLogin() {
        // Проверяем сохраненную сессию
        const savedUser = sessionStorage.getItem('currentUser');
        const rememberedUser = localStorage.getItem('rememberedUser');
        
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.isAuthenticated = true;
                this.showApp();
            } catch (e) {
                console.error('Ошибка при восстановлении сессии:', e);
                this.showLogin();
            }
        } else if (rememberedUser) {
            try {
                const remembered = JSON.parse(rememberedUser);
                if (remembered.rememberMe && this.users[remembered.username]) {
                    // Автоматически заполняем имя пользователя
                    document.getElementById('username').value = remembered.username;
                    document.getElementById('rememberMe').checked = true;
                    document.getElementById('password').focus();
                }
            } catch (e) {
                console.error('Ошибка при восстановлении запомненного пользователя:', e);
            }
        }
    }
    
    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        // Обновляем информацию о пользователе
        if (this.currentUser) {
            document.getElementById('currentUser').textContent = this.currentUser.name;
            document.getElementById('footerUser').textContent = this.currentUser.name;
        }
        
        // Инициализируем основное приложение
        if (window.app && window.app.initApp) {
            window.app.initApp();
        }
    }
    
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    showConfirmModal(message, callback) {
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmModal = document.getElementById('confirmModal');
        
        if (!confirmMessage || !confirmModal) return;
        
        confirmMessage.textContent = message;
        confirmModal.classList.add('active');
        this.pendingConfirmCallback = callback;
    }
    
    confirmAction() {
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
        }
        this.hideModal('confirmModal');
        this.pendingConfirmCallback = null;
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// Основной класс приложения (обновленный)
class PalletTrackerApp {
    constructor() {
        this.authManager = new AuthManager();
        this.workStartTime = null;
        this.workEndTime = null;
        this.isWorkingDay = false;
        this.currentPalletCheck = null;
        this.palletsChecked = 0;
        this.totalPalletsToCheck = 15;
        this.todayChecks = [];
        this.allDaysHistory = {};
        this.tempErrors = [];
        this.pendingConfirmCallback = null;
        this.todayStats = {
            totalPallets: 0,
            totalBoxes: 0,
            totalErrors: 0
        };
        
        // Инициализируем авторизацию
        this.authManager.init();
    }
    
    initApp() {
        console.log('Инициализация приложения для пользователя:', this.authManager.currentUser?.name);
        this.setupDate();
        this.setupEventListeners();
        this.loadFromStorage();
        this.updateDisplay();
        this.updateErrorFormVisibility();
        this.updateTodayStats();
    }
    
    setupDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('ru-RU', options);
        }
    }
    
    setupEventListeners() {
        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.authManager.logout());
        }
        
        // Кнопки рабочего времени
        document.getElementById('startWorkDay').addEventListener('click', () => this.startWorkDay());
        document.getElementById('endWorkDay').addEventListener('click', () => this.showEndWorkDayModal());
        document.getElementById('showHistory').addEventListener('click', () => this.showHistory());
        document.getElementById('saveData').addEventListener('click', () => this.saveToStorage());
        
        // Кнопки проверки паллетов
        document.getElementById('startPalletCheck').addEventListener('click', () => this.startPalletCheck());
        document.getElementById('endPalletCheck').addEventListener('click', () => this.askAboutErrors());
        
        // Ввод D-кода по Enter
        const palletCodeInput = document.getElementById('palletCode');
        if (palletCodeInput) {
            palletCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startPalletCheck();
            });
        }
        
        // Ввод количества коробов по Enter
        const boxCountInput = document.getElementById('boxCount');
        if (boxCountInput) {
            boxCountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startPalletCheck();
            });
        }
        
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
        document.getElementById('closePalletStats').addEventListener('click', () => this.hideModal('palletStatsModal'));
        
        // Обработчик клавиши Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
        
        // Клик по фону для закрытия модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal.id);
            });
        });
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        this.pendingConfirmCallback = null;
        this.authManager.pendingConfirmCallback = null;
    }
    
    // ============ МОДАЛЬНЫЕ ОКНА ПОДТВЕРЖДЕНИЯ ============
    showConfirmModal(message, callback) {
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmModal = document.getElementById('confirmModal');
        
        if (!confirmMessage || !confirmModal) return;
        
        confirmMessage.textContent = message;
        confirmModal.classList.add('active');
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
        if (!this.authManager.isAuthenticated) {
            this.showNotification('Требуется авторизация!', 'error');
            return;
        }
        
        this.workStartTime = new Date();
        this.isWorkingDay = true;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        this.currentPalletCheck = null;
        this.todayStats = {
            totalPallets: 0,
            totalBoxes: 0,
            totalErrors: 0
        };
        
        this.updateDisplay();
        this.enablePalletControls();
        this.showNotification('Рабочий день начат', 'success');
    }
    
    endWorkDay() {
        if (!this.authManager.isAuthenticated) {
            this.showNotification('Требуется авторизация!', 'error');
            return;
        }
        
        this.workEndTime = new Date();
        this.isWorkingDay = false;
        
        this.saveTodayToHistory();
        this.updateDisplay();
        this.disablePalletControls();
        this.showNotification('Рабочий день завершен', 'success');
    }
    
    // ============ ПРОВЕРКА ПАЛЛЕТОВ ============
    startPalletCheck() {
        if (!this.authManager.isAuthenticated) {
            this.showNotification('Требуется авторизация!', 'error');
            return;
        }
        
        console.log('Начало проверки паллета:', {
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck
        });
        
        if (!this.isWorkingDay) {
            this.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }
        
        const code = document.getElementById('palletCode').value.trim().toUpperCase();
        const boxCount = parseInt(document.getElementById('boxCount').value) || 0;
        
        // Проверка на обязательное количество коробов
        if (boxCount <= 0) {
            this.showNotification('Введите количество коробов (минимум 1)!', 'error');
            document.getElementById('boxCount').focus();
            return;
        }
        
        // Проверка на дублирование D-кода
        if (code) {
            // Проверяем валидность D-кода
            if (!code.startsWith('D') || code.length < 2 || !/^D\d+$/.test(code)) {
                this.showNotification('Неверный формат D-кода! Пример: D40505050', 'error');
                return;
            }
            
            // Проверяем, не проверялся ли уже этот паллет сегодня
            const isDuplicate = this.todayChecks.some(check => check.code === code);
            if (isDuplicate) {
                this.showNotification(`Паллет ${code} уже проверен сегодня!`, 'error');
                document.getElementById('palletCode').focus();
                return;
            }
        }
        
        if (this.currentPalletCheck) {
            this.showNotification('Завершите текущую проверку паллета!', 'error');
            return;
        }
        
        // Сбрасываем временные ошибки перед началом новой проверки
        this.tempErrors = [];
        
        // Формируем сообщение для подтверждения
        let confirmMessage = '';
        if (code) {
            confirmMessage = `Начать проверку паллета:\n${code}`;
        } else {
            confirmMessage = `Начать проверку без D-кода`;
        }
        
        confirmMessage += `\nКоличество коробов: ${boxCount}`;
        confirmMessage += '?';
        
        // Показываем модальное окно вместо confirm()
        this.showConfirmModal(confirmMessage, () => {
            this.currentPalletCheck = {
                code: code || `Без D-кода-${Date.now().toString().slice(-4)}`,
                boxCount: boxCount,
                start: new Date(),
                end: null,
                duration: null,
                errors: []
            };
            
            // Очищаем поля ввода
            document.getElementById('palletCode').value = '';
            document.getElementById('boxCount').value = '';
            
            this.updateCurrentCheckDisplay();
            this.updateButtonStates();
            this.showNotification(`Проверка паллета ${this.currentPalletCheck.code} начата`, 'success');
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
        this.resetErrorForm();
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
        
        if (productDetails) {
            if (['недостача', 'излишки', 'качество товара'].includes(errorType)) {
                productDetails.style.display = 'block';
            } else {
                productDetails.style.display = 'none';
            }
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
        
        // Обновляем статистику
        this.updateTodayStats();
        this.updateTodayChecksTable();
        this.updateDisplay();
        
        // Формируем сообщение
        let message = `Паллет ${this.currentPalletCheck.code} проверен!\n`;
        message += `Коробов: ${this.currentPalletCheck.boxCount}\n`;
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
    
    // ============ СТАТИСТИКА ============
    updateTodayStats() {
        this.todayStats.totalPallets = this.todayChecks.length;
        this.todayStats.totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        this.todayStats.totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        document.getElementById('totalPallets').textContent = this.todayStats.totalPallets;
        document.getElementById('totalBoxes').textContent = this.todayStats.totalBoxes;
        document.getElementById('totalErrors').textContent = this.todayStats.totalErrors;
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
        if (!display) return;
        
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
        const counter = document.getElementById('palletCounter');
        if (counter) {
            counter.textContent = `Паллетов проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
        }
    }
    
    updateProgressBar() {
        const progress = (this.palletsChecked / this.totalPalletsToCheck) * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }
    
    updateCurrentCheckDisplay() {
        const display = document.getElementById('currentCheckDisplay');
        if (!display) return;
        
        if (this.currentPalletCheck) {
            const startStr = this.formatTime(this.currentPalletCheck.start);
            let displayText = `
                <i class="fas fa-sync-alt fa-spin"></i>
                Проверяется: ${this.currentPalletCheck.code} (начато в ${startStr})
            `;
            
            // Добавляем информацию о количестве коробов
            if (this.currentPalletCheck.boxCount > 0) {
                displayText += `<br><i class="fas fa-box"></i> Коробов: ${this.currentPalletCheck.boxCount}`;
            }
            
            display.innerHTML = displayText;
        } else {
            display.innerHTML = '';
        }
    }
    
    updateButtonStates() {
        const startWorkBtn = document.getElementById('startWorkDay');
        const endWorkBtn = document.getElementById('endWorkDay');
        const startCheckBtn = document.getElementById('startPalletCheck');
        const endCheckBtn = document.getElementById('endPalletCheck');
        
        if (!startWorkBtn || !endWorkBtn || !startCheckBtn || !endCheckBtn) return;
        
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
        const startCheckBtn = document.getElementById('startPalletCheck');
        const endCheckBtn = document.getElementById('endPalletCheck');
        const startWorkBtn = document.getElementById('startWorkDay');
        const endWorkBtn = document.getElementById('endWorkDay');
        
        if (startCheckBtn) startCheckBtn.disabled = false;
        if (endCheckBtn) endCheckBtn.disabled = true;
        if (startWorkBtn) startWorkBtn.disabled = true;
        if (endWorkBtn) endWorkBtn.disabled = false;
        
        this.updateButtonStates();
    }
    
    disablePalletControls() {
        const startCheckBtn = document.getElementById('startPalletCheck');
        const endCheckBtn = document.getElementById('endPalletCheck');
        const startWorkBtn = document.getElementById('startWorkDay');
        const endWorkBtn = document.getElementById('endWorkDay');
        
        if (startCheckBtn) startCheckBtn.disabled = true;
        if (endCheckBtn) endCheckBtn.disabled = true;
        if (startWorkBtn) startWorkBtn.disabled = false;
        if (endWorkBtn) endWorkBtn.disabled = true;
        
        this.updateButtonStates();
    }
    
    enableEndWorkDay() {
        const endWorkBtn = document.getElementById('endWorkDay');
        if (endWorkBtn) {
            endWorkBtn.disabled = false;
        }
        this.updateButtonStates();
    }
    
    // ============ ТАБЛИЦА СЕГОДНЯШНИХ ПРОВЕРОК ============
    updateTodayChecksTable() {
        const tbody = document.getElementById('todayChecksBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.todayChecks.forEach((check, index) => {
            const row = document.createElement('tr');
            const startStr = this.formatTime(check.start);
            const endStr = this.formatTime(check.end);
            const hasErrors = check.errors && check.errors.length > 0;
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${check.code}</strong></td>
                <td>${check.boxCount || 0}</td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>${check.duration}</td>
                <td>
                    <span class="status-badge ${hasErrors ? 'status-warning' : 'status-success'}">
                        ${hasErrors ? 'Есть' : 'Нет'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-info view-stats-btn" data-index="${index}">
                        <i class="fas fa-chart-bar"></i> Статистика
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Добавить обработчики для кнопок просмотра статистики
        document.querySelectorAll('.view-stats-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.view-stats-btn').dataset.index);
                this.showPalletStats(index);
            });
        });
    }
    
    showPalletStats(index) {
        const check = this.todayChecks[index];
        
        const title = document.getElementById('palletStatsTitle');
        if (title) {
            title.textContent = `Статистика паллета ${check.code} (№${index + 1})`;
        }
        
        const statsInfo = document.getElementById('palletStatsInfo');
        const errorsList = document.getElementById('palletErrorsList');
        
        // Формируем статистику
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
        
        if (statsInfo) {
            statsInfo.innerHTML = `
                <p><strong>D-код:</strong> ${check.code}</p>
                <p><strong>Количество коробов:</strong> ${check.boxCount || 0}</p>
                <p><strong>Начало проверки:</strong> ${startStr}</p>
                <p><strong>Окончание проверки:</strong> ${endStr}</p>
                <p><strong>Длительность:</strong> ${check.duration}</p>
                <p><strong>Количество ошибок:</strong> ${check.errors ? check.errors.length : 0}</p>
            `;
        }
        
        // Формируем список ошибок
        if (errorsList) {
            if (!check.errors || check.errors.length === 0) {
                errorsList.innerHTML = `
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
                
                errorsList.innerHTML = errorsHtml;
            }
        }
        
        // Показываем модальное окно поверх всех
        this.showModal('palletStatsModal');
    }
    
    // ============ ИСТОРИЯ ============
    showHistory() {
        if (!this.authManager.isAuthenticated) {
            this.showNotification('Требуется авторизация!', 'error');
            return;
        }
        
        this.loadFromStorage();
        this.updateHistoryTable();
        this.showModal('historyModal');
    }
    
    updateHistoryTable() {
        const tbody = document.getElementById('historyBody');
        if (!tbody) return;
        
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
                let totalBoxes = 0;
                
                // Считаем общее количество коробов за день
                if (dayData.checks) {
                    totalBoxes = dayData.checks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
                }
                
                if (dayData.work_end) {
                    const endTime = new Date(dayData.work_end);
                    endStr = endTime.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const duration = (endTime - startTime) / 1000 / 60;
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
                    <td>${totalBoxes}</td>
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
        
        const title = document.getElementById('dayDetailsTitle');
        if (title) {
            title.textContent = `Проверки за ${dateDisplay}`;
        }
        
        // Информация о дне
        const dayInfo = document.getElementById('dayInfo');
        if (dayInfo) {
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
                
                const totalBoxes = dayData.checks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
                const totalErrors = dayData.checks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
                
                infoHtml += `<p><strong>Паллетов проверено:</strong> ${dayData.pallets_checked || 0}</p>`;
                infoHtml += `<p><strong>Коробов всего:</strong> ${totalBoxes}</p>`;
                infoHtml += `<p><strong>Ошибок всего:</strong> ${totalErrors}</p>`;
            }
            
            dayInfo.innerHTML = infoHtml;
        }
        
        // Таблица проверок за день
        const tbody = document.getElementById('dayChecksBody');
        if (tbody) {
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
                    <td>${check.boxCount || 0}</td>
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
        }
        
        this.showModal('dayDetailsModal');
    }
    
    // ============ ПОКАЗ ОШИБОК ============
    showPalletErrorsFromHistory(check, number) {
        this.showPalletErrorsModal(check, number, true);
    }
    
    showPalletErrorsModal(check, number, fromHistory = false) {
        const title = document.getElementById('viewErrorsTitle');
        if (title) {
            title.textContent = `Ошибки паллета ${check.code} (№${number})`;
        }
        
        const container = document.getElementById('errorsListContainer');
        if (!container) return;
        
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
            
            // Добавляем информацию о количестве коробов
            if (check.boxCount > 0) {
                errorsHtml += `<p><strong>Количество коробов:</strong> ${check.boxCount}</p>`;
            }
            
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
            
            let timeInfo = `
                <div class="error-item">
                    <p><strong>Начало:</strong> ${startStr}</p>
                    <p><strong>Окончание:</strong> ${endStr}</p>
                    <p><strong>Длительность:</strong> ${check.duration}</p>
                    <p><strong>Количество коробов:</strong> ${check.boxCount || 0}</p>
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
        if (!this.authManager.isAuthenticated) {
            this.showNotification('Требуется авторизация для сохранения!', 'error');
            return;
        }
        
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
            } : null,
            todayStats: this.todayStats
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
            
            this.todayChecks = (data.todayChecks || []).map(check => {
                try {
                    return {
                        ...check,
                        boxCount: check.boxCount || 0,
                        start: check.start ? new Date(check.start) : new Date(),
                        end: check.end ? new Date(check.end) : null
                    };
                } catch (e) {
                    console.warn('Ошибка при восстановлении даты проверки:', e);
                    return {
                        ...check,
                        boxCount: check.boxCount || 0,
                        start: new Date(),
                        end: check.end ? new Date() : null
                    };
                }
            });
            
            this.workStartTime = data.workStartTime ? new Date(data.workStartTime) : null;
            this.workEndTime = data.workEndTime ? new Date(data.workEndTime) : null;
            this.palletsChecked = data.palletsChecked || 0;
            this.isWorkingDay = data.isWorkingDay || false;
            this.todayStats = data.todayStats || {
                totalPallets: 0,
                totalBoxes: 0,
                totalErrors: 0
            };
            
            // Восстанавливаем текущую проверку
            if (data.currentPalletCheck) {
                this.currentPalletCheck = {
                    ...data.currentPalletCheck,
                    boxCount: data.currentPalletCheck.boxCount || 0,
                    start: new Date(data.currentPalletCheck.start),
                    end: data.currentPalletCheck.end ? new Date(data.currentPalletCheck.end) : null
                };
            }
            
            // Проверяем, не закончился ли рабочий день
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
            this.isWorkingDay = false;
            this.todayStats = {
                totalPallets: 0,
                totalBoxes: 0,
                totalErrors: 0
            };
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
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
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
