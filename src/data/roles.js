// Nombre legible de cada rol que guarda la base de datos. El color de cada uno está en ListaPerfiles.css (.lims-rol--clave)
const ROLES = {
  admin: { nombre: 'Administrador' },
  bioquimico: { nombre: 'Bioquímico' },
  tecnico: { nombre: 'Técnico' },
  recepcion: { nombre: 'Recepción' },
  paciente: { nombre: 'Paciente' },
};

// Quiénes usan cada pantalla de la fila de atención (el admin entra a todas)
export const ROLES_RECEPCION = ['recepcion', 'admin'];
// Bandeja de trabajo: el bioquímico y el técnico ven las órdenes pendientes de su sucursal
export const ROLES_BANDEJA = ['bioquimico', 'tecnico'];
// Extrae el técnico; el bioquímico queda habilitado por alguna eventualidad
export const ROLES_EXTRACCION = ['tecnico', 'bioquimico', 'admin'];
// Gestión de pacientes: la hace recepción y también el admin
export const ROLES_PACIENTES = ['recepcion', 'admin'];
// Órdenes médicas: las cargan, corrigen y anulan recepción y el admin
export const ROLES_ORDENES = ['recepcion', 'admin'];

export default ROLES;
