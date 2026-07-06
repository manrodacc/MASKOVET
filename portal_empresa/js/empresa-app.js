/* ==========================================================================
   MASKOVET - Portal Empresa App
   Versión: 3.0 - CORREGIDA
   ========================================================================== */

const EmpresaApp = {
    currentUser: null,
    activeTab: 'dashboard',
    reportData: null,
    isLoading: false,
    
    filters: {
        clientes: { termino: '', estado: 'Todos' },
        citas: { termino: '', estado: 'Todos' },
        productos: { termino: '', categoria: 'Todos' },
        pagos: { termino: '', estado: 'Todos' }
    },
    
    pagination: {
        clientes: { page: 1, perPage: 10 },
        citas: { page: 1, perPage: 10 },
        productos: { page: 1, perPage: 10 },
        pagos: { page: 1, perPage: 10 }
    },

    async init() {
        await initDB();
        try {
            if (!this.verificarSesion()) return;
            this.currentUser = this.obtenerUsuarioActual();
            
            this.renderizarDashboard();
            this.renderizarClientes();
            this.renderizarMascotas();
            this.renderizarServicios();
            this.renderizarProductos();
            this.renderizarCitas();
            this.renderizarClinica();
            this.renderizarPagos();
            this.renderizarVentasHistorial();
            this.renderizarPersonal();
            this.renderizarStock();
            this.renderizarConfigPagos();
            this.renderizarReportes();
            this.renderizarNotificacionesAdmin();
            this.cargarEventos();
            
            console.log('✅ MaskoVet Enterprise App loaded successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            showAlert('Error al cargar el portal administrativo', 'error');
        }
    },

    verificarSesion() {
        try {
            const session = getFromStorage('maskovet_admin_session');
            if (!session || !session.isLoggedIn) {
                window.location.href = 'login.html';
                return false;
            }
            if (session.fechaExpiracion) {
                const expiracion = new Date(session.fechaExpiracion);
                if (expiracion < new Date()) {
                    this.logout();
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('Error verifying session:', error);
            window.location.href = 'login.html';
            return false;
        }
    },

    obtenerUsuarioActual() {
        try {
            const session = getFromStorage('maskovet_admin_session');
            if (session && session.usuario) return session.usuario;
            return null;
        } catch (error) {
            return null;
        }
    },

    logout() {
        removeFromStorage('maskovet_admin_session');
        this.currentUser = null;
        showAlert('Sesión cerrada correctamente', 'info');
        window.location.href = 'login.html';
    },

    cargarEventos() {
        document.querySelectorAll('.admin-menu li a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section || link.getAttribute('href')?.replace('#', '');
                if (section) this.cambiarSeccion(section);
            });
        });
        
        const searchInput = document.getElementById('searchGlobal');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                EmpresaApp.buscarGlobal(e.target.value);
            });
        }
    },

    cambiarSeccion(section) {
        this.activeTab = section;
        document.querySelectorAll('.admin-menu li').forEach(li => {
            const link = li.querySelector('a');
            li.classList.toggle('active', link?.dataset?.section === section);
        });
        document.querySelectorAll('.admin-section').forEach(el => {
            el.classList.toggle('active', el.id === `section-${section}`);
        });
        
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Panel de Control' },
            clientes: { title: 'Clientes', subtitle: 'Gestión de clientes' },
            mascotas: { title: 'Mascotas', subtitle: 'Gestión de mascotas' },
            servicios: { title: 'Servicios', subtitle: 'Gestión de servicios' },
            productos: { title: 'Productos', subtitle: 'Gestión de productos' },
            citas: { title: 'Citas', subtitle: 'Gestión de citas' },
            clinica: { title: 'Clínica', subtitle: 'Historial clínico' },
            pagos: { title: 'Pagos', subtitle: 'Validación de pagos' },
            ventas: { title: 'Ventas', subtitle: 'Historial de ventas' },
            personal: { title: 'Personal', subtitle: 'Gestión de personal' },
            reportes: { title: 'Reportes', subtitle: 'Reportes y exportación' },
            config: { title: 'Configuración', subtitle: 'Configuración del sistema' }
        };
        
        const info = titles[section] || titles.dashboard;
        const tituloEl = document.querySelector('.topbar-admin .eyebrow');
        const subtituloEl = document.querySelector('.topbar-admin h2');
        if (tituloEl) tituloEl.textContent = info.title;
        if (subtituloEl) subtituloEl.textContent = info.subtitle;
    },

    buscarGlobal(termino) {
        if (!termino || termino.length < 2) {
            document.querySelectorAll('.admin-section').forEach(el => el.classList.add('active'));
            return;
        }
        const terminoLower = termino.toLowerCase().trim();
        let found = false;
        document.querySelectorAll('.admin-section').forEach(el => {
            const text = el.textContent.toLowerCase();
            if (text.includes(terminoLower)) {
                el.classList.add('active');
                found = true;
            } else {
                el.classList.remove('active');
            }
        });
        if (!found) {
            const dashboard = document.getElementById('section-dashboard');
            dashboard.classList.add('active');
            dashboard.innerHTML = `
                <div class="admin-table-box" style="text-align: center; padding: 60px 20px;">
                    <span style="font-size: 4rem;">🔍</span>
                    <h3>No se encontraron resultados</h3>
                    <p style="color: #64748b;">Intenta con otra palabra clave</p>
                </div>
            `;
        }
    },

    abrirModal(idModal) {
        const modal = document.getElementById(idModal);
        if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    },

    cerrarModal(idModal) {
        const modal = document.getElementById(idModal);
        if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
    },

    // ==========================================================================
    // DASHBOARD
    // ==========================================================================

    renderizarDashboard() {
        try {
            const clientes = DB.usuarios.filter(u => u.rol === 'cliente').length;
            const mascotas = DB.mascotas.length;
            const citas = DB.citas.length;
            const ventas = DB.ventas ? DB.ventas.reduce((sum, v) => sum + Number(v.total || 0), 0) : 0;
            const hoy = getCurrentDate();
            const citasHoy = DB.citas.filter(c => c.fecha === hoy).length;
            const pendientes = DB.citas.filter(c => c.estado === 'Pendiente' || c.estado === 'Confirmada').length;
            const completadas = DB.citas.filter(c => c.estado === 'Completada' || c.estado === 'Finalizada').length;
            
            this.actualizarKPI('kpi-clientes', clientes);
            this.actualizarKPI('kpi-mascotas', mascotas);
            this.actualizarKPI('kpi-citas', citas);
            this.actualizarKPI('kpi-ventas', formatCurrency(ventas));
            this.actualizarKPI('kpi-citas-hoy', citasHoy);
            this.actualizarKPI('kpi-citas-pendientes', pendientes);
            this.actualizarKPI('kpi-completadas', completadas);
            this.actualizarKPI('kpi-veterinarios', DB.veterinarios.length);
            this.actualizarKPI('kpi-recepcionistas', DB.recepcionistas.length);
            this.actualizarKPI('kpi-tecnicos', DB.tecnicos.length);
            
            const stockBajo = DB.inventario ? DB.inventario.filter(i => Number(i.stock || 0) <= Number(i.stockMinimo || 5)).length : 0;
            this.actualizarKPI('kpi-stock-bajo', stockBajo);
            this.renderizarUltimasActividades();
        } catch (error) {
            console.error('Error rendering dashboard:', error);
        }
    },

    actualizarKPI(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    },

    renderizarUltimasActividades() {
        const container = document.getElementById('ultimasActividades');
        if (!container) return;
        const actividades = [];
        DB.citas.slice().reverse().slice(0, 5).forEach(c => {
            const cliente = DB.usuarios.find(u => u.id === c.clienteId);
            actividades.push({
                fecha: c.fecha,
                hora: c.hora,
                descripcion: `📅 Cita: ${c.servicio || 'Servicio'} - ${cliente?.nombres || 'Cliente'}`,
                estado: c.estado || 'Pendiente'
            });
        });
        if (DB.pagos) {
            DB.pagos.slice().reverse().slice(0, 5).forEach(p => {
                const cliente = DB.usuarios.find(u => u.id === p.clienteId);
                actividades.push({
                    fecha: p.fechaPago || p.fechaCreacion || '',
                    hora: '',
                    descripcion: `💰 Pago: ${formatCurrency(p.monto)} - ${cliente?.nombres || 'Cliente'}`,
                    estado: p.estado || 'Pendiente'
                });
            });
        }
        actividades.sort((a, b) => { if (a.fecha > b.fecha) return -1; if (a.fecha < b.fecha) return 1; return 0; });
        const ultimas = actividades.slice(0, 8);
        if (!ultimas.length) { container.innerHTML = '<p style="color: #64748b;">No hay actividades recientes</p>'; return; }
        container.innerHTML = ultimas.map(a => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #E2E8F0;">
                <div>
                    <div style="font-weight: 500;">${escapeHtml(a.descripcion)}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(a.fecha)} ${a.hora ? '• ' + escapeHtml(a.hora) : ''}</div>
                </div>
                <span class="status-badge ${a.estado === 'Pendiente' ? 'status-pendiente' : a.estado === 'Cancelada' ? 'status-cancelado' : 'status-aprobado'}">${escapeHtml(a.estado || 'Activo')}</span>
            </div>
        `).join('');
    },

    // ==========================================================================
    // CLIENTES
    // ==========================================================================

    renderizarClientes() {
        const tbody = document.getElementById('table-clientes-body');
        if (!tbody) return;
        const termino = this.filters.clientes.termino.toLowerCase();
        const estado = this.filters.clientes.estado;
        let clientes = DB.usuarios.filter(u => u.rol === 'cliente');
        if (termino) {
            clientes = clientes.filter(c => 
                `${c.nombres || ''} ${c.apellidos || ''}`.toLowerCase().includes(termino) ||
                (c.correo || '').toLowerCase().includes(termino) ||
                (c.telefono || '').includes(termino)
            );
        }
        if (estado !== 'Todos') clientes = clientes.filter(c => c.estado === estado);
        const badge = document.getElementById('menuClientesBadge');
        if (badge) badge.textContent = clientes.length;
        const { page, perPage } = this.pagination.clientes;
        const start = (page - 1) * perPage;
        const paginated = clientes.slice(start, start + perPage);
        tbody.innerHTML = paginated.map(c => this.renderFilaCliente(c)).join('');
        this.renderizarPaginacion('clientes', clientes.length);
    },

    renderFilaCliente(c) {
        const mascotas = DB.mascotas.filter(m => m.clienteId === c.id).length;
        return `
            <tr>
                <td>${escapeHtml(c.id)}</td>
                <td><strong>${escapeHtml(`${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Sin nombre')}</strong></td>
                <td>${escapeHtml(c.correo || '')}</td>
                <td>${escapeHtml(c.telefono || '')}</td>
                <td>${mascotas}</td>
                <td><span class="status-badge ${c.estado === 'Activo' ? 'status-aprobado' : 'status-cancelado'}">${escapeHtml(c.estado || 'Activo')}</span></td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn btn-sm btn-outline" onclick="EmpresaApp.editarCliente('${c.id}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="EmpresaApp.eliminarCliente('${c.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    crearCliente() { this.abrirModal('modal-cliente'); },

    async guardarCliente(e) {
        e.preventDefault();
        const nombres = document.getElementById('cliente-nombres').value.trim();
        const apellidos = document.getElementById('cliente-apellidos').value.trim();
        const correo = document.getElementById('cliente-correo').value.trim();
        const telefono = document.getElementById('cliente-telefono').value.trim();
        const password = document.getElementById('cliente-password').value.trim();
        if (!nombres || !apellidos || !correo || !telefono || !password) {
            showAlert('Completa todos los campos', 'error'); return;
        }
        if (!isValidEmail(correo)) { showAlert('Correo electrónico inválido', 'error'); return; }
        if (!isValidPhone(telefono)) { showAlert('Teléfono inválido (9 dígitos)', 'error'); return; }
        if (password.length < 6) { showAlert('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
        if (DB.usuarios.some(u => u.correo.toLowerCase() === correo.toLowerCase())) {
            showAlert('Este correo ya está registrado', 'error'); return;
        }
        const usuario = {
            id: generateId('USR'),
            nombres, apellidos,
            correo: correo.toLowerCase(),
            telefono,
            password: encryptPassword(password),
            rol: 'cliente',
            estado: 'Activo',
            fechaCreacion: getCurrentDateTime()
        };
        await addUsuario(usuario);
        this.cerrarModal('modal-cliente');
        document.getElementById('form-cliente')?.reset();
        this.renderizarClientes();
        this.renderizarDashboard();
        showAlert('Cliente registrado correctamente 🎉', 'success');
    },

    editarCliente(id) {
        const cliente = DB.usuarios.find(u => u.id === id);
        if (!cliente) { showAlert('Cliente no encontrado', 'error'); return; }
        this.abrirModal('modal-cliente-edit');
        document.getElementById('edit-cliente-id').value = cliente.id;
        document.getElementById('edit-cliente-nombres').value = cliente.nombres || '';
        document.getElementById('edit-cliente-apellidos').value = cliente.apellidos || '';
        document.getElementById('edit-cliente-correo').value = cliente.correo || '';
        document.getElementById('edit-cliente-telefono').value = cliente.telefono || '';
    },

    async guardarEdicionCliente(e) {
        e.preventDefault();
        const id = document.getElementById('edit-cliente-id').value;
        const nombres = document.getElementById('edit-cliente-nombres').value.trim();
        const apellidos = document.getElementById('edit-cliente-apellidos').value.trim();
        const correo = document.getElementById('edit-cliente-correo').value.trim();
        const telefono = document.getElementById('edit-cliente-telefono').value.trim();
        if (!nombres || !apellidos || !correo || !telefono) {
            showAlert('Completa todos los campos', 'error'); return;
        }
        if (!isValidEmail(correo)) { showAlert('Correo electrónico inválido', 'error'); return; }
        if (!isValidPhone(telefono)) { showAlert('Teléfono inválido (9 dígitos)', 'error'); return; }
        await updateUsuario(id, { nombres, apellidos, correo: correo.toLowerCase(), telefono });
        this.cerrarModal('modal-cliente-edit');
        this.renderizarClientes();
        showAlert('Cliente actualizado correctamente', 'success');
    },

    async eliminarCliente(id) {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
        const mascotas = DB.mascotas.filter(m => m.clienteId === id);
        if (mascotas.length > 0) {
            showAlert(`El cliente tiene ${mascotas.length} mascotas. Elimínalas primero.`, 'error');
            return;
        }
        await deleteUsuario(id);
        this.renderizarClientes();
        this.renderizarDashboard();
        showAlert('Cliente eliminado correctamente', 'success');
    },

    // ==========================================================================
    // MASCOTAS
    // ==========================================================================

    renderizarMascotas() {
        const tbody = document.getElementById('table-mascotas-body');
        if (!tbody) return;
        const termino = document.getElementById('buscarMascota')?.value?.toLowerCase() || '';
        let mascotas = DB.mascotas;
        if (termino) {
            mascotas = mascotas.filter(m => 
                m.nombre.toLowerCase().includes(termino) ||
                m.especie?.toLowerCase().includes(termino) ||
                m.raza?.toLowerCase().includes(termino)
            );
        }
        const badge = document.getElementById('menuMascotasBadge');
        if (badge) badge.textContent = mascotas.length;
        tbody.innerHTML = mascotas.map(m => this.renderFilaMascota(m)).join('');
    },

    renderFilaMascota(m) {
        const propietario = DB.usuarios.find(u => u.id === m.clienteId);
        return `
            <tr>
                <td>${escapeHtml(m.id)}</td>
                <td>${escapeHtml(propietario ? `${propietario.nombres || ''} ${propietario.apellidos || ''}`.trim() : 'Sin propietario')}</td>
                <td><strong>${escapeHtml(m.nombre)}</strong></td>
                <td>${escapeHtml(m.especie || 'Sin dato')}</td>
                <td>${escapeHtml(m.raza || 'Sin dato')}</td>
                <td>${escapeHtml(m.sexo || 'Sin dato')}</td>
                <td>${escapeHtml(m.edad || 'Sin dato')}</td>
                <td>${escapeHtml(m.peso || 'Sin dato')}</td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn btn-sm btn-outline" onclick="EmpresaApp.verMascota('${m.id}')">👁️</button>
                        <button class="btn btn-sm btn-danger" onclick="EmpresaApp.eliminarMascotaAdmin('${m.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    verMascota(id) {
        const mascota = DB.mascotas.find(m => m.id === id);
        if (!mascota) return;
        const propietario = DB.usuarios.find(u => u.id === mascota.clienteId);
        const historial = DB.historialClinico.filter(h => h.mascotaId === id);
        showAlert(`
            🐾 ${mascota.nombre}
            Propietario: ${propietario?.nombres || 'Desconocido'} ${propietario?.apellidos || ''}
            Especie: ${mascota.especie || 'No especificada'}
            Raza: ${mascota.raza || 'No especificada'}
            Sexo: ${mascota.sexo || 'No especificado'}
            Edad: ${mascota.edad || 'No especificada'} años
            Peso: ${mascota.peso || 'No especificado'} kg
            Historial: ${historial.length} registros
        `, 'info', 8000);
    },

    async eliminarMascotaAdmin(id) {
        if (!confirm('¿Estás seguro de eliminar esta mascota?')) return;
        const citasActivas = DB.citas.some(c => c.mascotaId === id && c.estado !== 'Cancelada' && c.estado !== 'Completada');
        if (citasActivas) {
            showAlert('No se puede eliminar una mascota con citas activas', 'error');
            return;
        }
        await deleteMascota(id);
        this.renderizarMascotas();
        this.renderizarDashboard();
        showAlert('Mascota eliminada correctamente', 'success');
    },

    // ==========================================================================
    // SERVICIOS
    // ==========================================================================

    renderizarServicios() {
        const tbody = document.getElementById('table-servicios-body');
        if (!tbody) return;
        tbody.innerHTML = DB.servicios.map(s => this.renderFilaServicio(s)).join('');
    },

    renderFilaServicio(s) {
        return `
            <tr>
                <td>${escapeHtml(s.id)}</td>
                <td><strong>${escapeHtml(s.nombre)}</strong></td>
                <td>${formatCurrency(s.precio)}</td>
                <td>${escapeHtml(s.duracion || '30 min')}</td>
                <td>${escapeHtml(s.categoria || 'General')}</td>
                <td><span class="status-badge ${s.estado === 'Activo' ? 'status-aprobado' : 'status-cancelado'}">${escapeHtml(s.estado || 'Activo')}</span></td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn btn-sm btn-outline" onclick="EmpresaApp.editarServicio('${s.id}')">✏️</button>
                        <button class="btn btn-sm ${s.estado === 'Activo' ? 'btn-warning' : 'btn-success'}" onclick="EmpresaApp.toggleServicio('${s.id}')">
                            ${s.estado === 'Activo' ? '⏸️' : '▶️'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    async guardarServicio(e) {
        e.preventDefault();
        const nombre = document.getElementById('srv-nombre').value.trim();
        const precio = Number(document.getElementById('srv-costo').value);
        const duracion = document.getElementById('srv-duracion').value.trim();
        const categoria = document.getElementById('srv-categoria')?.value.trim() || 'General';
        if (!nombre || !precio || !duracion) {
            showAlert('Completa todos los datos del servicio', 'error'); return;
        }
        if (precio <= 0) { showAlert('El precio debe ser mayor a 0', 'error'); return; }
        await addServicio({ id: generateId('SRV'), nombre, precio, duracion, categoria, estado: 'Activo' });
        this.cerrarModal('modal-servicio');
        document.getElementById('form-nuevo-servicio')?.reset();
        this.renderizarServicios();
        showAlert('Servicio agregado correctamente ✅', 'success');
    },

    editarServicio(id) {
        const servicio = DB.servicios.find(s => s.id === id);
        if (!servicio) return;
        this.abrirModal('modal-servicio-edit');
        document.getElementById('edit-srv-id').value = servicio.id;
        document.getElementById('edit-srv-nombre').value = servicio.nombre || '';
        document.getElementById('edit-srv-costo').value = servicio.precio || 0;
        document.getElementById('edit-srv-duracion').value = servicio.duracion || '30 min';
        document.getElementById('edit-srv-categoria').value = servicio.categoria || 'General';
    },

    async guardarEdicionServicio(e) {
        e.preventDefault();
        const id = document.getElementById('edit-srv-id').value;
        const nombre = document.getElementById('edit-srv-nombre').value.trim();
        const precio = Number(document.getElementById('edit-srv-costo').value);
        const duracion = document.getElementById('edit-srv-duracion').value.trim();
        const categoria = document.getElementById('edit-srv-categoria').value.trim();
        if (!nombre || !precio || !duracion) {
            showAlert('Completa todos los datos', 'error'); return;
        }
        await updateServicio(id, { nombre, precio, duracion, categoria });
        this.cerrarModal('modal-servicio-edit');
        this.renderizarServicios();
        showAlert('Servicio actualizado correctamente', 'success');
    },

    async toggleServicio(id) {
        const servicio = DB.servicios.find(s => s.id === id);
        if (!servicio) return;
        const nuevoEstado = servicio.estado === 'Activo' ? 'Inactivo' : 'Activo';
        await updateServicio(id, { estado: nuevoEstado });
        this.renderizarServicios();
        showAlert(`Servicio ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'}`, 'success');
    },

    // ==========================================================================
    // PRODUCTOS
    // ==========================================================================

    renderizarProductos() {
        const tbody = document.getElementById('table-productos-body');
        if (!tbody) return;
        const termino = document.getElementById('buscarProducto')?.value?.toLowerCase() || '';
        let productos = DB.productos;
        if (termino) {
            productos = productos.filter(p => 
                p.nombre.toLowerCase().includes(termino) ||
                p.categoria?.toLowerCase().includes(termino)
            );
        }
        tbody.innerHTML = productos.map(p => this.renderFilaProducto(p)).join('');
    },

    renderFilaProducto(p) {
        const inventario = DB.inventario ? DB.inventario.find(item => item.productoId === p.id) : null;
        const stock = Number(inventario?.stock ?? p.stock ?? 0);
        const stockMinimo = Number(inventario?.stockMinimo ?? 5);
        const estadoStock = stock <= stockMinimo ? 'Stock bajo' : 'Disponible';
        const estadoClass = stock <= stockMinimo ? 'status-pendiente' : 'status-aprobado';
        return `
            <tr>
                <td>${escapeHtml(p.id)}</td>
                <td><strong>${escapeHtml(p.nombre)}</strong></td>
                <td>${escapeHtml(p.categoria || 'General')}</td>
                <td>${formatCurrency(p.precio)}</td>
                <td>${escapeHtml(stock)}</td>
                <td>${escapeHtml(stockMinimo)}</td>
                <td><span class="status-badge ${estadoClass}">${escapeHtml(estadoStock)}</span></td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn btn-sm btn-outline" onclick="EmpresaApp.editarProducto('${p.id}')">✏️</button>
                        <button class="btn btn-sm ${p.estado === 'Activo' ? 'btn-warning' : 'btn-success'}" onclick="EmpresaApp.toggleProducto('${p.id}')">
                            ${p.estado === 'Activo' ? '⏸️' : '▶️'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    async guardarProducto(e) {
        e.preventDefault();
        const nombre = document.getElementById('prod-nombre').value.trim();
        const categoria = document.getElementById('prod-categoria').value;
        const precio = Number(document.getElementById('prod-precio').value);
        const stock = Number(document.getElementById('prod-stock').value);
        const descripcion = document.getElementById('prod-descripcion')?.value.trim() || '';
        if (!nombre || !precio || !stock) {
            showAlert('Completa los datos del producto', 'error'); return;
        }
        if (precio <= 0 || stock < 0) {
            showAlert('Precio y stock deben ser valores positivos', 'error'); return;
        }
        await addProducto({ id: generateId('PRD'), nombre, categoria, precio, stock, descripcion, estado: 'Activo' });
        this.cerrarModal('modal-producto');
        document.getElementById('form-nuevo-producto')?.reset();
        this.renderizarProductos();
        this.renderizarStock();
        showAlert('Producto agregado correctamente ✅', 'success');
    },

    editarProducto(id) {
        const producto = DB.productos.find(p => p.id === id);
        if (!producto) return;
        const inventario = DB.inventario ? DB.inventario.find(item => item.productoId === id) : null;
        this.abrirModal('modal-producto-edit');
        document.getElementById('edit-prod-id').value = producto.id;
        document.getElementById('edit-prod-nombre').value = producto.nombre || '';
        document.getElementById('edit-prod-categoria').value = producto.categoria || 'General';
        document.getElementById('edit-prod-precio').value = producto.precio || 0;
        document.getElementById('edit-prod-stock').value = inventario?.stock ?? producto.stock ?? 0;
        document.getElementById('edit-prod-descripcion').value = producto.descripcion || '';
    },

    async guardarEdicionProducto(e) {
        e.preventDefault();
        const id = document.getElementById('edit-prod-id').value;
        const nombre = document.getElementById('edit-prod-nombre').value.trim();
        const categoria = document.getElementById('edit-prod-categoria').value;
        const precio = Number(document.getElementById('edit-prod-precio').value);
        const stock = Number(document.getElementById('edit-prod-stock').value);
        const descripcion = document.getElementById('edit-prod-descripcion').value.trim();
        if (!nombre || !precio || stock < 0) {
            showAlert('Completa los datos correctamente', 'error'); return;
        }
        await updateProducto(id, { nombre, categoria, precio, stock, descripcion });
        this.cerrarModal('modal-producto-edit');
        this.renderizarProductos();
        this.renderizarStock();
        showAlert('Producto actualizado correctamente', 'success');
    },

    async toggleProducto(id) {
        const producto = DB.productos.find(p => p.id === id);
        if (!producto) return;
        const nuevoEstado = producto.estado === 'Activo' ? 'Inactivo' : 'Activo';
        await updateProducto(id, { estado: nuevoEstado });
        this.renderizarProductos();
        showAlert(`Producto ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'}`, 'success');
    },

    // ==========================================================================
    // CITAS
    // ==========================================================================

    renderizarCitas() {
        const tbody = document.getElementById('table-citas-body');
        if (!tbody) return;
        const termino = document.getElementById('buscarCita')?.value?.toLowerCase() || '';
        const filtroEstado = document.getElementById('filtroCitaEstado')?.value || 'Todos';
        let citas = DB.citas;
        if (termino) {
            citas = citas.filter(c => 
                c.servicio?.toLowerCase().includes(termino) ||
                c.id.toLowerCase().includes(termino)
            );
        }
        if (filtroEstado !== 'Todos') citas = citas.filter(c => c.estado === filtroEstado);
        citas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const badge = document.getElementById('menuCitasBadge');
        if (badge) {
            const pendientes = citas.filter(c => c.estado === 'Pendiente').length;
            badge.textContent = pendientes;
            badge.className = `menu-badge ${pendientes > 0 ? 'danger' : 'success'}`;
        }
        tbody.innerHTML = citas.map(c => this.renderFilaCita(c)).join('');
    },

    renderFilaCita(c) {
        const cliente = DB.clientes ? DB.clientes.find(item => item.id === c.clienteId) : null;
        const clienteUser = DB.usuarios.find(item => item.id === c.clienteId);
        const clienteNombre = cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 
                              clienteUser ? `${clienteUser.nombres || ''} ${clienteUser.apellidos || ''}`.trim() : c.clienteId;
        const mascota = DB.mascotas.find(item => item.id === c.mascotaId);
        const veterinario = DB.veterinarios.find(item => item.id === c.veterinarioId);
        const pago = c.pagoId && DB.pagos ? DB.pagos.find(item => item.id === c.pagoId) : null;
        const estadoClass = c.estado === 'Pendiente' ? 'status-pendiente' : 
                           c.estado === 'Cancelada' ? 'status-cancelado' : 
                           c.estado === 'Completada' ? 'status-aprobado' : 'status-en-progreso';
        return `
            <tr>
                <td>${escapeHtml(c.id)}</td>
                <td>${escapeHtml(clienteNombre)}</td>
                <td>${escapeHtml(mascota?.nombre || 'Sin mascota')}</td>
                <td>${escapeHtml(veterinario?.nombre || 'Por asignar')}</td>
                <td>${escapeHtml(c.servicio || c.servicioId || 'Sin servicio')}</td>
                <td>${escapeHtml(c.fecha)}</td>
                <td>${escapeHtml(c.hora)}</td>
                <td>${escapeHtml(pago ? `${pago.metodo} - ${pago.estado}` : 'Sin pago')}</td>
                <td><span class="status-badge ${estadoClass}">${escapeHtml(c.estado || 'Pendiente')}</span></td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn btn-sm btn-success" onclick="EmpresaApp.cambiarEstadoCita('${c.id}', 'Confirmada')">✅</button>
                        <button class="btn btn-sm btn-primary" onclick="EmpresaApp.cambiarEstadoCita('${c.id}', 'En proceso')">⏳</button>
                        <button class="btn btn-sm btn-success" onclick="EmpresaApp.cambiarEstadoCita('${c.id}', 'Completada')">✔️</button>
                        <button class="btn btn-sm btn-danger" onclick="EmpresaApp.cambiarEstadoCita('${c.id}', 'Cancelada')">❌</button>
                        <button class="btn btn-sm btn-outline" onclick="EmpresaApp.reprogramarCita('${c.id}')">🔄</button>
                    </div>
                </td>
            </tr>
        `;
    },

    async cambiarEstadoCita(id, estado) {
        const cita = DB.citas.find(item => item.id === id);
        if (!cita) { showAlert('Cita no encontrada', 'error'); return; }
        await updateCita(id, { estado });
        const mensajes = {
            'Confirmada': 'Tu cita ha sido confirmada ✅',
            'En proceso': 'Tu cita está en proceso ⏳',
            'Completada': 'Tu cita ha sido completada ✔️',
            'Cancelada': 'Tu cita ha sido cancelada ❌'
        };
        addNotificacion({ 
            id: generateId('NOTI'), 
            usuarioId: cita.clienteId, 
            titulo: 'Actualización de cita',
            mensaje: mensajes[estado] || `Tu cita está ahora: ${estado}`,
            fecha: getCurrentDateTime() 
        });
        this.renderizarCitas();
        this.renderizarDashboard();
        showAlert(`Cita marcada como ${estado}`, 'success');
    },

    async reprogramarCita(id) {
        const cita = DB.citas.find(item => item.id === id);
        if (!cita) return;
        const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', cita.fecha || '');
        if (!nuevaFecha) return;
        const nuevaHora = prompt('Nueva hora (HH:MM):', cita.hora || '');
        if (!nuevaHora) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
            showAlert('Fecha inválida. Usa formato YYYY-MM-DD', 'error'); return;
        }
        if (!/^\d{2}:\d{2}$/.test(nuevaHora)) {
            showAlert('Hora inválida. Usa formato HH:MM', 'error'); return;
        }
        const ocupado = DB.citas.some(c => 
            c.fecha === nuevaFecha && c.hora === nuevaHora && c.id !== id && c.estado !== 'Cancelada'
        );
        if (ocupado) { showAlert('El horario seleccionado ya está ocupado', 'error'); return; }
        await updateCita(id, { fecha: nuevaFecha, hora: nuevaHora, estado: 'Pendiente' });
        addNotificacion({ 
            id: generateId('NOTI'), 
            usuarioId: cita.clienteId,
            titulo: 'Cita reprogramada',
            mensaje: `Tu cita ha sido reprogramada para el ${nuevaFecha} a las ${nuevaHora}`,
            fecha: getCurrentDateTime() 
        });
        this.renderizarCitas();
        showAlert('Cita reprogramada correctamente', 'success');
    },

    // ==========================================================================
    // CLÍNICA
    // ==========================================================================

    renderizarClinica() {
        const mascotaSelect = document.getElementById('clinicaMascota');
        const veterinarioSelect = document.getElementById('clinicaVeterinario');
        const tbody = document.getElementById('table-clinica-body');
        if (mascotaSelect) {
            mascotaSelect.innerHTML = DB.mascotas.map(m => 
                `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)}</option>`
            ).join('');
        }
        if (veterinarioSelect) {
            veterinarioSelect.innerHTML = DB.veterinarios.map(v => 
                `<option value="${escapeHtml(v.id)}">${escapeHtml(v.nombre)}</option>`
            ).join('');
        }
        if (!tbody) return;
        const termino = document.getElementById('buscarClinica')?.value?.toLowerCase() || '';
        let registros = DB.historialClinico;
        if (termino) {
            registros = registros.filter(r => 
                r.diagnostico?.toLowerCase().includes(termino) ||
                r.tratamiento?.toLowerCase().includes(termino) ||
                r.id.toLowerCase().includes(termino)
            );
        }
        registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        tbody.innerHTML = registros.map(r => this.renderFilaClinica(r)).join('');
    },

    renderFilaClinica(registro) {
        const mascota = DB.mascotas.find(item => item.id === registro.mascotaId);
        const cliente = DB.clientes ? DB.clientes.find(item => item.id === registro.clienteId) : null;
        const clienteUser = DB.usuarios.find(item => item.id === registro.clienteId);
        const clienteNombre = cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 
                              clienteUser ? `${clienteUser.nombres || ''} ${clienteUser.apellidos || ''}`.trim() : 'Sin cliente';
        const veterinario = DB.veterinarios.find(item => item.id === registro.veterinarioId);
        return `
            <tr>
                <td>${escapeHtml(registro.fecha || '')}</td>
                <td>${escapeHtml(clienteNombre)}</td>
                <td>${escapeHtml(mascota?.nombre || 'Sin mascota')}</td>
                <td>${escapeHtml(veterinario?.nombre || 'Sin veterinario')}</td>
                <td>${escapeHtml(registro.diagnostico || 'Sin diagnóstico')}</td>
                <td>${escapeHtml(registro.tratamiento || 'Sin tratamiento')}</td>
                <td>${escapeHtml(registro.vacuna || 'Sin vacuna')}</td>
                <td><span class="status-badge ${registro.estado === 'Activo' ? 'status-en-progreso' : 'status-aprobado'}">${escapeHtml(registro.estado || 'Activo')}</span></td>
            </tr>
        `;
    },

    async guardarRegistroClinico() {
        const mascotaId = document.getElementById('clinicaMascota')?.value || '';
        const veterinarioId = document.getElementById('clinicaVeterinario')?.value || '';
        const fecha = document.getElementById('clinicaFecha')?.value || getCurrentDate();
        const diagnostico = document.getElementById('clinicaDiagnostico')?.value.trim() || '';
        const tratamiento = document.getElementById('clinicaTratamiento')?.value.trim() || '';
        const vacuna = document.getElementById('clinicaVacuna')?.value.trim() || '';
        const observaciones = document.getElementById('clinicaObservaciones')?.value.trim() || '';
        const mascota = DB.mascotas.find(item => item.id === mascotaId);
        if (!mascota || !diagnostico) {
            showAlert('Selecciona una mascota y registra un diagnóstico', 'error'); return;
        }
        const registro = {
            id: generateId('HIST'),
            clienteId: mascota.clienteId,
            mascotaId,
            veterinarioId,
            fecha,
            diagnostico,
            tratamiento,
            vacuna,
            observaciones,
            estado: 'Activo'
        };
        await addHistorialClinico(registro);
        addNotificacion({ 
            id: generateId('NOTI'), 
            usuarioId: mascota.clienteId,
            titulo: 'Actualización clínica',
            mensaje: `Se ha registrado una actualización en el historial clínico de ${mascota.nombre}`,
            fecha: getCurrentDateTime() 
        });
        document.getElementById('clinicaDiagnostico').value = '';
        document.getElementById('clinicaTratamiento').value = '';
        document.getElementById('clinicaVacuna').value = '';
        document.getElementById('clinicaObservaciones').value = '';
        this.renderizarClinica();
        this.renderizarDashboard();
        showAlert('Registro clínico guardado ✅', 'success');
    },

    // ==========================================================================
    // PAGOS
    // ==========================================================================

    renderizarPagos() {
        const tbody = document.getElementById('table-pagos-body');
        if (!tbody) return;
        if (!DB.pagos || DB.pagos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">No hay pagos registrados</td></tr>`;
            return;
        }
        const termino = document.getElementById('buscarPago')?.value?.toLowerCase() || '';
        const filtroEstado = document.getElementById('filtroPagoEstado')?.value || 'Todos';
        let pagos = DB.pagos;
        if (termino) {
            pagos = pagos.filter(p => 
                p.id.toLowerCase().includes(termino) ||
                p.clienteId?.toLowerCase().includes(termino)
            );
        }
        if (filtroEstado !== 'Todos') pagos = pagos.filter(p => p.estado === filtroEstado);
        pagos.sort((a, b) => new Date(b.fechaPago || b.fechaCreacion) - new Date(a.fechaPago || a.fechaCreacion));
        const badge = document.getElementById('menuPagosBadge');
        if (badge) {
            const pendientes = pagos.filter(p => p.estado === 'Pendiente').length;
            badge.textContent = pendientes;
            badge.className = `menu-badge ${pendientes > 0 ? 'danger' : 'success'}`;
        }
        tbody.innerHTML = pagos.map(p => this.renderFilaPago(p)).join('');
    },

    renderFilaPago(p) {
        const cliente = DB.usuarios.find(u => u.id === p.clienteId);
        const estadoClass = p.estado === 'Pendiente' ? 'status-pendiente' : 
                           p.estado === 'Rechazado' ? 'status-cancelado' : 'status-aprobado';
        return `
            <tr>
                <td>${escapeHtml(p.id)}</td>
                <td>${escapeHtml(cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : p.clienteId || 'Sin cliente')}</td>
                <td>${escapeHtml(p.ventaId || '-')}</td>
                <td>${formatCurrency(p.monto)}</td>
                <td>${escapeHtml(p.metodo || 'Yape/Plin')}</td>
                <td>${p.comprobante ? `<button class="btn btn-sm btn-outline" onclick="EmpresaApp.verComprobante('${p.id}')">📎 Ver</button>` : 'Sin comprobante'}</td>
                <td><span class="status-badge ${estadoClass}">${escapeHtml(p.estado || 'Pendiente')}</span></td>
                <td>
                    <div class="table-actions-cell">
                        ${p.estado === 'Pendiente' ? `
                            <button class="btn btn-sm btn-success" onclick="EmpresaApp.aprobarPago('${p.id}')">✅</button>
                            <button class="btn btn-sm btn-danger" onclick="EmpresaApp.rechazarPago('${p.id}')">❌</button>
                        ` : `<button class="btn btn-sm btn-outline" onclick="EmpresaApp.verDetallePago('${p.id}')">👁️</button>`}
                    </div>
                </td>
            </tr>
        `;
    },

    verComprobante(id) {
        const pago = DB.pagos.find(p => p.id === id);
        if (!pago || !pago.comprobante) { showAlert('No hay comprobante disponible', 'error'); return; }
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <html><head><title>Comprobante - MaskoVet</title></head>
                <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
                    <img src="${pago.comprobante}" style="max-width:90%;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
                </body></html>
            `);
        }
    },

    verDetallePago(id) {
        const pago = DB.pagos.find(p => p.id === id);
        if (!pago) return;
        const cliente = DB.usuarios.find(u => u.id === pago.clienteId);
        const venta = DB.ventas ? DB.ventas.find(v => v.id === pago.ventaId) : null;
        showAlert(`
            💳 Detalle de Pago
            ID: ${pago.id}
            Cliente: ${cliente?.nombres || 'Desconocido'} ${cliente?.apellidos || ''}
            Monto: ${formatCurrency(pago.monto)}
            Método: ${pago.metodo || 'No especificado'}
            Estado: ${pago.estado || 'Pendiente'}
            ${venta ? `Venta: ${venta.id} - ${formatCurrency(venta.total)}` : 'Sin venta asociada'}
        `, 'info', 8000);
    },

    async aprobarPago(id) {
        const pago = DB.pagos.find(item => item.id === id);
        if (!pago) { showAlert('Pago no encontrado', 'error'); return; }
        await updatePago(id, { estado: 'Aprobado' });
        if (pago.ventaId && DB.ventas) {
            const venta = DB.ventas.find(v => v.id === pago.ventaId);
            if (venta) updateVenta(pago.ventaId, { estado: 'Completada', estadoPago: 'Aprobado' });
        }
        addNotificacion({ 
            id: generateId('NOTI'), 
            usuarioId: pago.clienteId,
            titulo: 'Pago aprobado ✅',
            mensaje: 'Tu pago ha sido aprobado. ¡Gracias por tu compra!',
            fecha: getCurrentDateTime() 
        });
        this.renderizarPagos();
        this.renderizarVentasHistorial();
        this.renderizarDashboard();
        showAlert('Pago aprobado correctamente ✅', 'success');
    },

    async rechazarPago(id) {
        const pago = DB.pagos.find(item => item.id === id);
        if (!pago) { showAlert('Pago no encontrado', 'error'); return; }
        if (!confirm('¿Estás seguro de rechazar este pago?')) return;
        const motivo = prompt('Motivo del rechazo (opcional):', '');
        await updatePago(id, { estado: 'Rechazado', observacion: motivo || '' });
        if (pago.ventaId && DB.ventas) updateVenta(pago.ventaId, { estado: 'Rechazada', estadoPago: 'Rechazado' });
        addNotificacion({ 
            id: generateId('NOTI'), 
            usuarioId: pago.clienteId,
            titulo: 'Pago rechazado ❌',
            mensaje: `Tu pago ha sido rechazado. ${motivo ? `Motivo: ${motivo}` : 'Revisa los datos e intenta nuevamente.'}`,
            fecha: getCurrentDateTime() 
        });
        this.renderizarPagos();
        this.renderizarVentasHistorial();
        this.renderizarDashboard();
        showAlert('Pago rechazado', 'warning');
    },

    // ==========================================================================
    // VENTAS
    // ==========================================================================

    renderizarVentasHistorial() {
        const tbody = document.getElementById('table-ventas-body');
        if (!tbody) return;
        if (!DB.ventas || DB.ventas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No hay ventas registradas</td></tr>`;
            return;
        }
        const termino = document.getElementById('buscarVenta')?.value?.toLowerCase() || '';
        let ventas = DB.ventas;
        if (termino) {
            ventas = ventas.filter(v => 
                v.id.toLowerCase().includes(termino) ||
                v.clienteId?.toLowerCase().includes(termino)
            );
        }
        ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        tbody.innerHTML = ventas.map(v => this.renderFilaVenta(v)).join('');
    },

    renderFilaVenta(v) {
        const pago = DB.pagos ? DB.pagos.find(p => p.ventaId === v.id) : null;
        const cliente = DB.usuarios.find(u => u.id === v.clienteId);
        const estadoClass = v.estado === 'Pendiente' ? 'status-pendiente' : 
                           v.estado === 'Rechazada' ? 'status-cancelado' : 'status-aprobado';
        return `
            <tr>
                <td>${escapeHtml(v.id)}</td>
                <td>${escapeHtml(cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : v.clienteId || 'Sin cliente')}</td>
                <td>${escapeHtml(pago?.metodo || 'Sin pago')}</td>
                <td>${formatCurrency(v.total || 0)}</td>
                <td>${escapeHtml(v.fecha || '')}</td>
                <td><span class="status-badge ${estadoClass}">${escapeHtml(v.estado || 'Pendiente')}</span></td>
            </tr>
        `;
    },

    // ==========================================================================
    // PERSONAL
    // ==========================================================================

    renderizarPersonal() {
        const tbody = document.getElementById('table-personal-body');
        if (!tbody) return;
        const todos = [
            ...DB.veterinarios.map(item => ({ tipo: 'Veterinario', ...item })),
            ...DB.recepcionistas.map(item => ({ tipo: 'Recepcionista', ...item })),
            ...DB.tecnicos.map(item => ({ tipo: 'Técnico', ...item }))
        ];
        tbody.innerHTML = todos.map(item => this.renderFilaPersonal(item)).join('');
    },

    renderFilaPersonal(item) {
        return `
            <tr>
                <td><span class="status-badge status-en-progreso">${escapeHtml(item.tipo)}</span></td>
                <td><strong>${escapeHtml(item.nombre)}</strong></td>
                <td>${escapeHtml(item.especialidad || '-')}</td>
                <td>${escapeHtml(item.telefono || '-')}</td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn btn-sm btn-outline" onclick="EmpresaApp.editarPersonal('${item.id}', '${item.tipo}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="EmpresaApp.eliminarPersonal('${item.id}', '${item.tipo}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    crearVeterinario() {
        const nombre = prompt('Nombre del veterinario:', ''); if (!nombre) return;
        const especialidad = prompt('Especialidad:', 'Medicina General') || 'Medicina General';
        const telefono = prompt('Teléfono:', '') || '';
        addVeterinario({ id: generateId('VET'), nombre: nombre.trim(), especialidad: especialidad.trim(), telefono: telefono.trim() });
        this.renderizarPersonal(); this.renderizarClinica(); this.renderizarDashboard();
        showAlert('Veterinario registrado ✅', 'success');
    },

    crearRecepcionista() {
        const nombre = prompt('Nombre de recepcionista:', ''); if (!nombre) return;
        const telefono = prompt('Teléfono:', '') || '';
        addRecepcionista({ id: generateId('REC'), nombre: nombre.trim(), telefono: telefono.trim() });
        this.renderizarPersonal(); this.renderizarDashboard();
        showAlert('Recepcionista registrada ✅', 'success');
    },

    crearTecnico() {
        const nombre = prompt('Nombre del técnico:', ''); if (!nombre) return;
        const especialidad = prompt('Especialidad:', 'Grooming') || 'Grooming';
        addTecnico({ id: generateId('TEC'), nombre: nombre.trim(), especialidad: especialidad.trim() });
        this.renderizarPersonal(); this.renderizarDashboard();
        showAlert('Técnico registrado ✅', 'success');
    },

    editarPersonal(id, tipo) {
        let item, updateFn;
        if (tipo === 'Veterinario') {
            item = DB.veterinarios.find(v => v.id === id);
            updateFn = (data) => { const idx = DB.veterinarios.findIndex(v => v.id === id); if (idx !== -1) DB.veterinarios[idx] = { ...DB.veterinarios[idx], ...data }; saveDB(); };
        } else if (tipo === 'Recepcionista') {
            item = DB.recepcionistas.find(r => r.id === id);
            updateFn = (data) => { const idx = DB.recepcionistas.findIndex(r => r.id === id); if (idx !== -1) DB.recepcionistas[idx] = { ...DB.recepcionistas[idx], ...data }; saveDB(); };
        } else {
            item = DB.tecnicos.find(t => t.id === id);
            updateFn = (data) => { const idx = DB.tecnicos.findIndex(t => t.id === id); if (idx !== -1) DB.tecnicos[idx] = { ...DB.tecnicos[idx], ...data }; saveDB(); };
        }
        if (!item) return;
        const nombre = prompt('Nombre:', item.nombre || ''); if (nombre === null) return;
        const especialidad = prompt('Especialidad:', item.especialidad || ''); if (especialidad === null) return;
        const telefono = prompt('Teléfono:', item.telefono || ''); if (telefono === null) return;
        updateFn({ nombre: nombre.trim(), especialidad: especialidad.trim(), telefono: telefono.trim() });
        this.renderizarPersonal(); showAlert('Personal actualizado', 'success');
    },

    eliminarPersonal(id, tipo) {
        if (!confirm(`¿Eliminar este ${tipo}?`)) return;
        if (tipo === 'Veterinario') DB.veterinarios = DB.veterinarios.filter(v => v.id !== id);
        else if (tipo === 'Recepcionista') DB.recepcionistas = DB.recepcionistas.filter(r => r.id !== id);
        else DB.tecnicos = DB.tecnicos.filter(t => t.id !== id);
        saveDB();
        this.renderizarPersonal(); this.renderizarDashboard();
        showAlert('Personal eliminado', 'success');
    },

    // ==========================================================================
    // STOCK
    // ==========================================================================

    renderizarStock() {
        const stock = DB.inventario || [];
        const total = stock.reduce((sum, item) => sum + Number(item.stock || 0), 0);
        const minimo = stock.filter(item => Number(item.stock || 0) <= Number(item.stockMinimo || 0)).length;
        const target = document.getElementById('reportPreview');
        if (target) {
            target.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 8px;">
                    <div><strong>Stock total:</strong> ${total} unidades</div>
                    <div><strong>Productos:</strong> ${DB.productos.length}</div>
                    <div><strong>Stock bajo:</strong> ${minimo} productos</div>
                </div>
            `;
        }
        const tbody = document.getElementById('table-stock-body');
        if (tbody) {
            tbody.innerHTML = stock.map(item => {
                const producto = DB.productos.find(p => p.id === item.productoId);
                const estadoClass = Number(item.stock || 0) <= Number(item.stockMinimo || 0) ? 'status-pendiente' : 'status-aprobado';
                return `
                    <tr>
                        <td>${escapeHtml(producto?.nombre || item.productoId)}</td>
                        <td>${escapeHtml(item.stock || 0)}</td>
                        <td>${escapeHtml(item.stockMinimo || 5)}</td>
                        <td><span class="status-badge ${estadoClass}">${Number(item.stock || 0) <= Number(item.stockMinimo || 0) ? '⚠️ Bajo' : '✅ OK'}</span></td>
                        <td><button class="btn btn-sm btn-outline" onclick="EmpresaApp.ajustarStock('${item.id}')">📦 Ajustar</button></td>
                    </tr>
                `;
            }).join('');
        }
    },

    ajustarStock(id) {
        const item = DB.inventario.find(i => i.id === id); if (!item) return;
        const nuevoStock = prompt('Nuevo stock:', item.stock || 0); if (nuevoStock === null) return;
        const stockNum = Number(nuevoStock); if (isNaN(stockNum) || stockNum < 0) {
            showAlert('Ingresa un número válido', 'error'); return;
        }
        item.stock = stockNum; saveDB();
        this.renderizarStock(); showAlert('Stock actualizado ✅', 'success');
    },

    // ==========================================================================
    // CONFIGURACIÓN
    // ==========================================================================

    renderizarConfigPagos() {
        const yape = document.getElementById('configYape');
        const plin = document.getElementById('configPlin');
        const titular = document.getElementById('configTitular');
        if (yape) yape.value = EMPRESA.yape || '929514843';
        if (plin) plin.value = EMPRESA.plin || '929514843';
        if (titular) titular.value = EMPRESA.titular || 'MaskoVet';
    },

    guardarConfigPagos() {
        const yape = document.getElementById('configYape')?.value.trim() || '929514843';
        const plin = document.getElementById('configPlin')?.value.trim() || '929514843';
        const titular = document.getElementById('configTitular')?.value.trim() || 'MaskoVet';
        if (!/^\d{9}$/.test(yape.replace(/\s/g, ''))) {
            showAlert('Número Yape inválido (9 dígitos)', 'error'); return;
        }
        if (!/^\d{9}$/.test(plin.replace(/\s/g, ''))) {
            showAlert('Número Plin inválido (9 dígitos)', 'error'); return;
        }
        updateEmpresaConfig({ yape, plin, titular });
        showAlert('Configuración de pagos actualizada ✅', 'success');
    },

    // ==========================================================================
    // REPORTES
    // ==========================================================================

    renderizarReportes() {
        const tipoSelect = document.getElementById('reporteTipo');
        if (tipoSelect) {
            const options = [
                { value: 'clientes', label: '📊 Clientes' },
                { value: 'mascotas', label: '🐾 Mascotas' },
                { value: 'citas', label: '📅 Citas' },
                { value: 'productos', label: '🛍️ Productos' },
                { value: 'servicios', label: '🏥 Servicios' },
                { value: 'ventas', label: '💰 Ventas' },
                { value: 'pagos', label: '💳 Pagos' },
                { value: 'inventario', label: '📦 Inventario' },
                { value: 'clinica', label: '📋 Clínica' }
            ];
            tipoSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        }
    },

    generarVistaReporte() {
        const tipo = document.getElementById('reporteTipo')?.value || 'clientes';
        const preview = document.getElementById('reportPreview');
        const datos = this.obtenerDatosReporte(tipo);
        if (preview) {
            preview.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <strong style="font-size: 1.1rem;">${escapeHtml(datos.titulo)}</strong>
                    <span style="color: #64748b; margin-left: 12px;">${escapeHtml(datos.resumen)}</span>
                </div>
                <div style="overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        <thead><tr style="background: #F8FAFC;">
                            ${datos.headers.map(h => `<th style="padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${escapeHtml(h)}</th>`).join('')}
                        </tr></thead>
                        <tbody>
                            ${datos.rows.slice(0, 10).map(row => `
                                <tr>${row.map(cell => `<td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0;">${escapeHtml(cell)}</td>`).join('')}</tr>
                            `).join('')}
                            ${datos.rows.length > 10 ? `<tr><td colspan="${datos.headers.length}" style="padding: 8px 12px; text-align: center; color: #64748B;">Mostrando 10 de ${datos.rows.length} registros</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `;
        }
        this.reportData = datos;
        showAlert(`Vista previa: ${datos.titulo} (${datos.rows.length} registros)`, 'info');
    },

    obtenerDatosReporte(tipo) {
        const reports = {
            clientes: {
                titulo: 'Reporte de Clientes',
                resumen: `${DB.usuarios.filter(u => u.rol === 'cliente').length} clientes registrados`,
                headers: ['ID', 'Nombre', 'Correo', 'Teléfono', 'Estado'],
                rows: DB.usuarios.filter(u => u.rol === 'cliente').map(u => 
                    [u.id, `${u.nombres || ''} ${u.apellidos || ''}`.trim(), u.correo || '', u.telefono || '', u.estado || 'Activo']
                )
            },
            mascotas: {
                titulo: 'Reporte de Mascotas',
                resumen: `${DB.mascotas.length} mascotas registradas`,
                headers: ['ID', 'Nombre', 'Especie', 'Raza', 'Edad', 'Propietario'],
                rows: DB.mascotas.map(m => {
                    const p = DB.usuarios.find(u => u.id === m.clienteId);
                    return [m.id, m.nombre, m.especie || 'Sin dato', m.raza || 'Sin dato', m.edad || 'Sin dato', p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : 'Sin propietario'];
                })
            },
            citas: {
                titulo: 'Reporte de Citas',
                resumen: `${DB.citas.length} citas registradas`,
                headers: ['ID', 'Cliente', 'Mascota', 'Servicio', 'Fecha', 'Hora', 'Estado'],
                rows: DB.citas.map(c => {
                    const cliente = DB.usuarios.find(u => u.id === c.clienteId);
                    const mascota = DB.mascotas.find(m => m.id === c.mascotaId);
                    return [c.id, cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Sin cliente', mascota?.nombre || 'Sin mascota', c.servicio || 'Sin servicio', c.fecha || '', c.hora || '', c.estado || 'Pendiente'];
                })
            },
            productos: {
                titulo: 'Reporte de Productos',
                resumen: `${DB.productos.length} productos en inventario`,
                headers: ['ID', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado'],
                rows: DB.productos.map(p => {
                    const inv = DB.inventario ? DB.inventario.find(i => i.productoId === p.id) : null;
                    return [p.id, p.nombre, p.categoria || 'General', formatCurrency(p.precio), inv?.stock || p.stock || 0, p.estado || 'Activo'];
                })
            },
            servicios: {
                titulo: 'Reporte de Servicios',
                resumen: `${DB.servicios.length} servicios activos`,
                headers: ['ID', 'Nombre', 'Precio', 'Duración', 'Categoría', 'Estado'],
                rows: DB.servicios.map(s => [s.id, s.nombre, formatCurrency(s.precio), s.duracion || '30 min', s.categoria || 'General', s.estado || 'Activo'])
            },
            ventas: {
                titulo: 'Reporte de Ventas',
                resumen: `${DB.ventas ? DB.ventas.length : 0} ventas registradas`,
                headers: ['ID', 'Cliente', 'Total', 'Fecha', 'Estado'],
                rows: DB.ventas ? DB.ventas.map(v => {
                    const cliente = DB.usuarios.find(u => u.id === v.clienteId);
                    return [v.id, cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Sin cliente', formatCurrency(v.total), v.fecha || '', v.estado || 'Pendiente'];
                }) : []
            },
            pagos: {
                titulo: 'Reporte de Pagos',
                resumen: `${DB.pagos ? DB.pagos.length : 0} pagos registrados`,
                headers: ['ID', 'Cliente', 'Monto', 'Método', 'Estado'],
                rows: DB.pagos ? DB.pagos.map(p => {
                    const cliente = DB.usuarios.find(u => u.id === p.clienteId);
                    return [p.id, cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Sin cliente', formatCurrency(p.monto), p.metodo || 'No especificado', p.estado || 'Pendiente'];
                }) : []
            },
            inventario: {
                titulo: 'Reporte de Inventario',
                resumen: `${DB.inventario ? DB.inventario.length : 0} productos con control de stock`,
                headers: ['Producto', 'Stock', 'Stock mínimo', 'Ubicación'],
                rows: DB.inventario ? DB.inventario.map(i => {
                    const p = DB.productos.find(prod => prod.id === i.productoId);
                    return [p?.nombre || i.productoId, i.stock || 0, i.stockMinimo || 5, i.ubicacion || 'Bodega principal'];
                }) : []
            },
            clinica: {
                titulo: 'Reporte Clínico',
                resumen: `${DB.historialClinico.length} registros clínicos`,
                headers: ['Fecha', 'Cliente', 'Mascota', 'Diagnóstico', 'Tratamiento', 'Estado'],
                rows: DB.historialClinico.map(h => {
                    const cliente = DB.usuarios.find(u => u.id === h.clienteId);
                    const mascota = DB.mascotas.find(m => m.id === h.mascotaId);
                    return [h.fecha || '', cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Sin cliente', mascota?.nombre || 'Sin mascota', h.diagnostico || 'Sin diagnóstico', h.tratamiento || 'Sin tratamiento', h.estado || 'Activo'];
                })
            }
        };
        return reports[tipo] || reports.clientes;
    },

    exportarReporte(tipo = 'excel') {
        if (!this.reportData) { showAlert('Genera primero la vista previa del reporte', 'warning'); return; }
        const data = this.reportData;
        const filename = `${data.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        try {
            if (tipo === 'excel' || tipo === 'csv') {
                const csv = toCsv(data.rows, data.headers);
                downloadTextFile(`${filename}.csv`, csv, 'text/csv;charset=utf-8');
            } else if (tipo === 'xml') {
                const xml = buildXmlFromReport({ titulo: data.titulo, headers: data.headers, rows: data.rows });
                downloadTextFile(`${filename}.xml`, xml, 'application/xml;charset=utf-8');
            } else if (tipo === 'json') {
                const json = toJson({ titulo: data.titulo, headers: data.headers, rows: data.rows });
                downloadTextFile(`${filename}.json`, json, 'application/json;charset=utf-8');
            } else {
                const pdf = createPdfContent({ titulo: data.titulo, headers: data.headers, rows: data.rows });
                downloadTextFile(`${filename}.pdf`, pdf, 'application/pdf;charset=utf-8');
            }
            showAlert(`Reporte "${data.titulo}" exportado en ${tipo.toUpperCase()} ✅`, 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            showAlert('Error al exportar el reporte', 'error');
        }
    },

    renderizarNotificacionesAdmin() {
        const container = document.getElementById('notificacionesAdminContainer');
        if (!container) return;
        const notis = DB.notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
        if (!notis.length) { container.innerHTML = '<p style="color: #64748b;">No hay notificaciones recientes</p>'; return; }
        container.innerHTML = notis.map(n => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
                <div>
                    <div style="font-weight: 600;">${escapeHtml(n.titulo || 'Notificación')}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${escapeHtml(n.mensaje)}</div>
                    <div style="font-size: 0.75rem; color: #94A3B8;">${escapeHtml(n.fecha)}</div>
                </div>
                <span class="status-badge ${n.leida ? 'status-aprobado' : 'status-pendiente'}">${n.leida ? 'Leída' : 'Pendiente'}</span>
            </div>
        `).join('');
    },

    renderizarPaginacion(section, total) {
        const container = document.getElementById(`pagination-${section}`);
        if (!container) return;
        const { page, perPage } = this.pagination[section] || { page: 1, perPage: 10 };
        const totalPages = Math.ceil(total / perPage);
        if (totalPages <= 1) { container.innerHTML = ''; return; }
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="EmpresaApp.irPagina('${section}', ${i})">${i}</button>`;
        }
        container.innerHTML = html;
    },

    irPagina(section, page) {
        if (this.pagination[section]) {
            this.pagination[section].page = page;
            const renderers = { clientes: 'renderizarClientes', citas: 'renderizarCitas', productos: 'renderizarProductos', pagos: 'renderizarPagos' };
            const renderFn = renderers[section];
            if (renderFn && this[renderFn]) this[renderFn]();
        }
    },

    aplicarFiltro(section, field, value) {
        if (this.filters[section]) {
            this.filters[section][field] = value;
            this.pagination[section].page = 1;
            const renderers = { clientes: 'renderizarClientes', citas: 'renderizarCitas', productos: 'renderizarProductos', pagos: 'renderizarPagos' };
            const renderFn = renderers[section];
            if (renderFn && this[renderFn]) this[renderFn]();
        }
    },

    limpiarFiltros(section) {
        if (this.filters[section]) {
            Object.keys(this.filters[section]).forEach(key => { this.filters[section][key] = ''; });
            this.pagination[section].page = 1;
            const renderers = { clientes: 'renderizarClientes', citas: 'renderizarCitas', productos: 'renderizarProductos', pagos: 'renderizarPagos' };
            const renderFn = renderers[section];
            if (renderFn && this[renderFn]) this[renderFn]();
        }
    },

    recargarDatos() {
        this.isLoading = true;
        showAlert('🔄 Recargando datos...', 'info');
        setTimeout(() => {
            loadFromStorage();
            this.renderizarDashboard();
            this.renderizarClientes();
            this.renderizarMascotas();
            this.renderizarServicios();
            this.renderizarProductos();
            this.renderizarCitas();
            this.renderizarClinica();
            this.renderizarPagos();
            this.renderizarVentasHistorial();
            this.renderizarPersonal();
            this.renderizarStock();
            this.renderizarNotificacionesAdmin();
            this.isLoading = false;
            showAlert('✅ Datos recargados correctamente', 'success');
        }, 500);
    }
};

// ==========================================================================
// FUNCIONES DE UTILIDAD (Wrapper para DB)
// ==========================================================================

function addVeterinario(veterinario) {
    if (!DB.veterinarios.some(v => v.id === veterinario.id)) {
        DB.veterinarios.push(veterinario);
        saveDB();
    }
}

function addRecepcionista(recepcionista) {
    if (!DB.recepcionistas.some(r => r.id === recepcionista.id)) {
        DB.recepcionistas.push(recepcionista);
        saveDB();
    }
}

function addTecnico(tecnico) {
    if (!DB.tecnicos.some(t => t.id === tecnico.id)) {
        DB.tecnicos.push(tecnico);
        saveDB();
    }
}

// ==========================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
    const session = getFromStorage('maskovet_admin_session');
    if (session && session.isLoggedIn) {
        EmpresaApp.init();
    } else {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

console.log('✅ MaskoVet Enterprise App Module (corregida) loaded successfully');