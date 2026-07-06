/* ==========================================================================
   MASKOVET - Portal Cliente App
   Versión: 3.1 - CORREGIDA (MASCOTAS)
   ========================================================================== */

let cliente = null;
let carrito = [];
let modoPago = 'Yape';
let mascotaFotoTemporal = '';
let comprobanteTemporal = '';
let filtroProducto = '';
let filtroCategoria = 'Todos';
let citaEditandoId = null;

// ==========================================================================
// 2. INICIALIZACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
    const session = getFromStorage('maskovet_session');
    if (session && session.usuario) {
        cliente = session.usuario;
    }
    
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    if (!cliente) {
        window.location.href = 'login.html';
        return;
    }
    
    cargarDashboard();
});

// ==========================================================================
// 3. AUTENTICACIÓN Y SESIÓN
// ==========================================================================

function getClienteActual() {
    const session = getFromStorage('maskovet_session');
    if (session && session.usuario) {
        cliente = session.usuario;
        return cliente;
    }
    return null;
}

function requireCliente() {
    const currentClient = getClienteActual();
    if (!currentClient && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return null;
    }
    return currentClient;
}

function logoutCliente() {
    removeFromStorage('maskovet_session');
    localStorage.removeItem('clienteLogueado');
    showAlert('Sesión cerrada correctamente', 'info');
    window.location.href = 'login.html';
}

// ==========================================================================
// 4. DASHBOARD PRINCIPAL
// ==========================================================================

async function cargarDashboard() {
    await initDB();
    const currentClient = requireCliente();
    if (!currentClient) return;

    cliente = currentClient;
    console.log('👤 Cliente actual:', cliente);
    
    try {
        actualizarInfoUsuario();
        renderPerfil();
        renderMascotas();
        renderProductos();
        renderCitas();
        renderDisponibilidadAgenda();
        renderNotificaciones();
        renderSelectorMascotas();
        renderSelectorServiciosCita();
        renderHistorialClinico();
        renderHistorialCompras();
        actualizarCarrito();
        actualizarEstadisticas();
        mostrarBienvenida();
        cargarEventos();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('Error al cargar el dashboard', 'error');
    }
}

