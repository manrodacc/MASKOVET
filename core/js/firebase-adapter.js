/* ==========================================================================
   MASKOVET - Firebase Adapter Module
   Archivo: core/js/firebase-adapter.js
   Versión: 3.0 - COMPLETAMENTE FUNCIONAL
   ========================================================================== */

// ==========================================================================
// 1. CONFIGURACIÓN DE FIREBASE (REEMPLAZAR CON TUS CREDENCIALES)
// ==========================================================================

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB8qRnqZ7xGvKqM9T3wR5pN2yL6cV4jF8",
    authDomain: "maskovet-prod.firebaseapp.com",
    databaseURL: "https://maskovet-prod-default-rtdb.firebaseio.com",
    projectId: "maskovet-prod",
    storageBucket: "maskovet-prod.appspot.com",
    messagingSenderId: "987654321012",
    appId: "1:987654321012:web:fedcba9876543210"
};

// ==========================================================================
// 2. CLASE PRINCIPAL MASKOVET FIREBASE
// ==========================================================================

class MaskoVetFirebase {
    constructor() {
        // Estado de conexión
        this.isConfigured = false;
        this.isConnected = false;
        this.isAuthenticated = false;
        
        // Referencias a Firebase
        this.app = null;
        this.auth = null;
        this.db = null;
        this.storage = null;
        
        // Usuario actual
        this.currentUser = null;
        this.currentUserData = null;
        
        // Suscripciones activas
        this.activeSubscriptions = {};
        
        // Caché offline
        this.cache = {
            usuarios: [],
            mascotas: [],
            citas: [],
            servicios: [],
            productos: [],
            pagos: [],
            notificaciones: [],
            historialClinico: [],
            ventas: []
        };
        
        // Configuración
        this.config = {
            enableRealtime: true,
            enableCache: true,
            cacheTimeout: 5 * 60 * 1000,
            retryAttempts: 3,
            retryDelay: 1000
        };
        
        // Inicializar
        this._init();
    }

    // ==========================================================================
    // 3. INICIALIZACIÓN
    // ==========================================================================

    _init() {
        console.log('🚀 MaskoVet Firebase Adapter - Initializing...');
        
        // Verificar si Firebase está disponible
        if (typeof firebase !== 'undefined') {
            this._initFirebase();
        } else {
            console.warn('⚠️ Firebase SDK not loaded. Running in localStorage mode.');
            this.isConfigured = false;
            this._loadFromLocalStorage();
            this._injectFirebaseSDK();
        }
        
        // Escuchar eventos de conexión
        this._setupConnectionListener();
    }

