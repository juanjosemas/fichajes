/** OBJETO PRINCIPAL DE LA APP **/
const app = {
    users: [], // Array donde guardamos la lista de empleados
    logs: [], // Array donde guardamos todos los fichajes (historial)
    currentUser: null, // Variable para saber quién tiene la sesión iniciada

    // FUNCIÓN DE INICIO (Se ejecuta al cargar la página)
    init: function() {
        // 1. Cargamos los usuarios desde la memoria del navegador (localStorage)
        const storedUsers = localStorage.getItem('users'); 
        if (storedUsers) { 
            this.users = JSON.parse(storedUsers); 
            // Nos aseguramos de que el administrador siempre tenga una clave por defecto
            const admin = this.users.find(u => u.id === 'admin'); 
            if (admin && !admin.pass) admin.pass = 'admin123'; 
        } else { 
            // Si es la primerísima vez, creamos el usuario admin por defecto
            this.users = [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }]; 
        }

        // 2. Cargamos el historial de fichajes
        this.logs = JSON.parse(localStorage.getItem('logs')) || []; 
        this.saveData(); // Guardamos para asegurar consistencia

        // 3. Configuramos los filtros de fecha al mes actual
        const now = new Date();
        const monthStr = now.toISOString().substring(0, 7); // Formato "YYYY-MM"
        
        // Usamos un pequeño retraso para asegurar que el HTML esté listo
        setTimeout(() => {
            if(document.getElementById('filter-date-emp')) document.getElementById('filter-date-emp').value = monthStr;
            if(document.getElementById('filter-date-admin-logs')) document.getElementById('filter-date-admin-logs').value = monthStr;
            if(document.getElementById('filter-date-admin-detail')) document.getElementById('filter-date-admin-detail').value = monthStr;
        }, 100);

        // 4. COMPROBACIÓN DE SESIÓN (Para no tener que loguear siempre)
        const savedSession = localStorage.getItem('session');
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession); // Restauramos el usuario
            this.setupUI(this.currentUser); // Preparamos los menús
            this.nav('view-home'); // Vamos directos al inicio
        }
    },

    // GUARDAR DATOS EN MEMORIA LOCAL
    saveData: function() {
        localStorage.setItem('users', JSON.stringify(this.users)); 
        localStorage.setItem('logs', JSON.stringify(this.logs)); 
    },

    // CONTROL DEL MENÚ LATERAL
    toggleMenu: function() {
        const isActive = document.getElementById('sidebar').classList.toggle('active'); 
        document.getElementById('overlay').style.display = isActive ? 'block' : 'none'; 
    },

    // NAVEGACIÓN ENTRE VISTAS
    nav: function(viewId) {
        // Ocultamos todas las secciones
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
        // Mostramos la sección que queremos ver
        document.getElementById(viewId).classList.add('active'); 
        // Cerramos el menú si estaba abierto
        if (document.getElementById('sidebar').classList.contains('active')) this.toggleMenu(); 
        
        // Actualizamos los datos específicos de la vista cargada
        if(viewId === 'view-admin-status') this.renderAdminStatus(); 
        if(viewId === 'view-admin-employees') this.renderAdminUsers(); 
        if(viewId === 'view-admin-logs') this.renderAdminLogs(); 
        if(viewId === 'view-admin-by-employee') this.renderAdminByEmployee(); 
        if(viewId === 'view-employee') this.renderEmployeePanel(); 
    },

    // SISTEMA DE ACCESO (LOGIN)
    login: function() {
        const u = document.getElementById('login-user').value.trim().toLowerCase(); 
        const p = document.getElementById('login-pass').value.trim(); 
        const user = this.users.find(user => user.id === u || user.name.toLowerCase() === u);

        if (user && user.pass === p) { 
            this.currentUser = user; 
            localStorage.setItem('session', JSON.stringify(this.currentUser)); // Guardamos sesión
            this.setupUI(user); 
            this.nav('view-home'); 
        } else {
            alert("Acceso denegado: datos incorrectos"); 
        }
    },

    // CONFIGURACIÓN DE LA INTERFAZ TRAS EL LOGIN
    setupUI: function(user) {
        document.getElementById('menu-btn').style.display = 'block'; 
        document.getElementById('menu-user-name').innerText = user.name; 
        document.getElementById('menu-user-role').innerText = user.role === 'admin' ? 'Administrador' : 'Empleado'; 
        // Mostramos u ocultamos el menú de admin según el rol
        document.getElementById('admin-only-menu').style.display = (user.role === 'admin') ? 'block' : 'none'; 
        document.getElementById('login-user').value = ""; 
        document.getElementById('login-pass').value = "";
    },

    // CERRAR SESIÓN
    logout: function() {
        this.currentUser = null; 
        localStorage.removeItem('session'); // Borramos la sesión de la memoria
        document.getElementById('menu-btn').style.display = 'none'; 
        this.nav('view-login'); 
    },

    // --- COPIAS DE SEGURIDAD ---
    downloadBackup: function() {
        const data = { users: this.users, logs: this.logs };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Backup_${new Date().toLocaleDateString().replace(/\//g,'-')}.json`;
        a.click();
    },

    importBackup: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            if (confirm("Se borrarán los datos actuales y se pondrán los del archivo. ¿Continuar?")) {
                this.users = data.users;
                this.logs = data.logs;
                this.saveData();
                location.reload(); // Reiniciamos la app para cargar todo de cero
            }
        };
        reader.readAsText(file);
    },

    // --- FILTRADO MENSUAL ---
    filterLogsByMonth: function(logsArray, inputId) {
        const filterVal = document.getElementById(inputId).value; // Ejemplo: "2023-10"
        if (!filterVal) return logsArray;
        const [year, month] = filterVal.split('-');
        return logsArray.filter(l => {
            const dateParts = l.time.split(',')[0].split('/'); // DD/MM/AAAA
            return dateParts[1] === month && dateParts[2] === year;
        });
    },

    // --- EDICIÓN Y BORRADO DE REGISTROS ---
    editLog: function(timestamp) {
        const log = this.logs.find(l => l.timestamp === timestamp);
        if (!log) return;
        const newTime = prompt("Editar fecha/hora (Formato: DD/MM/AAAA, HH:MM:SS)", log.time);
        if (newTime) {
            log.time = newTime;
            this.saveData();
            this.refreshCurrentView(); // Refrescamos la pantalla donde estemos
        }
    },

    deleteLog: function(timestamp) {
        if (confirm("¿Eliminar este registro para siempre?")) {
            this.logs = this.logs.filter(l => l.timestamp !== timestamp);
            this.saveData();
            this.refreshCurrentView();
        }
    },

    refreshCurrentView: function() {
        // Detectamos qué vista de historial está activa y la repintamos
        if (document.getElementById('view-admin-logs').classList.contains('active')) this.renderAdminLogs();
        if (document.getElementById('view-employee').classList.contains('active')) this.renderEmployeePanel();
        if (document.getElementById('admin-employee-detail-card').style.display === 'block') this.refreshCurrentDetail();
    },

    refreshCurrentDetail: function() {
        const title = document.getElementById('detail-employee-name').innerText;
        const empName = title.replace('Jornadas de ', '');
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
                alert("Empleado actualizado");
            }
        } else { 
            const newId = nameInput.toLowerCase().replace(/\s+/g, ''); 
            if (this.users.find(u => u.id === newId)) return alert("El usuario ya existe"); 
            this.users.push({ id: newId, name: nameInput, role: 'employee', pass: passInput }); 
            alert("Empleado registrado con éxito");
        }
        this.saveData(); 
        this.resetForm(); 
        this.renderAdminUsers(); 
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
        if (confirm("¿Borrar definitivamente a este empleado?")) { 
            this.users = this.users.filter(u => u.id !== id); 
            this.saveData(); 
            this.renderAdminUsers(); 
        }
    },

    // --- SISTEMA DE FICHADO (GPS) ---
    punch: function(type) {
        if (!navigator.geolocation) return alert("GPS no disponible");
        const btn = type === 'ENTRADA' ? document.getElementById('btn-in') : document.getElementById('btn-out');
        const originalText = btn.innerText;
        btn.innerText = "Ubicando..."; 
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition((pos) => {
            const now = new Date();
            this.logs.push({
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                type: type,
                time: now.toLocaleString(),
                timestamp: now.getTime(),
                coords: [pos.coords.latitude, pos.coords.longitude]
            });
            this.saveData();
            this.renderEmployeePanel();
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Fichaje realizado correctamente");
        }, (err) => {
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Error de GPS: Asegúrate de dar permisos de ubicación.");
        }, { enableHighAccuracy: true });
    },

    // --- LÓGICA DE TIEMPO Y EMPAREJAMIENTO ---
    formatDuration: function(ms) {
        if (ms <= 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return (hours > 0 ? hours + "h " : "") + minutes + "m";
    },

    getPairedLogs: function(logsToProcess) {
        const sorted = [...logsToProcess].sort((a, b) => a.timestamp - b.timestamp);
        const paired = [];
        const openEntries = {}; 

        sorted.forEach(log => {
            if (log.type === 'ENTRADA') {
                openEntries[log.userId] = log;
            } else if (log.type === 'SALIDA') {
                const entry = openEntries[log.userId];
                paired.push({
                    userName: log.userName,
                    userId: log.userId,
                    entry: entry || null,
                    exit: log,
                    duration: entry ? log.timestamp - entry.timestamp : 0
                });
                delete openEntries[log.userId];
            }
        });

        for (let id in openEntries) {
            paired.push({
                userName: openEntries[id].userName,
                userId: openEntries[id].userId,
                entry: openEntries[id],
                exit: null,
                duration: 0
            });
        }
        return paired.reverse(); 
    },

    // --- RENDERS (DIBUJAR EN PANTALLA) ---

    renderEmployeePanel: function() {
        const uLogs = this.logs.filter(l => l.userId === this.currentUser.id);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-emp');
        const paired = this.getPairedLogs(filtered);
        const isWorking = uLogs.length > 0 && uLogs[uLogs.length-1].type === 'ENTRADA';
        
        const badge = document.getElementById('status-badge');
        badge.innerText = isWorking ? 'TRABAJANDO' : 'FUERA DE JORNADA';
        badge.style.background = isWorking ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('btn-in').style.display = isWorking ? 'none' : 'block';
        document.getElementById('btn-out').style.display = isWorking ? 'block' : 'none';
        document.getElementById('emp-status-text').innerText = isWorking ? "Jornada en curso" : "Listo para fichar";

        document.getElementById('emp-history').innerHTML = paired.map(p => `
            <div class="user-row" style="flex-direction: column; align-items: flex-start;">
                <span>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</span>
                <small>${p.entry ? 'E: '+p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'S: '+p.exit.time.split(',')[1] : '...'}</small>
                ${p.exit ? `<b style="color:var(--primary)">Total: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || 'Sin registros en este mes.';
    },

    renderAdminByEmployee: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-select-employee-list').innerHTML = emps.map(u => `
            <button class="btn-user-select" onclick="app.viewEmployeeDetail('${u.id}')">👤 ${u.name}</button>
        `).join('');
    },

    viewEmployeeDetail: function(userId) {
        const user = this.users.find(u => u.id === userId);
        const uLogs = this.logs.filter(l => l.userId === userId);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-admin-detail');
        const paired = this.getPairedLogs(filtered);
        
        document.getElementById('detail-employee-name').innerText = `Jornadas de ${user.name}`;
        document.getElementById('admin-employee-logs-detail').innerHTML = paired.map(p => `
            <div class="user-row" style="flex-direction: column; align-items: flex-start;">
                <div style="width:100%; display:flex; justify-content:space-between;">
                    <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp})">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp})">🗑️</button>` : ''}
                    </div>
                </div>
                <small>${p.entry ? 'Entrada: '+p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'Salida: '+p.exit.time.split(',')[1] : 'En curso'}</small>
                ${p.exit ? `<b style="color:var(--primary)">Horas: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || 'Sin datos para este mes.';
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
            <div class="user-row" style="flex-direction: column; align-items: flex-start;">
                <div style="width:100%; display:flex; justify-content:space-between;">
                    <strong>👤 ${p.userName}</strong>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button>` : ''}
                    </div>
                </div>
                <small>E: ${p.entry ? p.entry.time : '--'} | S: ${p.exit ? p.exit.time : 'En curso'}</small>
                ${p.exit ? `<b style="color:var(--success)">⏱️ ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || 'Sin registros este mes.';
    },

    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-users-list').innerHTML = emps.map(u => `
            <div class="user-row">
                <div><b>${u.name}</b><br><small>ID: ${u.id}</small></div>
                <div class="user-btns">
                    <button class="btn-small btn-edit" onclick="app.editEmployee('${u.id}')">editar</button>
                    <button class="btn-small btn-del" onclick="app.deleteEmployee('${u.id}')">borrar</button>
                </div>
            </div>
        `).join('');
    },

    // --- MEJORA: EXPORTAR A EXCEL ---
    generateExcel: function() {
        const filterId = this.currentUser.role === 'admin' ? 'filter-date-admin-logs' : 'filter-date-emp';
        const filterVal = document.getElementById(filterId).value;
        const logsToUse = this.currentUser.role === 'admin' ? this.logs : this.logs.filter(l => l.userId === this.currentUser.id);
        const filtered = this.filterLogsByMonth(logsToUse, filterId);
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