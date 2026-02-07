/** OBJETO PRINCIPAL DE LA APP **/
const app = {
    users: [], // Array de usuarios
    logs: [], // Array de fichajes
    currentUser: null, // Sesión del usuario actual

    // FUNCIÓN DE INICIO
    init: function() {
        const storedUsers = localStorage.getItem('users'); // Busca usuarios en memoria
        if (storedUsers) { // Si existen datos guardados
            this.users = JSON.parse(storedUsers); // Los carga
            const admin = this.users.find(u => u.id === 'admin'); // Verifica al administrador
            if (admin && !admin.pass) admin.pass = 'admin123'; // Asegura clave de administrador
        } else { // Si es la primera vez que se abre la app
            this.users = [{ id: 'admin', name: 'principal', role: 'admin', pass: 'admin123' }]; // Crea al administrador
        }
        this.logs = JSON.parse(localStorage.getItem('logs')) || []; // Carga el historial
        this.saveData(); // Guarda la configuración inicial
    },

    // GUARDAR DATOS EN MEMORIA LOCAL
    saveData: function() {
        localStorage.setItem('users', JSON.stringify(this.users)); // Convierte lista a texto y guarda
        localStorage.setItem('logs', JSON.stringify(this.logs)); // Convierte historial a texto y guarda
    },

    // CONTROL DEL MENÚ SIDEBAR
    toggleMenu: function() {
        const isActive = document.getElementById('sidebar').classList.toggle('active'); // Mueve el sidebar
        document.getElementById('overlay').style.display = isActive ? 'block' : 'none'; // Muestra u oculta la sombra
    },

    // NAVEGACIÓN ENTRE VISTAS
    nav: function(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); // Oculta todas las secciones
        document.getElementById(viewId).classList.add('active'); // Muestra la sección pedida
        if (document.getElementById('sidebar').classList.contains('active')) this.toggleMenu(); // Cierra el menú si está abierto
        
        // Actualiza datos según la sección cargada
        if(viewId === 'view-admin-status') this.renderAdminStatus(); // Ver estados vivo
        if(viewId === 'view-admin-employees') this.renderAdminUsers(); // Ver gestión empleados
        if(viewId === 'view-admin-logs') this.renderAdminLogs(); // Ver historial completo
        if(viewId === 'view-employee') this.renderEmployeePanel(); // Ver panel fichaje
    },

    // SISTEMA DE ACCESO (LOGIN)
    login: function() {
        const u = document.getElementById('login-user').value.trim().toLowerCase(); // Lee usuario en minúsculas
        const p = document.getElementById('login-pass').value.trim(); // Lee contraseña
        // Busca usuario por ID o por Nombre exacto
        const user = this.users.find(user => user.id === u || user.name.toLowerCase() === u);

        if (user && user.pass === p) { // Si coincide usuario y contraseña
            this.currentUser = user; // Guarda la sesión activa
            this.setupUI(user); // Configura la interfaz
            this.nav('view-home'); // Ir a inicio
        } else {
            alert("Acceso denegado: datos incorrectos"); // Error
        }
    },

    // CONFIGURACIÓN DE INTERFAZ TRAS LOGIN
    setupUI: function(user) {
        document.getElementById('menu-btn').style.display = 'block'; // Muestra botón menú
        document.getElementById('menu-user-name').innerText = user.name; // Nombre en el menú
        document.getElementById('menu-user-role').innerText = user.role === 'admin' ? 'Administrador' : 'Empleado'; // Rol en menú
        document.getElementById('admin-only-menu').style.display = (user.role === 'admin') ? 'block' : 'none'; // Oculta herramientas admin a empleados
        document.getElementById('login-user').value = ""; // Limpia los campos
        document.getElementById('login-pass').value = "";
    },

    // CERRAR SESIÓN
    logout: function() {
        this.currentUser = null; // Borra sesión
        document.getElementById('menu-btn').style.display = 'none'; // Quita botón menú
        this.nav('view-login'); // Vuelve al login
    },

    // --- GESTIÓN DE EMPLEADOS (CREAR Y ACTUALIZAR) ---
    saveEmployee: function() {
        const nameInput = document.getElementById('new-emp-name').value.trim(); // Nombre del input
        const passInput = document.getElementById('new-emp-pass').value.trim(); // Clave del input
        const editId = document.getElementById('edit-id').value; // ID que estamos editando (si existe)

        if (!nameInput || !passInput) return alert("Rellena todos los campos"); // Valida vacíos

        if (editId) { // SI EDITID TIENE CONTENIDO -> MODO EDICIÓN
            const user = this.users.find(u => u.id === editId); // Busca el usuario original por ID
            if (user) {
                user.name = nameInput; // Cambia el nombre real
                user.pass = passInput; // Cambia la contraseña
                user.id = nameInput.toLowerCase().replace(/\s+/g, ''); // Actualiza su ID basado en el nuevo nombre
                alert("Cambios guardados con éxito");
            }
        } else { // SI NO HAY EDITID -> MODO CREACIÓN
            const newId = nameInput.toLowerCase().replace(/\s+/g, ''); // Crea el ID del nombre sin espacios
            if (this.users.find(u => u.id === newId)) return alert("Este usuario ya existe"); // Evita duplicados
            this.users.push({ id: newId, name: nameInput, role: 'employee', pass: passInput }); // Añade a la lista
            alert("Empleado registrado");
        }

        this.saveData(); // Guarda cambios permanentemente
        this.resetForm(); // Limpia campos y vuelve al modo registro
        this.renderAdminUsers(); // Refresca la lista visual
    },

    // PREPARAR FORMULARIO PARA EDITAR
    editEmployee: function(id) {
        const user = this.users.find(u => u.id === id); // Busca el usuario elegido
        if (!user) return; // Si no está, sale
        document.getElementById('form-title').innerText = "editar empleado"; // Cambia el título
        document.getElementById('edit-id').value = user.id; // Guarda su ID antiguo para buscarlo al guardar
        document.getElementById('new-emp-name').value = user.name; // Pone su nombre en el cuadro
        document.getElementById('new-emp-pass').value = user.pass; // Pone su clave en el cuadro
        document.getElementById('btn-action-main').innerText = "guardar cambios"; // Cambia texto botón
        document.getElementById('btn-action-cancel').style.display = "block"; // Muestra botón cancelar
        window.scrollTo(0,0); // Sube la pantalla arriba para ver el formulario
    },

    // RESETEAR EL FORMULARIO
    resetForm: function() {
        document.getElementById('form-title').innerText = "crear empleado"; // Título original
        document.getElementById('edit-id').value = ""; // Limpia rastro de edición
        document.getElementById('new-emp-name').value = ""; // Limpia inputs
        document.getElementById('new-emp-pass').value = "";
        document.getElementById('btn-action-main').innerText = "registrar"; // Texto original
        document.getElementById('btn-action-cancel').style.display = "none"; // Quita botón cancelar
    },

    // ELIMINAR UN EMPLEADO
    deleteEmployee: function(id) {
        if (confirm("¿Borrar definitivamente este empleado?")) { // Pide confirmación
            this.users = this.users.filter(u => u.id !== id); // Quita al usuario de la lista
            this.saveData(); // Guarda cambios
            this.renderAdminUsers(); // Refresca lista
        }
    },

    // --- SISTEMA DE FICHADO ---
    punch: function(type) {
        if (!navigator.geolocation) return alert("GPS no disponible");

        const btn = type === 'ENTRADA' ? document.getElementById('btn-in') : document.getElementById('btn-out');
        const originalText = btn.innerText;
        btn.innerText = "Obteniendo ubicación...";
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition((pos) => {
            const now = new Date();
            this.logs.push({
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                type: type,
                time: now.toLocaleString(),
                timestamp: now.getTime(), // Guardamos milisegundos para calcular diferencias
                coords: [pos.coords.latitude, pos.coords.longitude]
            });
            this.saveData();
            this.renderEmployeePanel();
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Fichaje realizado: " + type);
        }, (err) => {
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Error de GPS: Asegúrate de tenerlo activado.");
        }, { enableHighAccuracy: true });
    },

    // --- LÓGICA DE CÁLCULO DE TIEMPO ---
    
    // Convierte milisegundos en formato legible (Xh Ym)
    formatDuration: function(ms) {
        if (ms <= 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60) ;
        const minutes = totalMinutes % 60;
        return (hours > 0 ? hours + "h " : "") + minutes + "m";
    },

    // Organiza los logs planos en parejas de Entrada/Salida
    getPairedLogs: function(logsToProcess) {
        const sorted = [...logsToProcess].sort((a, b) => a.timestamp - b.timestamp);
        const paired = [];
        const openEntradas = {}; // Rastrea entradas sin salida por usuario

        sorted.forEach(log => {
            if (log.type === 'ENTRADA') {
                openEntradas[log.userId] = log;
            } else if (log.type === 'SALIDA') {
                const entry = openEntradas[log.userId];
                if (entry) {
                    paired.push({
                        userName: log.userName,
                        userId: log.userId,
                        entry: entry,
                        exit: log,
                        duration: log.timestamp - entry.timestamp
                    });
                    delete openEntradas[log.userId];
                } else {
                    // Salida sin entrada previa (huérfana)
                    paired.push({ userName: log.userName, exit: log, entry: null, duration: 0 });
                }
            }
        });

        // Entradas que aún no tienen salida (están trabajando)
        for (let id in openEntradas) {
            paired.push({
                userName: openEntradas[id].userName,
                userId: openEntradas[id].userId,
                entry: openEntradas[id],
                exit: null,
                duration: 0
            });
        }

        return paired.reverse(); // Mostrar lo más reciente primero
    },

    // --- DIBUJADO DE INTERFAZ (RENDERS) ---

    renderAdminStatus: function() {
        const listDiv = document.getElementById('admin-status-list');
        const emps = this.users.filter(u => u.role !== 'admin');
        listDiv.innerHTML = emps.map(u => {
            const uLogs = this.logs.filter(l => l.userId === u.id);
            const lastLog = uLogs[uLogs.length - 1];
            const isWorking = lastLog && lastLog.type === 'ENTRADA';
            return `
                <div class="status-item ${isWorking ? 'status-working' : 'status-out'}">
                    <b>${u.name}</b>: ${isWorking ? 'TRABAJANDO' : 'FUERA'} <br>
                    <small>Último: ${lastLog ? lastLog.time : 'Sin actividad'}</small>
                </div>
            `;
        }).join('');
    },

    renderEmployeePanel: function() {
        const uLogs = this.logs.filter(l => l.userId === this.currentUser.id);
        const paired = this.getPairedLogs(uLogs);
        
        const isWorking = uLogs.length > 0 && uLogs[uLogs.length - 1].type === 'ENTRADA';
        const badge = document.getElementById('status-badge');
        badge.innerText = isWorking ? 'TRABAJANDO' : 'FUERA DE JORNADA';
        badge.style.background = isWorking ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('emp-status-text').innerText = isWorking ? `En curso desde: ${uLogs[uLogs.length - 1].time.split(',')[1]}` : 'Pulsa para iniciar';
        document.getElementById('btn-in').style.display = isWorking ? 'none' : 'block';
        document.getElementById('btn-out').style.display = isWorking ? 'block' : 'none';
        
        document.getElementById('emp-history').innerHTML = paired.slice(0, 5).map(p => `
            <div class="user-row" style="flex-direction: column; align-items: flex-start;">
                <span>📅 ${p.entry ? p.entry.time.split(',')[0] : p.exit.time.split(',')[0]}</span>
                <small>
                    ${p.entry ? 'Entrada: ' + p.entry.time.split(',')[1] : '---'} | 
                    ${p.exit ? 'Salida: ' + p.exit.time.split(',')[1] : 'En curso...'}
                </small>
                ${p.exit ? `<b style="color:var(--primary)">Total: ${this.formatDuration(p.duration)}</b>` : ''}
            </div>
        `).join('');
    },

    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin');
        document.getElementById('admin-users-list').innerHTML = emps.map(u => `
            <div class="user-row">
                <div class="user-info"><b>${u.name}</b><br><small>id: ${u.id} | clave: ${u.pass}</small></div>
                <div class="user-btns">
                    <button class="btn-small btn-edit" onclick="app.editEmployee('${u.id}')">editar</button>
                    <button class="btn-small btn-del" onclick="app.deleteEmployee('${u.id}')">borrar</button>
                </div>
            </div>
        `).join('') || 'No hay empleados.';
    },

    renderAdminLogs: function() {
        const paired = this.getPairedLogs(this.logs);
        document.getElementById('admin-logs-list').innerHTML = paired.map(p => `
            <div class="user-row" style="flex-direction: column; align-items: flex-start;">
                <div><strong>👤 ${p.userName}</strong></div>
                <div style="font-size: 0.9rem;">
                    📅 ${p.entry ? p.entry.time : 'Sin entrada'} <br>
                    🏁 ${p.exit ? p.exit.time : 'Trabajando ahora...'}
                </div>
                ${p.exit && p.entry ? `<div style="color:var(--success); font-weight:bold;">⏱️ Tiempo: ${this.formatDuration(p.duration)}</div>` : ''}
                <div style="margin-top: 5px;">
                    ${p.entry ? `<a href="https://maps.google.com/?q=${p.entry.coords[0]},${p.entry.coords[1]}" target="_blank" style="font-size:0.7rem;">📍 Mapa Entrada</a>` : ''}
                    ${p.exit ? ` | <a href="https://maps.google.com/?q=${p.exit.coords[0]},${p.exit.coords[1]}" target="_blank" style="font-size:0.7rem;">📍 Mapa Salida</a>` : ''}
                </div>
            </div>
        `).join('') || 'Sin registros.';
    },

    generatePDF: function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Informe de Jornadas Detallado", 14, 15);
        
        const logsToUse = this.currentUser.role === 'admin' ? this.logs : this.logs.filter(l => l.userId === this.currentUser.id);
        const paired = this.getPairedLogs(logsToUse);
        
        const data = paired.map(p => [
            p.userName, 
            p.entry ? p.entry.time : '---', 
            p.exit ? p.exit.time : 'En curso', 
            p.exit ? this.formatDuration(p.duration) : '---'
        ]);

        doc.autoTable({ 
            head: [['Empleado', 'Entrada', 'Salida', 'Total']], 
            body: data, 
            startY: 20 
        });
        doc.save(`jornadas_${this.currentUser.id}.pdf`);
    }
};

// ARRANQUE
window.onload = () => app.init();