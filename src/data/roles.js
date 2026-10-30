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
// Extrae el técnico; el bioquímico queda habilitado por alguna eventualidad
export const ROLES_EXTRACCION = ['tecnico', 'bioquimico', 'admin'];
// Gestión de pacientes: la hace recepción y también el admin
export const ROLES_PACIENTES = ['recepcion', 'admin'];
// Órdenes médicas: las cargan, corrigen y anulan recepción y el admin
export const ROLES_ORDENES = ['recepcion', 'admin'];
// Carga de resultados: la hace recepción; el bioquímico también puede por alguna eventualidad
export const ROLES_RESULTADOS = ['recepcion', 'bioquimico', 'admin'];

export default ROLES;
