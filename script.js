/** OBJETO PRINCIPAL DE LA APP **/
const app = {
    users: [], // Array de usuarios
    logs: [], // Array de fichajes
    currentUser: null, // Sesión del usuario actual

    // FUNCIÓN DE INICIO
    init: function() {
        const storedUsers = localStorage.getItem('users'); 
        if (storedUsers) { 
            this.users = JSON.parse(storedUsers); 
            const admin = this.users.find(u => u.id === 'admin'); 
            if (admin && !admin.pass) admin.pass = 'admin123'; 
        } else { 
            this.users = [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }]; 
        }

        this.logs = JSON.parse(localStorage.getItem('logs')) || []; 
        this.saveData(); 

        // Poner mes actual por defecto en los filtros
        const now = new Date();
        const monthStr = now.toISOString().substring(0, 7);
        setTimeout(() => {
            if(document.getElementById('filter-date-emp')) document.getElementById('filter-date-emp').value = monthStr;
            if(document.getElementById('filter-date-admin-logs')) document.getElementById('filter-date-admin-logs').value = monthStr;
            if(document.getElementById('filter-date-admin-detail')) document.getElementById('filter-date-admin-detail').value = monthStr;
        }, 100);

        const savedSession = localStorage.getItem('session');
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession);
            this.setupUI(this.currentUser);
            this.nav('view-home');
        }
    },

    saveData: function() {
        localStorage.setItem('users', JSON.stringify(this.users)); 
        localStorage.setItem('logs', JSON.stringify(this.logs)); 
    },

    toggleMenu: function() {
        const isActive = document.getElementById('sidebar').classList.toggle('active'); 
        document.getElementById('overlay').style.display = isActive ? 'block' : 'none'; 
    },

    nav: function(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
        document.getElementById(viewId).classList.add('active'); 
        if (document.getElementById('sidebar').classList.contains('active')) this.toggleMenu(); 
        
        if(viewId === 'view-admin-status') this.renderAdminStatus(); 
        if(viewId === 'view-admin-employees') this.renderAdminUsers(); 
        if(viewId === 'view-admin-logs') this.renderAdminLogs(); 
        if(viewId === 'view-admin-by-employee') this.renderAdminByEmployee(); 
        if(viewId === 'view-employee') this.renderEmployeePanel(); 
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
        } else {
            alert("Acceso denegado: datos incorrectos"); 
        }
    },

    setupUI: function(user) {
        document.getElementById('menu-btn').style.display = 'block'; 
        document.getElementById('menu-user-name').innerText = user.name; 
        document.getElementById('menu-user-role').innerText = user.role === 'admin' ? 'Administrador' : 'Empleado'; 
        document.getElementById('admin-only-menu').style.display = (user.role === 'admin') ? 'block' : 'none'; 
        document.getElementById('login-user').value = ""; 
        document.getElementById('login-pass').value = "";
    },

    logout: function() {
        this.currentUser = null; 
        localStorage.removeItem('session');
        document.getElementById('menu-btn').style.display = 'none'; 
        this.nav('view-login'); 
    },

    // --- MEJORA: COPIAS DE SEGURIDAD ---
    downloadBackup: function() {
        const data = { users: this.users, logs: this.logs };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Copia_Seguridad_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    },

    importBackup: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            if (confirm("Se sobrescribirán todos los datos. ¿Continuar?")) {
                this.users = data.users;
                this.logs = data.logs;
                this.saveData();
                location.reload();
            }
        };
        reader.readAsText(file);
    },

    // --- MEJORA: FILTRADO MENSUAL ---
    filterLogsByMonth: function(logsArray, inputId) {
        const filterVal = document.getElementById(inputId).value; // YYYY-MM
        if (!filterVal) return logsArray;
        const [year, month] = filterVal.split('-');
        return logsArray.filter(l => {
            const dateParts = l.time.split(',')[0].split('/'); // DD/MM/AAAA
            return dateParts[1] === month && dateParts[2] === year;
        });
    },

    // --- MEJORA: EDICIÓN DE LOGS ---
    editLog: function(timestamp) {
        const log = this.logs.find(l => l.timestamp === timestamp);
        if (!log) return;
        const newTime = prompt("Editar fecha y hora (Ej: DD/MM/AAAA, HH:MM:SS)", log.time);
        if (newTime) {
            log.time = newTime;
            this.saveData();
            this.refreshCurrentView();
        }
    },

    refreshCurrentView: function() {
        const activeView = document.querySelector('.view.active').id;
        this.nav(activeView);
        if(document.getElementById('admin-employee-detail-card').style.display === 'block') this.refreshCurrentDetail();
    },

    refreshCurrentDetail: function() {
        const nameInDetail = document.getElementById('detail-employee-name').innerText;
        const empName = nameInDetail.replace('Jornadas de ', '');
        const user = this.users.find(u => u.name === empName);
        if (user) this.viewEmployeeDetail(user.id);
    },

    // --- GESTIÓN DE EMPLEADOS ---
    saveEmployee: function() {
        const nameInput = document.getElementById('new-emp-name').value.trim(); 
        const passInput = document.getElementById('new-emp-pass').value.trim(); 
        const editId = document.getElementById('edit-id').value; 

        if (!nameInput || !passInput) return alert("Rellena todos los campos");

        if (editId) { 
            const user = this.users.find(u => u.id === editId); 
            if (user) {
                user.name = nameInput; 
                user.pass = passInput; 
                user.id = nameInput.toLowerCase().replace(/\s+/g, ''); 
                alert("Cambios guardados");
            }
        } else { 
            const newId = nameInput.toLowerCase().replace(/\s+/g, ''); 
            if (this.users.find(u => u.id === newId)) return alert("Ya existe"); 
            this.users.push({ id: newId, name: nameInput, role: 'employee', pass: passInput }); 
            alert("Registrado");
        }
        this.saveData(); this.resetForm(); this.renderAdminUsers(); 
    },

    editEmployee: function(id) {
        const user = this.users.find(u => u.id === id); 
        if (!user) return; 
        document.getElementById('form-title').innerText = "editar empleado"; 
        document.getElementById('edit-id').value = user.id; 
        document.getElementById('new-emp-name').value = user.name; 
        document.getElementById('new-emp-pass').value = user.pass; 
        document.getElementById('btn-action-main').innerText = "guardar cambios"; 
        document.getElementById('btn-action-cancel').style.display = "block"; 
        window.scrollTo(0,0); 
    },

    resetForm: function() {
        document.getElementById('form-title').innerText = "crear empleado"; 
        document.getElementById('edit-id').value = ""; 
        document.getElementById('new-emp-name').value = ""; 
        document.getElementById('new-emp-pass').value = "";
        document.getElementById('btn-action-main').innerText = "registrar"; 
        document.getElementById('btn-action-cancel').style.display = "none"; 
    },

    deleteEmployee: function(id) {
        if (confirm("¿Borrar definitivamente?")) { 
            this.users = this.users.filter(u => u.id !== id); 
            this.saveData(); this.renderAdminUsers(); 
        }
    },

    // --- SISTEMA DE FICHADO ---
    punch: function(type) {
        if (!navigator.geolocation) return alert("GPS no disponible");
        const btn = type === 'ENTRADA' ? document.getElementById('btn-in') : document.getElementById('btn-out');
        const originalText = btn.innerText;
        btn.innerText = "Ubicando..."; btn.disabled = true;

        navigator.geolocation.getCurrentPosition((pos) => {
            const now = new Date();
            this.logs.push({
                userId: this.currentUser.id, userName: this.currentUser.name,
                type: type, time: now.toLocaleString(), timestamp: now.getTime(),
                coords: [pos.coords.latitude, pos.coords.longitude]
            });
            this.saveData(); this.renderEmployeePanel();
            btn.innerText = originalText; btn.disabled = false;
            alert("Fichaje OK: " + type);
        }, (err) => {
            btn.innerText = originalText; btn.disabled = false; alert("Error GPS");
        }, { enableHighAccuracy: true });
    },

    deleteLog: function(timestamp, viewToRefresh) {
        if (confirm("¿Eliminar permanentemente?")) {
            this.logs = this.logs.filter(l => l.timestamp !== timestamp);
            this.saveData();
            if (viewToRefresh === 'admin-logs') this.renderAdminLogs();
            if (viewToRefresh === 'admin-by-employee') this.refreshCurrentDetail();
            if (viewToRefresh === 'employee-panel') this.renderEmployeePanel();
        }
    },

    formatDuration: function(ms) {
        if (ms <= 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    },

    getPairedLogs: function(logsToProcess) {
        const sorted = [...logsToProcess].sort((a, b) => a.timestamp - b.timestamp);
        const paired = []; const openEntradas = {}; 

        sorted.forEach(log => {
            if (log.type === 'ENTRADA') openEntradas[log.userId] = log;
            else if (log.type === 'SALIDA') {
                const entry = openEntradas[log.userId];
                paired.push({ userName: log.userName, userId: log.userId, entry: entry || null, exit: log, duration: entry ? log.timestamp - entry.timestamp : 0 });
                delete openEntradas[log.userId];
            }
        });
        for (let id in openEntradas) paired.push({ userName: openEntradas[id].userName, userId: openEntradas[id].userId, entry: openEntradas[id], exit: null, duration: 0 });
        return paired.reverse(); 
    },

    // --- RENDERS ---
    renderAdminByEmployee: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-employee-detail-card').style.display = 'none';
        document.getElementById('admin-select-employee-list').innerHTML = emps.map(u => `
            <button class="btn-user-select" onclick="app.viewEmployeeDetail('${u.id}')">👤 ${u.name}</button>
        `).join('') || 'No hay empleados.';
    },

    viewEmployeeDetail: function(userId) {
        const user = this.users.find(u => u.id === userId);
        const uLogs = this.logs.filter(l => l.userId === userId);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-admin-detail');
        const paired = this.getPairedLogs(filtered);
        
        document.getElementById('detail-employee-name').innerText = `Jornadas de ${user.name}`;
        document.getElementById('admin-employee-logs-detail').innerHTML = paired.map(p => `
            <div class="user-row" style="flex-direction: column;">
                <div style="width:100%; display:flex; justify-content:space-between;">
                    <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️ E</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp}, 'admin-by-employee')">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️ S</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp}, 'admin-by-employee')">🗑️</button>` : ''}
                    </div>
                </div>
                <small>${p.entry ? 'E: ' + p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'S: ' + p.exit.time.split(',')[1] : 'En curso'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Total: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || 'Sin registros.';
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
            <div class="user-row" style="flex-direction: column;">
                <span>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</span>
                <small>${p.entry ? 'Ent: '+p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'Sal: '+p.exit.time.split(',')[1] : '...'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Total: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || 'Sin registros.';
    },

    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-users-list').innerHTML = emps.map(u => `
            <div class="user-row">
                <div><b>${u.name}</b><br><small>${u.id}</small></div>
                <div class="user-btns"><button class="btn-small btn-edit" onclick="app.editEmployee('${u.id}')">E</button><button class="btn-small btn-del" onclick="app.deleteEmployee('${u.id}')">X</button></div>
            </div>
        `).join('');
    },

    renderAdminLogs: function() {
        const filtered = this.filterLogsByMonth(this.logs, 'filter-date-admin-logs');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('admin-logs-list').innerHTML = paired.map(p => `
            <div class="user-row" style="flex-direction: column;">
                <div style="width:100%; display:flex; justify-content:space-between;">
                    <strong>👤 ${p.userName}</strong>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp}, 'admin-logs')">🗑️ E</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp}, 'admin-logs')">🗑️ S</button>` : ''}
                    </div>
                </div>
                <small>📅 ${p.entry ? p.entry.time : '--'} | 🏁 ${p.exit ? p.exit.time : 'En curso'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--success)">⏱️ Tiempo: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || 'Sin registros.';
    },

    generatePDF: function() {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.text("Informe de Jornadas", 14, 15);
        const logsToUse = this.currentUser.role === 'admin' ? this.logs : this.logs.filter(l => l.userId === this.currentUser.id);
        const filterId = this.currentUser.role === 'admin' ? 'filter-date-admin-logs' : 'filter-date-emp';
        const filtered = this.filterLogsByMonth(logsToUse, filterId);
        const paired = this.getPairedLogs(filtered);
        const data = paired.map(p => [p.userName, p.entry?p.entry.time:'--', p.exit?p.exit.time:'--', p.exit?this.formatDuration(p.duration):'--']);
        doc.autoTable({ head: [['Empleado', 'Entrada', 'Salida', 'Total']], body: data, startY: 20 });
        doc.save(`Informe_${document.getElementById(filterId).value}.pdf`);
    }
};

window.onload = () => app.init();