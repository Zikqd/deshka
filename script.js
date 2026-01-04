// Простая система авторизации
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = {
            'admin': { password: 'admin123', name: 'Администратор' },
            'operator': { password: 'operator123', name: 'Оператор' },
            'user': { password: 'user123', name: 'Пользователь' }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAutoLogin();
    }
    
    setupEventListeners() {
        // Кнопка входа
        document.getElementById('loginButton').addEventListener('click', () => this.login());
        
        // Кнопка показа/скрытия пароля
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePasswordVisibility());
        
        // Ввод по Enter
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
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
    
    login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        console.log('Попытка входа:', username);
        
        if (!username || !password) {
            this.showNotification('Введите имя пользователя и пароль', 'error');
            return;
        }
        
        // Проверка учетных данных
        if (this.users[username] && this.users[username].password === password) {
            this.currentUser = {
                username: username,
                name: this.users[username].name
            };
            
            // Сохраняем сессию
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Показываем основное приложение
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            // Обновляем информацию о пользователе
            document.getElementById('currentUser').textContent = this.currentUser.name;
            document.getElementById('footerUser').textContent = this.currentUser.name;
            
            // Инициализируем приложение
            if (window.app) {
                window.app.initApp();
            }
            
            this.showNotification(`Добро пожаловать, ${this.currentUser.name}!`, 'success');
        } else {
            this.showNotification('Неверное имя пользователя или пароль', 'error');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }
    
    logout() {
        sessionStorage.removeItem('currentUser');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        
        // Очищаем форму
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('rememberMe').checked = false;
        
        this.showNotification('Вы успешно вышли из системы', 'info');
    }
    
    checkAutoLogin() {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appContainer').style.display = 'block';
                
                document.getElementById('currentUser').textContent = this.currentUser.name;
                document.getElementById('footerUser').textContent = this.currentUser.name;
                
                if (window.app) {
                    window.app.initApp();
                }
            } catch (e) {
                console.error('Ошибка при восстановлении сессии:', e);
            }
        }
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
        
        console.log('Приложение создано');
    }
    
    initApp() {
        console.log('Инициализация приложения');
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
        console.log('Настройка обработчиков событий');
        
        // Кнопка выхода
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (window.authManager) {
                window.authManager.logout();
            }
        });
        
        // Кнопки рабочего времени
        document.getElementById('startWorkDay').addEventListener('click', () => this.startWorkDay());
        document.getElementById('endWorkDay').addEventListener('click', () => this.showEndWorkDayModal());
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
        
        // Закрытие модальных окон
        document.getElementById('closeConfirmModal').addEventListener('click', () => this.hideModal('confirmModal'));
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideModal('confirmModal'));
    }
    
    // ============ РАБОЧИЙ ДЕНЬ ============
    startWorkDay() {
        this.workStartTime = new Date();
        this.isWorkingDay = true;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        this.currentPalletCheck = null;
        
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
    
    // ============ ПРОВЕРКА ПАЛЛЕТОВ ============
    startPalletCheck() {
        const code = document.getElementById('palletCode').value.trim().toUpperCase();
        const boxCount = parseInt(document.getElementById('boxCount').value) || 0;
        
        if (!this.isWorkingDay) {
            this.showNotification('Сначала начните рабочий день!', 'error');
            return;
        }
        
        if (boxCount <= 0) {
            this.showNotification('Введите количество коробов (минимум 1)!', 'error');
            document.getElementById('boxCount').focus();
            return;
        }
        
        if (code) {
            if (!code.startsWith('D') || code.length < 2 || !/^D\d+$/.test(code)) {
                this.showNotification('Неверный формат D-кода! Пример: D40505050', 'error');
                return;
            }
            
            const isDuplicate = this.todayChecks.some(check => check.code === code);
            if (isDuplicate) {
                this.showNotification(`Паллет ${code} уже проверен сегодня!`, 'error');
                return;
            }
        }
        
        if (this.currentPalletCheck) {
            this.showNotification('Завершите текущую проверку паллета!', 'error');
            return;
        }
        
        this.showConfirmModal(`Начать проверку паллета: ${code || 'Без D-кода'}\nКоличество коробов: ${boxCount}?`, () => {
            this.currentPalletCheck = {
                code: code || `Без D-кода-${Date.now().toString().slice(-4)}`,
                boxCount: boxCount,
                start: new Date(),
                end: null,
                duration: null,
                errors: []
            };
            
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
        
        this.showModal('errorModal');
    }
    
    showErrorForm() {
        this.hideModal('errorModal');
        this.showNotification('Форма ошибок еще не реализована', 'info');
        // Временно завершаем проверку без ошибок
        setTimeout(() => this.endPalletCheckWithErrors([]), 1000);
    }
    
    endPalletCheckWithErrors(errors) {
        if (!this.currentPalletCheck) return;
        
        this.hideModal('errorModal');
        
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
        
        this.currentPalletCheck = null;
        this.updateCurrentCheckDisplay();
        this.updateButtonStates();
    }
    
    // ============ ОТОБРАЖЕНИЕ ДАННЫХ ============
    updateDisplay() {
        this.updateWorkTimeDisplay();
        this.updatePalletCounter();
        this.updateProgressBar();
        this.updateButtonStates();
        this.updateTodayChecksTable();
        this.updateCurrentCheckDisplay();
        this.updateTodayStats();
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
            let displayText = `
                <i class="fas fa-sync-alt fa-spin"></i>
                Проверяется: ${this.currentPalletCheck.code} (начато в ${startStr})
            `;
            
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
        
        startWorkBtn.disabled = this.isWorkingDay;
        endWorkBtn.disabled = !this.isWorkingDay;
        startCheckBtn.disabled = !this.isWorkingDay || this.currentPalletCheck !== null;
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
                    <button class="btn btn-small btn-info" onclick="alert('Статистика паллета ${check.code}')">
                        <i class="fas fa-chart-bar"></i> Статистика
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    updateTodayStats() {
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        document.getElementById('totalPallets').textContent = totalPallets;
        document.getElementById('totalBoxes').textContent = totalBoxes;
        document.getElementById('totalErrors').textContent = totalErrors;
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
            todayChecks: this.todayChecks,
            workStartTime: this.workStartTime,
            workEndTime: this.workEndTime,
            palletsChecked: this.palletsChecked,
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck
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
            this.todayChecks = data.todayChecks || [];
            this.workStartTime = data.workStartTime ? new Date(data.workStartTime) : null;
            this.workEndTime = data.workEndTime ? new Date(data.workEndTime) : null;
            this.palletsChecked = data.palletsChecked || 0;
            this.isWorkingDay = data.isWorkingDay || false;
            this.currentPalletCheck = data.currentPalletCheck || null;
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
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
    
    showConfirmModal(message, callback) {
        this.pendingConfirmCallback = callback;
        document.getElementById('confirmMessage').textContent = message;
        this.showModal('confirmModal');
    }
    
    confirmAction() {
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
        }
        this.hideModal('confirmModal');
        this.pendingConfirmCallback = null;
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
    console.log('Документ загружен');
    window.authManager = new AuthManager();
    window.app = new PalletTrackerApp();
    console.log('Приложения инициализированы');
});