function actualizarInfoUsuario() {
    const nombreBox = document.getElementById('clienteNombre');
    const avatarBox = document.getElementById('userAvatar');
    
    if (nombreBox) {
        nombreBox.textContent = `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente';
    }
    
    if (avatarBox) {
        const iniciales = `${(cliente.nombres || '')[0]}${(cliente.apellidos || '')[0]}`.toUpperCase();
        avatarBox.textContent = iniciales || 'C';
    }
}

function actualizarEstadisticas() {
    const numMascotas = DB.mascotas.filter(m => m.clienteId === cliente.id).length;
    const numCitas = DB.citas.filter(c => c.clienteId === cliente.id).length;
    const numPedidos = DB.ventas ? DB.ventas.filter(v => v.clienteId === cliente.id).length : 0;
    const noLeidas = DB.notificaciones.filter(n => n.clienteId === cliente.id && !n.leida).length;

    const totalMascotas = document.getElementById('totalMascotas');
    const totalCitas = document.getElementById('totalCitas');
    const totalPedidos = document.getElementById('totalPedidos');
    const totalNotificaciones = document.getElementById('totalNotificaciones');

    if (totalMascotas) totalMascotas.textContent = numMascotas;
    if (totalCitas) totalCitas.textContent = numCitas;
    if (totalPedidos) totalPedidos.textContent = numPedidos;
    if (totalNotificaciones) {
        totalNotificaciones.textContent = noLeidas;
        totalNotificaciones.style.display = noLeidas > 0 ? 'inline' : 'none';
    }

    const mascotasBadge = document.getElementById('mascotasBadge');
    const citasBadge = document.getElementById('citasBadge');
    const notificacionesBadge = document.getElementById('notificacionesBadge');

    if (mascotasBadge) {
        mascotasBadge.textContent = numMascotas;
        mascotasBadge.style.display = numMascotas > 0 ? 'inline-block' : 'none';
    }
    if (citasBadge) {
        citasBadge.textContent = numCitas;
        citasBadge.style.display = numCitas > 0 ? 'inline-block' : 'none';
    }
    if (notificacionesBadge) {
        notificacionesBadge.textContent = noLeidas > 0 ? noLeidas : '';
        notificacionesBadge.style.display = noLeidas > 0 ? 'inline-block' : 'none';
    }
}

function mostrarBienvenida() {
    const lastWelcome = localStorage.getItem('maskovet_last_welcome');
    const today = getCurrentDate();
    
    if (lastWelcome !== today) {
        const hora = parseInt(new Date().getHours());
        let saludo = 'Buenos días';
        if (hora >= 12 && hora < 18) saludo = 'Buenas tardes';
        if (hora >= 18) saludo = 'Buenas noches';
        
        showAlert(`${saludo}, ${cliente.nombres || 'bienvenido'} a MaskoVet 🐾`, 'success', 4000);
        localStorage.setItem('maskovet_last_welcome', today);
    }
}

function cargarEventos() {
    const searchInput = document.getElementById('searchProductos');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            actualizarFiltroProductos(e.target.value);
        });
    }
    
    const categoryFilter = document.getElementById('filtroCategoriaProducto');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function(e) {
            actualizarFiltroCategoria(e.target.value);
        });
    }
    
    const fechaCita = document.getElementById('fechaCita');
    if (fechaCita) {
        fechaCita.addEventListener('change', renderDisponibilidadAgenda);
        fechaCita.min = getCurrentDate();
    }
    
    const formMascota = document.getElementById('formMascota');
    if (formMascota) {
        formMascota.addEventListener('submit', registrarMascotaDesdeFormulario);
    }
    
    const fileInput = document.getElementById('paymentFile');
    if (fileInput) {
        fileInput.addEventListener('change', manejarComprobante);
    }
}

// ==========================================================================
// 5. PERFIL DE USUARIO
// ==========================================================================

function renderPerfil() {
    const perfilBox = document.getElementById('profileBox');
    if (!perfilBox || !cliente) return;

    const foto = cliente.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente.nombres || '')}+${encodeURIComponent(cliente.apellidos || '')}&background=1E5EFF&color=fff&size=100`;
    
    perfilBox.innerHTML = `
        <div class="section-card" style="text-align: center;">
            <img src="${escapeHtml(foto)}" alt="Perfil" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 12px; object-fit: cover; border: 3px solid #1E5EFF;">
            <h3 style="margin: 0;">${escapeHtml(cliente.nombres || '')} ${escapeHtml(cliente.apellidos || '')}</h3>
            <p style="color: #64748b; margin: 4px 0;">${escapeHtml(cliente.correo || '')}</p>
            <p style="color: #64748b; margin: 4px 0;">${escapeHtml(cliente.telefono || '')}</p>
            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="editarPerfilCliente()">✏️ Editar</button>
                <button class="btn btn-outline btn-sm" onclick="cambiarContrasena()">🔑 Cambiar contraseña</button>
                <button class="btn btn-danger btn-sm" onclick="logoutCliente()">🚪 Cerrar sesión</button>
            </div>
        </div>
    `;
}

function editarPerfilCliente() {
    if (!cliente) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Editar Perfil</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <form id="formEditarPerfil" onsubmit="guardarEdicionPerfil(event)">
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Nombres</label>
                        <input type="text" id="editNombres" value="${escapeHtml(cliente.nombres || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Apellidos</label>
                        <input type="text" id="editApellidos" value="${escapeHtml(cliente.apellidos || '')}" required>
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Correo electrónico</label>
                        <input type="email" id="editCorreo" value="${escapeHtml(cliente.correo || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" id="editTelefono" value="${escapeHtml(cliente.telefono || '')}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Foto de perfil (URL)</label>
                    <input type="url" id="editFoto" value="${escapeHtml(cliente.foto || '')}" placeholder="https://ejemplo.com/foto.jpg">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Guardar cambios</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarEdicionPerfil(event) {
    event.preventDefault();
    
    const nombres = document.getElementById('editNombres').value.trim();
    const apellidos = document.getElementById('editApellidos').value.trim();
    const correo = document.getElementById('editCorreo').value.trim();
    const telefono = document.getElementById('editTelefono').value.trim();
    const foto = document.getElementById('editFoto').value.trim();
    
    if (!nombres || !apellidos || !correo) {
        showAlert('Nombres, apellidos y correo son obligatorios', 'error');
        return;
    }
    
    if (!isValidEmail(correo)) {
        showAlert('Correo electrónico inválido', 'error');
        return;
    }
    
    if (telefono && !isValidPhone(telefono)) {
        showAlert('Teléfono inválido (9 dígitos)', 'error');
        return;
    }
    
    const updates = {
        nombres: nombres,
        apellidos: apellidos,
        correo: correo,
        telefono: telefono,
        foto: foto || null
    };
    
    if (await updateUsuario(cliente.id, updates)) {
        cliente = { ...cliente, ...updates };
        
        const session = getFromStorage('maskovet_session');
        if (session) {
            session.usuario = cliente;
            saveToStorage('maskovet_session', session);
        }
        
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        renderPerfil();
        actualizarInfoUsuario();
        showAlert('Perfil actualizado correctamente', 'success');
    } else {
        showAlert('Error al actualizar el perfil', 'error');
    }
}

function cambiarContrasena() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Cambiar Contraseña</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <form id="formCambiarContrasena" onsubmit="guardarCambioContrasena(event)">
                <div class="form-group">
                    <label>Contraseña actual</label>
                    <input type="password" id="passActual" required>
                </div>
                <div class="form-group">
                    <label>Nueva contraseña</label>
                    <input type="password" id="passNueva" required minlength="6">
                </div>
                <div class="form-group">
                    <label>Confirmar nueva contraseña</label>
                    <input type="password" id="passConfirmar" required>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Cambiar contraseña</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarCambioContrasena(event) {
    event.preventDefault();
    
    const actual = document.getElementById('passActual').value;
    const nueva = document.getElementById('passNueva').value;
    const confirmar = document.getElementById('passConfirmar').value;
    
    if (nueva !== confirmar) {
        showAlert('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (nueva.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    const usuario = DB.usuarios.find(u => u.id === cliente.id);
    if (!usuario) {
        showAlert('Usuario no encontrado', 'error');
        return;
    }
    
    const passwordEncrypted = encryptPassword(actual);
    if (usuario.password !== passwordEncrypted && usuario.password !== actual) {
        showAlert('Contraseña actual incorrecta', 'error');
        return;
    }
    
    if (await updateUsuario(cliente.id, { password: encryptPassword(nueva) })) {
        document.querySelector('.modal-overlay').remove();
        showAlert('Contraseña actualizada correctamente', 'success');
    } else {
        showAlert('Error al cambiar la contraseña', 'error');
    }
}

// ==========================================================================
// 6. MÓDULO DE MASCOTAS - CORREGIDO
// ==========================================================================

function renderMascotas() {
    const container = document.getElementById('mascotasContainer');
    if (!container || !cliente) return;

    const mascotas = DB.mascotas.filter(m => m.clienteId === cliente.id);
    console.log('🐾 Mascotas del cliente:', mascotas.length);
    
    if (mascotas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <span style="font-size: 4rem;">🐾</span>
                <h3>No tienes mascotas registradas</h3>
                <p style="color: #64748b;">Registra a tu mascota para agendar citas y darle seguimiento</p>
                <button class="btn btn-primary" onclick="abrirFormularioMascota()">+ Registrar Mascota</button>
            </div>
        `;
        return;
    }

    container.innerHTML = mascotas.map(m => renderTarjetaMascota(m)).join('');
}

function renderTarjetaMascota(m) {
    const foto = m.foto || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80';
    
    return `
        <div class="pet-card">
            <img src="${escapeHtml(foto)}" alt="${escapeHtml(m.nombre)}" class="pet-image" onerror="this.src='https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80'">
            <div class="pet-info">
                <div class="pet-name">${escapeHtml(m.nombre)}</div>
                <div class="pet-detail">${escapeHtml(m.especie || 'Mascota')} • ${escapeHtml(m.raza || 'Sin raza')}</div>
                <div class="pet-detail">${escapeHtml(m.sexo || '')} ${m.edad ? `• ${escapeHtml(m.edad)} años` : ''}</div>
                <div class="pet-detail">${m.peso ? `⚖️ ${escapeHtml(m.peso)} kg` : ''}</div>
                <span class="status-badge active">Activo</span>
                <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-outline" onclick="verMascota('${m.id}')">📋 Ver</button>
                    <button class="btn btn-sm btn-primary" onclick="abrirEditarMascota('${m.id}')">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarMascota('${m.id}')">🗑️ Eliminar</button>
                </div>
            </div>
        </div>
    `;
}

function abrirFormularioMascota() {
    console.log('📝 Abriendo formulario de mascota');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Registrar Mascota</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <form id="formMascota" onsubmit="registrarMascotaDesdeFormulario(event)">
                <div class="form-grid two">
                    <div class="form-group">
                        <label class="required">Nombre</label>
                        <input type="text" id="mascotaNombre" required placeholder="Ej: Max">
                    </div>
                    <div class="form-group">
                        <label class="required">Especie</label>
                        <select id="mascotaEspecie" required>
                            <option value="">Selecciona...</option>
                            <option value="Perro">🐕 Perro</option>
                            <option value="Gato">🐈 Gato</option>
                            <option value="Ave">🐦 Ave</option>
                            <option value="Roedor">🐹 Roedor</option>
                            <option value="Reptil">🦎 Reptil</option>
                            <option value="Otro">🐾 Otro</option>
                        </select>
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Raza</label>
                        <input type="text" id="mascotaRaza" placeholder="Ej: Golden Retriever">
                    </div>
                    <div class="form-group">
                        <label>Sexo</label>
                        <select id="mascotaSexo">
                            <option value="">Selecciona...</option>
                            <option value="Macho">♂️ Macho</option>
                            <option value="Hembra">♀️ Hembra</option>
                        </select>
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Edad (años)</label>
                        <input type="number" id="mascotaEdad" min="0" step="0.5" placeholder="3">
                    </div>
                    <div class="form-group">
                        <label>Peso (kg)</label>
                        <input type="number" id="mascotaPeso" min="0" step="0.1" placeholder="25">
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Color</label>
                        <input type="text" id="mascotaColor" placeholder="Ej: Dorado">
                    </div>
                    <div class="form-group">
                        <label>Fecha de nacimiento</label>
                        <input type="date" id="mascotaFechaNacimiento">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea id="mascotaObservaciones" rows="2" placeholder="Alergias, enfermedades, etc."></textarea>
                </div>
                <div class="form-group">
                    <label>Foto de la mascota</label>
                    <input type="file" id="mascotaFoto" accept="image/*" onchange="manejarFotoMascota(event)">
                    <div id="fotoMascotaPreview" class="pet-photo-preview"></div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Registrar Mascota</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function abrirEditarMascota(id) {
    const mascota = DB.mascotas.find(m => m.id === id);
    if (!mascota) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Editar Mascota</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <form id="formEditarMascota" onsubmit="guardarEdicionMascota(event, '${id}')">
                <div class="form-grid two">
                    <div class="form-group">
                        <label class="required">Nombre</label>
                        <input type="text" id="editMascotaNombre" value="${escapeHtml(mascota.nombre || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="required">Especie</label>
                        <select id="editMascotaEspecie" required>
                            <option value="">Selecciona...</option>
                            <option value="Perro" ${mascota.especie === 'Perro' ? 'selected' : ''}>🐕 Perro</option>
                            <option value="Gato" ${mascota.especie === 'Gato' ? 'selected' : ''}>🐈 Gato</option>
                            <option value="Ave" ${mascota.especie === 'Ave' ? 'selected' : ''}>🐦 Ave</option>
                            <option value="Roedor" ${mascota.especie === 'Roedor' ? 'selected' : ''}>🐹 Roedor</option>
                            <option value="Reptil" ${mascota.especie === 'Reptil' ? 'selected' : ''}>🦎 Reptil</option>
                            <option value="Otro" ${mascota.especie === 'Otro' ? 'selected' : ''}>🐾 Otro</option>
                        </select>
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Raza</label>
                        <input type="text" id="editMascotaRaza" value="${escapeHtml(mascota.raza || '')}">
                    </div>
                    <div class="form-group">
                        <label>Sexo</label>
                        <select id="editMascotaSexo">
                            <option value="">Selecciona...</option>
                            <option value="Macho" ${mascota.sexo === 'Macho' ? 'selected' : ''}>♂️ Macho</option>
                            <option value="Hembra" ${mascota.sexo === 'Hembra' ? 'selected' : ''}>♀️ Hembra</option>
                        </select>
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Edad (años)</label>
                        <input type="number" id="editMascotaEdad" min="0" step="0.5" value="${escapeHtml(mascota.edad || '')}">
                    </div>
                    <div class="form-group">
                        <label>Peso (kg)</label>
                        <input type="number" id="editMascotaPeso" min="0" step="0.1" value="${escapeHtml(mascota.peso || '')}">
                    </div>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Color</label>
                        <input type="text" id="editMascotaColor" value="${escapeHtml(mascota.color || '')}">
                    </div>
                    <div class="form-group">
                        <label>Fecha de nacimiento</label>
                        <input type="date" id="editMascotaFechaNacimiento" value="${escapeHtml(mascota.fechaNacimiento || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea id="editMascotaObservaciones" rows="2">${escapeHtml(mascota.observaciones || mascota.notas || '')}</textarea>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Guardar cambios</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarEdicionMascota(event, id) {
    event.preventDefault();
    
    const data = {
        nombre: document.getElementById('editMascotaNombre').value.trim(),
        especie: document.getElementById('editMascotaEspecie').value,
        raza: document.getElementById('editMascotaRaza').value.trim(),
        sexo: document.getElementById('editMascotaSexo').value,
        edad: document.getElementById('editMascotaEdad').value,
        peso: document.getElementById('editMascotaPeso').value,
        color: document.getElementById('editMascotaColor').value.trim(),
        fechaNacimiento: document.getElementById('editMascotaFechaNacimiento').value,
        observaciones: document.getElementById('editMascotaObservaciones').value.trim()
    };
    
    if (!data.nombre || !data.especie) {
        showAlert('Nombre y especie son obligatorios', 'error');
        return;
    }
    
    if (await updateMascota(id, data)) {
        document.querySelector('.modal-overlay').remove();
        renderMascotas();
        renderSelectorMascotas();
        showAlert('Mascota actualizada correctamente', 'success');
    } else {
        showAlert('Error al actualizar la mascota', 'error');
    }
}

function verMascota(id) {
    const mascota = DB.mascotas.find(m => m.id === id);
    if (!mascota) return;
    
    const historial = DB.historialClinico.filter(h => h.mascotaId === id);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>${escapeHtml(mascota.nombre)}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <img src="${escapeHtml(mascota.foto || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80')}" 
                         alt="${escapeHtml(mascota.nombre)}" 
                         style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px;"
                         onerror="this.src='https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80'">
                </div>
                <div style="flex: 2;">
                    <p><strong>Especie:</strong> ${escapeHtml(mascota.especie || 'No especificada')}</p>
                    <p><strong>Raza:</strong> ${escapeHtml(mascota.raza || 'No especificada')}</p>
                    <p><strong>Sexo:</strong> ${escapeHtml(mascota.sexo || 'No especificado')}</p>
                    <p><strong>Edad:</strong> ${escapeHtml(mascota.edad || 'No especificada')} años</p>
                    <p><strong>Peso:</strong> ${escapeHtml(mascota.peso || 'No especificado')} kg</p>
                    <p><strong>Color:</strong> ${escapeHtml(mascota.color || 'No especificado')}</p>
                    ${mascota.alergias ? `<p><strong>Alergias:</strong> ${escapeHtml(mascota.alergias)}</p>` : ''}
                    ${mascota.enfermedades ? `<p><strong>Enfermedades:</strong> ${escapeHtml(mascota.enfermedades)}</p>` : ''}
                    ${mascota.vacunas ? `<p><strong>Vacunas:</strong> ${escapeHtml(mascota.vacunas)}</p>` : ''}
                    ${mascota.observaciones || mascota.notas ? `<p><strong>Observaciones:</strong> ${escapeHtml(mascota.observaciones || mascota.notas)}</p>` : ''}
                </div>
            </div>
            ${historial.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h4>Historial Clínico</h4>
                    ${historial.map(h => `
                        <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                            <p><strong>${escapeHtml(h.fecha)}</strong></p>
                            <p>${escapeHtml(h.diagnostico || 'Sin diagnóstico')}</p>
                            ${h.tratamiento ? `<p><strong>Tratamiento:</strong> ${escapeHtml(h.tratamiento)}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div style="margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="abrirEditarMascota('${id}')">✏️ Editar</button>
                <button class="btn btn-outline btn-sm" onclick="agendarCitaMascota('${id}')">📅 Agendar cita</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function agendarCitaMascota(id) {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    
    const selector = document.getElementById('mascotaCita');
    if (selector) {
        selector.value = id;
    }
    
    const citasSection = document.getElementById('citasSection');
    if (citasSection) {
        citasSection.scrollIntoView({ behavior: 'smooth' });
    }
}

async function eliminarMascota(id) {
    if (!confirm('¿Estás seguro de eliminar esta mascota?')) return;
    
    const tieneCitas = DB.citas.some(c => c.mascotaId === id && c.estado !== 'Cancelada' && c.estado !== 'Completada');
    if (tieneCitas) {
        showAlert('No puedes eliminar una mascota con citas activas', 'error');
        return;
    }
    
    if (await deleteMascota(id)) {
        renderMascotas();
        renderSelectorMascotas();
        showAlert('Mascota eliminada correctamente', 'success');
    } else {
        showAlert('Error al eliminar la mascota', 'error');
    }
}

function manejarFotoMascota(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showAlert('La imagen no debe superar los 5MB', 'error');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showAlert('Solo se permiten imágenes', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function () {
        mascotaFotoTemporal = reader.result;
        const preview = document.getElementById('fotoMascotaPreview');
        if (preview) {
            preview.innerHTML = `<img src="${escapeHtml(mascotaFotoTemporal)}" alt="Foto de mascota" />`;
        }
        showAlert('Foto cargada correctamente', 'success');
    };
    reader.onerror = function() {
        showAlert('Error al cargar la foto', 'error');
    };
    reader.readAsDataURL(file);
}

// ==========================================================================
// 6.1 REGISTRAR MASCOTA - CORREGIDO
// ==========================================================================

async function registrarMascotaDesdeFormulario(event) {
    event.preventDefault();
    
    console.log('📝 Registrando mascota desde formulario...');
    
    // Obtener datos del formulario
    const nombre = document.getElementById('mascotaNombre')?.value?.trim() || '';
    const especie = document.getElementById('mascotaEspecie')?.value || '';
    const raza = document.getElementById('mascotaRaza')?.value?.trim() || '';
    const sexo = document.getElementById('mascotaSexo')?.value || '';
    const edad = document.getElementById('mascotaEdad')?.value || '';
    const peso = document.getElementById('mascotaPeso')?.value || '';
    const color = document.getElementById('mascotaColor')?.value?.trim() || '';
    const fechaNacimiento = document.getElementById('mascotaFechaNacimiento')?.value || '';
    const observaciones = document.getElementById('mascotaObservaciones')?.value?.trim() || '';
    const foto = mascotaFotoTemporal || '';

    console.log('📊 Datos de mascota:', { nombre, especie, raza, sexo, edad, peso, color, fechaNacimiento, observaciones });

    if (!nombre || !especie) {
        showAlert('Completa al menos el nombre y la especie', 'error');
        return;
    }

    // Verificar que el cliente existe
    if (!cliente || !cliente.id) {
        console.error('❌ Cliente no autenticado');
        showAlert('Debes iniciar sesión para registrar una mascota', 'error');
        return;
    }

    const data = {
        nombre: nombre,
        especie: especie,
        raza: raza,
        sexo: sexo,
        edad: edad,
        peso: peso,
        color: color,
        fechaNacimiento: fechaNacimiento,
        observaciones: observaciones,
        foto: foto
    };

    const resultado = await registrarMascota(data);
    
    if (resultado) {
        document.querySelector('.modal-overlay')?.remove();
        mascotaFotoTemporal = '';
        document.getElementById('mascotaFoto').value = '';
        renderMascotas();
        renderSelectorMascotas();
        actualizarEstadisticas();
        showAlert('Mascota registrada correctamente 🐾', 'success');
    } else {
        showAlert('Error al registrar la mascota. Intenta nuevamente.', 'error');
    }
}

async function registrarMascota(data) {
    console.log('📝 Registrando mascota...');
    console.log('👤 Cliente actual:', cliente);
    
    if (!cliente || !cliente.id) {
        console.error('❌ Cliente no autenticado');
        return false;
    }
    
    // Verificar que el cliente existe en DB
    const clienteExistente = DB.usuarios.find(u => u.id === cliente.id);
    if (!clienteExistente) {
        console.error('❌ Cliente no encontrado en DB:', cliente.id);
        return false;
    }
    
    console.log('✅ Cliente verificado:', clienteExistente.correo);
    
    const mascota = {
        id: generateId('PET'),
        clienteId: cliente.id,
        nombre: data.nombre,
        especie: data.especie,
        raza: data.raza || '',
        sexo: data.sexo || '',
        edad: data.edad || '',
        peso: data.peso || '',
        color: data.color || '',
        fechaNacimiento: data.fechaNacimiento || '',
        observaciones: data.observaciones || '',
        notas: data.observaciones || '',
        foto: data.foto || '',
        alergias: data.alergias || '',
        enfermedades: data.enfermedades || '',
        vacunas: data.vacunas || '',
        fechaRegistro: getCurrentDateTime()
    };
    
    console.log('🐾 Mascota a registrar:', mascota);
    
    const resultado = await addMascota(mascota);
    console.log('📊 Resultado addMascota:', resultado);
    
    if (resultado) {
        console.log('✅ Mascota registrada:', resultado.nombre);
        return true;
    } else {
        console.error('❌ Error al registrar mascota');
        return false;
    }
}

// ==========================================================================
// 7. SELECCIONES
// ==========================================================================

function renderSelectorMascotas() {
    const selectors = [
        document.getElementById('historialMascota'),
        document.getElementById('mascotaCita')
    ];
    
    selectors.forEach(selector => {
        if (!selector || !cliente) return;
        
        const mascotas = DB.mascotas.filter(m => m.clienteId === cliente.id);
        const options = mascotas.map(m => 
            `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)} (${escapeHtml(m.especie || 'Mascota')})</option>`
        ).join('');
        
        if (selector.id === 'mascotaCita') {
            selector.innerHTML = `<option value="">Selecciona una mascota</option>${options}`;
        } else {
            selector.innerHTML = options;
        }
    });
}

function renderSelectorServiciosCita() {
    const selector = document.getElementById('servicioCita');
    if (!selector) return;
    
    const servicios = DB.servicios.filter(s => (s.estado || 'Activo') === 'Activo');
    selector.innerHTML = servicios.map(s => 
        `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nombre)} - ${formatCurrency(s.precio)}</option>`
    ).join('');
}

// ==========================================================================
// 8. HISTORIAL CLÍNICO
// ==========================================================================

function renderHistorialClinico() {
    const container = document.getElementById('historialContainer');
    if (!container || !cliente) return;
    
    const registros = DB.historialClinico.filter(h => h.clienteId === cliente.id);
    if (!registros.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #64748b;">No hay historial clínico registrado aún.</p>
                <button class="btn btn-primary btn-sm" onclick="abrirFormularioHistorial()">+ Agregar registro</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = registros.slice().reverse().map(h => `
        <div class="notification-item ${h.estado === 'Activo' ? '' : 'unread'}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(h.diagnostico || 'Sin diagnóstico')}</strong>
                    <div style="font-size: 0.85rem; color: #64748b;">
                        ${escapeHtml(h.fecha)} • Mascota: ${escapeHtml(DB.mascotas.find(m => m.id === h.mascotaId)?.nombre || 'Sin mascota')}
                    </div>
                    ${h.tratamiento ? `<div style="font-size: 0.85rem;"><strong>Tratamiento:</strong> ${escapeHtml(h.tratamiento)}</div>` : ''}
                    ${h.vacuna ? `<div style="font-size: 0.85rem;"><strong>Vacuna:</strong> ${escapeHtml(h.vacuna)}</div>` : ''}
                    ${h.observaciones ? `<div style="font-size: 0.85rem;">${escapeHtml(h.observaciones)}</div>` : ''}
                </div>
                <span class="status-badge ${h.estado === 'Activo' ? 'active' : 'inactive'}">${escapeHtml(h.estado || 'Activo')}</span>
            </div>
        </div>
    `).join('');
}

function abrirFormularioHistorial() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Agregar Historial Clínico</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <form id="formHistorial" onsubmit="guardarHistorialDesdeFormulario(event)">
                <div class="form-group">
                    <label class="required">Mascota</label>
                    <select id="historialMascota" required></select>
                </div>
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="historialFecha" value="${getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label class="required">Diagnóstico</label>
                    <textarea id="historialDiagnostico" required rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Tratamiento</label>
                    <textarea id="historialTratamiento" rows="2"></textarea>
                </div>
                <div class="form-grid two">
                    <div class="form-group">
                        <label>Vacuna</label>
                        <input type="text" id="historialVacuna">
                    </div>
                    <div class="form-group">
                        <label>Receta</label>
                        <input type="text" id="historialReceta">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea id="historialObservaciones" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="historialEstado">
                        <option value="Activo">Activo</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="En tratamiento">En tratamiento</option>
                    </select>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    const selector = document.getElementById('historialMascota');
    if (selector && cliente) {
        const mascotas = DB.mascotas.filter(m => m.clienteId === cliente.id);
        selector.innerHTML = mascotas.map(m => 
            `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)}</option>`
        ).join('');
    }
}

function guardarHistorialDesdeFormulario(event) {
    event.preventDefault();
    
    const mascotaId = document.getElementById('historialMascota').value;
    const fecha = document.getElementById('historialFecha').value || getCurrentDate();
    const diagnostico = document.getElementById('historialDiagnostico').value.trim();
    const tratamiento = document.getElementById('historialTratamiento').value.trim();
    const vacuna = document.getElementById('historialVacuna').value.trim();
    const receta = document.getElementById('historialReceta').value.trim();
    const observaciones = document.getElementById('historialObservaciones').value.trim();
    const estado = document.getElementById('historialEstado').value;

    if (!mascotaId || !diagnostico) {
        showAlert('Selecciona una mascota y escribe un diagnóstico', 'error');
        return;
    }

    const registro = {
        id: generateId('HIST'),
        clienteId: cliente.id,
        mascotaId,
        fecha,
        diagnostico,
        tratamiento,
        vacuna,
        receta,
        observaciones,
        estado
    };

    if (addHistorialClinico(registro)) {
        addNotificacion({
            id: generateId('NOTI'),
            clienteId: cliente.id,
            titulo: 'Nuevo registro clínico',
            mensaje: `Se registró un nuevo seguimiento clínico para ${DB.mascotas.find(m => m.id === mascotaId)?.nombre || 'tu mascota'}`,
            fecha: getCurrentDateTime()
        });
        document.querySelector('.modal-overlay')?.remove();
        renderHistorialClinico();
        showAlert('Historial guardado correctamente', 'success');
    } else {
        showAlert('Error al guardar el historial', 'error');
    }
}

// ==========================================================================
// 9. PRODUCTOS Y SERVICIOS
// ==========================================================================

function renderProductos() {
    const container = document.getElementById('productosContainer');
    const serviciosContainer = document.getElementById('serviciosContainer');
    const categoriaSelect = document.getElementById('filtroCategoriaProducto');
    
    if (!container) return;
    
    const productosFiltrados = DB.productos.filter((producto) => {
        const texto = `${producto.nombre} ${producto.categoria || ''} ${producto.descripcion || ''}`.toLowerCase();
        const coincideTexto = texto.includes(filtroProducto.toLowerCase());
        const coincideCategoria = filtroCategoria === 'Todos' || (producto.categoria || 'General') === filtroCategoria;
        return coincideTexto && coincideCategoria && (producto.estado || 'Activo') === 'Activo';
    });
    
    container.innerHTML = productosFiltrados.length ? productosFiltrados.map(producto => `
        <div class="product-card">
            <div class="product-image" style="background: #F3F4F6; height: 120px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                🛍️
            </div>
            <div class="product-name">${escapeHtml(producto.nombre)}</div>
            <div class="product-detail">${escapeHtml(producto.categoria || 'General')}</div>
            <div class="product-price">${formatCurrency(producto.precio)}</div>
            <div class="product-detail">${escapeHtml(producto.descripcion || '')}</div>
            <div class="product-detail">Stock: ${producto.stock || 0} unidades</div>
            <button class="btn btn-primary btn-sm" onclick="agregarCarrito('${producto.id}', false)" ${(producto.stock || 0) <= 0 ? 'disabled' : ''}>
                ${(producto.stock || 0) > 0 ? '🛒 Agregar' : '⚠️ Sin stock'}
            </button>
        </div>
    `).join('') : `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <p style="color: #64748b;">No hay productos que coincidan con tu búsqueda</p>
        </div>
    `;
    
    if (serviciosContainer) {
        const serviciosActivos = DB.servicios.filter(s => (s.estado || 'Activo') === 'Activo');
        serviciosContainer.innerHTML = serviciosActivos.map(servicio => `
            <div class="service-card">
                <div class="service-image" style="background: #F3F4F6; height: 120px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                    🏥
                </div>
                <div class="service-name">${escapeHtml(servicio.nombre)}</div>
                <div class="service-detail">${escapeHtml(servicio.duracion || '30 min')}</div>
                <div class="service-price">${formatCurrency(servicio.precio)}</div>
                <div class="service-detail">${escapeHtml(servicio.descripcion || '')}</div>
                <button class="btn btn-secondary btn-sm" onclick="agregarCarrito('${servicio.id}', true)">📅 Agendar</button>
            </div>
        `).join('');
    }
    
    if (categoriaSelect) {
        const categorias = ['Todos', ...new Set(DB.productos.map(p => p.categoria || 'General'))];
        const currentValue = categoriaSelect.value;
        categoriaSelect.innerHTML = categorias.map(cat => 
            `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
        ).join('');
        categoriaSelect.value = currentValue || 'Todos';
    }
}

