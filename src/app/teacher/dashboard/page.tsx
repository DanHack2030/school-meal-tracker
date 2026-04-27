'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/export';
import './teacher.css';

type ConsumptionLevel = 'NADA' | 'POCO' | 'TODO';
type Tab = 'registros' | 'apoderados' | 'historial';

interface UserInfo {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
}

interface MealRecord {
  id: string;
  menuText?: string | null;
  menuImage?: string | null;
  consumption?: ConsumptionLevel | string | null;
  observation?: string | null;
  teacher?: { username: string; fullName: string | null };
}

interface Student {
  id: string;
  name: string;
  age?: number | null;
  course?: string | null; // Added
  parentId?: string | null;
  medicalInfo?: string | null;
  teacher?: { course: string | null }; 
  meals: MealRecord[];
}

interface ParentStudent {
  id: string;
  name: string;
  age?: number | null;
  course?: string | null; // Added
  medicalInfo?: string | null;
  parentId?: string | null;
  teacher?: { course: string | null };
  meals: MealRecord[];
}

interface Parent {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mustChangePassword: boolean;
  parentOf: ParentStudent[];
}

interface HistoryRecord {
  id: string;
  date: string;
  menuText?: string | null;
  menuImage?: string | null;
  consumption?: ConsumptionLevel | string | null;
  mainCourse?: string | null;
  observation?: string | null;
  student: { id: string; name: string };
  teacher: { username: string; fullName: string | null };
}

const consumptionOptions: ConsumptionLevel[] = ['NADA', 'POCO', 'TODO'];

const consumptionColor: Record<string, string> = {
  'NADA': 'badge-none',
  'POCO': 'badge-quarter',
  '1/4': 'badge-quarter',
  '1/2': 'badge-half',
  'TODO': 'badge-full',
};

