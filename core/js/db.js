/* ==========================================================================
   MASKOVET - Core Database Module
   Versión: 4.0 - DEFINITIVA
   ========================================================================== */
// ==========================================================================
// 0. CONFIGURACIÓN DE SUPABASE
// ==========================================================================
const SUPABASE_URL = 'https://zvstqnosywejhizvejju.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2c3Rxbm9zeXdlamhpenZlamp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjYwNzIsImV4cCI6MjA5ODg0MjA3Mn0.79nkM4ORcSF5qT4CV3ztLvunCgBAVYOOlD5UGP8NnBY';
var supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
    alert('💥 ERROR INICIALIZANDO SUPABASE: ' + err.message + '. ¿Tienes un bloqueador de anuncios activo o jsdelivr está bloqueado?');
    console.error('Supabase init error:', err);
}

const DB = {
    usuarios: [],
    clientes: [],
    mascotas: [],
    veterinarios: [],
    recepcionistas: [],
    tecnicos: [],
    categorias: [],
    servicios: [],
    productos: [],
    inventario: [],
    movimientosInventario: [],
    ventas: [],
    detalleVenta: [],
    citas: [],
    historialClinico: [],
    diagnosticos: [],
    tratamientos: [],
    vacunas: [],
    pagos: [],
    seguimientos: [],
    notificaciones: [],
    encuestas: [],
    logs: [],
    sesiones: [],
    dimCliente: [],
    dimMascota: [],
    dimVeterinario: [],
    dimRecepcionista: [],
    dimProducto: [],
    dimServicio: [],
    dimTiempo: [],
    dimFecha: [],
    dimEstado: [],
    dimPago: [],
    factCitas: [],
    factVentas: [],
    factDetalleVentas: [],
    factPagos: [],
    factServicios: [],
    factHistorialClinico: [],
    factVacunas: [],
    factTratamientos: [],
    factEncuestas: []
};
window.DB = DB;


// ==========================================================================
// 2. CONFIGURACIÓN DE EMPRESA
// ==========================================================================

const EMPRESA = {
    id: 'EMPRESA-001',
    nombre: 'MaskoVet S.A.C.',
    ruc: '20601234567',
    email: 'admin@maskovet.com',
    password: 'Miperrito2026',
    yape: '929514843',
    plin: '929514843',
    titular: 'MaskoVet S.A.C.',
    direccion: 'Av. Principal 123, Lima',
    telefono: '01 234 5678',
    horarioApertura: '09:00',
    horarioCierre: '17:00',
    diasAtencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    duracionCita: 30,
    configuracion: {
        notificaciones: { email: true, push: true, whatsapp: false },
        pagos: { yape: true, plin: true, tarjeta: true, efectivo: true },
        recordatorios: { '24h': true, '2h': true }
    }
};

// ==========================================================================
// 3. UTILIDADES
// ==========================================================================

function generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

function getCurrentDateTime() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function getCurrentTimestamp() {
    return new Date().toISOString();
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
    }).format(amount);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^[0-9]{9}$/.test(phone);
}

// ==========================================================================
// 3.1 ENCRIPTACIÓN - SIMPLE Y FUNCIONAL
// ==========================================================================

function encryptPassword(password) {
    return btoa(password + 'MaskoVet2026SecureKey');
}

function verifyPassword(inputPassword, storedPassword) {
    const encrypted = encryptPassword(inputPassword);
    return encrypted === storedPassword;
}

// ==========================================================================
// 4. PERSISTENCIA
// ==========================================================================