function actualizarFiltroProductos(valor) {
    filtroProducto = valor || '';
    renderProductos();
}

function actualizarFiltroCategoria(valor) {
    filtroCategoria = valor || 'Todos';
    renderProductos();
}

// ==========================================================================
// 10. CARRITO DE COMPRAS
// ==========================================================================

function agregarCarrito(id, isServicio = false) {
    const item = isServicio ? DB.servicios.find(s => s.id === id) : DB.productos.find(p => p.id === id);
    if (!item) {
        showAlert('Item no encontrado', 'error');
        return;
    }
    
    if (!isServicio && (item.stock || 0) <= 0) {
        showAlert('Producto sin stock disponible', 'error');
        return;
    }
    
    const existing = carrito.find(c => c.id === item.id && c.kind === (isServicio ? 'servicio' : 'producto'));
    if (existing) {
        existing.cantidad += 1;
    } else {
        carrito.push({ 
            ...item, 
            kind: isServicio ? 'servicio' : 'producto', 
            cantidad: 1 
        });
    }
    
    actualizarCarrito();
    showAlert(`${item.nombre} agregado al carrito 🛒`, 'success');
}

function actualizarCantidad(id, delta) {
    const item = carrito.find(c => c.id === id);
    if (!item) return;
    item.cantidad = Math.max(1, item.cantidad + delta);
    actualizarCarrito();
}

