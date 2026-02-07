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
        if (!navigator.geolocation) return alert("GPS no disponible"); // Comprueba GPS
        navigator.geolocation.getCurrentPosition((pos) => { // Pide ubicación
            this.logs.push({ // Crea registro de fichaje
                userId: this.currentUser.id, // ID actual
                userName: this.currentUser.name, // Nombre actual
                type: type, // Entrada o Salida
                time: new Date().toLocaleString(), // Hora actual
                coords: [pos.coords.latitude, pos.coords.longitude] // GPS
            });
            this.saveData(); // Guarda
            this.renderEmployeePanel(); // Actualiza botones
            alert("Fichaje realizado: " + type); // Notifica
        }, () => alert("GPS desactivado: actívalo para fichar"));
    },

    // --- DIBUJADO DE INTERFAZ (RENDERS) ---

    // DIBUJAR ESTADO EN VIVO (ADMIN)
    renderAdminStatus: function() {
        const listDiv = document.getElementById('admin-status-list'); // Contenedor
        const emps = this.users.filter(u => u.role !== 'admin'); // Solo empleados
        listDiv.innerHTML = emps.map(u => { // Crea cada tarjeta
            const uLogs = this.logs.filter(l => l.userId === u.id); // Sus fichajes
            const lastLog = uLogs[uLogs.length - 1]; // Último movimiento
            const isWorking = lastLog && lastLog.type === 'ENTRADA'; // ¿Está dentro?
            return `
                <div class="status-item ${isWorking ? 'status-working' : 'status-out'}">
                    <b>${u.name}</b>: ${isWorking ? 'TRABAJANDO' : 'FUERA'} <br>
                    <small>Último: ${lastLog ? lastLog.time : 'Sin actividad'}</small>
                </div>
            `;
        }).join('');
    },

    // PANEL OPERATIVO TRABAJADOR
    renderEmployeePanel: function() {
        const uLogs = this.logs.filter(l => l.userId === this.currentUser.id).reverse(); // Sus logs
        const isWorking = uLogs[0] && uLogs[0].type === 'ENTRADA'; // Comprueba estado
        const badge = document.getElementById('status-badge'); // Badge visual
        badge.innerText = isWorking ? 'TRABAJANDO' : 'FUERA DE JORNADA'; // Texto
        badge.style.background = isWorking ? 'var(--success)' : 'var(--danger)'; // Color
        badge.style.color = 'white'; // Letra blanca
        document.getElementById('emp-status-text').innerText = isWorking ? `Hora entrada: ${uLogs[0].time.split(',')[1]}` : 'Pulsa para iniciar';
        document.getElementById('btn-in').style.display = isWorking ? 'none' : 'block'; // Oculta/Muestra botones
        document.getElementById('btn-out').style.display = isWorking ? 'block' : 'none';
        document.getElementById('emp-history').innerHTML = uLogs.slice(0,5).map(l => `<div class="user-row"><span><b>${l.type}</b> - ${l.time}</span></div>`).join('');
    },

    // LISTA PERSONAL GESTIÓN (ADMIN)
    renderAdminUsers: function() {
        const emps = this.users.filter(u => u.role !== 'admin'); // Solo empleados
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

    // HISTORIAL REGISTROS (ADMIN)
    renderAdminLogs: function() {
        document.getElementById('admin-logs-list').innerHTML = [...this.logs].reverse().map(l => `
            <div class="user-row">
                <div>
                    <strong>${l.userName}</strong> - ${l.type}<br>
                    <small>${l.time}</small> | <a href="https://maps.google.com/?q=${l.coords[0]},${l.coords[1]}" target="_blank">📍 Ver Mapa</a>
                </div>
            </div>
        `).join('') || 'Sin registros.';
    },

    // GENERAR PDF
    generatePDF: function() {
        const { jsPDF } = window.jspdf; // Cargar motor
        const doc = new jsPDF(); // Doc nuevo
        doc.text("Informe de Jornada", 14, 15); // Título
        const data = this.logs.filter(l => this.currentUser.role === 'admin' ? true : l.userId === this.currentUser.id).map(l => [l.userName, l.type, l.time]);
        doc.autoTable({ head: [['empleado', 'acción', 'fecha/hora']], body: data, startY: 20 }); // Tabla
        doc.save(`fichajes_${this.currentUser.id}.pdf`); // Bajar
    }
};

// ARRANQUE
window.onload = () => app.init(); // Iniciar al cargar página