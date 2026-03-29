/** 
 * CONFIGURACIÓN DE FIREBASE 
 **/
const firebaseConfig = {
    apiKey: "AIzaSyCeSB3MXhuKiJ9XANBfHzwEWU1e8mlqB6k",
    authDomain: "fichajes-ec381.firebaseapp.com",
    databaseURL: "https://fichajes-ec381-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fichajes-ec381",
    storageBucket: "fichajes-ec381.firebasestorage.app",
    messagingSenderId: "650676337319",
    appId: "1:650676337319:web:18140b21d1103e4b20b982",
    measurementId: "G-NTBW1YL7KP"
};

// Inicializamos Firebase
try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database(); 
} catch (e) {
    console.error("Error Firebase: ", e);
}

/** OBJETO PRINCIPAL **/
const app = {
    users: [], 
    logs: [], 
    settings: { entryTime: "08:00", reminderMins: 10 }, // Valores por defecto
    currentUser: null, 

    // INICIO
    init: function() {
        db.ref('/').on('value', (snapshot) => {
            const data = snapshot.val() || {}; 
            this.users = data.users || [];
            this.logs = data.logs || [];
            this.settings = data.settings || { entryTime: "08:00", reminderMins: 10 };
            
            if (this.users.length === 0) {
                this.users = [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }];
                this.saveData(); 
            }
            this.refreshCurrentView();
            this.updateSettingsUI();
        });

        // Configuración inicial de meses
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setTimeout(() => {
            ['filter-date-emp', 'filter-date-admin-logs', 'filter-date-admin-detail'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = monthStr;
            });
        }, 300);

        const savedSession = localStorage.getItem('session');
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession);
            this.setupUI(this.currentUser);
            this.nav('view-home');
        }

        // BUCLE DE VERIFICACIÓN DE HORARIOS (Cada 1 minuto)
        setInterval(() => this.checkScheduleReminder(), 60000);
    },

    saveData: function() {
        db.ref('/').update({ users: this.users, logs: this.logs, settings: this.settings });
    },

    saveSettings: function() {
        const time = document.getElementById('settings-entry-time').value;
        const mins = document.getElementById('settings-reminder-mins').value;
        if(!time || !mins) return alert("Completa los datos de horario");
        this.settings = { entryTime: time, reminderMins: parseInt(mins) };
        this.saveData();
        this.showAlert("Horarios actualizados", "success");
    },

    updateSettingsUI: function() {
        const tInput = document.getElementById('settings-entry-time');
        const mInput = document.getElementById('settings-reminder-mins');
        if(tInput) tInput.value = this.settings.entryTime;
        if(mInput) mInput.value = this.settings.reminderMins;
    },

    // FUNCIÓN CRÍTICA: COMPRUEBA SI DEBE MOSTRAR EL AVISO
    checkScheduleReminder: function() {
        if (!this.currentUser || this.currentUser.role === 'admin') return;

        const now = new Date();
        const currentTotalMins = (now.getHours() * 60) + now.getMinutes();

        const [sHour, sMin] = this.settings.entryTime.split(':').map(Number);
        const targetTotalMins = (sHour * 60) + sMin;
        const reminderStartMins = targetTotalMins - this.settings.reminderMins;

        // Si estamos en el rango de tiempo de aviso Y el usuario no ha fichado hoy
        if (currentTotalMins >= reminderStartMins && currentTotalMins < targetTotalMins) {
            const todayStr = now.toLocaleDateString();
            const hasPunchedToday = this.logs.some(l => 
                l.userId === this.currentUser.id && 
                l.type === 'ENTRADA' && 
                new Date(l.timestamp).toLocaleDateString() === todayStr
            );

            if (!hasPunchedToday) {
                document.getElementById('alarm-banner').style.display = 'flex';
                this.playSound(true); // Sonido de alarma más fuerte
            }
        } else {
            document.getElementById('alarm-banner').style.display = 'none';
        }
    },

    toggleMenu: function() {
        const isActive = document.getElementById('sidebar').classList.toggle('active'); 
        document.getElementById('overlay').style.display = isActive ? 'block' : 'none'; 
    },

    nav: function(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
        const targetView = document.getElementById(viewId);
        if(targetView) targetView.classList.add('active'); 
        if (document.getElementById('sidebar').classList.contains('active')) this.toggleMenu(); 
        
        if(viewId === 'view-admin-status') this.renderAdminStatus(); 
        if(viewId === 'view-admin-employees') this.renderAdminUsers(); 
        if(viewId === 'view-admin-logs') this.renderAdminLogs(); 
        if(viewId === 'view-admin-by-employee') this.renderAdminByEmployee(); 
        if(viewId === 'view-employee') this.renderEmployeePanel(); 
        if(viewId === 'view-admin-settings') this.updateSettingsUI();
    },

    login: function() {
        const u = document.getElementById('login-user').value.trim().toLowerCase(); 
        const p = document.getElementById('login-pass').value.trim(); 
        const user = this.users.find(user => user.id === u || user.name.toLowerCase() === u);
        if (user && user.pass === p) { 
            this.currentUser = user; 
            localStorage.setItem('session', JSON.stringify(this.currentUser));
            this.setupUI(user); 
            this.nav('view-home'); 
            this.showAlert(`Hola, ${user.name}`, "success");
            this.checkScheduleReminder(); // Comprobar nada más entrar
        } else alert("Acceso denegado"); 
    },

    setupUI: function(user) {
        const btn = document.getElementById('menu-btn');
        if(btn) btn.style.display = 'block'; 
        document.getElementById('menu-user-name').innerText = user.name; 
        document.getElementById('menu-user-role').innerText = user.role === 'admin' ? 'Administrador' : 'Empleado'; 
        document.getElementById('admin-only-menu').style.display = (user.role === 'admin') ? 'block' : 'none'; 
    },

    logout: function() {
        this.currentUser = null; 
        localStorage.removeItem('session');
        document.getElementById('menu-btn').style.display = 'none'; 
        this.nav('view-login'); 
    },

    formatTimeDisplay: function(timeStr) {
        if (!timeStr) return "--:--";
        const parts = timeStr.split(', ');
        if (parts.length < 2) return timeStr;
        const timePart = parts[1];
        const timeParts = timePart.split(':');
        if (timeParts.length < 2) return timePart;
        return `${timeParts[0]}:${timeParts[1]}`; 
    },

    playSound: function(isAlarm = false) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            if (isAlarm) {
                // Sonido tipo alarma bi-tonal
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.5);
            } else {
                // Pitido simple de éxito
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.2);
            }
        } catch(e) { console.log("Audio bloqueado"); }
    },

    showAlert: function(message, type) {
        const container = document.getElementById('notification-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        container.appendChild(toast);
        this.playSound(false);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    },

    punch: function(type) {
        if (!navigator.geolocation) return alert("GPS no disponible");
        const btn = type === 'ENTRADA' ? document.getElementById('btn-in') : document.getElementById('btn-out');
        const originalText = btn.innerText;
        btn.innerText = "Ubicando..."; btn.disabled = true;
        navigator.geolocation.getCurrentPosition((pos) => {
            const now = new Date();
            const newLog = {
                userId: this.currentUser.id, userName: this.currentUser.name,
                type: type, time: now.toLocaleString(), timestamp: now.getTime(),
                coords: [pos.coords.latitude, pos.coords.longitude]
            };
            this.logs.push(newLog);
            this.saveData(); 
            btn.disabled = false;
            btn.innerText = originalText;
            document.getElementById('alarm-banner').style.display = 'none';
            const msg = type === 'ENTRADA' ? `✅ ENTRADA: ${this.formatTimeDisplay(newLog.time)}` : `🛑 SALIDA: ${this.formatTimeDisplay(newLog.time)}`;
            this.showAlert(msg, type === 'ENTRADA' ? 'success' : 'danger');
        }, (err) => { 
            alert("Error GPS: Activa la ubicación"); 
            btn.disabled = false; btn.innerText = originalText;
        }, { enableHighAccuracy: true, timeout: 10000 });
    },

    editLog: function(timestamp) {
        const log = this.logs.find(l => l.timestamp === timestamp);
        if (!log) return;
        const newTimeStr = prompt("Editar hora (Formato: DD/MM/AAAA, HH:MM:SS)", log.time);
        if (newTimeStr) {
            try {
                const parts = newTimeStr.split(', ');
                const dP = parts[0].split('/');
                const tP = parts[1].split(':');
                const nD = new Date(dP[2], dP[1]-1, dP[0], tP[0], tP[1], tP[2]);
                if (isNaN(nD.getTime())) throw new Error();
                log.time = newTimeStr;
                log.timestamp = nD.getTime();
                this.saveData(); 
                this.showAlert("Actualizado", "success");
            } catch (e) { alert("Formato incorrecto"); }
        }
    },

    deleteLog: function(timestamp) {
        if (confirm("¿Borrar?")) {
            this.logs = this.logs.filter(l => l.timestamp !== timestamp);
            this.saveData();
            this.showAlert("Eliminado", "danger");
        }
    },

    formatDuration: function(ms) {
        if (ms <= 0) return "0m";
        const min = Math.floor(ms / 60000);
        return `${Math.floor(min / 60)}h ${min % 60}m`;
    },

    getPairedLogs: function(logsToProcess) {
        const sorted = [...logsToProcess].sort((a, b) => a.timestamp - b.timestamp);
        const paired = []; const open = {};
        sorted.forEach(l => {
            if (l.type === 'ENTRADA') open[l.userId] = l;
            else {
                const entry = open[l.userId];
                paired.push({ userName: l.userName, userId: l.userId, entry: entry || null, exit: l, duration: entry ? l.timestamp - entry.timestamp : 0 });
                delete open[l.userId];
            }
        });
        for (let id in open) paired.push({ userName: open[id].userName, userId: open[id].userId, entry: open[id], exit: null, duration: 0 });
        return paired.reverse();
    },

    filterLogsByMonth: function(logsArray, inputId) {
        const el = document.getElementById(inputId);
        if(!el || !el.value) return logsArray; 
        const [year, month] = el.value.split('-').map(Number);
        return logsArray.filter(l => {
            const d = new Date(l.timestamp);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });
    },

    refreshCurrentDetail: function() {
        const titleEl = document.getElementById('detail-employee-name');
        if (!titleEl) return;
        const title = titleEl.innerText;
        const empName = title.replace('Jornadas de ', '');
        const user = this.users.find(u => u.name === empName);
        if (user) this.viewEmployeeDetail(user.id);
    },

    refreshCurrentView: function() {
        const active = document.querySelector('.view.active');
        if (active) this.nav(active.id);
        const detailCard = document.getElementById('admin-employee-detail-card');
        if (detailCard && detailCard.style.display === 'block') this.refreshCurrentDetail();
    },

    renderEmployeePanel: function() {
        const uLogs = this.logs.filter(l => l.userId === this.currentUser.id);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-emp');
        const paired = this.getPairedLogs(filtered);
        const isWorking = uLogs.length > 0 && uLogs[uLogs.length-1].type === 'ENTRADA';
        document.getElementById('status-badge').innerText = isWorking ? 'TRABAJANDO' : 'FUERA';
        document.getElementById('status-badge').style.background = isWorking ? 'var(--success)' : 'var(--danger)';
        document.getElementById('btn-in').style.display = isWorking ? 'none' : 'block';
        document.getElementById('btn-out').style.display = isWorking ? 'block' : 'none';
        document.getElementById('emp-history').innerHTML = paired.map(p => `
            <div class="user-row">
                <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                <small>${p.entry ? 'E: ' + this.formatTimeDisplay(p.entry.time) : '--'} | ${p.exit ? 'S: ' + this.formatTimeDisplay(p.exit.time) : '...'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Total: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || '<p>Sin registros.</p>';
    },

    renderAdminByEmployee: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-select-employee-list').innerHTML = emps.map(u => `<button class="btn-user-select" onclick="app.viewEmployeeDetail('${u.id}')">👤 ${u.name}</button>`).join('') || 'Sin empleados.';
    },

    viewEmployeeDetail: function(userId) {
        const user = this.users.find(u => u.id === userId);
        const uLogs = this.logs.filter(l => l.userId === userId);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-admin-detail');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('detail-employee-name').innerText = `Jornadas de ${user.name}`;
        document.getElementById('admin-employee-logs-detail').innerHTML = paired.map(p => `
            <div class="user-row">
                <div style="display:flex; justify-content:space-between; width:100%">
                    <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button>` : ''}
                    </div>
                </div>
                <small>E: ${p.entry ? this.formatTimeDisplay(p.entry.time) : '--'} | S: ${p.exit ? this.formatTimeDisplay(p.exit.time) : '...'}</small>
            </div>
        `).join('');
        document.getElementById('admin-employee-detail-card').style.display = 'block';
    },

    renderAdminStatus: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-status-list').innerHTML = emps.map(u => {
            const uLogs = this.logs.filter(l => l.userId === u.id);
            const isWorking = uLogs.length > 0 && uLogs[uLogs.length-1].type === 'ENTRADA';
            return `<div class="status-item ${isWorking ? 'status-working' : 'status-out'}"><b>${u.name}</b>: ${isWorking ? 'TRABAJANDO' : 'FUERA'}</div>`;
        }).join('');
    },

    renderAdminLogs: function() {
        const filtered = this.filterLogsByMonth(this.logs, 'filter-date-admin-logs');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('admin-logs-list').innerHTML = paired.map(p => `
            <div class="user-row">
                <strong>👤 ${p.userName}</strong>
                <small>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]} | E: ${p.entry ? this.formatTimeDisplay(p.entry.time) : '--'} | S: ${p.exit ? this.formatTimeDisplay(p.exit.time) : '...'}</small>
            </div>
        `).join('');
    },

    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-users-list').innerHTML = emps.map(u => `<div class="user-row"><b>${u.name}</b><button class="btn-small btn-del" onclick="app.deleteEmployee('${u.id}')">Eliminar</button></div>`).join('');
    },

    saveEmployee: function() {
        const name = document.getElementById('new-emp-name').value.trim();
        const pass = document.getElementById('new-emp-pass').value.trim();
        if(!name || !pass) return alert("Faltan datos");
        const id = name.toLowerCase().replace(/\s+/g, '');
        this.users.push({ id, name, role: 'employee', pass: pass });
        this.saveData(); this.resetForm();
    },

    deleteEmployee: function(id) {
        if(confirm("¿Borrar?")){
            this.users = this.users.filter(u => u.id !== id);
            this.saveData(); 
        }
    },

    resetForm: function() {
        document.getElementById('new-emp-name').value = "";
        document.getElementById('new-emp-pass').value = "";
    },

    downloadBackup: function() {
        const data = { users: this.users, logs: this.logs, settings: this.settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Backup_${new Date().toLocaleDateString()}.json`;
        a.click();
    },

    importBackup: function(event) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            if (confirm("¿Restaurar?")) {
                this.users = data.users; this.logs = data.logs; this.settings = data.settings || this.settings;
                this.saveData(); 
            }
        };
        reader.readAsText(event.target.files[0]);
    },

    generateExcel: function() {
        const filterId = this.currentUser.role === 'admin' ? 'filter-date-admin-logs' : 'filter-date-emp';
        const filtered = this.filterLogsByMonth(this.logs, filterId);
        const paired = this.getPairedLogs(filtered);
        const excelData = paired.map(p => ({
            "Empleado": p.userName,
            "Fecha": p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0],
            "Entrada": p.entry ? this.formatTimeDisplay(p.entry.time) : "---",
            "Salida": p.exit ? this.formatTimeDisplay(p.exit.time) : "---",
            "Total": p.exit ? this.formatDuration(p.duration) : "---"
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jornadas");
        XLSX.writeFile(wb, "Fichajes.xlsx");
    }
};

window.onload = () => app.init();