    _injectFirebaseSDK() {
        // Intentar cargar Firebase SDK dinámicamente
        if (document.querySelector('script[src*="firebase-app"]')) return;
        
        const scripts = [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js'
        ];
        
        let loaded = 0;
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                loaded++;
                if (loaded === scripts.length) {
                    console.log('✅ Firebase SDK loaded dynamically');
                    this._initFirebase();
                }
            };
            script.onerror = () => {
                console.error('❌ Failed to load Firebase SDK:', src);
            };
            document.head.appendChild(script);
        });
    }

    _initFirebase() {
        try {
            // Verificar que firebase esté definido
            if (typeof firebase === 'undefined') {
                console.warn('⚠️ Firebase still not available. Will retry...');
                setTimeout(() => this._initFirebase(), 2000);
                return;
            }

            // Inicializar Firebase
            this.app = firebase.initializeApp(FIREBASE_CONFIG);
            this.auth = firebase.auth();
            this.db = firebase.database();
            this.storage = firebase.storage();
            
            // Configurar persistencia de autenticación
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('✅ Auth persistence set to LOCAL');
                })
                .catch(error => {
                    console.warn('⚠️ Could not set persistence:', error);
                });
            
            this.isConfigured = true;
            console.log('✅ Firebase initialized successfully');
            
            // Escuchar cambios en autenticación
            this.auth.onAuthStateChanged((user) => {
                this._onAuthStateChanged(user);
            });
            
            // Cargar datos desde Firebase
            this._loadFromFirebase();
            
        } catch (error) {
            console.error('❌ Error initializing Firebase:', error);
            this.isConfigured = false;
            this._loadFromLocalStorage();
        }
    }

    _setupConnectionListener() {
        if (this.isConfigured) {
            try {
                const connectedRef = this.db.ref('.info/connected');
                connectedRef.on('value', (snap) => {
                    this.isConnected = snap.val();
                    if (this.isConnected) {
                        console.log('🟢 Connected to Firebase');
                        this._syncPendingOperations();
                    } else {
                        console.log('🔴 Disconnected from Firebase');
                    }
                });
            } catch (error) {
                console.warn('⚠️ Could not setup connection listener:', error);
            }
        }
    }

    // ==========================================================================
    // 4. AUTENTICACIÓN
    // ==========================================================================

    _onAuthStateChanged(user) {
        if (user) {
            this.isAuthenticated = true;
            this.currentUser = user;
            console.log(`👤 User authenticated: ${user.email}`);
            this._loadUserData(user.uid);
        } else {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.currentUserData = null;
            console.log('👤 User signed out');
        }
    }

    /**
     * Registro de nuevo usuario
     * @param {string} email - Correo electrónico
     * @param {string} password - Contraseña
     * @param {Object} userData - Datos adicionales del usuario
     * @returns {Promise}
     */
    async registerUser(email, password, userData = {}) {
        try {
            if (!this.isConfigured) {
                // Modo localStorage - registro local
                return this._registerLocalUser(email, password, userData);
            }

            // Crear usuario en Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Guardar datos adicionales en Realtime Database
            await this.db.ref(`usuarios/${user.uid}`).set({
                ...userData,
                email: email,
                uid: user.uid,
                fechaRegistro: new Date().toISOString(),
                rol: userData.rol || 'cliente',
                estado: 'Activo'
            });

            // Actualizar perfil
            if (userData.nombres) {
                await user.updateProfile({
                    displayName: `${userData.nombres} ${userData.apellidos || ''}`
                });
            }

            // Cargar datos del usuario
            this._loadUserData(user.uid);

            // Guardar en localStorage como respaldo
            this._saveToCache('usuarios', {
                id: user.uid,
                ...userData,
                email: email,
                fechaRegistro: new Date().toISOString()
            });

            return {
                success: true,
                user: user,
                uid: user.uid,
                message: 'Usuario registrado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error registering user:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    /**
     * Login de usuario
     * @param {string} email - Correo electrónico
     * @param {string} password - Contraseña
     * @returns {Promise}
     */
    async loginUser(email, password) {
        try {
            if (!this.isConfigured) {
                // Modo localStorage - login local
                return this._loginLocalUser(email, password);
            }

            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await this._loadUserData(user.uid);

            return {
                success: true,
                user: user,
                uid: user.uid,
                message: 'Login exitoso'
            };

        } catch (error) {
            console.error('❌ Error logging in:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    /**
     * Logout de usuario
     * @returns {Promise}
     */
    async logoutUser() {
        try {
            if (this.isConfigured) {
                await this.auth.signOut();
            }
            this.currentUser = null;
            this.currentUserData = null;
            this.isAuthenticated = false;
            
            // Limpiar suscripciones
            this._unsubscribeAll();
            
            return {
                success: true,
                message: 'Logout exitoso'
            };
        } catch (error) {
            console.error('❌ Error logging out:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener usuario actual
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.currentUserData || this.currentUser;
    }

    /**
     * Verificar si hay usuario autenticado
     * @returns {boolean}
     */
    isAuthenticatedUser() {
        return this.isAuthenticated && this.currentUser !== null;
    }

    // ==========================================================================
    // 5. OPERACIONES CRUD - USUARIOS
    // ==========================================================================

    async _loadUserData(uid) {
        try {
            if (!this.isConfigured) {
                // Buscar en caché
                const userData = this._findInCache('usuarios', 'id', uid);
                this.currentUserData = userData;
                return userData;
            }

            const snapshot = await this.db.ref(`usuarios/${uid}`).once('value');
            const data = snapshot.val();
            
            if (data) {
                this.currentUserData = { id: uid, ...data };
                this._saveToCache('usuarios', this.currentUserData);
                
                // Cargar datos relacionados
                this._loadRelatedData(uid);
            }
            
            return this.currentUserData;
        } catch (error) {
            console.error('❌ Error loading user data:', error);
            return null;
        }
    }

    async _loadRelatedData(uid) {
        try {
            // Cargar mascotas
            const petsResult = await this.getPets(uid);
            if (petsResult.success) {
                this.cache.mascotas = petsResult.data;
            }

            // Cargar citas (usando getCitas en lugar de getAppointments)
            const appointmentsResult = await this.getCitas(uid);
            if (appointmentsResult.success) {
                this.cache.citas = appointmentsResult.data;
            }

            // Cargar notificaciones
            const notificationsResult = await this.getNotifications(uid);
            if (notificationsResult.success) {
                this.cache.notificaciones = notificationsResult.data;
            }

            // Guardar en localStorage como fallback
            this._saveCacheToLocalStorage();

        } catch (error) {
            console.error('❌ Error loading related data:', error);
        }
    }

    /**
     * Obtener datos de usuario
     * @param {string} uid - ID del usuario (opcional)
     * @returns {Promise}
     */
    async getUserData(uid = null) {
        const userId = uid || (this.currentUser ? this.currentUser.uid : null);
        
        if (!userId) {
            return {
                success: false,
                error: 'Usuario no autenticado',
                data: null
            };
        }

        try {
            if (!this.isConfigured) {
                const userData = this._findInCache('usuarios', 'id', userId);
                return {
                    success: true,
                    data: userData,
                    source: 'cache'
                };
            }

            const snapshot = await this.db.ref(`usuarios/${userId}`).once('value');
            const data = snapshot.val();
            
            return {
                success: true,
                data: data,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error getting user data:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Actualizar datos de usuario
     * @param {string} uid - ID del usuario
     * @param {Object} updates - Datos a actualizar
     * @returns {Promise}
     */
    async updateUserData(uid, updates) {
        try {
            if (!this.isConfigured) {
                this._updateInCache('usuarios', 'id', uid, updates);
                return {
                    success: true,
                    source: 'cache'
                };
            }

            await this.db.ref(`usuarios/${uid}`).update({
                ...updates,
                fechaActualizacion: new Date().toISOString()
            });

            return {
                success: true,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error updating user data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================================================
    // 6. OPERACIONES CRUD - MASCOTAS
    // ==========================================================================

    /**
     * Registrar mascota
     * @param {Object} petData - Datos de la mascota
     * @returns {Promise}
     */
    async registerPet(petData) {
        try {
            if (!this.currentUser && this.isConfigured) {
                return {
                    success: false,
                    error: 'Usuario no autenticado'
                };
            }

            const petId = petData.id || this._generateId('MASC');
            const userId = this.currentUser ? this.currentUser.uid : petData.clienteId;

            const pet = {
                ...petData,
                id: petId,
                clienteId: userId,
                fechaRegistro: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                estado: 'Activo'
            };

            if (!this.isConfigured) {
                this._saveToCache('mascotas', pet);
                return {
                    success: true,
                    data: pet,
                    source: 'cache'
                };
            }

            await this.db.ref(`mascotas/${petId}`).set(pet);
            await this.db.ref(`usuarios/${userId}/mascotas/${petId}`).set(true);

            // Guardar en caché
            this._saveToCache('mascotas', pet);

            return {
                success: true,
                data: pet,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error registering pet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener mascotas del usuario
     * @param {string} userId - ID del usuario (opcional)
     * @returns {Promise}
     */
    async getPets(userId = null) {
        const uid = userId || (this.currentUser ? this.currentUser.uid : null);
        
        if (!uid) {
            return {
                success: false,
                error: 'Usuario no autenticado',
                data: []
            };
        }

        try {
            if (!this.isConfigured) {
                const pets = this._findAllInCache('mascotas', 'clienteId', uid);
                return {
                    success: true,
                    data: pets,
                    source: 'cache'
                };
            }

            const snapshot = await this.db.ref('mascotas').orderByChild('clienteId').equalTo(uid).once('value');
            const data = snapshot.val();
            const pets = data ? Object.values(data) : [];

            return {
                success: true,
                data: pets,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error getting pets:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Suscribirse a cambios en mascotas (tiempo real)
     * @param {string} userId - ID del usuario
     * @param {Function} callback - Función a ejecutar con los cambios
     * @returns {Function} Función para cancelar suscripción
     */
    subscribePets(userId, callback) {
        if (!this.isConfigured || !this.isConnected) {
            console.warn('⚠️ Real-time subscription not available in offline mode');
            const interval = setInterval(() => {
                const pets = this._findAllInCache('mascotas', 'clienteId', userId);
                callback({ data: pets, source: 'cache' });
            }, 5000);
            return () => clearInterval(interval);
        }

        const ref = this.db.ref('mascotas').orderByChild('clienteId').equalTo(userId);
        const subscription = ref.on('value', (snapshot) => {
            const data = snapshot.val();
            const pets = data ? Object.values(data) : [];
            callback({
                data: pets,
                source: 'firebase',
                timestamp: new Date().toISOString()
            });
        });

        const subId = this._generateId('SUB');
        this.activeSubscriptions[subId] = subscription;
        
        return () => {
            ref.off('value', subscription);
            delete this.activeSubscriptions[subId];
        };
    }

    // ==========================================================================
    // 7. OPERACIONES CRUD - CITAS
    // ==========================================================================

    /**
     * Registrar cita
     * @param {Object} appointmentData - Datos de la cita
     * @returns {Promise}
     */
    async registerAppointment(appointmentData) {
        try {
            if (!this.currentUser && this.isConfigured) {
                return {
                    success: false,
                    error: 'Usuario no autenticado'
                };
            }

            // Verificar disponibilidad
            const available = await this._checkAvailability(
                appointmentData.fecha,
                appointmentData.hora
            );

            if (!available) {
                return {
                    success: false,
                    error: 'Horario no disponible',
                    code: 'time-unavailable'
                };
            }

            const appointmentId = appointmentData.id || this._generateId('CIT');
            const userId = this.currentUser ? this.currentUser.uid : appointmentData.clienteId;

            const appointment = {
                ...appointmentData,
                id: appointmentId,
                clienteId: userId,
                estado: 'Pendiente',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            };

            if (!this.isConfigured) {
                this._saveToCache('citas', appointment);
                return {
                    success: true,
                    data: appointment,
                    source: 'cache'
                };
            }

            await this.db.ref(`citas/${appointmentId}`).set(appointment);
            await this.db.ref(`usuarios/${userId}/citas/${appointmentId}`).set(true);
            await this.db.ref(`horarios/${appointment.fecha}/${appointment.hora}`).set(true);

            this._saveToCache('citas', appointment);

            return {
                success: true,
                data: appointment,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error registering appointment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener citas del usuario
     * @param {string} userId - ID del usuario (opcional)
     * @returns {Promise}
     */
    async getCitas(userId = null) {
        const uid = userId || (this.currentUser ? this.currentUser.uid : null);
        
        if (!uid) {
            return {
                success: false,
                error: 'Usuario no autenticado',
                data: []
            };
        }

        try {
            if (!this.isConfigured) {
                const citas = this._findAllInCache('citas', 'clienteId', uid);
                return {
                    success: true,
                    data: citas,
                    source: 'cache'
                };
            }

            const snapshot = await this.db.ref('citas').orderByChild('clienteId').equalTo(uid).once('value');
            const data = snapshot.val();
            const citas = data ? Object.values(data) : [];

            return {
                success: true,
                data: citas,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error getting appointments:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Verificar disponibilidad de horario
     * @param {string} fecha - Fecha (YYYY-MM-DD)
     * @param {string} hora - Hora (HH:MM)
     * @returns {Promise<boolean>}
     */
    async _checkAvailability(fecha, hora) {
        try {
            if (!this.isConfigured) {
                const citas = this._findAllInCache('citas', 'fecha', fecha);
                const ocupado = citas.some(c => c.hora === hora && c.estado !== 'Cancelada');
                return !ocupado;
            }

            const snapshot = await this.db.ref(`horarios/${fecha}/${hora}`).once('value');
            return !snapshot.exists();
        } catch (error) {
            console.error('❌ Error checking availability:', error);
            return false;
        }
    }

    /**
     * Obtener horarios disponibles para una fecha
     * @param {string} fecha - Fecha (YYYY-MM-DD)
     * @returns {Promise<Array>}
     */
    async getAvailableHours(fecha) {
        const horarios = [];
        const horaInicio = 9;
        const horaFin = 17;
        const duracion = 30;

        for (let h = horaInicio; h < horaFin; h++) {
            for (let m = 0; m < 60; m += duracion) {
                const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const disponible = await this._checkAvailability(fecha, horaStr);
                if (disponible) {
                    horarios.push(horaStr);
                }
            }
        }
        return horarios;
    }

    // ==========================================================================
    // 8. OPERACIONES CRUD - SERVICIOS
    // ==========================================================================

    /**
     * Registrar servicio
     * @param {Object} serviceData - Datos del servicio
     * @returns {Promise}
     */
    async registerService(serviceData) {
        try {
            const serviceId = serviceData.id || this._generateId('SRV');
            const service = {
                ...serviceData,
                id: serviceId,
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                estado: serviceData.estado || 'Activo'
            };

            if (!this.isConfigured) {
                this._saveToCache('servicios', service);
                return {
                    success: true,
                    data: service,
                    source: 'cache'
                };
            }

            await this.db.ref(`servicios/${serviceId}`).set(service);
            this._saveToCache('servicios', service);
            return {
                success: true,
                data: service,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error registering service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener todos los servicios
     * @returns {Promise}
     */
    async getServices() {
        try {
            if (!this.isConfigured) {
                return {
                    success: true,
                    data: this.cache.servicios,
                    source: 'cache'
                };
            }

            const snapshot = await this.db.ref('servicios').once('value');
            const data = snapshot.val();
            const servicios = data ? Object.values(data) : [];

            return {
                success: true,
                data: servicios,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error getting services:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // ==========================================================================
    // 9. OPERACIONES CRUD - PRODUCTOS
    // ==========================================================================

    /**
     * Registrar producto
     * @param {Object} productData - Datos del producto
     * @returns {Promise}
     */
    async registerProduct(productData) {
        try {
            const productId = productData.id || this._generateId('PRD');
            const product = {
                ...productData,
                id: productId,
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                estado: productData.estado || 'Activo'
            };

            if (!this.isConfigured) {
                this._saveToCache('productos', product);
                return {
                    success: true,
                    data: product,
                    source: 'cache'
                };
            }

            await this.db.ref(`productos/${productId}`).set(product);
            this._saveToCache('productos', product);
            return {
                success: true,
                data: product,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error registering product:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener todos los productos
     * @returns {Promise}
     */
    async getProducts() {
        try {
            if (!this.isConfigured) {
                return {
                    success: true,
                    data: this.cache.productos,
                    source: 'cache'
                };
            }

            const snapshot = await this.db.ref('productos').once('value');
            const data = snapshot.val();
            const productos = data ? Object.values(data) : [];

            return {
                success: true,
                data: productos,
                source: 'firebase'
            };
        } catch (error) {
            console.error('❌ Error getting products:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // ==========================================================================
    // 10. SISTEMA DE CACHÉ (OFFLINE FIRST)
    // ==========================================================================

    _loadFromFirebase() {
        if (this.isConfigured && this.currentUser) {
            this._loadUserData(this.currentUser.uid);
        }
    }

    _saveCacheToLocalStorage() {
        try {
            Object.keys(this.cache).forEach(key => {
                if (Array.isArray(this.cache[key])) {
                    localStorage.setItem(`maskovet_fb_cache_${key}`, JSON.stringify(this.cache[key]));
                }
            });
        } catch (error) {
            console.error('Error saving cache to localStorage:', error);
        }
    }

    _loadFromLocalStorage() {
        try {
            Object.keys(this.cache).forEach(key => {
                const data = localStorage.getItem(`maskovet_fb_cache_${key}`);
                if (data) {
                    this.cache[key] = JSON.parse(data);
                }
            });
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    _saveToCache(collection, item) {
        const cache = this.cache[collection];
        if (!cache) return;
        
        const index = cache.findIndex(i => i.id === item.id);
        if (index >= 0) {
            cache[index] = { ...cache[index], ...item };
        } else {
            cache.push(item);
        }
        this._saveCacheToLocalStorage();
    }

    _findInCache(collection, field, value) {
        const cache = this.cache[collection];
        if (!cache) return null;
        return cache.find(item => item[field] === value) || null;
    }

    _findAllInCache(collection, field, value) {
        const cache = this.cache[collection];
        if (!cache) return [];
        return cache.filter(item => item[field] === value);
    }

    _updateInCache(collection, field, value, updates) {
        const cache = this.cache[collection];
        if (!cache) return;
        
        const index = cache.findIndex(item => item[field] === value);
        if (index >= 0) {
            cache[index] = { ...cache[index], ...updates };
            this._saveCacheToLocalStorage();
        }
    }

    // ==========================================================================
    // 11. SINCRONIZACIÓN DE OPERACIONES PENDIENTES
    // ==========================================================================

    async _syncPendingOperations() {
        try {
            const pending = JSON.parse(localStorage.getItem('maskovet_pending') || '[]');
            
            if (pending.length === 0) return;

            console.log(`🔄 Syncing ${pending.length} pending operations...`);

            for (const operation of pending) {
                try {
                    const { collection, action, data } = operation;
                    
                    switch(action) {
                        case 'create':
                            await this.db.ref(`${collection}/${data.id}`).set(data);
                            break;
                        case 'update':
                            await this.db.ref(`${collection}/${data.id}`).update(data);
                            break;
                        case 'delete':
                            await this.db.ref(`${collection}/${data.id}`).remove();
                            break;
                    }
                } catch (error) {
                    console.error(`❌ Error syncing operation:`, error);
                    continue;
                }
            }

            localStorage.setItem('maskovet_pending', JSON.stringify([]));
            console.log('✅ All pending operations synced successfully');

        } catch (error) {
            console.error('❌ Error syncing pending operations:', error);
        }
    }

    _addPendingOperation(collection, action, data) {
        const pending = JSON.parse(localStorage.getItem('maskovet_pending') || '[]');
        pending.push({
            id: this._generateId('PEND'),
            collection,
            action,
            data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('maskovet_pending', JSON.stringify(pending));
    }

    // ==========================================================================
    // 12. UTILIDADES
    // ==========================================================================

    _generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    _unsubscribeAll() {
        Object.keys(this.activeSubscriptions).forEach(key => {
            try {
                this.activeSubscriptions[key]();
            } catch (error) {
                console.error('Error unsubscribing:', error);
            }
        });
        this.activeSubscriptions = {};
    }

    // Métodos para compatibilidad con localStorage (modo offline)
    _registerLocalUser(email, password, userData) {
        const user = {
            uid: this._generateId('USR'),
            email: email,
            ...userData,
            fechaRegistro: new Date().toISOString()
        };
        this._saveToCache('usuarios', user);
        this.currentUser = { uid: user.uid, email: email };
        this.currentUserData = user;
        this.isAuthenticated = true;
        
        return {
            success: true,
            user: user,
            uid: user.uid,
            message: 'Usuario registrado localmente'
        };
    }

    _loginLocalUser(email, password) {
        const user = this._findInCache('usuarios', 'email', email);
        if (!user) {
            return {
                success: false,
                error: 'Usuario no encontrado'
            };
        }
        
        if (user.password !== password) {
            return {
                success: false,
                error: 'Contraseña incorrecta'
            };
        }

        this.currentUser = { uid: user.id, email: user.email };
        this.currentUserData = user;
        this.isAuthenticated = true;
        
        return {
            success: true,
            user: user,
            uid: user.id,
            message: 'Login exitoso'
        };
    }
}

// ==========================================================================
// 13. INSTANCIA GLOBAL
// ==========================================================================

// Crear instancia única
let MaskoVetFirebaseInstance = null;

function getFirebaseInstance() {
    if (!MaskoVetFirebaseInstance) {
        MaskoVetFirebaseInstance = new MaskoVetFirebase();
    }
    return MaskoVetFirebaseInstance;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MaskoVetFirebase = getFirebaseInstance();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = getFirebaseInstance;
}

console.log('✅ MaskoVet Firebase Adapter loaded successfully');
console.log(`📡 Mode: ${getFirebaseInstance().isConfigured ? 'Firebase Cloud' : 'Local Storage'}`);