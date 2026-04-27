'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './admin.css';

const COURSE_OPTIONS = [
  'Kinder A', 'Kinder B',
  '1ro BA', '1ro BB',
  '2do BA', '2do BB',
  '3ro BA', '3ro BB',
  '4to BA', '4to BB',
  '5to BA', '5to BB',
  '6to BA', '6to BB',
  '7mo BA', '7mo BB',
  '8vo BA', '8vo BB',
  '1ro MA', '1ro MB',
  '2do MA', '2do MB',
  '3ro MA', '3ro MB',
  '4to MA', '4to MB'
];

interface Teacher {
  id: string;
  username: string;
  fullName: string;
  course: string;
  email?: string | null;
  isActive: boolean; // Added
  _count: {
    students: number;
  };
}

interface NewTeacherResponse {
  username: string;
  email?: string | null;
  tempPassword: string;
}

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<NewTeacherResponse | null>(null);
  const router = useRouter();

  type SortField = 'fullName' | 'email' | 'course' | 'username' | 'students' | 'isActive';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Form State
  const [fullName, setFullName] = useState('');
  const [course, setCourse] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Daily Menus State
  const [menu1, setMenu1] = useState('');
  const [menu2, setMenu2] = useState('');
  const [menu3, setMenu3] = useState('');
  const [savingMenus, setSavingMenus] = useState(false);

  const fetchDailyMenus = useCallback(async () => {
    try {
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const res = await fetch(`/api/daily-menus?dateString=${dateString}`);
      if (res.ok) {
        const data = await res.json();
        const m1 = data.find((d: any) => d.optionNumber === 1);
        const m2 = data.find((d: any) => d.optionNumber === 2);
        const m3 = data.find((d: any) => d.optionNumber === 3);
        if (m1) setMenu1(m1.menuText);
        if (m2) setMenu2(m2.menuText);
        if (m3) setMenu3(m3.menuText);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/teachers');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        setTeachers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTeachers();
    fetchDailyMenus();
  }, [fetchTeachers, fetchDailyMenus]);

  const handleLogout = () => {
    document.cookie = 'userId=; Max-Age=0; path=/;';
    document.cookie = 'userRole=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const handleSaveDailyMenus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMenus(true);
    try {
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const saveMenu = async (opt: number, text: string) => {
        if (!text.trim()) return;
        await fetch('/api/daily-menus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateString, optionNumber: opt, menuText: text })
        });
      };
      
      await Promise.all([
        saveMenu(1, menu1),
        saveMenu(2, menu2),
        saveMenu(3, menu3)
      ]);
      
      alert('Menús del día guardados correctamente.');
    } catch (err) {
      alert('Error al guardar menús.');
    } finally {
      setSavingMenus(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !course) return;
    
    setSaving(true);
    setError('');
    setSuccess(null);
    
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, course, email: email || undefined }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(data);
        setFullName('');
        setCourse('');
        setEmail('');
        fetchTeachers();
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editFullName, course: editCourse, isActive: editIsActive, password: editPassword || undefined, email: editEmail || undefined }),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchTeachers();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al actualizar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar al profesor ${name}?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTeachers();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setEditFullName(t.fullName);
    setEditCourse(t.course);
    setEditEmail(t.email || '');
    setEditPassword('');
    setEditIsActive(t.isActive);
    setShowEditModal(true);
  };

  const uniqueCourses = Array.from(new Set(teachers.map(t => t.course))).filter(Boolean).sort() as string[];
  const filteredTeachers = selectedCourse === 'all' 
    ? teachers 
    : teachers.filter(t => t.course === selectedCourse);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    let aVal: any = a[sortField as keyof Teacher];
    let bVal: any = b[sortField as keyof Teacher];
    
    if (sortField === 'students') {
      aVal = a._count.students;
      bVal = b._count.students;
    }
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return aVal > bVal ? modifier : -modifier;
  });

  return (
    <div className="page-container admin-container">
      <header className="dashboard-header">
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Panel del Administrador</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Gestión de Planta Docente y Cursos</p>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="btn-outline">Cerrar Sesión</button>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-value">{teachers.length}</span>
          <span className="stat-label">Profesores</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-value">
            {teachers.reduce((acc, t) => acc + t._count.students, 0)}
          </span>
          <span className="stat-label">Total Alumnos</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-value">
            {new Set(teachers.map(t => t.course)).size}
          </span>
          <span className="stat-label">Cursos Activos</span>
        </div>
      </div>

      <div className="admin-content">
        {/* Daily Menus Section */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#f59e0b', fontSize: '1.5rem' }}>🍽️</span> Menús del Día (Global)
          </h2>
          <form onSubmit={handleSaveDailyMenus} className="admin-form" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group flex-1" style={{ marginBottom: 0, minWidth: '200px' }}>
              <label className="label">Opción 1</label>
              <input type="text" className="form-input" value={menu1} onChange={e => setMenu1(e.target.value)} placeholder="Ej: Pollo con arroz" />
            </div>
            <div className="form-group flex-1" style={{ marginBottom: 0, minWidth: '200px' }}>
              <label className="label">Opción 2</label>
              <input type="text" className="form-input" value={menu2} onChange={e => setMenu2(e.target.value)} placeholder="Ej: Fideos con salsa" />
            </div>
            <div className="form-group flex-1" style={{ marginBottom: 0, minWidth: '200px' }}>
              <label className="label">Opción 3 (Dieta/Extra)</label>
              <input type="text" className="form-input" value={menu3} onChange={e => setMenu3(e.target.value)} placeholder="Ej: Pescado al horno" />
            </div>
            <button type="submit" className="btn-primary" disabled={savingMenus} style={{ padding: '0.75rem 2rem', fontWeight: 600, height: '42px' }}>
              {savingMenus ? 'Guardando...' : 'Guardar Menús'}
            </button>
          </form>
        </div>

        {/* Registration Section */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#818cf8', fontSize: '1.5rem' }}>✨</span> Registrar Nuevo Profesor
          </h2>
          <form onSubmit={handleAddTeacher} className="admin-form">
            <div className="form-group flex-1" style={{ marginBottom: 0 }}>
              <label className="label">Nombre Completo</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.75rem 1rem' }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="form-group flex-1" style={{ marginBottom: 0 }}>
              <label className="label">Correo Electrónico</label>
              <input
                type="email"
                className="form-input"
                style={{ padding: '0.75rem 1rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="profesor@colegio.cl"
                required
              />
            </div>
            <div className="form-group flex-1" style={{ marginBottom: 0 }}>
              <label className="label">Curso / Nivel</label>
              <select
                className="form-input"
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                <option value="">Seleccione un Curso</option>
                {COURSE_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '0.75rem 2rem', fontWeight: 600 }}>
              {saving ? 'Guardando...' : 'Crear Acceso'}
            </button>
          </form>

          {error && <div className="error-msg" style={{ marginTop: '1rem' }}>{error}</div>}

          {success && (
            <div className="credentials-alert">
              <strong>✅ ¡Profesor creado con éxito!</strong>
              <p>Comparte estas credenciales temporales con el docente:</p>
              <div className="credentials-grid">
                <div className="credential-item">
                  <span className="cred-label">Correo Electrónico</span>
                  <span className="cred-value">{success.email || success.username}</span>
                </div>
                <div className="credential-item">
                  <span className="cred-label">Contraseña Temporal</span>
                  <span className="cred-value">{success.tempPassword}</span>
                </div>
              </div>
              <small style={{ display: 'block', marginTop: '1rem', color: '#6366f1' }}>
                * El profesor deberá cambiar esta clave en su primer inicio de sesión.
              </small>
            </div>
          )}
        </div>

        {/* Teachers List */}
        <div className="teacher-management">
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Lista de Profesores</h2>
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>Filtrar Curso:</span>
              <select 
                className="form-input filter-select" 
                style={{ 
                  width: 'auto', 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderColor: 'rgba(99, 102, 241, 0.5)',
                  cursor: 'pointer'
                }}
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">Todos los Cursos</option>
                {uniqueCourses.map(c => (
                  <option key={c} value={c} style={{ background: '#0f172a' }}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="data-table-wrapper glass-panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('fullName')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Nombre del Profesor {sortField === 'fullName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Correo {sortField === 'email' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('course')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Curso {sortField === 'course' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>

                  <th onClick={() => handleSort('students')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Alumnos {sortField === 'students' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">No hay profesores que coincidan con el filtro.</td>
                  </tr>
                ) : (
                  sortedTeachers.map((t) => (
                    <tr key={t.id}>
                      <td className="parent-username" style={{ fontWeight: 600 }}>🎓 {t.fullName}</td>
                      <td style={{ fontSize: '0.85rem' }}>{t.email || <span className="text-muted">Sin correo</span>}</td>
                      <td><span className="parent-chip" style={{ background: 'rgba(219, 39, 119, 0.1)', color: '#ec4899', border: '1px solid #ec4899' }}>{t.course}</span></td>

                      <td>{t._count.students}</td>
                      <td>
                        <span className={`status-chip ${t.isActive ? 'chip-ok' : 'chip-warning'}`}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                         <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-sm btn-edit" onClick={() => openEditModal(t)}>✏️</button>
                            <button className="btn-sm btn-delete" onClick={() => handleDeleteTeacher(t.id, t.fullName)} disabled={deletingId === t.id}>
                              {deletingId === t.id ? '...' : '🗑️'}
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Editar Profesor</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" className="form-input" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input type="email" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="profesor@colegio.cl" required />
              </div>
              <div className="form-group">
                <label>Curso / Nivel</label>
                <select 
                  className="form-input" 
                  style={{ cursor: 'pointer' }}
                  value={editCourse} 
                  onChange={(e) => setEditCourse(e.target.value)}
                >
                  <option value="">Seleccione un Curso</option>
                  {COURSE_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nueva Contraseña (opcional)</label>
                <input type="password" className="form-input" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" />
              </div>
              <div className="form-group">
                <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                  Profesor Activo
                </label>
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-primary" onClick={handleUpdateTeacher} disabled={saving} style={{ marginTop: '1rem' }}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