function eliminarCarrito(id) {
    carrito = carrito.filter(c => c.id !== id);
    actualizarCarrito();
}

function limpiarCarrito() {
    if (!carrito.length) return;
    if (!confirm('¿Estás seguro de vaciar el carrito?')) return;
    carrito = [];
    actualizarCarrito();
    showAlert('Carrito vaciado', 'info');
}

// ==========================================================================
// 10.1 ACTUALIZAR CARRITO
// ==========================================================================

function actualizarCarrito() {
    const total = carrito.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 1), 0);
    const totalBox = document.getElementById('carritoTotal');
    const itemsBox = document.getElementById('carritoItems');
    const listBox = document.getElementById('carritoItemsList');
    const paymentTotal = document.getElementById('paymentTotal');
    
    if (totalBox) totalBox.textContent = formatCurrency(total);
    if (itemsBox) itemsBox.textContent = carrito.length;
    
    if (paymentTotal) {
        paymentTotal.textContent = formatCurrency(total);
    }
    
    if (listBox) {
        if (!carrito.length) {
            listBox.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3rem;">🛒</span>
                    <p style="color: #64748b;">Tu carrito está vacío</p>
                </div>
            `;
            return;
        }
        
        listBox.innerHTML = carrito.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <strong>${escapeHtml(item.nombre)}</strong>
                    <br>
                    <small style="color: #64748b;">${escapeHtml(item.kind === 'servicio' ? 'Servicio' : 'Producto')}</small>
                    <br>
                    <small>${formatCurrency(item.precio)} c/u</small>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn btn-sm btn-outline" onclick="actualizarCantidad('${escapeHtml(item.id)}', -1)" style="padding: 4px 10px;">-</button>
                    <span style="min-width: 24px; text-align: center; font-weight: 600;">${item.cantidad}</span>
                    <button class="btn btn-sm btn-outline" onclick="actualizarCantidad('${escapeHtml(item.id)}', 1)" style="padding: 4px 10px;">+</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarCarrito('${escapeHtml(item.id)}')" style="padding: 4px 10px;">✕</button>
                </div>
            </div>
        `).join('');
    }
}

