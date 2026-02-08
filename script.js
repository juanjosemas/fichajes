/** 
 * CONFIGURACIÓN DE FIREBASE (Datos reales de tu consola)
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

// Inicializamos la conexión con Firebase
try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database(); // Acceso a la base de datos sincronizada
} catch (e) {
    console.error("Error al conectar con Firebase: ", e);
}

/** OBJETO PRINCIPAL DE LA APP **/
const app = {
    users: [], // Empleados sincronizados desde la nube
    logs: [], // Fichajes sincronizados desde la nube
    currentUser: null, // Usuario logueado en este móvil

    // FUNCIÓN DE INICIO: Se ejecuta al abrir la app
    init: function() {
        // 1. ESCUCHA EN TIEMPO REAL: Firebase nos envía los datos cada vez que hay un cambio
        db.ref('/').on('value', (snapshot) => {
            const data = snapshot.val() || {}; // Si es null (vacío), usamos un objeto vacío
            
            // Cargamos usuarios y logs, o arrays vacíos si no existen
            this.users = data.users || [];
            this.logs = data.logs || [];
            
            // CORRECCIÓN: Si no hay ningún usuario (base de datos vacía), creamos el admin ahora mismo
            if (this.users.length === 0) {
                this.users = [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }];
                this.saveData(); // Lo subimos a la nube inmediatamente
            }
            
            // Actualizamos la pantalla actual para mostrar los datos recién bajados
            this.refreshCurrentView();
        }, (error) => {
            alert("Error de conexión: Revisa internet y las reglas de Firebase.");
        });

        // 2. CONFIGURACIÓN DE FILTROS: Mes actual por defecto
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setTimeout(() => {
            ['filter-date-emp', 'filter-date-admin-logs', 'filter-date-admin-detail'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = monthStr;
            });
        }, 300);

        // 3. PERSISTENCIA: Si el usuario no cerró sesión, entra directo
        const savedSession = localStorage.getItem('session');
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession);
            this.setupUI(this.currentUser);
            this.nav('view-home');
        }
    },

    // GUARDA LOS DATOS EN LA NUBE (Sincroniza todos los móviles)
    saveData: function() {
        db.ref('/').set({
            users: this.users,
            logs: this.logs
        }).catch(e => alert("Error al guardar: " + e.message));
    },

    // CONTROL DEL MENÚ SIDEBAR
    toggleMenu: function() {
        const isActive = document.getElementById('sidebar').classList.toggle('active'); 
        document.getElementById('overlay').style.display = isActive ? 'block' : 'none'; 
    },

    // NAVEGACIÓN ENTRE VISTAS
    nav: function(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
        const targetView = document.getElementById(viewId);
        if(targetView) targetView.classList.add('active'); 
        if (document.getElementById('sidebar').classList.contains('active')) this.toggleMenu(); 
        
        // Renderizamos según la pantalla
        if(viewId === 'view-admin-status') this.renderAdminStatus(); 
        if(viewId === 'view-admin-employees') this.renderAdminUsers(); 
        if(viewId === 'view-admin-logs') this.renderAdminLogs(); 
        if(viewId === 'view-admin-by-employee') this.renderAdminByEmployee(); 
        if(viewId === 'view-employee') this.renderEmployeePanel(); 
    },

    // LOGIN
    login: function() {
        const u = document.getElementById('login-user').value.trim().toLowerCase(); 
        const p = document.getElementById('login-pass').value.trim(); 
        
        // Buscamos en la lista sincronizada de la nube
        const user = this.users.find(user => user.id === u || user.name.toLowerCase() === u);

        if (user && user.pass === p) { 
            this.currentUser = user; 
            localStorage.setItem('session', JSON.stringify(this.currentUser));
            this.setupUI(user); 
            this.nav('view-home'); 
        } else {
            alert("Acceso denegado: usuario o clave incorrectos."); 
        }
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

    // --- FICHADO GPS ---
    punch: function(type) {
        if (!navigator.geolocation) return alert("GPS no disponible");
        const btn = type === 'ENTRADA' ? document.getElementById('btn-in') : document.getElementById('btn-out');
        const originalText = btn.innerText;
        btn.innerText = "Ubicando..."; btn.disabled = true;

        navigator.geolocation.getCurrentPosition((pos) => {
            const now = new Date();
            const newLog = {
                userId: this.currentUser.id, 
                userName: this.currentUser.name,
                type: type, 
                time: now.toLocaleString(), 
                timestamp: now.getTime(),
                coords: [pos.coords.latitude, pos.coords.longitude]
            };

            this.logs.push(newLog);
            this.saveData(); // Sincroniza
            
            btn.disabled = false;
            btn.innerText = originalText;
            alert("Fichaje realizado y guardado.");
        }, (err) => { 
            alert("Error GPS: Activa la ubicación."); 
            btn.disabled = false; 
            btn.innerText = originalText;
        }, { enableHighAccuracy: true, timeout: 10000 });
    },

    // --- COPIAS DE SEGURIDAD ---
    downloadBackup: function() {
        const data = { users: this.users, logs: this.logs };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Backup_Nube_${new Date().toLocaleDateString()}.json`;
        a.click();
    },

    importBackup: function(event) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm("¿Sobrescribir datos de la NUBE con esta copia?")) {
                    this.users = data.users; this.logs = data.logs;
                    this.saveData(); 
                }
            } catch(err) { alert("Archivo no válido"); }
        };
        reader.readAsText(event.target.files[0]);
    },

    // --- EDICIÓN Y BORRADO ---
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
            } catch (e) { alert("Formato incorrecto"); }
        }
    },

    deleteLog: function(timestamp) {
        if (confirm("¿Borrar definitivamente?")) {
            this.logs = this.logs.filter(l => l.timestamp !== timestamp);
            this.saveData();
        }
    },

    // --- CÁLCULOS Y FILTROS ---
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

    refreshCurrentView: function() {
        const active = document.querySelector('.view.active');
        if (active) this.nav(active.id);
        const detailCard = document.getElementById('admin-employee-detail-card');
        if (detailCard && detailCard.style.display === 'block') {
            const title = document.getElementById('detail-employee-name').innerText;
            const user = this.users.find(u => title.includes(u.name));
            if (user) this.viewEmployeeDetail(user.id);
        }
    },

    // --- RENDERS ---

    renderEmployeePanel: function() {
        const uLogs = this.logs.filter(l => l.userId === this.currentUser.id);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-emp');
        const paired = this.getPairedLogs(filtered);
        const lastLog = uLogs[uLogs.length - 1];
        const isWorking = lastLog && lastLog.type === 'ENTRADA';
        
        document.getElementById('status-badge').innerText = isWorking ? 'TRABAJANDO' : 'FUERA';
        document.getElementById('status-badge').style.background = isWorking ? 'var(--success)' : 'var(--danger)';
        document.getElementById('btn-in').style.display = isWorking ? 'none' : 'block';
        document.getElementById('btn-out').style.display = isWorking ? 'block' : 'none';

        document.getElementById('emp-history').innerHTML = paired.map(p => `
            <div class="user-row">
                <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                <small>${p.entry ? 'E: '+p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'S: '+p.exit.time.split(',')[1] : '...'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Total: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || '<p style="margin-top:10px">Sin registros este mes.</p>';
    },

    renderAdminByEmployee: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-select-employee-list').innerHTML = emps.map(u => `
            <button class="btn-user-select" onclick="app.viewEmployeeDetail('${u.id}')">👤 ${u.name}</button>
        `).join('') || 'No hay empleados registrados.';
    },

    viewEmployeeDetail: function(userId) {
        const user = this.users.find(u => u.id === userId);
        const uLogs = this.logs.filter(l => l.userId === userId);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-admin-detail');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('detail-employee-name').innerText = `Jornadas de ${user.name}`;
        document.getElementById('admin-employee-logs-detail').innerHTML = paired.map(p => `
            <div class="user-row">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                    <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp})">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp})">🗑️</button>` : ''}
                    </div>
                </div>
                <small>${p.entry ? 'Entrada: '+p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'Salida: '+p.exit.time.split(',')[1] : 'En curso'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Horas: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || '<p>Sin datos.</p>';
        document.getElementById('admin-employee-detail-card').style.display = 'block';
    },

    renderAdminStatus: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-status-list').innerHTML = emps.map(u => {
            const uLogs = this.logs.filter(l => l.userId === u.id);
            const isWorking = uLogs.length > 0 && uLogs[uLogs.length-1].type === 'ENTRADA';
            return `<div class="status-item ${isWorking ? 'status-working' : 'status-out'}"><b>${u.name}</b>: ${isWorking ? 'TRABAJANDO' : 'FUERA'}</div>`;
        }).join('') || 'Sin empleados registrados.';
    },

    renderAdminLogs: function() {
        const filtered = this.filterLogsByMonth(this.logs, 'filter-date-admin-logs');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('admin-logs-list').innerHTML = paired.map(p => `
            <div class="user-row">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                    <strong>👤 ${p.userName}</strong>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp})">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp})">🗑️</button>` : ''}
                    </div>
                </div>
                <small>E: ${p.entry ? p.entry.time : '--'} | S: ${p.exit ? p.exit.time : '...'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--success)">⏱️ ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || '<p>Sin datos este mes.</p>';
    },

    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-users-list').innerHTML = emps.map(u => `
            <div class="user-row" style="flex-direction:row; justify-content:space-between; align-items:center;">
                <div><b>${u.name}</b><br><small>ID: ${u.id}</small></div>
                <div class="user-btns">
                    <button class="btn-small btn-edit" onclick="app.editEmployee('${u.id}')">E</button>
                    <button class="btn-small btn-del" onclick="app.deleteEmployee('${u.id}')">X</button>
                </div>
            </div>
        `).join('') || 'Sin empleados registrados.';
    },

    saveEmployee: function() {
        const nameInput = document.getElementById('new-emp-name');
        const passInput = document.getElementById('new-emp-pass');
        const editId = document.getElementById('edit-id').value;
        const name = nameInput.value.trim();
        const pass = passInput.value.trim();
        
        if(!name || !pass) return alert("Faltan datos");
        
        if(editId){
            const user = this.users.find(u => u.id === editId);
            user.name = name; user.pass = pass;
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '');
            this.users.push({ id, name, role: 'employee', pass });
        }
        this.saveData(); 
        this.resetForm();
    },

    editEmployee: function(id) {
        const user = this.users.find(u => u.id === id);
        document.getElementById('form-title').innerText = "Editar empleado";
        document.getElementById('edit-id').value = user.id;
        document.getElementById('new-emp-name').value = user.name;
        document.getElementById('new-emp-pass').value = user.pass;
        document.getElementById('btn-action-cancel').style.display = "block";
    },

    resetForm: function() {
        document.getElementById('form-title').innerText = "Crear empleado";
        document.getElementById('edit-id').value = "";
        document.getElementById('new-emp-name').value = "";
        document.getElementById('new-emp-pass').value = "";
        document.getElementById('btn-action-cancel').style.display = "none";
    },

    deleteEmployee: function(id) {
        if(confirm("¿Borrar empleado?")){
            this.users = this.users.filter(u => u.id !== id);
            this.saveData(); 
        }
    },

    generateExcel: function() {
        const filterId = this.currentUser.role === 'admin' ? 'filter-date-admin-logs' : 'filter-date-emp';
        const filterVal = document.getElementById(filterId).value;
        const filtered = this.filterLogsByMonth(this.logs, filterId);
        const paired = this.getPairedLogs(filtered);

        const excelData = paired.map(p => ({
            "Empleado": p.userName,
            "Fecha": p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0],
            "Entrada": p.entry ? p.entry.time.split(',')[1].trim() : "---",
            "Salida": p.exit ? p.exit.time.split(',')[1].trim() : "En curso",
            "Total Horas": p.exit ? this.formatDuration(p.duration) : "---"
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Jornadas");
        XLSX.writeFile(workbook, `Fichajes_${filterVal}.xlsx`);
    }
};

// ARRANQUE
window.onload = () => app.init();