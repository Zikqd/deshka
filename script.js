// Система авторизации
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
            else {
            // Если приложение не существует, создаем новое
            window.app = new PalletTrackerApp();
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
            } else {
                // Если приложение не существует, создаем новое
                window.app = new PalletTrackerApp();
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
        this.currentPalletStatsIndex = null;
        
        this.settings = {
            rcName: 'Распределительный центр',
            rcCode: 'РЦ-001',
            specialistName: 'Иванов И.И.',
            specialistEmail: 'ivanov@example.com',
            targetPallets: 15
        };
        
        console.log('Приложение создано');
    }
    
    initApp() {
        console.log('Инициализация приложения');
        this.setupDate();
        this.setupEventListeners();
        this.loadFromStorage();
        this.loadSettings();
        this.updateDisplay();
        this.updateErrorFormVisibility();
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
        
        // Кнопка настроек
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Кнопки рабочего времени
        document.getElementById('startWorkDay').addEventListener('click', () => this.startWorkDay());
        document.getElementById('endWorkDay').addEventListener('click', () => this.showEndWorkDayModal());
        document.getElementById('showHistory').addEventListener('click', () => this.showHistoryModal());
        // ДОБАВИТЬ ЭТУ СТРОЧКУ:
        document.getElementById('resetDay').addEventListener('click', () => this.resetWorkDay());
        document.getElementById('saveData').addEventListener('click', () => this.saveToStorage());
        
        // Кнопки проверки паллетов
        document.getElementById('startPalletCheck').addEventListener('click', () => this.startPalletCheck());
        document.getElementById('endPalletCheck').addEventListener('click', () => this.askAboutErrors());
        
        // Кнопки экспорта
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('generateAct').addEventListener('click', () => this.generateAct());
        document.getElementById('generateLetter').addEventListener('click', () => this.generateLetter());
        
        // Ввод D-кода по Enter
        document.getElementById('palletCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startPalletCheck();
        });
        
        // Ввод количества коробов по Enter
        document.getElementById('boxCount').addEventListener('keypress', (e) => {
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
        
        // Настройки
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.hideModal('settingsModal'));
        
        // Закрытие модальных окон
        document.getElementById('closePalletStats').addEventListener('click', () => this.hideModal('palletStatsModal'));
        document.getElementById('closeHistory').addEventListener('click', () => this.hideModal('historyModal'));
        document.getElementById('closeConfirmModal').addEventListener('click', () => this.hideModal('confirmModal'));
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideModal('confirmModal'));
        
        // Клик по фону для закрытия модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal.id);
            });
        });
        
        // Обработчик клавиши Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }
    
    showSettingsModal() {
        // Загружаем текущие настройки в форму
        document.getElementById('rcName').value = this.settings.rcName;
        document.getElementById('rcCode').value = this.settings.rcCode;
        document.getElementById('specialistName').value = this.settings.specialistName;
        document.getElementById('specialistEmail').value = this.settings.specialistEmail;
        document.getElementById('targetPallets').value = this.settings.targetPallets;
        
        this.showModal('settingsModal');
    }
    
    saveSettings() {
        this.settings = {
            rcName: document.getElementById('rcName').value || 'Распределительный центр',
            rcCode: document.getElementById('rcCode').value || 'РЦ-001',
            specialistName: document.getElementById('specialistName').value || 'Иванов И.И.',
            specialistEmail: document.getElementById('specialistEmail').value || 'ivanov@example.com',
            targetPallets: parseInt(document.getElementById('targetPallets').value) || 15
        };
        
        this.totalPalletsToCheck = this.settings.targetPallets;
        
        localStorage.setItem('palletTrackerSettings', JSON.stringify(this.settings));
        this.hideModal('settingsModal');
        this.updateDisplay();
        this.showNotification('Настройки сохранены', 'success');
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('palletTrackerSettings');
            if (saved) {
                this.settings = JSON.parse(saved);
                this.totalPalletsToCheck = this.settings.targetPallets;
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
    
    // ============ МОДАЛЬНЫЕ ОКНА ============
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        });
        this.pendingConfirmCallback = null;
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
    
    // ============ РАБОЧИЙ ДЕНЬ ============
    startWorkDay() {
        this.workStartTime = new Date();
        this.isWorkingDay = true;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        this.currentPalletCheck = null;
        
        // Скрываем панель экспорта
        document.getElementById('exportSection').style.display = 'none';
        
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
        resetWorkDay() {
    this.showConfirmModal('Вы уверены, что хотите сбросить текущий рабочий день? Все данные будут потеряны.', () => {
        this.workStartTime = null;
        this.workEndTime = null;
        this.isWorkingDay = false;
        this.currentPalletCheck = null;
        this.palletsChecked = 0;
        this.todayChecks = [];
        this.tempErrors = [];
        
        // Скрываем панель экспорта
        document.getElementById('exportSection').style.display = 'none';
        
        this.updateDisplay();
        this.disablePalletControls();
        this.showNotification('Рабочий день сброшен', 'info');
    });
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
        
        this.tempErrors = [];
        
        const palletCode = code || `Без D-кода-${Date.now().toString().slice(-4)}`;
        this.showConfirmModal(`Начать проверку паллета: ${palletCode}\nКоличество коробов: ${boxCount}?`, () => {
            this.currentPalletCheck = {
                code: palletCode,
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
        this.resetErrorForm();
        this.updateErrorFormVisibility();
        this.showModal('errorDetailsModal');
    }
    
    resetErrorForm() {
        document.querySelector('input[name="errorType"][value="недостача"]').checked = true;
        document.getElementById('productPLU').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('productUnit').value = 'шт';
        document.getElementById('errorComment').value = '';
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
        
        
        
        const errorData = {
            type: errorType,
            comment: comment || ''
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
                text += ` (${error.comment.length > 30 ? error.comment.substring(0, 30) + '...' : error.comment})`;
            }
            
            li.innerHTML = `
                <span>${text}</span>
                <button class="remove-error" data-index="${index}">× Удалить</button>
            `;
            
            list.appendChild(li);
        });
        
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
        this.hideModal('errorDetailsModal');
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
        
        let message = `Паллет ${this.currentPalletCheck.code} проверен!\n`;
        message += `Коробов: ${this.currentPalletCheck.boxCount}\n`;
        message += `Длительность: ${this.currentPalletCheck.duration}\n`;
        message += `Проверено: ${this.palletsChecked}/${this.totalPalletsToCheck}`;
        
        if (errors.length > 0) {
            message += `\nОшибок: ${errors.length}`;
        }
        
        if (this.palletsChecked >= this.totalPalletsToCheck) {
            message += '\n✅ Все паллеты проверены!';
            this.enableEndWorkDay();
            this.showExportPanel();
        }
        
        this.showNotification(message, 'success');
        
        this.currentPalletCheck = null;
        this.tempErrors = [];
        this.updateCurrentCheckDisplay();
        this.updateButtonStates();
    }
    
    showExportPanel() {
        document.getElementById('exportSection').style.display = 'block';
    }
    
    // ============ СТАТИСТИКА ПАЛЛЕТА ============
    showPalletStats(index) {
        this.currentPalletStatsIndex = index;
        const check = this.todayChecks[index];
        
        document.getElementById('palletStatsTitle').textContent = 
            `Статистика паллета ${check.code} (№${index + 1})`;
        
        const statsInfo = document.getElementById('palletStatsInfo');
        const errorsList = document.getElementById('palletErrorsList');
        
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
        
        statsInfo.innerHTML = `
            <p><strong>D-код паллета:</strong> ${check.code}</p>
            <p><strong>Количество коробов:</strong> ${check.boxCount || 0}</p>
            <p><strong>Начало проверки:</strong> ${startStr}</p>
            <p><strong>Окончание проверки:</strong> ${endStr}</p>
            <p><strong>Длительность проверки:</strong> ${check.duration}</p>
            <p><strong>Количество ошибок:</strong> ${check.errors ? check.errors.length : 0}</p>
        `;
        
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
                }
                
                if (error.comment) {
                    errorsHtml += `<p><strong>Комментарий:</strong> ${error.comment}</p>`;
                }
                
                errorsHtml += `
                        </div>
                    </div>
                `;
            });
            
            errorsList.innerHTML = errorsHtml;
        }
        
        this.showModal('palletStatsModal');
    }
    
    // ============ ИСТОРИЯ ПРОВЕРОК ============
    showHistoryModal() {
        this.updateHistoryTable();
        this.showModal('historyModal');
    }
    
    updateHistoryTable() {
        const tbody = document.getElementById('historyBody');
        tbody.innerHTML = '';
        
        const dates = Object.keys(this.allDaysHistory).sort((a, b) => b.localeCompare(a));
        
        if (dates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-history" style="font-size: 2rem; color: #a0aec0; margin-bottom: 10px;"></i>
                        <p>История проверок пуста</p>
                    </td>
                </tr>
            `;
            return;
        }
        
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
                `;
                
                tbody.appendChild(row);
            }
        });
    }
    
    // ============ ЭКСПОРТ ДАННЫХ ============
    exportToExcel() {
        if (this.todayChecks.length === 0) {
            this.showNotification('Нет данных для экспорта', 'error');
            return;
        }
        
        try {
            // Создаем данные для Excel
            const wsData = [
                ['Отчет о проверке паллетов', '', '', '', '', '', ''],
                ['Дата:', new Date().toLocaleDateString('ru-RU'), '', '', '', '', ''],
                ['РЦ:', this.settings.rcName, 'Код РЦ:', this.settings.rcCode, '', '', ''],
                ['Специалист КРО:', this.settings.specialistName, 'Email:', this.settings.specialistEmail, '', '', ''],
                ['', '', '', '', '', '', ''],
                ['№', 'D-код', 'Коробов', 'Начало', 'Окончание', 'Длительность', 'Ошибки']
            ];
            
            // Добавляем данные проверок
            this.todayChecks.forEach((check, index) => {
                const errorsCount = check.errors ? check.errors.length : 0;
                wsData.push([
                    index + 1,
                    check.code,
                    check.boxCount || 0,
                    this.formatTime(new Date(check.start)),
                    this.formatTime(new Date(check.end)),
                    check.duration,
                    errorsCount > 0 ? `${errorsCount} ошибок` : 'Нет'
                ]);
            });
            
            // Добавляем итоги
            const totalPallets = this.todayChecks.length;
            const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
            const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
            
            wsData.push(['', '', '', '', '', '', '']);
            wsData.push(['ИТОГО:', totalPallets, 'паллетов', totalBoxes, 'коробов', totalErrors, 'ошибок']);
            
            // Создаем рабочий лист
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Создаем книгу
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Проверки паллетов");
            
            // Генерируем имя файла
            const fileName = `Проверка_паллетов_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.xlsx`;
            
            // Сохраняем файл
            XLSX.writeFile(wb, fileName);
            
            this.showNotification('Excel файл успешно скачан', 'success');
        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            this.showNotification('Ошибка при экспорте в Excel', 'error');
        }
    }
    
    generateAct() {
        if (this.todayChecks.length === 0) {
            this.showNotification('Нет данных для формирования акта', 'error');
            return;
        }
        
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        const actContent = `АКТ ПРОВЕРКИ ПАЛЛЕТОВ № ${new Date().getTime()}
            
Дата составления: ${new Date().toLocaleDateString('ru-RU')}
            
1. Распределительный центр: ${this.settings.rcName}
2. Код РЦ: ${this.settings.rcCode}
3. Специалист КРО: ${this.settings.specialistName}
            
РЕЗУЛЬТАТЫ ПРОВЕРКИ:
            
1. Всего проверено паллетов: ${totalPallets}
2. Всего проверено коробов: ${totalBoxes}
3. Обнаружено ошибок: ${totalErrors}
            
Детали проверки:
${this.todayChecks.map((check, index) => `
${index + 1}. Паллет ${check.code}:
   - Коробов: ${check.boxCount || 0}
   - Время проверки: ${check.duration}
   - Ошибок: ${check.errors ? check.errors.length : 0}
`).join('')}
            
Подпись специалиста КРО: ____________________
            
Дата: ${new Date().toLocaleDateString('ru-RU')}`;
        
        this.downloadTextFile(`Акт_проверки_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.txt`, actContent);
        this.showNotification('Акт проверки сформирован', 'success');
    }
    
    generateLetter() {
        if (this.todayChecks.length === 0) {
            this.showNotification('Нет данных для формирования письма', 'error');
            return;
        }
        
        const totalPallets = this.todayChecks.length;
        const totalBoxes = this.todayChecks.reduce((sum, check) => sum + (check.boxCount || 0), 0);
        const totalErrors = this.todayChecks.reduce((sum, check) => sum + (check.errors ? check.errors.length : 0), 0);
        
        const letterContent = `Уважаемые коллеги,
            
Направляем результаты проверки паллетов в РЦ ${this.settings.rcName} (${this.settings.rcCode}).
            
Дата проверки: ${new Date().toLocaleDateString('ru-RU')}
Специалист КРО: ${this.settings.specialistName}
            
Результаты проверки:
- Проверено паллетов: ${totalPallets}
- Проверено коробов: ${totalBoxes}
- Обнаружено ошибок: ${totalErrors}
            
${totalErrors > 0 ? 'Обнаружены следующие проблемы, требующие внимания:' : 'Ошибок не обнаружено. Все паллеты соответствуют требованиям.'}
            
${totalErrors > 0 ? this.todayChecks.filter(check => check.errors && check.errors.length > 0)
    .map(check => `Паллет ${check.code}: ${check.errors.length} ошибок`)
    .join('\n') : ''}
            
Просим принять необходимые меры по устранению выявленных замечаний.
            
С уважением,
${this.settings.specialistName}
Специалист КРО
${this.settings.specialistEmail}`;
        
        this.downloadTextFile(`Письмо_результатов_${this.settings.rcCode}_${new Date().toISOString().slice(0,10)}.txt`, letterContent);
        this.showNotification('Письмо результатов сформировано', 'success');
    }
    
    downloadTextFile(filename, content) {
        const element = document.createElement('a');
        const file = new Blob([content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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
            workStartTime: this.workStartTime ? this.workStartTime.toISOString() : null,
            workEndTime: this.workEndTime ? this.workEndTime.toISOString() : null,
            palletsChecked: this.palletsChecked,
            isWorkingDay: this.isWorkingDay,
            currentPalletCheck: this.currentPalletCheck,
            tempErrors: this.tempErrors
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
            this.tempErrors = data.tempErrors || [];
            
            // Восстанавливаем объекты Date из строк
            if (this.currentPalletCheck && this.currentPalletCheck.start) {
                this.currentPalletCheck.start = new Date(this.currentPalletCheck.start);
            }
            
            if (this.currentPalletCheck && this.currentPalletCheck.end) {
                this.currentPalletCheck.end = new Date(this.currentPalletCheck.end);
            }
            
            // Конвертируем даты в todayChecks
            this.todayChecks = this.todayChecks.map(check => ({
                ...check,
                start: new Date(check.start),
                end: new Date(check.end)
            }));
            
            // Показываем панель экспорта если все паллеты проверены
            if (this.palletsChecked >= this.totalPalletsToCheck && this.todayChecks.length > 0) {
                this.showExportPanel();
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
    
    // ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
    formatTime(date) {
        if (!date || !(date instanceof Date) || isNaN(date)) return '-';
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
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