// ==========================================================================
// 11. CITAS Y AGENDA
// ==========================================================================

function renderCitas() {
    const container = document.getElementById('citasContainer');
    if (!container || !cliente) return;
    
    const citas = DB.citas.filter(c => c.clienteId === cliente.id);
    if (!citas.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #64748b;">No tienes citas registradas</p>
                <button class="btn btn-primary btn-sm" onclick="irACitas()">📅 Agendar cita</button>
            </div>
        `;
        return;
    }
    
    citas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    container.innerHTML = citas.map(c => renderTarjetaCita(c)).join('');
}

function renderTarjetaCita(c) {
    const mascota = DB.mascotas.find(m => m.id === c.mascotaId)?.nombre || 'Sin mascota';
    const servicio = DB.servicios.find(s => s.id === c.servicioId)?.nombre || c.servicio || 'Servicio';
    const estado = c.estado || 'Pendiente';
    
    const estadoColors = {
        'Pendiente': 'pending',
        'Aceptada': 'in-progress',
        'En proceso': 'in-progress',
        'Completada': 'approved',
        'Cancelada': 'rejected'
    };
    
    const puedeCancelar = estado === 'Pendiente' || estado === 'Aceptada';
    const puedeReprogramar = estado === 'Pendiente' || estado === 'Aceptada';
    
    return `
        <div class="cita-box">
            <div class="cita-header">
                <div>
                    <div class="cita-title">${escapeHtml(servicio)}</div>
                    <div class="cita-info">🐾 ${escapeHtml(mascota)}</div>
                </div>
                <span class="status-badge ${estadoColors[estado] || 'pending'}">${escapeHtml(estado)}</span>
            </div>
            <div class="cita-info">📅 ${escapeHtml(formatDate(c.fecha, 'long'))} • 🕐 ${escapeHtml(c.hora)}</div>
            <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                ${puedeCancelar ? `<button class="btn btn-sm btn-danger" onclick="cancelarCita('${c.id}')">🗑️ Cancelar</button>` : ''}
                ${puedeReprogramar ? `<button class="btn btn-sm btn-outline" onclick="reprogramarCita('${c.id}')">🔄 Reprogramar</button>` : ''}
            </div>
        </div>
    `;
}

function irACitas() {
    const citasSection = document.getElementById('citasSection');
    if (citasSection) {
        citasSection.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('fechaCita')?.focus();
    }
}

async function renderDisponibilidadAgenda() {
    const inputFecha = document.getElementById('fechaCita');
    const container = document.getElementById('agendaSlots');
    const summary = document.getElementById('agendaSummary');
    const horaInput = document.getElementById('horaCita');
    
    if (!inputFecha || !container) return;

    const fecha = inputFecha.value;
    if (!fecha) {
        container.innerHTML = '<p style="color: #64748b;">Selecciona una fecha para ver los horarios disponibles.</p>';
        if (summary) summary.innerHTML = '';
        return;
    }

    const fechaReserva = new Date(fecha);
    const dia = fechaReserva.getDay();
    
    if (dia === 0) {
        container.innerHTML = '<p style="color: #EF4444;">La clínica atiende de lunes a sábado. 🏥</p>';
        if (summary) summary.innerHTML = '<strong>Domingo - No disponible</strong>';
        return;
    }

    // Await the asynchronous database check to get the actual array instead of a Promise
    let horarios = [];
    try {
        horarios = await getHorariosDisponibles(fecha);
    } catch (e) {
        console.error('Error fetching schedules:', e);
        container.innerHTML = '<p style="color: #EF4444;">Error al cargar horarios. Intenta de nuevo.</p>';
        return;
    }

    const allHoras = [];
    for (let h = 9; h < 17; h++) {
        for (let m = 0; m < 60; m += 30) {
            const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            allHoras.push(horaStr);
        }
    }
    
    container.innerHTML = allHoras.map(hora => {
        const disponible = horarios.includes(hora);
        const isSelected = horaInput && horaInput.value === hora;
        return `
            <button class="agenda-slot ${disponible ? (isSelected ? 'selected' : 'available') : 'blocked'}" 
                    ${disponible ? `onclick="seleccionarHorario('${hora}')"` : 'disabled'}>
                ${hora}
                ${isSelected ? ' ✓' : ''}
            </button>
        `;
    }).join('');

    const fechaTexto = fechaReserva.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    if (summary) {
        summary.innerHTML = `
            <strong>📅 ${escapeHtml(fechaTexto)}</strong>
            <div class="agenda-legend">
                <span class="legend-item"><span class="legend available"></span> Disponible</span>
                <span class="legend-item"><span class="legend blocked"></span> Ocupado</span>
                <span class="legend-item"><span class="legend selected"></span> Seleccionado</span>
            </div>
        `;
    }
}

async function seleccionarHorario(hora) {
    const input = document.getElementById('horaCita');
    if (!input) return;
    input.value = hora;
    await renderDisponibilidadAgenda();
    showAlert(`Horario seleccionado: ${hora}`, 'success');
}

async function reservarCitaDesdeFormulario() {
    const fecha = document.getElementById('fechaCita')?.value || '';
    const hora = document.getElementById('horaCita')?.value || '';
    const servicioId = document.getElementById('servicioCita')?.value || '';
    const mascotaId = document.getElementById('mascotaCita')?.value || '';
    
    await reservarCita(fecha, hora, servicioId, mascotaId);
}

async function reservarCita(fecha, hora, servicioId, mascotaId) {
    if (!cliente) {
        showAlert('Debes iniciar sesión para reservar una cita', 'error');
        return;
    }
    
    if (!fecha) {
        showAlert('Selecciona una fecha para la cita', 'error');
        return;
    }
    
    if (!hora) {
        showAlert('Selecciona un horario para la cita', 'error');
        return;
    }
    
    if (!servicioId) {
        showAlert('Selecciona un servicio para la cita', 'error');
        return;
    }
    
    if (!mascotaId) {
        showAlert('Selecciona una mascota para la cita', 'error');
        return;
    }

    const fechaReserva = new Date(fecha);
    const dia = fechaReserva.getDay();
    if (dia === 0) {
        showAlert('La clínica atiende de lunes a sábado', 'error');
        return;
    }

    const [hh, mm] = hora.split(':').map(Number);
    const horaNum = hh * 60 + mm;
    if (horaNum < 9 * 60 || horaNum >= 17 * 60) {
        showAlert('El horario debe estar entre 09:00 y 17:00', 'error');
        return;
    }

    const existe = DB.citas.some(c => c.fecha === fecha && c.hora === hora && c.estado !== 'Cancelada');
    if (existe) {
        showAlert('Este horario ya está ocupado. Selecciona otro.', 'error');
        return;
    }

    const servicio = DB.servicios.find(s => s.id === servicioId);
    const citaId = citaEditandoId || generateId('CITA');
    
    const cita = {
        id: citaId,
        clienteId: cliente.id,
        mascotaId: mascotaId,
        servicioId: servicioId,
        servicio: servicio?.nombre || servicioId,
        fecha: fecha,
        hora: hora,
        veterinarioId: '',
        estado: 'Pendiente',
        pagoId: ''
    };
    
    if (citaEditandoId) {
        await updateCita(citaId, cita);
        addNotificacion({
            id: generateId('NOTI'),
            clienteId: cliente.id,
            titulo: 'Cita reprogramada',
            mensaje: `Tu cita para ${cita.servicio} ha sido reprogramada para el ${formatDate(fecha)} a las ${hora}`,
            fecha: getCurrentDateTime()
        });
        showAlert('Cita reprogramada correctamente 🔄', 'success');
        citaEditandoId = null;
    } else {
        await addCita(cita);
        addNotificacion({
            id: generateId('NOTI'),
            clienteId: cliente.id,
            titulo: 'Cita registrada',
            mensaje: `Tu cita para ${cita.servicio} ha sido registrada para el ${formatDate(fecha)} a las ${hora}`,
            fecha: getCurrentDateTime()
        });
        showAlert('Cita reservada correctamente 📅', 'success');
    }
    
    document.getElementById('horaCita').value = '';
    renderCitas();
    await renderDisponibilidadAgenda();
    actualizarEstadisticas();
}

async function reprogramarCita(id) {
    const cita = DB.citas.find(c => c.id === id);
    if (!cita) {
        showAlert('Cita no encontrada', 'error');
        return;
    }
    
    citaEditandoId = id;
    document.getElementById('fechaCita').value = cita.fecha;
    document.getElementById('horaCita').value = cita.hora;
    document.getElementById('servicioCita').value = cita.servicioId || cita.servicio;
    document.getElementById('mascotaCita').value = cita.mascotaId || '';
    
    showAlert(`Reprogramando cita para ${cita.servicio} - Selecciona nueva fecha y hora`, 'info');
    document.getElementById('fechaCita')?.focus();
    await renderDisponibilidadAgenda();
}

async function cancelarCita(id) {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) return;
    
    const cita = DB.citas.find(c => c.id === id);
    if (!cita) return;
    
    await updateCita(id, { estado: 'Cancelada' });
    addNotificacion({
        id: generateId('NOTI'),
        clienteId: cita.clienteId,
        titulo: 'Cita cancelada',
        mensaje: `Tu cita del ${formatDate(cita.fecha)} a las ${cita.hora} ha sido cancelada`,
        fecha: getCurrentDateTime()
    });
    
    renderCitas();
    await renderDisponibilidadAgenda();
    actualizarEstadisticas();
    showAlert('Cita cancelada correctamente', 'success');
}

// ==========================================================================
// 12. PAGOS Y COMPROBANTES
// ==========================================================================

function seleccionarMetodo(tipo) {
    modoPago = tipo;
    
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    paymentMethodBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === tipo);
    });
    
    const paymentNumber = document.getElementById('paymentNumber');
    if (paymentNumber) {
        const numbers = {
            'Yape': EMPRESA.yape || '929514843',
            'Plin': EMPRESA.plin || '929514843',
            'Tarjeta': 'Pago con tarjeta al confirmar checkout',
            'Efectivo': 'Pago en caja al recibir el producto o servicio'
        };
        paymentNumber.textContent = numbers[tipo] || '';
    }
    
    const comprobanteSection = document.getElementById('comprobanteSection');
    if (comprobanteSection) {
        comprobanteSection.style.display = (tipo === 'Yape' || tipo === 'Plin') ? 'block' : 'none';
    }
    
    showAlert(`💳 Método de pago: ${tipo}`, 'info');
}

function generarPago(tipo = 'Yape') {
    seleccionarMetodo(tipo);
    
    const total = carrito.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 1), 0);
    const paymentTotal = document.getElementById('paymentTotal');
    if (paymentTotal) {
        paymentTotal.textContent = formatCurrency(total);
    }
    
    if (total === 0) {
        showAlert('El carrito está vacío. Agrega productos o servicios.', 'warning');
    } else {
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
            paymentSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function manejarComprobante(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showAlert('El archivo no debe superar los 5MB', 'error');
        event.target.value = '';
        return;
    }
    
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
        showAlert('Solo se permiten JPG, PNG o PDF', 'error');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function () {
        comprobanteTemporal = reader.result;
        const status = document.getElementById('comprobanteStatus');
        if (status) {
            status.innerHTML = '✅ Comprobante cargado correctamente';
            status.style.color = '#10B981';
        }
        showAlert('Comprobante listo para enviar 📎', 'success');
    };
    reader.onerror = function() {
        showAlert('Error al cargar el comprobante', 'error');
    };
    reader.readAsDataURL(file);
}

function subirComprobante() {
    if (!cliente) {
        showAlert('Debes iniciar sesión para realizar un pedido', 'error');
        return;
    }
    
    const total = carrito.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 1), 0);
    if (total === 0) {
        showAlert('El carrito está vacío', 'error');
        return;
    }

    if ((modoPago === 'Yape' || modoPago === 'Plin') && !comprobanteTemporal) {
        showAlert('Por favor, sube el comprobante de pago 📎', 'error');
        return;
    }

    const venta = {
        id: generateId('VENTA'),
        clienteId: cliente.id,
        fecha: getCurrentDate(),
        total: total,
        estado: 'Pendiente',
        metodoPago: modoPago,
        estadoPago: 'Pendiente',
        comprobante: comprobanteTemporal || '',
        items: carrito.map(item => ({ 
            productoId: item.id, 
            cantidad: Number(item.cantidad || 1), 
            precio: Number(item.precio || 0), 
            tipo: item.kind || 'producto',
            nombre: item.nombre
        }))
    };
    
    addVenta(venta);
    
    const pago = {
        id: generateId('PAG'),
        clienteId: cliente.id,
        ventaId: venta.id,
        monto: total,
        metodo: modoPago,
        estado: 'Pendiente',
        comprobante: comprobanteTemporal || '',
        fechaPago: getCurrentDateTime()
    };
    addPago(pago);
    
    addNotificacion({
        id: generateId('NOTI'),
        clienteId: cliente.id,
        titulo: 'Nuevo pedido',
        mensaje: `Tu pedido por ${formatCurrency(total)} ha sido registrado y está pendiente de validación`,
        fecha: getCurrentDateTime()
    });
    
    carrito = [];
    comprobanteTemporal = '';
    actualizarCarrito();
    
    const fileInput = document.getElementById('paymentFile');
    if (fileInput) fileInput.value = '';
    const status = document.getElementById('comprobanteStatus');
    if (status) status.innerHTML = '';
    
    renderHistorialCompras();
    actualizarEstadisticas();
    showAlert('Pedido enviado correctamente ✅', 'success');
}

// ==========================================================================
// 13. HISTORIAL DE COMPRAS
// ==========================================================================

function renderHistorialCompras() {
    const container = document.getElementById('historialComprasContainer');
    if (!container || !cliente) return;
    
    const ventas = DB.ventas ? DB.ventas.filter(v => v.clienteId === cliente.id) : [];
    if (!ventas.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #64748b;">No tienes compras registradas</p>
            </div>
        `;
        return;
    }
    
    ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    container.innerHTML = ventas.map(v => renderTarjetaCompra(v)).join('');
}