async function initDB() {
    try {
        console.log('🔄 Sincronizando datos con Supabase...');
        const [uRes, mRes, sRes, pRes, cRes, hRes, pagRes, notiRes] = await Promise.all([
            supabase.from('usuarios').select('*'),
            supabase.from('mascotas').select('*'),
            supabase.from('servicios').select('*'),
            supabase.from('productos').select('*'),
            supabase.from('citas').select('*'),
            supabase.from('historial_clinico').select('*'),
            supabase.from('pagos').select('*'),
            supabase.from('notificaciones').select('*').order('fecha_creacion', { ascending: false })
        ]);

        if (uRes.data) DB.usuarios = uRes.data;
        if (mRes.data) DB.mascotas = mRes.data.map(m => ({...m, clienteId: m.cliente_id, fechaNacimiento: m.fecha_nacimiento}));
        if (sRes.data) DB.servicios = sRes.data;
        if (pRes.data) DB.productos = pRes.data;
        if (cRes.data) DB.citas = cRes.data.map(c => ({...c, clienteId: c.cliente_id, mascotaId: c.mascota_id, veterinarioId: c.veterinario_id, servicioId: c.servicio_id, pagoId: c.pago_id}));
        if (hRes.data) DB.historialClinico = hRes.data.map(h => ({...h, clienteId: h.cliente_id, mascotaId: h.mascota_id, veterinarioId: h.veterinario_id}));
        if (pagRes.data) DB.pagos = pagRes.data.map(p => ({...p, clienteId: p.cliente_id, citaId: p.cita_id, ventaId: p.venta_id}));
        if (notiRes.data) DB.notificaciones = notiRes.data.map(n => ({...n, clienteId: n.cliente_id, usuarioId: n.cliente_id, leida: n.leida || false}));
        
        console.log('✅ Base de datos local sincronizada.');
        return true;
    } catch (e) {
        console.error('❌ Error sincronizando con Supabase:', e);
        return false;
    }
}


function loadFromStorage() {
    // Deprecated for Supabase
    return true;
}

function saveDB() {
    try {
        Object.keys(DB).forEach(key => {
            if (Array.isArray(DB[key])) {
                localStorage.setItem(`maskovet_${key}`, JSON.stringify(DB[key]));
            }
        });
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

function loadEmpresaConfig() {
    try {
        const saved = localStorage.getItem('maskovet_empresa');
        if (saved) {
            Object.assign(EMPRESA, JSON.parse(saved));
        } else {
            localStorage.setItem('maskovet_empresa', JSON.stringify(EMPRESA));
        }
    } catch (error) {
        console.error('Error loading empresa config:', error);
    }
}

function updateEmpresaConfig(updates) {
    try {
        Object.assign(EMPRESA, updates);
        localStorage.setItem('maskovet_empresa', JSON.stringify(EMPRESA));
        return true;
    } catch (error) {
        console.error('Error updating empresa config:', error);
        return false;
    }
}

// ==========================================================================
// 4.1 CREAR USUARIOS INICIALES - SIEMPRE EJECUTA
// ==========================================================================

function crearUsuariosIniciales() {
    console.log('🔧 Verificando usuarios iniciales...');
    
    let creados = 0;
    
    const adminExists = DB.usuarios.some(u => u.correo === 'admin@maskovet.com');
    if (!adminExists) {
        console.log('👤 Creando administrador...');
        DB.usuarios.push({
            id: generateId('USR'),
            nombres: 'Admin',
            apellidos: 'MaskoVet',
            correo: 'admin@maskovet.com',
            password: encryptPassword('Miperrito2026'),
            telefono: '929514843',
            rol: 'empresa',
            estado: 'Activo',
            fechaCreacion: getCurrentDateTime(),
            fechaActualizacion: getCurrentDateTime(),
            ultimoAcceso: null
        });
        creados++;
        console.log('✅ Admin creado');
    }
    
    const clienteExists = DB.usuarios.some(u => u.correo === 'cliente@test.com');
    if (!clienteExists) {
        console.log('👤 Creando cliente de prueba...');
        DB.usuarios.push({
            id: generateId('USR'),
            nombres: 'Juan',
            apellidos: 'Perez',
            correo: 'cliente@test.com',
            password: encryptPassword('123456'),
            telefono: '987654321',
            rol: 'cliente',
            estado: 'Activo',
            fechaCreacion: getCurrentDateTime(),
            fechaActualizacion: getCurrentDateTime(),
            ultimoAcceso: null
        });
        creados++;
        console.log('✅ Cliente de prueba creado');
    }
    
    if (creados > 0) {
        saveDB();
        console.log(`✅ ${creados} usuarios creados inicialmente`);
    } else {
        console.log('✅ Todos los usuarios iniciales ya existen');
    }
}

// ==========================================================================
// 5. MÓDULO DE USUARIOS
// ==========================================================================

async function addUsuario(usuario) {
    try {
        if (!usuario.correo || !usuario.password || !usuario.rol) {
            console.error('❌ Datos incompletos para registro');
            return { error: 'Datos incompletos: correo, password y rol son obligatorios' };
        }
        if (!validateEmail(usuario.correo)) {
            return { error: 'El correo electrónico no es válido' };
        }

        const emailNormalizado = usuario.correo.toLowerCase().trim();

        // Verificar duplicado directamente en Supabase
        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('correo', emailNormalizado)
            .limit(1);

        if (existente && existente.length > 0) {
            return { error: 'Este correo ya está registrado' };
        }

        const nuevo = {
            nombres: (usuario.nombres || '').trim(),
            apellidos: (usuario.apellidos || '').trim(),
            correo: emailNormalizado,
            password: encryptPassword(usuario.password),
            telefono: (usuario.telefono || '').trim(),
            rol: usuario.rol,
            estado: 'Activo'
        };

        const { data, error } = await supabase
            .from('usuarios')
            .insert([nuevo])
            .select();

        if (error) {
            console.error('❌ Error Supabase insert:', error);
            if (error.code === '23505') {
                return { error: 'Este correo ya está registrado' };
            }
            return { error: 'Error al registrar: ' + (error.message || 'Error desconocido') };
        }

        if (!data || data.length === 0) {
            return { error: 'No se pudo crear el usuario' };
        }

        // Actualizar caché local
        DB.usuarios.push(data[0]);

        console.log('✅ Usuario registrado:', emailNormalizado);
        return data[0];
    } catch (error) {
        console.error('❌ Error en addUsuario:', error);
        return { error: 'Error de conexión: ' + (error.message || 'Intenta nuevamente') };
    }
}

async function getUsuarios() {
    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data;
}

async function getUsuario(id) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }
    return data;
}

