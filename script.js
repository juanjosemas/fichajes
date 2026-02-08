/** OBJETO PRINCIPAL DE LA APP **/
const app = {
    users: [], // Almacena los empleados registrados
    logs: [], // Almacena todos los fichajes realizados
    currentUser: null, // Almacena el usuario con la sesión activa

    // FUNCIÓN DE INICIO: Se ejecuta nada más cargar la página
    init: function() {
        // Carga los usuarios de la memoria, si no hay, crea el admin inicial
        this.users = JSON.parse(localStorage.getItem('users')) || [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }]; 
        
        // Carga los fichajes de la memoria
        this.logs = JSON.parse(localStorage.getItem('logs')) || []; 
        this.saveData(); 

        // Configura los filtros de fecha al mes actual al arrancar
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;
        
        // Aplica el mes actual a los selectores de fecha
        setTimeout(() => {
            const filters = ['filter-date-emp', 'filter-date-admin-logs', 'filter-date-admin-detail'];
            filters.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = monthStr;
            });
        }, 150);

        // PERSISTENCIA: Si el usuario no cerró sesión la última vez, entra directo
        const savedSession = localStorage.getItem('session');
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession);
            this.setupUI(this.currentUser);
            this.nav('view-home');
        }
    },

    // GUARDA LOS DATOS ACTUALES EN LA MEMORIA DEL NAVEGADOR
    saveData: function() {
        localStorage.setItem('users', JSON.stringify(this.users)); 
        localStorage.setItem('logs', JSON.stringify(this.logs)); 
    },

    // ABRE O CIERRA EL MENÚ LATERAL
    toggleMenu: function() {
        const isActive = document.getElementById('sidebar').classList.toggle('active'); 
        document.getElementById('overlay').style.display = isActive ? 'block' : 'none'; 
    },

    // NAVEGACIÓN ENTRE LAS DIFERENTES PANTALLAS (VISTAS)
    nav: function(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
        document.getElementById(viewId).classList.add('active'); 
        if (document.getElementById('sidebar').classList.contains('active')) this.toggleMenu(); 
        
        // Repinta los datos necesarios al cambiar de pantalla
        if(viewId === 'view-admin-status') this.renderAdminStatus(); 
        if(viewId === 'view-admin-employees') this.renderAdminUsers(); 
        if(viewId === 'view-admin-logs') this.renderAdminLogs(); 
        if(viewId === 'view-admin-by-employee') this.renderAdminByEmployee(); 
        if(viewId === 'view-employee') this.renderEmployeePanel(); 
    },

    // PROCESO DE INICIO DE SESIÓN
    login: function() {
        const u = document.getElementById('login-user').value.trim().toLowerCase(); 
        const p = document.getElementById('login-pass').value.trim(); 
        const user = this.users.find(user => user.id === u || user.name.toLowerCase() === u);

        if (user && user.pass === p) { 
            this.currentUser = user; 
            localStorage.setItem('session', JSON.stringify(this.currentUser)); // Guarda la sesión
            this.setupUI(user); 
            this.nav('view-home'); 
        } else {
            alert("Acceso denegado"); 
        }
    },

    // CONFIGURA QUÉ OPCIONES DE MENÚ SE VE SEGÚN EL ROL
    setupUI: function(user) {
        document.getElementById('menu-btn').style.display = 'block'; 
        document.getElementById('menu-user-name').innerText = user.name; 
        document.getElementById('menu-user-role').innerText = user.role === 'admin' ? 'Administrador' : 'Empleado'; 
        document.getElementById('admin-only-menu').style.display = (user.role === 'admin') ? 'block' : 'none'; 
    },

    // CIERRE DE SESIÓN
    logout: function() {
        this.currentUser = null; 
        localStorage.removeItem('session'); // Borra la sesión de la memoria
        document.getElementById('menu-btn').style.display = 'none'; 
        this.nav('view-login'); 
    },

    // --- SISTEMA DE COPIAS DE SEGURIDAD ---
    downloadBackup: function() {
        const data = { users: this.users, logs: this.logs };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Copia_${new Date().toLocaleDateString().replace(/\//g,'-')}.json`;
        a.click();
    },

    importBackup: function(event) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm("¿Sobrescribir datos actuales con esta copia?")) {
                    this.users = data.users; 
                    this.logs = data.logs;
                    this.saveData(); 
                    location.reload(); // Reinicia para cargar los nuevos datos
                }
            } catch(e) { 
                alert("Error en archivo"); 
            }
        };
        reader.readAsText(event.target.files[0]);
    },

    // --- FILTRADO DE DATOS ---
    filterLogsByMonth: function(logsArray, inputId) {
        const filterVal = document.getElementById(inputId).value; // Obtiene el valor YYYY-MM
        if (!filterVal) return logsArray;
        const [year, month] = filterVal.split('-').map(Number);

        return logsArray.filter(l => {
            if (l.timestamp) { // Prioridad por milisegundos
                const d = new Date(l.timestamp);
                if (d.getFullYear() === year && (d.getMonth() + 1) === month) return true;
            }
            if (l.time && l.time.includes('/')) { // Fallback por texto
                const parts = l.time.split(',')[0].split('/');
                if (parseInt(parts[1]) === month && parseInt(parts[2]) === year) return true;
            }
            return false;
        });
    },

    // --- EDICIÓN DE MARCACIONES (CON RECALCULO DE TIEMPO) ---
    editLog: function(timestamp) {
        const log = this.logs.find(l => l.timestamp === timestamp);
        if (!log) return;
        
        const newTimeStr = prompt("Editar hora (Formato exacto: DD/MM/AAAA, HH:MM:SS)", log.time);
        
        if (newTimeStr) {
            try {
                // Intentamos procesar la fecha para generar el nuevo timestamp numérico
                // Formato esperado: "8/2/2026, 12:00:00"
                const parts = newTimeStr.split(', ');
                const dateParts = parts[0].split('/');
                const timeParts = parts[1].split(':');
                
                // Creamos objeto fecha (Mes es 0-11, por eso restamos 1)
                const newDateObj = new Date(
                    parseInt(dateParts[2]), 
                    parseInt(dateParts[1]) - 1, 
                    parseInt(dateParts[0]), 
                    parseInt(timeParts[0]), 
                    parseInt(timeParts[1]), 
                    parseInt(timeParts[2])
                );

                if (isNaN(newDateObj.getTime())) {
                    throw new Error("Formato inválido");
                }

                // ACTUALIZAMOS AMBOS VALORES: Texto para vista y Timestamp para cálculos
                log.time = newTimeStr;
                log.timestamp = newDateObj.getTime();

                this.saveData();
                this.refreshCurrentView(); // Al refrescar, getPairedLogs usará el nuevo timestamp
                alert("Registro actualizado y tiempo trabajado recalculado.");

            } catch (e) {
                alert("Error: Asegúrate de respetar el formato DD/MM/AAAA, HH:MM:SS");
            }
        }
    },

    // --- BORRADO DE MARCACIONES ---
    deleteLog: function(timestamp) {
        if (confirm("¿Borrar este registro definitivamente?")) {
            this.logs = this.logs.filter(l => l.timestamp !== timestamp);
            this.saveData();
            this.refreshCurrentView();
        }
    },

    // Función auxiliar para repintar la pantalla actual tras cambios
    refreshCurrentView: function() {
        const activeView = document.querySelector('.view.active').id;
        this.nav(activeView);
        if (document.getElementById('admin-employee-detail-card').style.display === 'block') this.refreshCurrentDetail();
    },

    refreshCurrentDetail: function() {
        const title = document.getElementById('detail-employee-name').innerText;
        const user = this.users.find(u => title.includes(u.name));
        if (user) this.viewEmployeeDetail(user.id);
    },

    // --- PROCESO DE FICHADO CON GPS ---
    punch: function(type) {
        if (!navigator.geolocation) return alert("GPS no disponible");
        const btn = type === 'ENTRADA' ? document.getElementById('btn-in') : document.getElementById('btn-out');
        btn.innerText = "Ubicando..."; 
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition((pos) => {
            const now = new Date();
            this.logs.push({
                userId: this.currentUser.id, 
                userName: this.currentUser.name,
                type: type, 
                time: now.toLocaleString(), 
                timestamp: now.getTime(), // ID único basado en el tiempo
                coords: [pos.coords.latitude, pos.coords.longitude]
            });
            this.saveData(); 
            this.renderEmployeePanel();
            btn.innerText = type === 'ENTRADA' ? "Fichar entrada" : "Fichar salida";
            btn.disabled = false;
            alert("Fichaje realizado con éxito");
        }, () => { 
            alert("Error GPS: Activa la ubicación"); 
            btn.disabled = false; 
        }, { enableHighAccuracy: true });
    },

    // CONVIERTE MILISEGUNDOS EN FORMATO 0h 0m
    formatDuration: function(ms) {
        if (ms <= 0) return "0m";
        const min = Math.floor(ms / 60000);
        return `${Math.floor(min / 60)}h ${min % 60}m`;
    },

    // UNE LAS ENTRADAS CON LAS SALIDAS PARA CALCULAR TIEMPOS
    getPairedLogs: function(logsToProcess) {
        const sorted = [...logsToProcess].sort((a, b) => a.timestamp - b.timestamp);
        const paired = []; 
        const open = {}; // Auxiliar para encontrar parejas

        sorted.forEach(l => {
            if (l.type === 'ENTRADA') {
                open[l.userId] = l;
            } else {
                const entry = open[l.userId];
                paired.push({ 
                    userName: l.userName, 
                    userId: l.userId, 
                    entry: entry || null, 
                    exit: l, 
                    duration: entry ? l.timestamp - entry.timestamp : 0 
                });
                delete open[l.userId];
            }
        });
        // Si hay entradas sin salida (empleado trabajando aún)
        for (let id in open) {
            paired.push({ userName: open[id].userName, userId: open[id].userId, entry: open[id], exit: null, duration: 0 });
        }
        return paired.reverse(); // Mostrar lo más reciente arriba
    },

    // --- FUNCIONES DE DIBUJADO (RENDERS) ---

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
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp})">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp})">🗑️</button>` : ''}
                    </div>
                </div>
                <small>${p.entry ? 'Entrada: '+p.entry.time.split(',')[1] : '--'} | ${p.exit ? 'Salida: '+p.exit.time.split(',')[1] : 'En curso'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Horas: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || '<p style="margin-top:10px">Sin datos para este mes.</p>';
        document.getElementById('admin-employee-detail-card').style.display = 'block';
    },

    renderAdminStatus: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-status-list').innerHTML = emps.map(u => {
            const uLogs = this.logs.filter(l => l.userId === u.id);
            const isWorking = uLogs.length > 0 && uLogs[uLogs.length-1].type === 'ENTRADA';
            return `<div class="status-item ${isWorking ? 'status-working' : 'status-out'}"><b>${u.name}</b>: ${isWorking ? 'TRABAJANDO' : 'FUERA'}</div>`;
        }).join('') || 'Sin empleados.';
    },

    renderAdminLogs: function() {
        const filtered = this.filterLogsByMonth(this.logs, 'filter-date-admin-logs');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('admin-logs-list').innerHTML = paired.map(p => `
            <div class="user-row">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>👤 ${p.userName}</strong>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp})">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp})">🗑️</button>` : ''}
                    </div>
                </div>
                <small>E: ${p.entry ? p.entry.time : '--'} | S: ${p.exit ? p.exit.time : '...'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--success)">⏱️ ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('') || '<p style="margin-top:10px">Sin datos este mes.</p>';
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

    // --- GESTIÓN DE EMPLEADOS ---
    saveEmployee: function() {
        const name = document.getElementById('new-emp-name').value.trim();
        const pass = document.getElementById('new-emp-pass').value.trim();
        const editId = document.getElementById('edit-id').value;
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
        this.renderAdminUsers();
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
            this.renderAdminUsers();
        }
    },

    // --- EXPORTAR A EXCEL ---
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

window.onload = () => app.init();