function renderTarjetaCompra(venta) {
    const pago = DB.pagos ? DB.pagos.find(p => p.ventaId === venta.id) : null;
    const estadoColors = {
        'Pendiente': 'pending',
        'En revisión': 'in-progress',
        'Aprobado': 'approved',
        'Rechazado': 'rejected',
        'Completado': 'approved',
        'Cancelado': 'rejected'
    };
    
    const resumen = venta.items ? venta.items.map(item => 
        `${item.nombre || item.productoId} x${item.cantidad}`
    ).join(', ') : 'Sin detalle';
    
    return `
        <div class="notification-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(venta.id)}</strong>
                    <div style="font-size: 0.85rem; color: #64748b;">
                        ${escapeHtml(formatDate(venta.fecha, 'long'))}
                    </div>
                    <div style="font-size: 0.85rem;">${escapeHtml(resumen)}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: 700; color: #10B981;">${formatCurrency(venta.total)}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${escapeHtml(venta.metodoPago || 'Sin método')}</div>
                    <span class="status-badge ${estadoColors[venta.estadoPago || venta.estado] || 'pending'}">
                        ${escapeHtml(venta.estadoPago || venta.estado || 'Pendiente')}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// ==========================================================================
// 14. NOTIFICACIONES
// ==========================================================================

function renderNotificaciones() {
    const container = document.getElementById('notificacionesContainer');
    if (!container || !cliente) return;
    
    const notis = DB.notificaciones.filter(n => n.clienteId === cliente.id);
    if (!notis.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <span style="font-size: 2rem;">🔔</span>
                <p style="color: #64748b;">No tienes notificaciones</p>
            </div>
        `;
        return;
    }
    
    notis.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    container.innerHTML = notis.map(n => renderTarjetaNotificacion(n)).join('');
    
    const noLeidas = notis.filter(n => !n.leida).length;
    const badge = document.getElementById('notificacionesBadge');
    if (badge) {
        badge.textContent = noLeidas;
        badge.style.display = noLeidas > 0 ? 'inline' : 'none';
    }
}