async function updateUsuario(id, updates) {
    try {
        if (updates.correo) {
            if (!validateEmail(updates.correo)) return false;
            updates.correo = updates.correo.toLowerCase().trim();
        }
        if (updates.password) {
            updates.password = encryptPassword(updates.password);
        }

        updates.fecha_actualizacion = new Date().toISOString();

        const { error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating user in Supabase:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
}

async function deleteUsuario(id) {
    try {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (error) {
            console.error('Error deleting user in Supabase:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        return false;
    }
}

// ==========================================================================
// 6. MÓDULO DE MASCOTAS
// ==========================================================================

async function addMascota(mascota) {
    try {
        if (!mascota.clienteId || !mascota.nombre) return null;

        const nueva = {
            cliente_id: mascota.clienteId,
            nombre: mascota.nombre.trim(),
            especie: (mascota.especie || '').trim(),
            raza: (mascota.raza || '').trim(),
            sexo: (mascota.sexo || '').trim(),
            fecha_nacimiento: mascota.fechaNacimiento || null,
            edad: mascota.edad || null,
            peso: Number(mascota.peso || 0),
            color: (mascota.color || '').trim(),
            alergias: (mascota.alergias || '').trim(),
            enfermedades: (mascota.enfermedades || '').trim(),
            vacunas: (mascota.vacunas || '').trim(),
            foto: mascota.foto || null,
            observaciones: (mascota.observaciones || mascota.notas || '').trim(),
            estado: mascota.estado || 'Activo'
        };

        const { data, error } = await supabase.from('mascotas').insert([nueva]).select();

        if (error) {
            console.error('Error adding pet to Supabase:', error);
            return null;
        }

        return data[0];
    } catch (error) {
        console.error('Error adding pet:', error);
        return null;
    }
}

async function getMascotas(clienteId = null) {
    let query = supabase.from('mascotas').select('*');
    if (clienteId) {
        query = query.eq('cliente_id', clienteId);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Error fetching pets:', error);
        return [];
    }
    return data;
}

async function getMascota(id) {
    const { data, error } = await supabase.from('mascotas').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching pet:', error);
        return null;
    }
    return data;
}

async function updateMascota(id, updates) {
    try {
        if (updates.peso) updates.peso = Number(updates.peso);
        if (updates.clienteId) updates.cliente_id = updates.clienteId;
        if (updates.fechaNacimiento) updates.fecha_nacimiento = updates.fechaNacimiento;
        
        updates.fecha_actualizacion = new Date().toISOString();

        const { error } = await supabase.from('mascotas').update(updates).eq('id', id);
        if (error) {
            console.error('Error updating pet in Supabase:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error updating pet:', error);
        return false;
    }
}

async function deleteMascota(id) {
    try {
        const { error } = await supabase.from('mascotas').delete().eq('id', id);
        if (error) {
            console.error('Error deleting pet from Supabase:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error deleting pet:', error);
        return false;
    }
}

// ==========================================================================
// 7. MÓDULO DE SERVICIOS
// ==========================================================================

async function addServicio(servicio) {
    try {
        if (!servicio.nombre) return null;

        const nuevo = {
            nombre: servicio.nombre.trim(),
            descripcion: (servicio.descripcion || '').trim(),
            precio: Number(servicio.precio || 0),
            duracion: servicio.duracion || '30 min',
            imagen: servicio.imagen || null,
            categoria: servicio.categoria || 'General',
            estado: servicio.estado || 'Activo'
        };

        const { data, error } = await supabase.from('servicios').insert([nuevo]).select();
        if (error) {
            console.error('Error adding service:', error);
            return null;
        }
        return data[0];
    } catch (error) {
        console.error('Error adding service:', error);
        return null;
    }
}

async function getServicios() {
    const { data, error } = await supabase.from('servicios').select('*');
    if (error) {
        console.error('Error fetching services:', error);
        return [];
    }
    return data;
}

async function getServicio(id) {
    const { data, error } = await supabase.from('servicios').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching service:', error);
        return null;
    }
    return data;
}

async function updateServicio(id, updates) {
    try {
        if (updates.precio) updates.precio = Number(updates.precio);
        updates.fecha_actualizacion = new Date().toISOString();

        const { error } = await supabase.from('servicios').update(updates).eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

async function deleteServicio(id) {
    try {
        const { error } = await supabase.from('servicios').delete().eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

// ==========================================================================
// 7.1 MÓDULO DE SERVICIOS - FILTRADO PARA CLIENTE
// ==========================================================================

/**
 * Obtiene los servicios visibles para el portal cliente
 * Excluye los servicios inactivos y los que no deben mostrarse
 */
function getServiciosCliente() {
    // Servicios que NO deben mostrarse en el portal cliente
    const serviciosOcultos = [
        'Consulta Médica General',
        'Vacunación Completa',
        'Cirugía y Esterilización',
        'Grooming y Baño Medicado'
    ];
    
    return DB.servicios.filter(s => 
        s.estado === 'Activo' && 
        !serviciosOcultos.includes(s.nombre)
    );
}

/**
 * Obtiene todos los servicios (para portal empresa)
 */
function getServiciosTodos() {
    return DB.servicios;
}

/**
 * Obtiene servicios activos (para portal empresa)
 */
function getServiciosActivos() {
    return DB.servicios.filter(s => s.estado === 'Activo');
}

// ==========================================================================
// 8. MÓDULO DE PRODUCTOS
// ==========================================================================

async function addProducto(producto) {
    try {
        if (!producto.nombre) return null;

        const nuevo = {
            nombre: producto.nombre.trim(),
            descripcion: (producto.descripcion || '').trim(),
            precio: Number(producto.precio || 0),
            stock: Number(producto.stock || 0),
            categoria: producto.categoria || 'General',
            imagen: producto.imagen || null,
            estado: producto.estado || 'Activo'
        };

        const { data, error } = await supabase.from('productos').insert([nuevo]).select();
        if (error) return null;
        return data[0];
    } catch (error) {
        return null;
    }
}

async function getProductos() {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) return [];
    return data;
}

async function getProducto(id) {
    const { data, error } = await supabase.from('productos').select('*').eq('id', id).single();
    if (error) return null;
    return data;
}

async function updateProducto(id, updates) {
    try {
        if (updates.precio) updates.precio = Number(updates.precio);
        if (updates.stock) updates.stock = Number(updates.stock);
        updates.fecha_actualizacion = new Date().toISOString();

        const { error } = await supabase.from('productos').update(updates).eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

async function deleteProducto(id) {
    try {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

// ==========================================================================
// 9. MÓDULO DE CITAS
// ==========================================================================

async function addCita(cita) {
    try {
        if (!cita.clienteId || !cita.mascotaId || !cita.fecha || !cita.hora) return null;

        const nueva = {
            cliente_id: cita.clienteId,
            mascota_id: cita.mascotaId,
            veterinario_id: cita.veterinarioId || null,
            servicio_id: cita.servicioId || null,
            servicio: cita.servicio || null,
            fecha: cita.fecha,
            hora: cita.hora,
            estado: cita.estado || 'Pendiente',
            notas: (cita.notas || '').trim(),
            pago_id: cita.pagoId || null
        };

        const { data, error } = await supabase.from('citas').insert([nueva]).select();
        if (error) return { error: 'Error al reservar' };
        return data[0];
    } catch (error) {
        return null;
    }
}

async function getCitas(clienteId = null) {
    let query = supabase.from('citas').select('*');
    if (clienteId) query = query.eq('cliente_id', clienteId);
    
    const { data, error } = await query;
    if (error) return [];
    return data;
}

async function getCita(id) {
    const { data, error } = await supabase.from('citas').select('*').eq('id', id).single();
    if (error) return null;
    return data;
}

async function updateCita(id, updates) {
    try {
        updates.fecha_actualizacion = new Date().toISOString();
        const { error } = await supabase.from('citas').update(updates).eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

async function deleteCita(id) {
    try {
        const { error } = await supabase.from('citas').delete().eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

async function getHorariosDisponibles(fecha) {
    const horarios = [];
    
    const { data: citas } = await supabase.from('citas').select('hora').eq('fecha', fecha).neq('estado', 'Cancelada');
    const horasOcupadas = citas ? citas.map(c => c.hora.substring(0,5)) : [];

    for (let h = 9; h < 17; h++) {
        for (let m = 0; m < 60; m += 30) {
            const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (!horasOcupadas.includes(horaStr)) {
                horarios.push(horaStr);
            }
        }
    }
    return horarios;
}

// ==========================================================================
// 10. MÓDULO DE HISTORIAL CLÍNICO
// ==========================================================================

async function addHistorialClinico(registro) {
    try {
        if (!registro.mascotaId || !registro.diagnostico) return null;

        const nuevo = {
            cliente_id: registro.clienteId || null,
            mascota_id: registro.mascotaId,
            veterinario_id: registro.veterinarioId || null,
            fecha: registro.fecha || getCurrentDate(),
            diagnostico: registro.diagnostico.trim(),
            tratamiento: (registro.tratamiento || '').trim(),
            vacuna: (registro.vacuna || '').trim(),
            receta: (registro.receta || '').trim(),
            observaciones: (registro.observaciones || '').trim(),
            estado: registro.estado || 'Activo'
        };

        const { data, error } = await supabase.from('historial_clinico').insert([nuevo]).select();
        if (error) return null;
        return data[0];
    } catch (error) {
        return null;
    }
}

async function getHistorialClinico(mascotaId = null, clienteId = null) {
    let query = supabase.from('historial_clinico').select('*');
    if (mascotaId) query = query.eq('mascota_id', mascotaId);
    if (clienteId) query = query.eq('cliente_id', clienteId);
    
    const { data, error } = await query;
    if (error) return [];
    return data;
}

async function getHistorialClinicoById(id) {
    const { data, error } = await supabase.from('historial_clinico').select('*').eq('id', id).single();
    if (error) return null;
    return data;
}

async function updateHistorialClinico(id, updates) {
    try {
        updates.fecha_actualizacion = new Date().toISOString();
        const { error } = await supabase.from('historial_clinico').update(updates).eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

async function deleteHistorialClinico(id) {
    try {
        const { error } = await supabase.from('historial_clinico').delete().eq('id', id);
        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
}

// ==========================================================================
// 11. MÓDULO DE PAGOS
// ==========================================================================

function addPago(pago) {
    try {
        if (!pago.clienteId || !pago.monto) return null;

        const nuevo = {
            id: pago.id || generateId('PAG'),
            clienteId: pago.clienteId,
            citaId: pago.citaId || null,
            ventaId: pago.ventaId || null,
            monto: Number(pago.monto),
            metodo: pago.metodo || 'Efectivo',
            estado: pago.estado || 'Pendiente',
            comprobante: pago.comprobante || null,
            observacion: pago.observacion || '',
            fechaPago: pago.fechaPago || getCurrentDateTime(),
            fechaCreacion: getCurrentDateTime(),
            fechaActualizacion: getCurrentDateTime()
        };

        if (DB.pagos.some(p => p.id === nuevo.id)) return null;

        DB.pagos.push(nuevo);
        saveDB();
        return nuevo;
    } catch (error) {
        console.error('Error adding payment:', error);
        return null;
    }
}

function getPagos(clienteId = null) {
    if (clienteId) {
        return DB.pagos.filter(p => p.clienteId === clienteId);
    }
    return DB.pagos;
}

function getPago(id) {
    return DB.pagos.find(p => p.id === id) || null;
}

function updatePago(id, updates) {
    try {
        const idx = DB.pagos.findIndex(p => p.id === id);
        if (idx === -1) return false;

        updates.fechaActualizacion = getCurrentDateTime();
        DB.pagos[idx] = { ...DB.pagos[idx], ...updates };
        saveDB();
        return true;
    } catch (error) {
        console.error('Error updating payment:', error);
        return false;
    }
}

// ==========================================================================
// 12. MÓDULO DE VENTAS
// ==========================================================================

function addVenta(venta) {
    try {
        if (!venta.clienteId || !venta.total) return null;

        const nueva = {
            id: venta.id || generateId('VENTA'),
            clienteId: venta.clienteId,
            fecha: venta.fecha || getCurrentDate(),
            total: Number(venta.total),
            estado: venta.estado || 'Pendiente',
            metodoPago: venta.metodoPago || 'No especificado',
            estadoPago: venta.estadoPago || 'Pendiente',
            comprobante: venta.comprobante || null,
            items: venta.items || [],
            fechaCreacion: getCurrentDateTime(),
            fechaActualizacion: getCurrentDateTime()
        };

        if (DB.ventas.some(v => v.id === nueva.id)) return null;

        DB.ventas.push(nueva);
        saveDB();
        return nueva;
    } catch (error) {
        console.error('Error adding sale:', error);
        return null;
    }
}

function getVentas(clienteId = null) {
    if (clienteId) {
        return DB.ventas.filter(v => v.clienteId === clienteId);
    }
    return DB.ventas;
}

function getVenta(id) {
    return DB.ventas.find(v => v.id === id) || null;
}

function updateVenta(id, updates) {
    try {
        const idx = DB.ventas.findIndex(v => v.id === id);
        if (idx === -1) return false;

        updates.fechaActualizacion = getCurrentDateTime();
        DB.ventas[idx] = { ...DB.ventas[idx], ...updates };
        saveDB();
        return true;
    } catch (error) {
        console.error('Error updating sale:', error);
        return false;
    }
}

function deleteVenta(id) {
    try {
        DB.ventas = DB.ventas.filter(v => v.id !== id);
        saveDB();
        return true;
    } catch (error) {
        console.error('Error deleting sale:', error);
        return false;
    }
}

// ==========================================================================
// 13. MÓDULO DE NOTIFICACIONES
// ==========================================================================

async function addNotificacion(notificacion) {
    try {
        const clienteIdReal = notificacion.clienteId || notificacion.usuarioId;
        const nueva = {
            cliente_id: clienteIdReal,
            titulo: notificacion.titulo || 'Notificación',
            mensaje: notificacion.mensaje || '',
            tipo: notificacion.tipo || 'info',
            leida: false
        };

        const { data, error } = await supabase.from('notificaciones').insert([nueva]).select();
        if (error) {
            console.error('Error adding notification to Supabase:', error);
            return null;
        }
        const notif = { ...data[0], clienteId: data[0].cliente_id, usuarioId: data[0].cliente_id };
        DB.notificaciones.unshift(notif);
        return notif;
    } catch (error) {
        console.error('Error adding notification:', error);
        return null;
    }
}

function getNotificaciones(usuarioId = null) {
    if (usuarioId) {
        return DB.notificaciones.filter(n => n.usuarioId === usuarioId || n.clienteId === usuarioId)
            .sort((a, b) => new Date(b.fecha_creacion || b.fecha) - new Date(a.fecha_creacion || a.fecha));
    }
    return DB.notificaciones.sort((a, b) => new Date(b.fecha_creacion || b.fecha) - new Date(a.fecha_creacion || a.fecha));
}

async function getNotificacionesSupabase(clienteId) {
    try {
        const { data, error } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('cliente_id', clienteId)
            .order('fecha_creacion', { ascending: false });
        if (error) return [];
        return data.map(n => ({ ...n, clienteId: n.cliente_id, usuarioId: n.cliente_id }));
    } catch (e) {
        console.error('Error fetching notifications:', e);
        return [];
    }
}

async function marcarNotificacionLeidaSupabase(id) {
    try {
        await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
        const idx = DB.notificaciones.findIndex(n => n.id === id);
        if (idx !== -1) DB.notificaciones[idx].leida = true;
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

async function marcarTodasLeidasSupabase(clienteId) {
    try {
        await supabase.from('notificaciones').update({ leida: true }).eq('cliente_id', clienteId).eq('leida', false);
        DB.notificaciones = DB.notificaciones.map(n =>
            (n.clienteId === clienteId || n.cliente_id === clienteId) ? { ...n, leida: true } : n
        );
        return true;
    } catch (error) {
        console.error('Error marking all as read:', error);
        return false;
    }
}

function marcarNotificacionLeida(id) {
    const idx = DB.notificaciones.findIndex(n => n.id === id);
    if (idx !== -1) { DB.notificaciones[idx].leida = true; saveDB(); }
    return true;
}

function marcarTodasLeidas(usuarioId) {
    DB.notificaciones = DB.notificaciones.map(n =>
        (n.usuarioId === usuarioId || n.clienteId === usuarioId) ? { ...n, leida: true } : n
    );
    saveDB();
    return true;
}

// ==========================================================================
// 14. MÓDULO DE PERSONAL
// ==========================================================================

function addVeterinario(veterinario) {
    try {
        if (!veterinario.id) veterinario.id = generateId('VET');
        if (!DB.veterinarios.some(v => v.id === veterinario.id)) {
            DB.veterinarios.push(veterinario);
            saveDB();
            return veterinario;
        }
        return null;
    } catch (error) {
        console.error('Error adding veterinarian:', error);
        return null;
    }
}

function addRecepcionista(recepcionista) {
    try {
        if (!recepcionista.id) recepcionista.id = generateId('REC');
        if (!DB.recepcionistas.some(r => r.id === recepcionista.id)) {
            DB.recepcionistas.push(recepcionista);
            saveDB();
            return recepcionista;
        }
        return null;
    } catch (error) {
        console.error('Error adding receptionist:', error);
        return null;
    }
}

function addTecnico(tecnico) {
    try {
        if (!tecnico.id) tecnico.id = generateId('TEC');
        if (!DB.tecnicos.some(t => t.id === tecnico.id)) {
            DB.tecnicos.push(tecnico);
            saveDB();
            return tecnico;
        }
        return null;
    } catch (error) {
        console.error('Error adding technician:', error);
        return null;
    }
}

// ==========================================================================
// 15. AUTENTICACIÓN
// ==========================================================================

async function loginUsuario(correo, password) {
    console.log('🔍 Intentando login:', correo);
    
    const emailNormalizado = correo.toLowerCase().trim();

    // Buscar usuario directamente en Supabase para datos frescos
    const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', emailNormalizado)
        .limit(1);

    if (error) {
        console.error('❌ Error consultando Supabase:', error);
        return { success: false, message: 'Error de conexión. Intenta nuevamente.' };
    }

    const usuario = usuarios && usuarios[0];
    
    if (!usuario) {
        console.log('❌ Usuario no encontrado');
        return { success: false, message: 'Usuario no encontrado' };
    }
    
    console.log('👤 Usuario encontrado:', usuario.correo);
    
    const passwordEncrypted = encryptPassword(password);
    const correct = usuario.password === passwordEncrypted;
    
    if (!correct) {
        return { success: false, message: 'Contraseña incorrecta' };
    }
    
    // Actualizar último acceso en Supabase
    await supabase
        .from('usuarios')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', usuario.id);
    
    const token = generateId('TOKEN');
    console.log('✅ Login exitoso para:', correo);
    
    return {
        success: true,
        usuario: usuario,
        token: token
    };
}

function logoutUsuario() {
    localStorage.removeItem('maskovet_session');
    localStorage.removeItem('maskovet_admin_session');
    return true;
}

function getSession() {
    try {
        const data = localStorage.getItem('maskovet_session');
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function getAdminSession() {
    try {
        const data = localStorage.getItem('maskovet_admin_session');
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

// ==========================================================================
// 16. INICIALIZACIÓN
// ==========================================================================

console.log('🚀 Inicializando MaskoVet DB...');

loadFromStorage();
crearUsuariosIniciales();

console.log('✅ MaskoVet DB inicializada');
console.log(`📊 ${DB.usuarios.length} usuarios en DB`);

const admin = DB.usuarios.find(u => u.correo === 'admin@maskovet.com');
if (admin) {
    console.log('🔑 Credenciales de acceso:');
    console.log('   👤 Empresa: admin@maskovet.com / Miperrito2026');
    console.log('   👤 Cliente: cliente@test.com / 123456');
}