/* ==========================================================================
   MASKOVET - Core Utilities Module
   Archivo: core/js/utils.js
   Versión: 3.0 - CORREGIDA
   ========================================================================== */

// ==========================================================================
// 1. SISTEMA DE NOTIFICACIONES (Toast)
// ==========================================================================

function showAlert(message, type = "info", duration = 3200) {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: '🔔' };
    const titles = { success: 'Éxito', error: 'Error', warning: 'Advertencia', info: 'Información' };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 420px;
        width: 100%;
    `;

    const style = document.createElement('style');
    style.textContent = `
        .toast {
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            padding: 16px 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            opacity: 0;
            transform: translateX(50px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-left: 4px solid #1E5EFF;
        }
        .toast.success { border-left-color: #10B981; }
        .toast.error { border-left-color: #EF4444; }
        .toast.warning { border-left-color: #F59E0B; }
        .toast.info { border-left-color: #1E5EFF; }
        .toast-icon { font-size: 1.5rem; line-height: 1; }
        .toast-content { flex: 1; }
        .toast-title { font-weight: 600; font-size: 0.9rem; color: #111827; }
        .toast-message { font-size: 0.85rem; color: #6B7280; margin-top: 2px; }
        .toast-close { background: none; border: none; color: #64748B; cursor: pointer; font-size: 1.2rem; padding: 0 4px; }
        .toast-close:hover { color: #111827; }
    `;
    document.head.appendChild(style);

    return container;
}

function confirmAction(message, title = 'Confirmar') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            z-index: 99998;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #FFFFFF;
            border-radius: 18px;
            padding: 32px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 24px 48px -12px rgba(0,0,0,0.15);
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 8px 0; color: #111827;">${escapeHtml(title)}</h3>
            <p style="margin: 0 0 24px 0; color: #6B7280;">${escapeHtml(message)}</p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
                <button class="btn btn-primary" data-action="confirm">Confirmar</button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        const close = (confirmed) => {
            modal.remove();
            resolve(confirmed);
        };

        dialog.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
        dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close(false);
            if (e.key === 'Enter') close(true);
        }, { once: true });
    });
}

// ==========================================================================
// 2. VALIDACIONES
// ==========================================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase().trim());
}

function isValidPhone(phone) {
    return /^[0-9]{9}$/.test(String(phone).trim());
}

function isValidDNI(dni) {
    return /^[0-9]{8}$/.test(String(dni).trim());
}

function isValidRUC(ruc) {
    return /^[0-9]{11}$/.test(String(ruc).trim());
}

function isEmpty(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function isNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

function escapeHtml(value) {
    if (!value) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };
    return String(value).replace(/[&<>"'/]/g, (s) => map[s]);
}

function truncateText(text, maxLength = 50, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
}

// ==========================================================================
// 3. FORMATEADORES
// ==========================================================================

function formatCurrency(amount) {
    const num = parseFloat(amount || 0);
    return `S/ ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatNumber(number, decimals = 0) {
    const num = parseFloat(number || 0);
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatPercentage(value, decimals = 1) {
    const num = parseFloat(value || 0);
    return `${num.toFixed(decimals)}%`;
}

function formatDate(date, format = 'short') {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'Fecha inválida';

    const options = {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    };

    return d.toLocaleDateString('es-ES', options[format] || options.short);
}

function formatTime(time, showSeconds = false) {
    const d = time instanceof Date ? time : new Date(`2000-01-01T${time}`);
    if (isNaN(d.getTime())) return 'Hora inválida';

    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    if (showSeconds) options.second = '2-digit';

    return d.toLocaleTimeString('es-ES', options);
}

function daysBetween(date1, date2 = new Date()) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function getMonthName(month) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1] || '';
}

function getDayName(day) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day] || '';
}

// ==========================================================================
// 4. GENERADORES
// ==========================================================================

function generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

function generateCode(length = 8, includeNumbers = true, includeLetters = true) {
    let chars = '';
    if (includeLetters) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) chars += '0123456789';
    if (!chars) chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

// ==========================================================================
// 5. UTILIDADES DE ARRAYS
// ==========================================================================

function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key] || 'undefined';
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {});
}

function sortBy(array, key, direction = 'asc') {
    const sorted = [...array];
    sorted.sort((a, b) => {
        const aVal = a[key] || '';
        const bVal = b[key] || '';
        if (typeof aVal === 'string') {
            return direction === 'asc' 
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        return direction === 'asc' 
            ? (aVal - bVal)
            : (bVal - aVal);
    });
    return sorted;
}

function filterBy(array, term, keys) {
    if (!term) return array;
    const lowerTerm = term.toLowerCase().trim();
    return array.filter(item => {
        return keys.some(key => {
            const value = item[key] || '';
            return String(value).toLowerCase().includes(lowerTerm);
        });
    });
}

function uniqueValues(array, key = null) {
    if (key) {
        return [...new Set(array.map(item => item[key]))];
    }
    return [...new Set(array)];
}

function sumBy(array, key) {
    return array.reduce((total, item) => total + parseFloat(item[key] || 0), 0);
}

function averageBy(array, key) {
    if (array.length === 0) return 0;
    return sumBy(array, key) / array.length;
}

// ==========================================================================
// 6. UTILIDADES DE FECHAS
// ==========================================================================

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('es-PE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function getCurrentDateTime() {
    return `${getCurrentDate()} ${new Date().toLocaleTimeString('es-PE', { hour12: false })}`;
}

function getDateRange(period) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            end.setDate(now.getDate() + (6 - now.getDay()));
            end.setHours(23, 59, 59, 999);
            break;
        case 'month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(now.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'year':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(now.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

function isPastDate(date) {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
}

function isFutureDate(date) {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d > today;
}

function isToday(date) {
    const d = new Date(date);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
}

// ==========================================================================
// 7. PERSISTENCIA
// ==========================================================================

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function getFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error getting from storage:', error);
        return defaultValue;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from storage:', error);
    }
}

function clearAppStorage() {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('maskovet_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
}

// ==========================================================================
// 8. UTILIDADES DOM
// ==========================================================================

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function toggleVisibility(id, show) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = show ? '' : 'none';
    }
}

function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.entries(value).forEach(([prop, val]) => {
                element.style[prop] = val;
            });
        } else {
            element.setAttribute(key, value);
        }
    });
    if (content) {
        element.innerHTML = content;
    }
    return element;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showAlert('Texto copiado al portapapeles', 'success');
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showAlert('Texto copiado al portapapeles', 'success');
            return true;
        } catch (e) {
            showAlert('Error al copiar texto', 'error');
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

// ==========================================================================
// 9. EXPORTACIÓN
// ==========================================================================

function downloadTextFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function toCsv(rows, headers = null) {
    const allRows = headers ? [headers, ...rows] : rows;
    return allRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
}

function buildXmlFromReport(reportData) {
    const rows = reportData.rows.map((row) => {
        const fields = row.map((value, index) => 
            `<campo nombre="${escapeXml(reportData.headers[index] || `campo${index + 1}`)}">${escapeXml(value)}</campo>`
        ).join('');
        return `    <registro>\n      ${fields}\n    </registro>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<reporte>\n  <titulo>${escapeXml(reportData.titulo)}</titulo>\n${rows}\n</reporte>`;
}

function escapeXml(value) {
    if (!value) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
    };
    return String(value).replace(/[&<>"']/g, (s) => map[s]);
}

function toJson(reportData) {
    return JSON.stringify({
        titulo: reportData.titulo,
        headers: reportData.headers,
        rows: reportData.rows,
        fechaGeneracion: getCurrentDateTime()
    }, null, 2);
}

// ==========================================================================
// 10. PERFORMANCE
// ==========================================================================

function debounce(fn, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

function throttle(fn, limit = 300) {
    let inThrottle = false;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================================================
// 11. EXPORTACIÓN GLOBAL
// ==========================================================================

if (typeof window !== 'undefined') {
    window.showAlert = showAlert;
    window.confirmAction = confirmAction;
    window.isValidEmail = isValidEmail;
    window.isValidPhone = isValidPhone;
    window.isValidDNI = isValidDNI;
    window.isValidRUC = isValidRUC;
    window.isEmpty = isEmpty;
    window.isNumber = isNumber;
    window.escapeHtml = escapeHtml;
    window.truncateText = truncateText;
    window.formatCurrency = formatCurrency;
    window.formatNumber = formatNumber;
    window.formatPercentage = formatPercentage;
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    window.daysBetween = daysBetween;
    window.calculateAge = calculateAge;
    window.getMonthName = getMonthName;
    window.getDayName = getDayName;
    window.generateId = generateId;
    window.generateCode = generateCode;
    window.generateRandomColor = generateRandomColor;
    window.groupBy = groupBy;
    window.sortBy = sortBy;
    window.filterBy = filterBy;
    window.uniqueValues = uniqueValues;
    window.sumBy = sumBy;
    window.averageBy = averageBy;
    window.getCurrentDate = getCurrentDate;
    window.getCurrentTime = getCurrentTime;
    window.getCurrentDateTime = getCurrentDateTime;
    window.getDateRange = getDateRange;
    window.isPastDate = isPastDate;
    window.isFutureDate = isFutureDate;
    window.isToday = isToday;
    window.saveToStorage = saveToStorage;
    window.getFromStorage = getFromStorage;
    window.removeFromStorage = removeFromStorage;
    window.clearAppStorage = clearAppStorage;
    window.getInputValue = getInputValue;
    window.setInputValue = setInputValue;
    window.toggleVisibility = toggleVisibility;
    window.createElement = createElement;
    window.copyToClipboard = copyToClipboard;
    window.downloadTextFile = downloadTextFile;
    window.toCsv = toCsv;
    window.buildXmlFromReport = buildXmlFromReport;
    window.toJson = toJson;
    window.debounce = debounce;
    window.throttle = throttle;
}

console.log('✅ MaskoVet Utils Module loaded successfully');