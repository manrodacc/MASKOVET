-- ======================================================================================
-- MASKOVET - SCRIPT DE BASE DE DATOS PARA SUPABASE
-- Copia y pega este script en el "SQL Editor" de tu proyecto de Supabase y ejecútalo.
-- ======================================================================================

-- Habilitar extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    correo TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    telefono TEXT,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'empresa', 'cliente', 'veterinario', 'recepcionista', 'tecnico')),
    especialidad TEXT,
    estado TEXT DEFAULT 'Activo',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    ultimo_acceso TIMESTAMP WITH TIME ZONE
);

-- 2. TABLA: mascotas
CREATE TABLE IF NOT EXISTS mascotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    especie TEXT,
    raza TEXT,
    sexo TEXT,
    fecha_nacimiento DATE,
    edad TEXT,
    peso DECIMAL(5,2),
    color TEXT,
    alergias TEXT,
    enfermedades TEXT,
    vacunas TEXT,
    foto TEXT,
    observaciones TEXT,
    estado TEXT DEFAULT 'Activo',
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. TABLA: servicios
CREATE TABLE IF NOT EXISTS servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    duracion TEXT DEFAULT '30 min',
    imagen TEXT,
    categoria TEXT DEFAULT 'General',
    estado TEXT DEFAULT 'Activo',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    categoria TEXT DEFAULT 'General',
    imagen TEXT,
    estado TEXT DEFAULT 'Activo',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. TABLA: citas
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    mascota_id UUID REFERENCES mascotas(id) ON DELETE CASCADE,
    veterinario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL,
    servicio TEXT,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado TEXT DEFAULT 'Pendiente',
    notas TEXT,
    pago_id TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. TABLA: historial_clinico
CREATE TABLE IF NOT EXISTS historial_clinico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    mascota_id UUID REFERENCES mascotas(id) ON DELETE CASCADE,
    veterinario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    diagnostico TEXT NOT NULL,
    tratamiento TEXT,
    vacuna TEXT,
    receta TEXT,
    observaciones TEXT,
    estado TEXT DEFAULT 'Activo',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ======================================================================================
-- SEGURIDAD (Row Level Security - RLS)
-- Recomendado: Permite a todos leer y escribir temporalmente mientras haces la migración.
-- Una vez en producción, debes cambiar estas políticas para mayor seguridad.
-- ======================================================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso publico usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir acceso publico mascotas" ON mascotas;
DROP POLICY IF EXISTS "Permitir acceso publico servicios" ON servicios;
DROP POLICY IF EXISTS "Permitir acceso publico productos" ON productos;
DROP POLICY IF EXISTS "Permitir acceso publico citas" ON citas;
DROP POLICY IF EXISTS "Permitir acceso publico historial" ON historial_clinico;

-- 7. TABLA: notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL DEFAULT 'Notificación',
    mensaje TEXT,
    tipo TEXT DEFAULT 'info',
    leida BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acceso publico notificaciones" ON notificaciones;
CREATE POLICY "Permitir acceso publico notificaciones" ON notificaciones FOR ALL USING (true);

CREATE POLICY "Permitir acceso publico usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Permitir acceso publico mascotas" ON mascotas FOR ALL USING (true);
CREATE POLICY "Permitir acceso publico servicios" ON servicios FOR ALL USING (true);
CREATE POLICY "Permitir acceso publico productos" ON productos FOR ALL USING (true);
CREATE POLICY "Permitir acceso publico citas" ON citas FOR ALL USING (true);
CREATE POLICY "Permitir acceso publico historial" ON historial_clinico FOR ALL USING (true);

