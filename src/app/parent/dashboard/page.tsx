'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import './parent.css';

type ConsumptionLevel = 'NADA' | 'POCO' | 'TODO';

interface UserInfo {
  id: string;
  username: string;
  fullName: string | null;
}

interface MealRecord {
  id: string;
  date: string;
  menuText?: string | null;
  menuImage?: string | null;
  consumption?: ConsumptionLevel | string | null;
  observation?: string | null;
  // Legacy
  mainCourse?: string;
  salad?: string;
  dessert?: string;
}

interface Student {
  id: string;
  name: string;
  medicalInfo?: string | null;
}

const levelToNumeric = (level?: string | null) => {
  switch (level) {
    case 'NADA': return 0;
    case 'POCO': return 50;
    case '1/4': return 25; // Legacy
    case '1/2': return 50; // Legacy
    case 'TODO': return 100;
    default: return 0;
  }
};

const consumptionColor: Record<string, string> = {
  'NADA': 'badge-none',
  'POCO': 'badge-quarter',
  '1/4': 'badge-quarter',
  '1/2': 'badge-half',
  'TODO': 'badge-full',
};

const COLORS = ['#4ade80', '#facc15', '#f87171']; // TODO, POCO/1-2, NADA

export default function ParentDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMe();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchMeals(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) setCurrentUser(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setStudents(data);
      if (data.length > 0) {
        setSelectedStudentId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeals = async (studentId: string) => {
    try {
      const res = await fetch(`/api/meals?studentId=${studentId}`);
      if (res.ok) {
        setMeals(await res.json());
      }
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    document.cookie = 'userId=; Max-Age=0; path=/;';
    document.cookie = 'userRole=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Line Chart Data
  const trendData = [...meals].reverse().slice(-14).map(m => {
    const d = new Date(m.date);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); // Fix weird day offsets
    return {
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      Consumo: levelToNumeric(m.consumption || m.mainCourse)
    };
  });

  // Pie Chart Data
  const pieData = [
    { name: 'Todo', value: 0 },
    { name: 'Poco/Mitad', value: 0 },
    { name: 'Nada', value: 0 }
  ];
  meals.forEach(m => {
    const val = m.consumption || m.mainCourse;
    if (val === 'TODO') pieData[0].value++;
    else if (val === 'POCO' || val === '1/2' || val === '1/4') pieData[1].value++;
    else if (val === 'NADA') pieData[2].value++;
  });
  
  const activePieData = pieData.filter(d => d.value > 0);

  const averageConsumption = meals.slice(0, 7).reduce((acc, m) => acc + levelToNumeric(m.consumption || m.mainCourse), 0) / (Math.min(meals.length, 7) || 1);

  if (loading) return <div className="page-container">Cargando...</div>;

  return (
    <div className="page-container dashboard-container">
      <header className="dashboard-header" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem' }}>Hola, {currentUser?.fullName || currentUser?.username || 'Apoderado'} 👋</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Monitorea el consumo nutricional de tu hijo/a</p>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="btn-outline">Cerrar Sesión</button>
        </div>
      </header>

      {students.length === 0 ? (
        <div className="empty-state glass-panel">
          <p>No hay estudiantes asignados a tu cuenta. Por favor contacta al profesor.</p>
        </div>
      ) : (
        <div className="content-layout">
          {/* Top Bar with Selector and Stats */}
          <div className="dashboard-top-row">
            <div className="student-selector">
              <span className="label">Alumno Seleccionado:</span>
              <div className="segmented-control student-tabs">
                {students.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`segment-btn ${selectedStudentId === s.id ? 'active' : ''}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {meals.length > 0 && (
              <div className="stats-cards">
                <div className="glass-panel summary-card">
                  <div className="summary-label">Promedio Plato Principal (7 días)</div>
                  <div className="summary-value">{Math.round(averageConsumption)}%</div>
                  <div className="summary-bar-track">
                    <div className="summary-bar-fill" style={{ width: `${averageConsumption}%` }}></div>
                  </div>
                </div>
                <div className="glass-panel summary-card" style={{ minWidth: '150px' }}>
                  <div className="summary-label">Registros Totales</div>
                  <div className="summary-value" style={{ color: '#a5b4fc' }}>{meals.length}</div>
                </div>
              </div>
            )}
          </div>

          <div className="charts-grid">
            {/* Trend Chart */}
            <div className="glass-panel chart-panel">
              <h3 className="section-title">📉 Tendencia de Consumo (Últimos 14 días)</h3>
              {trendData.length > 0 ? (
                <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(99, 102, 241, 0.3)', borderRadius: '8px', color: 'white', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: 'white' }} 
                        formatter={(val) => [`${val}%`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                      <Line type="monotone" name="Consumo General" dataKey="Consumo" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#818cf8', stroke: 'white', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state"><p>No hay suficientes datos para generar tendencia.</p></div>
              )}
            </div>

            {/* Pie Chart */}
            <div className="glass-panel chart-panel">
              <h3 className="section-title">Distribución de Consumo (Histórico Total)</h3>
              {activePieData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={activePieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                        {activePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[pieData.findIndex(p => p.name === entry.name)]} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                         formatter={(val) => [`${val} días`, '']}
                         contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: 'white' }} 
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                 <div className="empty-state"><p>Sin datos registrados aún.</p></div>
              )}
            </div>
          </div>

          <div className="info-bottom-grid">
            <div className="glass-panel medical-info-card">
              <h3 className="card-title">📝 Ficha Médica</h3>
              <div className="medical-content">
                {selectedStudent?.medicalInfo ? (
                  <p>{selectedStudent.medicalInfo}</p>
                ) : (
                  <p className="no-info">No hay información médica registrada para este estudiante.</p>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>📋 Historial Reciente</h3>
              <div className="data-table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {meals.length === 0 ? (
                  <p className="no-info">No hay historial disponible.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Menú</th>
                        <th>Foto</th>
                        <th>Consumo</th>
                        <th>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meals.slice(0, 10).map((m) => (
                        <tr key={m.id}>
                          <td>{new Date(m.date).toLocaleDateString('es-CL')}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.menuText || '-'}</td>
                          <td>{m.menuImage ? <img src={m.menuImage} alt="Plato" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} /> : '-'}</td>
                          <td><span className={`meal-badge ${consumptionColor[m.consumption || m.mainCourse || 'NADA']}`}>{m.consumption || m.mainCourse || 'NADA'}</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.observation || ''}>{m.observation || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
