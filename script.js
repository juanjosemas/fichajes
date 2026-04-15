

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
    currentUser: null, 

    // INICIO
    init: function() {
        db.ref('/').on('value', (snapshot) => {
            const data = snapshot.val() || {}; 
            this.users = data.users || [];
            this.logs = data.logs || [];

            // Solo crea el admin si la lista de usuarios está totalmente vacía
            if (this.users.length === 0) {
                this.users = [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }];
                this.saveData(); 
            }
            this.refreshCurrentView();
        });

        // Mes actual por defecto al cargar
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
    },

    saveData: function() {
        db.ref('/').set({ users: this.users, logs: this.logs });
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
    },

    login: function() {
        // Obtenemos los valores de los inputs
        const u = document.getElementById('login-user').value.trim().toLowerCase(); 
        const p = document.getElementById('login-pass').value.trim(); 
        
        // Buscamos el usuario en la lista que viene de Firebase
        const user = this.users.find(user => user.id === u || user.name.toLowerCase() === u);
        
        if (user && user.pass === p) { 
            this.currentUser = user; 
            // Guardamos la sesión para que no pida login al refrescar
            localStorage.setItem('session', JSON.stringify(this.currentUser));
            this.setupUI(user); 
            this.nav('view-home'); 
        } else {
            alert("Usuario o contraseña incorrectos. Si acabas de cambiarlos en Firebase, asegúrate de que el ID esté en minúsculas."); 
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

    // FUNCIÓN PARA QUITAR SEGUNDOS
    formatTimeDisplay: function(timeStr) {
        if (!timeStr) return "--:--";
        const parts = timeStr.split(', ');
        if (parts.length < 2) return timeStr;
        const timePart = parts[1];
        const timeParts = timePart.split(':');
        if (timeParts.length < 2) return timePart;
        return `${timeParts[0]}:${timeParts[1]}`; 
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
            alert("Fichaje guardado correctamente.");
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
            } catch (e) { alert("Formato incorrecto"); }
        }
    },

    deleteLog: function(timestamp) {
        if (confirm("¿Borrar permanentemente?")) {
            this.logs = this.logs.filter(l => l.timestamp !== timestamp);
            this.saveData();
        }
    },

    formatDuration: function(ms) {
        if (ms <= 0) return "0h 0m";
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

    // REFRESCAR VISTA ACTUAL
    refreshCurrentView: function() {
        const active = document.querySelector('.view.active');
        if (active) this.nav(active.id);
        const detailCard = document.getElementById('admin-employee-detail-card');
        if (detailCard && detailCard.style.display === 'block') {
            this.refreshCurrentDetail();
        }
    },

    // --- FUNCIÓN CORREGIDA: REFRESCAR DETALLE DE EMPLEADO ---
    refreshCurrentDetail: function() {
        const title = document.getElementById('detail-employee-name').innerText;
        const empName = title.replace('Jornadas de ', '');
        const user = this.users.find(u => u.name === empName);
        if (user) this.viewEmployeeDetail(user.id);
    },

    renderEmployeePanel: function() {
        // NUEVA LÓGICA: Solo mostramos la tarjeta de registros si el usuario es administrador
        const historyCard = document.getElementById('emp-history-card');
        if (historyCard) {
            historyCard.style.display = (this.currentUser.role === 'admin') ? 'block' : 'none';
        }

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
                <div style="margin-top:5px">
                    ${p.entry ? `<a href="https://www.google.com/maps?q=${p.entry.coords[0]},${p.entry.coords[1]}" target="_blank" style="font-size:0.7rem; color:var(--primary)">📍 Mapa E</a>` : ''}
                    ${p.exit ? ` | <a href="https://www.google.com/maps?q=${p.exit.coords[0]},${p.exit.coords[1]}" target="_blank" style="font-size:0.7rem; color:var(--primary)">📍 Mapa S</a>` : ''}
                </div>
            </div>
        `).join('') || '<p style="margin-top:10px">Sin registros este mes.</p>';
    },

    renderAdminByEmployee: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-select-employee-list').innerHTML = emps.map(u => `<button class="btn-user-select" onclick="app.viewEmployeeDetail('${u.id}')">👤 ${u.name}</button>`).join('') || 'No hay empleados registrados.';
    },

    viewEmployeeDetail: function(userId) {
        const user = this.users.find(u => u.id === userId);
        const uLogs = this.logs.filter(l => l.userId === userId);
        const filtered = this.filterLogsByMonth(uLogs, 'filter-date-admin-detail');
        const paired = this.getPairedLogs(filtered);
        document.getElementById('detail-employee-name').innerText = `Jornadas de ${user.name}`;
        // Guardamos el ID actual en un atributo para el botón de excel
        document.getElementById('admin-employee-detail-card').dataset.currentUserDetail = userId;
        document.getElementById('admin-employee-logs-detail').innerHTML = paired.map(p => `
            <div class="user-row">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                    <b>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</b>
                    <div>
                        ${p.entry ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.entry.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.entry.timestamp})">🗑️</button>` : ''}
                        ${p.exit ? `<button class="btn-small btn-edit" onclick="app.editLog(${p.exit.timestamp})">✏️</button><button class="btn-small btn-del" onclick="app.deleteLog(${p.exit.timestamp})">🗑️</button>` : ''}
                    </div>
                </div>
                <small>${p.entry ? 'E: ' + this.formatTimeDisplay(p.entry.time) : '--'} | ${p.exit ? 'S: ' + this.formatTimeDisplay(p.exit.time) : 'En curso'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--primary)">Horas: ${this.formatDuration(p.duration)}</b>` : ''}
                <div style="margin-top:5px">
                    ${p.entry ? `<a href="https://www.google.com/maps?q=${p.entry.coords[0]},${p.entry.coords[1]}" target="_blank" style="font-size:0.7rem; color:var(--primary)">📍 Mapa E</a>` : ''}
                    ${p.exit ? ` | <a href="https://www.google.com/maps?q=${p.exit.coords[0]},${p.exit.coords[1]}" target="_blank" style="font-size:0.7rem; color:var(--primary)">📍 Mapa S</a>` : ''}
                </div>
            </div>
        `).join('') || '<p style="margin-top:10px">Sin datos este mes.</p>';
        document.getElementById('admin-employee-detail-card').style.display = 'block';
    },

    renderAdminStatus: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-status-list').innerHTML = emps.map(u => {
            const uLogs = this.logs.filter(l => l.userId === u.id);
            const isWorking = uLogs.length > 0 && uLogs[uLogs.length-1].type === 'ENTRADA';
            const statusClass = isWorking ? 'status-badge-working' : 'status-badge-out';
            const statusText = isWorking ? 'TRABAJANDO' : 'FUERA';
            return `
                <div class="status-item">
                    <span class="status-name">👤 ${u.name}</span>
                    <span class="status-badge-live ${statusClass}">${statusText}</span>
                </div>`;
        }).join('') || 'Sin empleados.';
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
                <small>E: ${p.entry ? this.formatTimeDisplay(p.entry.time) : '--'} | S: ${p.exit ? this.formatTimeDisplay(p.exit.time) : '...'}</small>
                ${p.exit && p.entry ? `<b style="color:var(--success)">⏱️ ${this.formatDuration(p.duration)}</b>` : ''}
                <div style="margin-top:5px">
                    ${p.entry ? `<a href="https://www.google.com/maps?q=${p.entry.coords[0]},${p.entry.coords[1]}" target="_blank" style="font-size:0.7rem; color:var(--primary)">📍 Mapa E</a>` : ''}
                    ${p.exit ? ` | <a href="https://www.google.com/maps?q=${p.exit.coords[0]},${p.exit.coords[1]}" target="_blank" style="font-size:0.7rem; color:var(--primary)">📍 Mapa S</a>` : ''}
                </div>
            </div>
        `).join('') || '<p style="margin-top:10px">Sin datos este mes.</p>';
    },

    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-users-list').innerHTML = emps.map(u => `<div class="user-row" style="flex-direction:row; justify-content:space-between; align-items:center;"><div><b>${u.name}</b><br><small>ID: ${u.id}</small></div><div class="user-btns"><button class="btn-small btn-edit" onclick="app.editEmployee('${u.id}')">E</button><button class="btn-small btn-del" onclick="app.deleteEmployee('${u.id}')">X</button></div></div>`).join('') || 'Sin empleados.';
    },

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
            this.users.push({ id, name, role: 'employee', pass: pass });
        }
        this.saveData(); this.resetForm();
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

    downloadBackup: function() {
        const data = { users: this.users, logs: this.logs };
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
            if (confirm("¿Sobrescribir datos de la NUBE?")) {
                this.users = data.users; this.logs = data.logs;
                this.saveData(); 
            }
        };
        reader.readAsText(event.target.files[0]);
    },

    generateExcel: function() {
        const filterId = this.currentUser.role === 'admin' ? 'filter-date-admin-logs' : 'filter-date-emp';
        const filterVal = document.getElementById(filterId).value;
        const filtered = this.filterLogsByMonth(this.logs, filterId);
        const paired = this.getPairedLogs(filtered);
        const excelData = paired.map(p => ({
            "Empleado": p.userName,
            "Fecha": p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0],
            "Entrada": p.entry ? this.formatTimeDisplay(p.entry.time) : "---",
            "Salida": p.exit ? this.formatTimeDisplay(p.exit.time) : "En curso",
            "Total Horas": p.exit ? this.formatDuration(p.duration) : "---"
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jornadas");
        XLSX.writeFile(wb, `Fichajes_${filterVal || 'Historico'}.xlsx`);
    },

    generatePDF: function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const filterId = this.currentUser.role === 'admin' ? 'filter-date-admin-logs' : 'filter-date-emp';
        const filterVal = document.getElementById(filterId).value;
        const filtered = this.filterLogsByMonth(this.logs, filterId);
        const paired = this.getPairedLogs(filtered);

        doc.setFontSize(18);
        doc.text("Historial Global de Fichajes", 14, 20);
        doc.setFontSize(10);
        doc.text(`Mes: ${filterVal || 'Todo el histórico'}`, 14, 28);

        const head = [["Empleado", "Fecha", "Entrada", "Salida", "Total"]];
        const body = paired.map(p => [
            p.userName,
            p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0],
            p.entry ? this.formatTimeDisplay(p.entry.time) : "---",
            p.exit ? this.formatTimeDisplay(p.exit.time) : "En curso",
            p.exit ? this.formatDuration(p.duration) : "---"
        ]);

        doc.autoTable({ head, body, startY: 35 });
        doc.save(`Fichajes_${filterVal || 'Historico'}.pdf`);
    },

    // --- NUEVA FUNCIÓN: INFORME INDIVIDUAL CON FORMATO DE FOTO (PDF) ---
    generateIndividualPDF: function(userId, inputFilterId) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const id = userId || document.getElementById('admin-employee-detail-card').dataset.currentUserDetail;
        const user = this.users.find(u => u.id === id);
        const filterVal = document.getElementById(inputFilterId).value;
        
        const uLogs = this.logs.filter(l => l.userId === id);
        const filtered = this.filterLogsByMonth(uLogs, inputFilterId);
        const paired = this.getPairedLogs(filtered).reverse(); 

        let totalMs = 0;

        // Cabecera del informe
        doc.setFontSize(16);
        doc.setTextColor(230, 126, 34); // Naranja corporativo
        doc.text("INFORME DE JORNADAS", 105, 15, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Empresa: Ecostruct S.L.`, 14, 25);
        doc.text(`CIF: B-19343441`, 14, 30);
        doc.text(`Centro: Oficina Principal`, 14, 35);

        doc.text(`Empleado: ${user.name}`, 120, 25);
        doc.text(`Nº Afiliación: ---`, 120, 30);
        doc.text(`Mes: ${filterVal}`, 120, 35);

        // Tabla de datos
        const head = [["FECHA", "ENTRADA", "SALIDA", "DURACIÓN"]];
        const body = paired.map(p => {
            const fecha = p.entry ? p.entry.time.split(',')[0] : (p.exit ? p.exit.time.split(',')[0] : '--');
            const entrada = p.entry ? this.formatTimeDisplay(p.entry.time) : '--';
            const salida = p.exit ? this.formatTimeDisplay(p.exit.time) : 'En curso';
            const duracion = p.exit && p.entry ? this.formatDuration(p.duration) : '--';
            if(p.duration) totalMs += p.duration;
            return [fecha, entrada, salida, duracion];
        });

        doc.autoTable({
            head,
            body,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] }
        });

        let finalY = doc.lastAutoTable.finalY + 10;

        // Resumen
        doc.setFont(undefined, 'bold');
        doc.text("RESUMEN:", 14, finalY);
        doc.setFont(undefined, 'normal');
        doc.text(`TOTAL TIEMPO TRABAJADO: ${this.formatDuration(totalMs)}`, 14, finalY + 7);
        doc.text(`TIEMPO TOTAL: ${this.formatDuration(totalMs)}`, 14, finalY + 14);

        // Firmas
        finalY += 40;
        doc.text("Firma empleado:", 14, finalY);
        doc.text("__________________________", 14, finalY + 10);
        
        doc.text("Firma y sello empresa:", 120, finalY);
        doc.text("__________________________", 120, finalY + 10);

        doc.save(`Informe_${user.name}_${filterVal}.pdf`);
    },

    // --- FUNCIÓN: INFORME INDIVIDUAL CON FORMATO DE FOTO (EXCEL) ---
    generateIndividualExcel: function(userId, inputFilterId) {
        const id = userId || document.getElementById('admin-employee-detail-card').dataset.currentUserDetail;
        const user = this.users.find(u => u.id === id);
        const filterVal = document.getElementById(inputFilterId).value;
        
        const uLogs = this.logs.filter(l => l.userId === id);
        const filtered = this.filterLogsByMonth(uLogs, inputFilterId);
        const paired = this.getPairedLogs(filtered).reverse(); 

        let totalMs = 0;

        const rows = [
            ["INFORME DE JORNADAS"],
            [""],
            ["Empresa:", "Ecostruct S.L.", "", "Empleado:", user.name],
            ["CIF:", "B-19343441", "", "Nº Afiliación:", ""],
            ["Centro de trabajo:", "Oficina Principal", "", "Intervalo:", filterVal],
            [""],
            ["FECHA:", "ENTRADA:", "SALIDA:", "DURACIÓN:"], 
        ];

        paired.forEach(p => {
            const fecha = p.entry ? p.entry.time.split(',')[0] : (p.exit ? p.exit.time.split(',')[0] : '--');
            const entrada = p.entry ? this.formatTimeDisplay(p.entry.time) : '--';
            const salida = p.exit ? this.formatTimeDisplay(p.exit.time) : 'En curso';
            const duracion = p.exit && p.entry ? this.formatDuration(p.duration) : '--';
            if(p.duration) totalMs += p.duration;
            rows.push([fecha, entrada, salida, duracion]);
        });

        rows.push([""]);
        rows.push(["TOTAL TIEMPO TRABAJADO:", this.formatDuration(totalMs)]);
        rows.push([""]);
        rows.push(["RESUMEN:"]);
        rows.push(["TIEMPO TOTAL:", this.formatDuration(totalMs)]);
        rows.push([""]);
        rows.push([""]);
        rows.push(["Firma empleado:", "", "", "Firma y sello empresa:"]);
        rows.push(["__________________________", "", "", "__________________________"]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Informe");
        XLSX.writeFile(wb, `Informe_${user.name}_${filterVal}.xlsx`);
    }
};

window.onload = () => app.init();