// ──────────────────────────────────────────────
// Student Card Component
// ──────────────────────────────────────────────
function StudentCard({
  student,
  parentName,
  globalMenu,
  onEditProfile,
  onRefetch,
}: {
  student: Student;
  parentName?: string;
  globalMenu: string;
  onEditProfile: (s: Student) => void;
  onRefetch: () => void;
}) {
  const existingMeal = student.meals[0];
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState(existingMeal?.menuImage || '');
  const [consumption, setConsumption] = useState<ConsumptionLevel | string>(existingMeal?.consumption || 'NADA');
  const [observation, setObservation] = useState(existingMeal?.observation || '');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Update local state when existingMeal changes
  useEffect(() => {
    if (existingMeal) {
      setPreviewImage(existingMeal.menuImage || '');
      setConsumption(existingMeal.consumption || 'NADA');
      setObservation(existingMeal.observation || '');
    } else {
      setPreviewImage('');
      setConsumption('NADA');
      setObservation('');
    }
  }, [existingMeal]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMenuImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('idle');
    try {
      let imageUrl = previewImage;
      if (menuImage) {
        const formData = new FormData();
        formData.append('file', menuImage);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          imageUrl = url;
        }
      }

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          date: new Date().toLocaleDateString('en-CA'),
          menuText: globalMenu || existingMeal?.menuText || 'Menú General',
          menuImage: imageUrl,
          consumption,
          observation
        }),
      });
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus('idle');
          onRefetch();
        }, 800);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const renderConsumptionSelector = () => (
    <div className="meal-selector">
      <span className="selector-label">Nivel de Consumo</span>
      <div className="segmented-control">
        {consumptionOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setConsumption(opt)}
            className={`segment-btn ${consumption === opt ? 'active' : ''}`}
            disabled={loading}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const isRegistered = !!existingMeal;

  return (
    <div className={`glass-panel student-card ${isRegistered ? 'is-registered' : ''}`}>
      <div className="student-header">
        <div className="student-header-info">
          <h3>{student.name}</h3>
          {student.medicalInfo && (
            <div style={{ marginTop: '4px', marginBottom: '8px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
               <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
               <span style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                 {student.medicalInfo}
               </span>
            </div>
          )}
          <div className="student-subheader-info">
            {parentName ? (
              <span className="parent-chip">👤 {parentName}</span>
            ) : (
              <span className="no-parent-chip">Sin apoderado</span>
            )}
            {student.age && <span className="age-chip">🎂 {student.age} años</span>}
          </div>
          {existingMeal?.teacher && (
            <span className="teacher-attribution">
              ✍️ {existingMeal.teacher.fullName || existingMeal.teacher.username}
            </span>
          )}
        </div>
        <div className="header-badges">
          {saveStatus === 'success' && <span className="status-badge success">Guardado</span>}
          {saveStatus === 'error' && <span className="status-badge error">Error</span>}
        </div>
      </div>

      <div className="selectors-container" style={{ gap: '1rem' }}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="selector-label">Foto del Plato (Opcional)</span>
          <input type="file" accept="image/*" onChange={handleImageChange} disabled={loading} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
          {previewImage && <img src={previewImage} alt="Preview" style={{ marginTop: '0.5rem', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />}
        </div>
        {renderConsumptionSelector()}
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="selector-label">Observación</span>
          <textarea className="form-input" placeholder="Comió con dificultad..." value={observation} onChange={(e) => setObservation(e.target.value)} disabled={loading} rows={2} style={{ resize: 'vertical' }} />
        </div>
      </div>

      <div className="card-footer">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`btn-primary save-btn ${saveStatus === 'success' ? 'btn-success' : ''}`}
        >
          {loading ? 'Guardando...' : saveStatus === 'success' ? '¡Guardado!' : isRegistered ? 'Actualizar Registro' : 'Guardar Registro'}
        </button>
        <button className="btn-profile" onClick={() => onEditProfile(student)}>
          Ver Perfil / Ficha 📝
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Parent Card Component (for Apoderados tab)
// ──────────────────────────────────────────────
function ParentCard({
  parent,
  selectedCourse,
  onEdit,
  onDelete,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  deletingId,
  deletingStudentId,
}: {
  parent: Parent;
  selectedCourse: string;
  onEdit: (p: Parent) => void;
  onDelete: (id: string) => void;
  onAddStudent: (parentId: string) => void;
  onEditStudent: (s: ParentStudent) => void;
  onDeleteStudent: (id: string, name: string) => void;
  deletingId: string | null;
  deletingStudentId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);

  const filteredStudents = useMemo(() => {
    if (!selectedCourse) return parent.parentOf;
    return parent.parentOf.filter(s => (s.course === selectedCourse || s.teacher?.course === selectedCourse));
  }, [parent.parentOf, selectedCourse]);

  if (filteredStudents.length === 0 && selectedCourse) return null;

  return (
    <div className="glass-panel parent-card">
      <div className="parent-card-header">
        <div className="parent-card-title">
          <button
            className="expand-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Colapsar' : 'Expandir'}
          >
            {expanded ? '▾' : '▸'}
          </button>
          <span className="parent-username-lg">👤 {parent.fullName || parent.username}</span>
          {parent.email && <span className="parent-email" style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>✉️ {parent.email}</span>}
          {parent.mustChangePassword ? (
            <span className="status-chip chip-warning">Pendiente clave</span>
          ) : (
            <span className="status-chip chip-ok">Activo</span>
          )}
        </div>
        <div className="parent-card-actions">
          <button className="btn-sm btn-edit" onClick={() => onEdit(parent)}>
            ✏️ Editar Apoderado
          </button>
          <button
            className="btn-sm btn-delete"
            onClick={() => onDelete(parent.id)}
            disabled={deletingId === parent.id}
          >
            {deletingId === parent.id ? '...' : '🗑️ Eliminar Apoderado'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="parent-students-section">
          <div className="section-subheader">
            <span className="subheader-title">Alumnos a cargo</span>
            <button className="btn-sm btn-add-mini" onClick={() => onAddStudent(parent.id)}>
              ➕ Agregar Alumno
            </button>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="no-students-msg">Sin alumnos en este filtro</div>
          ) : (
            <div className="parent-students-grid">
              {filteredStudents.map((s) => (
                <div key={s.id} className={`parent-student-card ${s.meals[0] ? 'ps-registered' : ''}`}>
                  <div className="psc-header">
                    <div className="psc-name-group">
                      <span className="psc-name">{s.name}</span>
                      {s.age && <span className="psc-age">{s.age} años</span>}
                    </div>
                    <div className="psc-actions">
                      <button className="btn-icon-mini" title="Editar Alumno" onClick={() => onEditStudent({ ...s, parentId: parent.id })}>
                        ✏️
                      </button>
                      <button 
                        className="btn-icon-mini text-danger" 
                        title="Eliminar Alumno" 
                        onClick={() => onDeleteStudent(s.id, s.name)}
                        disabled={deletingStudentId === s.id}
                      >
                        {deletingStudentId === s.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  </div>

                  <div className="psc-section">
                    <span className="psc-label">📋 Ficha Médica</span>
                    <p className="psc-medical">
                      {s.medicalInfo || <em className="text-muted">Sin información médica registrada.</em>}
                    </p>
                  </div>

                  <div className="psc-section">
                    <span className="psc-label">🍽️ Registro Hoy</span>
                    {s.meals[0] ? (
                      <div className="psc-meals">
                        <div className="psc-meal-row">
                          <span className="psc-meal-label">Menú:</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s.meals[0].menuText || 'No especificado'}</span>
                        </div>
                        <div className="psc-meal-row">
                          <span className="psc-meal-label">Consumo:</span>
                          <span className={`meal-badge ${consumptionColor[s.meals[0].consumption || 'NADA']}`}>
                            {s.meals[0].consumption || 'NADA'}
                          </span>
                        </div>
                        {s.meals[0].observation && (
                          <div className="psc-meal-row" style={{ marginTop: '4px', alignItems: 'flex-start' }}>
                            <span className="psc-meal-label" style={{ flex: 1 }}>Obs:</span>
                            <span style={{ flex: 3, fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'right' }}>{s.meals[0].observation}</span>
                          </div>
                        )}
                        {s.meals[0].menuImage && (
                          <div className="psc-meal-row" style={{ marginTop: '4px', justifyContent: 'flex-end' }}>
                            <img src={s.meals[0].menuImage} alt="Plato" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Sin registro para hoy.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Dashboard Component
// ──────────────────────────────────────────────
export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('registros');
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [globalMenu, setGlobalMenu] = useState('');
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- Student Management modal state ---
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | ParentStudent | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [studentCourse, setStudentCourse] = useState(''); // New
  const [studentMedical, setStudentMedical] = useState('');
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string, name: string } | null>(null);

  // --- Apoderados state ---
  const [showParentModal, setShowParentModal] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [parentFullName, setParentFullName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentError, setParentError] = useState('');
  const [savingParent, setSavingParent] = useState(false);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // --- Historial state ---
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateStr = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFilterFrom(localDateStr(d));
    setFilterTo(localDateStr(new Date()));
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) setCurrentUser(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setStudents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [router]);

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch('/api/parents');
      if (res.ok) setParents(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchMe();
    fetchStudents();
    fetchParents();
  }, [fetchMe, fetchStudents, fetchParents]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ from: filterFrom, to: filterTo });
      if (filterStudent) params.append('studentId', filterStudent);
      const res = await fetch(`/api/meals?${params}`);
      if (res.ok) setHistoryRecords(await res.json());
    } catch (err) { console.error(err); }
    finally { setHistoryLoading(false); }
  }, [filterFrom, filterTo, filterStudent]);

  useEffect(() => {
    if (activeTab === 'historial' && mounted) fetchHistory();
  }, [activeTab, fetchHistory, mounted]);

  const handleLogout = () => {
    document.cookie = 'userId=; Max-Age=0; path=/;';
    document.cookie = 'userRole=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const courses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { 
      if (s.course) set.add(s.course);
      else if (s.teacher?.course) set.add(s.teacher.course); 
    });
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!selectedCourse) return students;
    return students.filter(s => (s.course === selectedCourse || s.teacher?.course === selectedCourse));
  }, [students, selectedCourse]);

  // --- Student CRUD Actions ---
  const openNewStudentModal = (parentId?: string | null) => {
    setStudentToEdit(null);
    setStudentName('');
    setStudentAge('');
    setStudentCourse('');
    setStudentMedical('');
    setTargetParentId(parentId || null);
    setStudentError('');
    setShowStudentModal(true);
  };

  const openEditStudentModal = (s: Student | ParentStudent) => {
    setStudentToEdit(s);
    setStudentName(s.name);
    setStudentAge(s.age?.toString() || '');
    setStudentCourse(s.course || '');
    setStudentMedical(s.medicalInfo || '');
    setTargetParentId(s.parentId || null);
    setStudentError('');
    setShowStudentModal(true);
  };

  const handleSaveStudent = async () => {
    if (!studentName.trim()) { setStudentError('El nombre es requerido.'); return; }
    setSavingStudent(true);
    try {
      const body = {
        name: studentName,
        age: studentAge ? parseInt(studentAge) : null,
        course: studentCourse || null,
        medicalInfo: studentMedical,
        parentId: targetParentId
      };
      const url = studentToEdit ? `/api/students/${studentToEdit.id}` : '/api/students';
      const method = studentToEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowStudentModal(false);
        fetchStudents();
        fetchParents();
      } else {
        const data = await res.json();
        setStudentError(data.error || 'Error al guardar');
      }
    } catch {
      setStudentError('Error de conexión');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeletingStudentId(studentToDelete.id);
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteModal(false);
        setStudentToDelete(null);
        fetchStudents();
        fetchParents();
      } else {
        alert('Error al eliminar estudiante.');
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const openDeleteModal = (id: string, name: string) => {
    setStudentToDelete({ id, name });
    setShowDeleteModal(true);
  };

  // --- Parent Actions ---
  const openNewParentModal = () => {
    setEditingParent(null);
    setParentFullName('');
    setParentEmail('');
    setParentPassword('');
    setParentError('');
    setSelectedStudentIds([]);
    setStudentName('');
    setStudentAge('');
    setStudentCourse('');
    setStudentMedical('');
    setShowParentModal(true);
  };

  const openEditParentModal = (p: Parent) => {
    setEditingParent(p);
    setParentFullName(p.fullName || p.username);
    setParentEmail(p.email || '');
    setParentPassword('');
    setParentError('');
    setSelectedStudentIds(p.parentOf.map((s) => s.id));
    setShowParentModal(true);
  };

  const handleSaveParent = async () => {
    if (!parentFullName.trim()) { setParentError('El usuario es requerido.'); return; }
    if (!editingParent && !parentPassword) { setParentError('La contraseña es requerida.'); return; }
    if (!editingParent && !studentName.trim()) { setParentError('El nombre del alumno es requerido.'); return; }
    setSavingParent(true);
    try {
      const body: any = { fullName: parentFullName, email: parentEmail || undefined, studentIds: selectedStudentIds };
      if (parentPassword) body.password = parentPassword;
      const url = editingParent ? `/api/parents/${editingParent.id}` : '/api/parents';
      const method = editingParent ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const parentData = await res.json();
        if (!editingParent && studentName.trim()) {
          await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: studentName,
              age: studentAge ? parseInt(studentAge) : null,
              course: studentCourse || null,
              medicalInfo: studentMedical,
              parentId: parentData.id
            })
          });
        }
        setShowParentModal(false);
        fetchParents();
        fetchStudents();
      } else {
        const data = await res.json();
        setParentError(data.error || 'Error al guardar');
      }
    } catch { setParentError('Error de conexión.'); }
    finally { setSavingParent(false); }
  };

  const handleDeleteParent = async (id: string) => {
    if (!confirm('¿Eliminar este apoderado? Los alumnos vinculados quedarán sin apoderado.')) return;
    setDeletingParentId(id);
    try {
      await fetch(`/api/parents/${id}`, { method: 'DELETE' });
      fetchParents();
      fetchStudents();
    } catch (err) { console.error(err); }
    finally { setDeletingParentId(null); }
  };

  const handleExportHistory = () => {
    if (historyRecords.length === 0) return;
    const headers = ['Fecha', 'Alumno', 'Menú', 'Consumo', 'Observación'];
    const rows = historyRecords.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.student.name,
      r.menuText || '-',
      r.consumption || r.mainCourse || 'NADA',
      r.observation || '-'
    ]);
    exportToCSV(`historial_comidas_${new Date().toLocaleDateString()}.csv`, headers, rows);
  };

  const getParentName = (parentId?: string | null) => {
    if (!parentId) return undefined;
    return parents.find((p) => p.id === parentId)?.username;
  };



  if (loading) return <div className="page-container">Cargando panel...</div>;

  return (
    <div className="page-container dashboard-container">
      <header className="dashboard-header" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem' }}>Hola, {currentUser?.fullName || currentUser?.username || 'Profesor'} 👋</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Registro de Comidas: {mounted ? new Date().toLocaleDateString() : '...'}</p>
        </div>
        
        <div style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          {(courses.length > 0) && (
           <h2 style={{ fontSize: '1.45rem', color: '#c7d2fe', margin: 0, fontWeight: 800, letterSpacing: '0.03em', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))', padding: '0.5rem 1.75rem', borderRadius: '2rem', border: '1px solid rgba(99, 102, 241, 0.4)', ...({ boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)' } as any) }}>
             {selectedCourse ? selectedCourse : (courses.length === 1 ? courses[0] : 'Varios Cursos')}
           </h2>
          )}
        </div>

        <div className="header-actions" style={{ flex: 1, justifyContent: 'flex-end' }}>
          {(activeTab === 'registros' || activeTab === 'apoderados') && courses.length > 1 && (
            <div className="global-filter">
              <label htmlFor="course-select">Filtrar por curso:</label>
              <select 
                id="course-select" 
                className="form-input filter-select" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Todos los cursos</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {activeTab !== 'historial' && (
            <button onClick={openNewParentModal} className="btn-primary" style={{ marginRight: '0.5rem' }}>
              + Nuevo Ingreso
            </button>
          )}
          <button onClick={handleLogout} className="btn-outline">Cerrar Sesión</button>
        </div>
      </header>

      <nav className="tab-nav">
        <button className={`tab-btn ${activeTab === 'registros' ? 'active' : ''}`} onClick={() => setActiveTab('registros')}>📋 Registros</button>
        <button className={`tab-btn ${activeTab === 'apoderados' ? 'active' : ''}`} onClick={() => setActiveTab('apoderados')}>👥 Apoderados</button>
        <button className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>📅 Historial</button>
      </nav>

      {activeTab === 'registros' && (
        <>
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fcd34d' }}>
              <span style={{ fontSize: '1.4rem' }}>🍲</span> Menú Principal del Día
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Lo que escribas aquí se pre-cargará automáticamente en todos tus alumnos para agilizar tu registro.
            </p>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: Lentejas con ensalada..." 
              value={globalMenu}
              onChange={e => setGlobalMenu(e.target.value)}
              style={{ maxWidth: '400px' }}
            />
          </div>

          <div className="students-grid">
            {filteredStudents.length === 0 ? (
              <div className="empty-state glass-panel"><p>No se encontraron estudiantes con este filtro.</p></div>
            ) : (
              filteredStudents.map(s => (
                <StudentCard key={s.id} student={s} parentName={getParentName(s.parentId)} globalMenu={globalMenu} onEditProfile={openEditStudentModal} onRefetch={() => { fetchStudents(); fetchParents(); }} />
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'apoderados' && (
        <div className="tab-content">
          {parents.length === 0 ? (
            <div className="empty-state glass-panel"><p>No hay apoderados.</p></div>
          ) : (
            <div className="parents-list">
              {parents.map(p => (
                <ParentCard 
                  key={p.id} 
                  parent={p} 
                  selectedCourse={selectedCourse}
                  onEdit={openEditParentModal} 
                  onDelete={handleDeleteParent} 
                  onAddStudent={openNewStudentModal} 
                  onEditStudent={openEditStudentModal} 
                  onDeleteStudent={openDeleteModal} 
                  deletingId={deletingParentId} 
                  deletingStudentId={deletingStudentId} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Historial and Modals follow --- */}
      {activeTab === 'historial' && (
        <div className="tab-content">
          <div className="glass-panel history-filters">
            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.75rem' }}>Desde</label>
              <input type="date" className="form-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.75rem' }}>Hasta</label>
              <input type="date" className="form-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.75rem' }}>Alumno</label>
              <select className="form-input" value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
                <option value="">Todos</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button className="btn-primary" onClick={fetchHistory} disabled={historyLoading}>{historyLoading ? '...' : '🔍 Buscar'}</button>
              <button className="btn-outline" onClick={handleExportHistory} disabled={historyRecords.length === 0} style={{ padding: '0.5rem 1rem' }}>📥 Exportar</button>
            </div>
          </div>

          <div className="data-table-wrapper glass-panel">
            <table className="data-table">
              <thead>
                <tr><th>Fecha</th><th>Alumno</th><th>Menú</th><th>Foto</th><th>Consumo</th><th>Observación</th></tr>
              </thead>
              <tbody>
                {historyRecords.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(r.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.student.name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.menuText || '-'}</td>
                    <td>{r.menuImage ? <img src={r.menuImage} alt="Plato" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} /> : '-'}</td>
                    <td><span className={`meal-badge ${consumptionColor[r.consumption || r.mainCourse || 'NADA']}`}>{r.consumption || r.mainCourse || 'NADA'}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.observation || ''}>{r.observation || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Student Modal --- */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem' }}>{studentToEdit ? `Editar Alumno: ${studentToEdit.name}` : 'Nuevo Alumno'}</h2>
              <button className="close-btn" onClick={() => setShowStudentModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Nombre</label>
                <input type="text" className="form-input" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem' }}>Edad</label>
                  <input type="number" className="form-input" value={studentAge} onChange={(e) => setStudentAge(e.target.value)} placeholder="Años" />
                </div>
                {courses.length > 1 && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem' }}>Curso a registrar</label>
                    <select className="form-input" value={studentCourse} onChange={(e) => setStudentCourse(e.target.value)}>
                      <option value="">Automático</option>
                      {courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {studentToEdit && (
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem' }}>Apoderado</label>
                  <select 
                    className="form-input" 
                    value={targetParentId || ''} 
                    onChange={(e) => setTargetParentId(e.target.value || null)}
                  >
                    <option value="">-- Sin apoderado --</option>
                    {parents.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Info Médica</label>
                <textarea className="form-input medical-textarea" value={studentMedical} onChange={(e) => setStudentMedical(e.target.value)} placeholder="Alergias, etc..." style={{ fontSize: '0.9rem' }} />
              </div>
              {studentError && <div className="error-msg">{studentError}</div>}
              <button className="btn-primary" onClick={handleSaveStudent} disabled={savingStudent}>{savingStudent ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Parent Modal --- */}
      {showParentModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem' }}>{editingParent ? `Editar: ${editingParent.fullName || editingParent.username}` : 'Nuevo Apoderado'}</h2>
              <button className="close-btn" onClick={() => setShowParentModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Nombre del Apoderado (Requerido)</label>
                <input type="text" className="form-input" value={parentFullName} onChange={(e) => setParentFullName(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Correo Electrónico</label>
                <input type="email" className="form-input" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="apoderado@gmail.com" required />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>{editingParent ? 'Nueva Clave (opcional)' : 'Clave'}</label>
                <input type="password" className="form-input" value={parentPassword} onChange={(e) => setParentPassword(e.target.value)} placeholder="*****" />
              </div>
              {editingParent ? (
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem' }}>Alumnos Vinculados</label>
                  <div className="student-selection-list glass-panel">
                    {students.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem', fontStyle: 'italic' }}>
                        Aún no hay alumnos disponibles para vincular.
                      </div>
                    ) : (
                      students.map(s => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        return (
                          <label key={s.id} className={`student-checkbox-item ${isSelected ? 'selected' : ''}`}>
                            <input type="checkbox" style={{ display: 'none' }} checked={isSelected} onChange={(e) => {
                              if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                              else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                            }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span className="student-name-label" style={{ fontSize: '0.95rem', fontWeight: isSelected ? 600 : 400, color: isSelected ? '#a5b4fc' : 'white' }}>
                                {s.name}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Datos del Alumno</h3>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem' }}>Nombre del Alumno (Requerido)</label>
                    <input type="text" className="form-input" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Ej: Carlitos Vidal" />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem' }}>Edad</label>
                      <input type="number" className="form-input" value={studentAge} onChange={(e) => setStudentAge(e.target.value)} placeholder="Años" />
                    </div>
                    {courses.length > 1 && (
                      <div className="form-group">
                        <label style={{ fontSize: '0.85rem' }}>Curso a registrar</label>
                        <select className="form-input" value={studentCourse} onChange={(e) => setStudentCourse(e.target.value)}>
                          <option value="">Automático</option>
                          {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem' }}>Info Médica / Alergias</label>
                    <textarea className="form-input medical-textarea" value={studentMedical} onChange={(e) => setStudentMedical(e.target.value)} placeholder="Ej: Alérgico al maní, intolerante a la lactosa..." style={{ fontSize: '0.9rem' }} />
                  </div>
                </>
              )}
              {parentError && <div className="error-msg">{parentError}</div>}
              <button className="btn-primary" onClick={handleSaveParent} disabled={savingParent}>{savingParent ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem' }}>Confirmar Eliminación</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem' }}>¿Estás seguro de eliminar a <strong>{studentToDelete?.name}</strong>?</p>
              <p className="text-danger" style={{ fontSize: '0.8rem', margin: '0.5rem 0' }}>Esta acción es permanente y borrará todos sus registros de comida.</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <button className="btn-outline" onClick={() => setShowDeleteModal(false)} style={{ flex: 1, fontSize: '0.9rem' }}>Cancelar</button>
                <button className="btn-primary" onClick={handleDeleteStudent} disabled={!!deletingStudentId} style={{ flex: 1, background: '#ef4444', border: 'none', fontSize: '0.9rem' }}>
                  {deletingStudentId ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