function renderTarjetaNotificacion(n) {
    const isUnread = !n.leida;
    
    return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="marcarNotificacionLeida('${n.id}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(n.titulo || 'Notificación')}</strong>
                    <div>${escapeHtml(n.mensaje)}</div>
                    <div class="notification-time">${escapeHtml(n.fecha)}</div>
                </div>
                ${isUnread ? '<span style="font-size: 0.7rem; color: #1E5EFF;">● Nuevo</span>' : ''}
            </div>
        </div>
    `;
}

function marcarNotificacionLeida(id) {
    const noti = DB.notificaciones.find(n => n.id === id);
    if (noti && !noti.leida) {
        marcarNotificacionLeidaDB(id);
        renderNotificaciones();
        actualizarEstadisticas();
    }
}

function marcarTodasNotificaciones() {
    if (!cliente) return;
    
    const noLeidas = DB.notificaciones.filter(n => n.clienteId === cliente.id && !n.leida);
    if (!noLeidas.length) {
        showAlert('No tienes notificaciones sin leer', 'info');
        return;
    }
    
    marcarTodasLeidas(cliente.id);
    renderNotificaciones();
    actualizarEstadisticas();
    showAlert('Todas las notificaciones marcadas como leídas', 'success');
}

// ==========================================================================
// 15. FUNCIONES DE UTILIDAD
// ==========================================================================

function marcarNotificacionLeidaDB(id) {
    const idx = DB.notificaciones.findIndex(n => n.id === id);
    if (idx !== -1) {
        DB.notificaciones[idx].leida = true;
        saveDB();
    }
}

function addNotificacion(notificacion) {
    if (!DB.notificaciones) DB.notificaciones = [];
    DB.notificaciones.push(notificacion);
    saveDB();
}

// ==========================================================================
// 16. EXPORTACIÓN GLOBAL
// ==========================================================================

window.getClienteActual = getClienteActual;
window.requireCliente = requireCliente;
window.cargarDashboard = cargarDashboard;
window.logoutCliente = logoutCliente;
window.editarPerfilCliente = editarPerfilCliente;
window.guardarEdicionPerfil = guardarEdicionPerfil;
window.cambiarContrasena = cambiarContrasena;
window.guardarCambioContrasena = guardarCambioContrasena;
window.renderMascotas = renderMascotas;
window.registrarMascotaDesdeFormulario = registrarMascotaDesdeFormulario;
window.manejarFotoMascota = manejarFotoMascota;
window.abrirFormularioMascota = abrirFormularioMascota;
window.abrirEditarMascota = abrirEditarMascota;
window.guardarEdicionMascota = guardarEdicionMascota;
window.verMascota = verMascota;
window.eliminarMascota = eliminarMascota;
window.agendarCitaMascota = agendarCitaMascota;
window.renderSelectorMascotas = renderSelectorMascotas;
window.renderSelectorServiciosCita = renderSelectorServiciosCita;
window.renderHistorialClinico = renderHistorialClinico;
window.guardarHistorialDesdeFormulario = guardarHistorialDesdeFormulario;
window.abrirFormularioHistorial = abrirFormularioHistorial;
window.renderProductos = renderProductos;
window.actualizarFiltroProductos = actualizarFiltroProductos;
window.actualizarFiltroCategoria = actualizarFiltroCategoria;
window.agregarCarrito = agregarCarrito;
window.actualizarCantidad = actualizarCantidad;
window.eliminarCarrito = eliminarCarrito;
window.limpiarCarrito = limpiarCarrito;
window.actualizarCarrito = actualizarCarrito;
window.renderCitas = renderCitas;
window.irACitas = irACitas;
window.renderDisponibilidadAgenda = renderDisponibilidadAgenda;
window.seleccionarHorario = seleccionarHorario;
window.reservarCitaDesdeFormulario = reservarCitaDesdeFormulario;
window.reservarCita = reservarCita;
window.reprogramarCita = reprogramarCita;
window.cancelarCita = cancelarCita;
window.seleccionarMetodo = seleccionarMetodo;
window.generarPago = generarPago;
window.manejarComprobante = manejarComprobante;
window.subirComprobante = subirComprobante;
window.renderHistorialCompras = renderHistorialCompras;
window.renderNotificaciones = renderNotificaciones;
window.marcarNotificacionLeida = marcarNotificacionLeida;
window.marcarTodasNotificaciones = marcarTodasNotificaciones;

console.log('✅ MaskoVet Client App (corregida) loaded successfully');