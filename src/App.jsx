import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, Home, Users, Calendar, Settings, FileText, 
  Plus, Edit2, Trash2, Check, AlertCircle, TrendingUp, 
  Award, FileMinus, Moon, VolumeX, Smartphone, Headphones, 
  Gamepad2, MicOff, UserMinus, UserX, Building, Coffee, 
  DoorOpen, Copy, Activity, ShieldAlert, BookOpen, ChevronRight,
  MessageSquare, LogOut, Lock
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, getDoc, 
  addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';

// --- FIREBASE SETUP ---
// Configuração adaptável: tenta usar o __firebase_config da plataforma primeiro, 
// caso contrário, usa as variáveis de ambiente locais do Vite (.env)
let firebaseConfig;
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
} else {
  // Puxando as chaves do arquivo .env (O GitHub não verá mais isso)
  // Usamos um try/catch para evitar erros de compilação em ambientes que não suportam import.meta
  try {
    firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  } catch (e) {
    firebaseConfig = {}; // Configuração vazia como fallback seguro
  }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'escola-gestao';

// --- CONSTANTS & DEFAULTS ---
const DEFAULT_BEHAVIORS = [
  { text: 'Não realizar atividades propostas', icon: 'FileMinus' },
  { text: 'Dormir durante a aula', icon: 'Moon' },
  { text: 'Atrapalhar a aula (conversas/gritos)', icon: 'VolumeX' },
  { text: 'Usar o celular', icon: 'Smartphone' },
  { text: 'Usar fones de ouvido', icon: 'Headphones' },
  { text: 'Acessar jogos', icon: 'Gamepad2' },
  { text: 'Falar palavrões', icon: 'MicOff' },
  { text: 'Desrespeitar colegas', icon: 'Users' },
  { text: 'Desrespeitar o professor(a)', icon: 'UserMinus' },
  { text: 'Postura inadequada', icon: 'UserX' },
  { text: 'Uso indevido da infraestrutura', icon: 'Building' },
  { text: 'Alimentação em locais proibidos', icon: 'Coffee' },
  { text: 'Saídas excessivas da sala', icon: 'DoorOpen' },
  { text: 'Copiar atividades (cola)', icon: 'Copy' },
];

const DEFAULT_ACTIONS = [
  { text: 'Conversa de advertência verbal' },
  { text: 'Mudança de lugar na sala' },
  { text: 'Anotação na agenda/caderno' },
  { text: 'Encaminhamento à coordenação' },
  { text: 'Contato com os responsáveis' },
];

const AVAILABLE_ICONS = [
  'FileMinus', 'Moon', 'VolumeX', 'Smartphone', 'Headphones', 'Gamepad2', 
  'MicOff', 'Users', 'UserMinus', 'UserX', 'Building', 'Coffee', 'DoorOpen', 
  'Copy', 'AlertCircle', 'Activity', 'MessageSquare'
];

// --- HELPER COMPONENTS ---
const IconByName = ({ name, className }) => {
  const icons = {
    FileMinus, Moon, VolumeX, Smartphone, Headphones, Gamepad2, 
    MicOff, Users, UserMinus, UserX, Building, Coffee, DoorOpen, 
    Copy, AlertCircle, Activity, MessageSquare
  };
  const IconComponent = icons[name] || AlertCircle;
  return <IconComponent className={className} />;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

const Thermometer = ({ score }) => {
  let color = 'bg-emerald-500';
  let label = 'Excelente';
  let width = '10%';

  if (score > 0 && score <= 3) {
    color = 'bg-amber-400';
    label = 'Atenção';
    width = '40%';
  } else if (score > 3 && score <= 7) {
    color = 'bg-orange-500';
    label = 'Preocupante';
    width = '70%';
  } else if (score > 7) {
    color = 'bg-rose-600';
    label = 'Crítico';
    width = '100%';
  }

  return (
    <div className="flex items-center gap-2 w-full max-w-xs">
      <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width }} />
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${color} text-white`}>
        {label} ({score})
      </span>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null); // 'pendente', 'aprovado'
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth Form States
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Data States
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [records, setRecords] = useState([]);
  const [studentActions, setStudentActions] = useState([]);

  // Setup Auth & Status Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Check if teacher is approved
        const docRef = doc(db, 'professores', u.uid);
        
        // Listen to changes in real-time so if admin approves, it updates instantly
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setApprovalStatus(docSnap.data().status);
          } else {
            setApprovalStatus('pendente'); // Failsafe
          }
          setAuthLoading(false);
        });
        
        return () => unsubDoc();
      } else {
        setUser(null);
        setApprovalStatus(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data (Only if approved)
  useEffect(() => {
    if (!user || approvalStatus !== 'aprovado') return;

    const basePath = (collectionName) => collection(db, 'artifacts', appId, 'users', user.uid, collectionName);

    const unsubClasses = onSnapshot(basePath('classes'), (snap) => setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubStudents = onSnapshot(basePath('students'), (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubRecords = onSnapshot(basePath('records'), (snap) => setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubStudentActions = onSnapshot(basePath('studentActions'), (snap) => setStudentActions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubBehaviors = onSnapshot(basePath('behaviors'), async (snap) => {
      if (snap.docs.length === 0) {
        for (const b of DEFAULT_BEHAVIORS) await addDoc(basePath('behaviors'), b);
      } else {
        setBehaviors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });

    const unsubActionTypes = onSnapshot(basePath('actionTypes'), async (snap) => {
      if (snap.docs.length === 0) {
        for (const a of DEFAULT_ACTIONS) await addDoc(basePath('actionTypes'), a);
      } else {
        setActionTypes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });

    return () => {
      unsubClasses(); unsubStudents(); unsubBehaviors(); 
      unsubActionTypes(); unsubRecords(); unsubStudentActions();
    };
  }, [user, approvalStatus]);

  // Auth Functions
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Create User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save initial pending status
        await setDoc(doc(db, 'professores', userCredential.user.uid), {
          nome: nome,
          email: email,
          status: 'pendente',
          dataCadastro: new Date().toISOString()
        });
      }
    } catch (error) {
      let msg = 'Erro na autenticação.';
      if (error.code === 'auth/email-already-in-use') msg = 'Email já cadastrado.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') msg = 'Email ou senha incorretos.';
      if (error.code === 'auth/weak-password') msg = 'A senha deve ter pelo menos 6 caracteres.';
      if (error.code === 'auth/invalid-credential') msg = 'Credenciais inválidas.';
      setAuthError(msg);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- RENDER CONDITIONALS ---
  if (authLoading) return <div className="flex items-center justify-center h-screen bg-slate-100 font-medium text-slate-500">Iniciando sistema...</div>;

  // Render Login/Register Screen
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-xl shadow-md"><Activity size={32} className="text-white" /></div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Gestão Comportamental</h1>
          <p className="text-center text-slate-500 mb-8">{isLogin ? 'Faça login para continuar' : 'Crie sua conta de professor'}</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input 
                  type="text" required value={nome} onChange={e=>setNome(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Escolar</label>
              <input 
                type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input 
                type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {authError && <p className="text-sm text-rose-600 font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
              {isLogin ? 'Entrar no Sistema' : 'Solicitar Cadastro'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? 'Não tem uma conta? ' : 'Já possui conta? '}
            <button onClick={() => {setIsLogin(!isLogin); setAuthError('');}} className="text-blue-600 font-semibold hover:underline">
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Pending Screen
  if (approvalStatus === 'pendente') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-sans text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 flex flex-col items-center">
          <div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-4">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600 mb-8">Sua conta foi criada e está <strong>aguardando aprovação</strong> da coordenação escolar. Você terá acesso assim que seu cadastro for validado.</p>
          <button onClick={handleLogout} className="text-slate-500 font-medium hover:text-slate-800 flex items-center gap-2">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>
    );
  }

  // --- VIEWS (Only accessible if approved) ---
  const dbRef = (col) => collection(db, 'artifacts', appId, 'users', user.uid, col);

  const DashboardView = () => {
    const totalClasses = classes.length;
    const totalStudents = students.length;
    const totalRecords = records.length;
    
    const studentStats = useMemo(() => {
      return students.map(student => {
        const studentRecords = records.filter(r => r.studentId === student.id && r.present);
        let negativeCount = 0;
        studentRecords.forEach(r => { negativeCount += (r.behaviors || []).length; });
        return { 
          ...student, 
          negativeCount, 
          daysPresent: studentRecords.length,
          className: classes.find(c => c.id === student.classId)?.name || 'Desconhecida'
        };
      }).sort((a, b) => b.negativeCount - a.negativeCount);
    }, [students, records, classes]);

    const positiveHighlights = studentStats.filter(s => s.daysPresent >= 1 && s.negativeCount === 0);
    const criticalStudents = studentStats.filter(s => s.negativeCount > 5).slice(0, 5);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Painel Consolidado</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><BookOpen size={24} /></div>
            <div><p className="text-sm text-slate-500 font-medium">Turmas Ativas</p><p className="text-2xl font-bold text-slate-800">{totalClasses}</p></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-lg"><Users size={24} /></div>
            <div><p className="text-sm text-slate-500 font-medium">Total de Alunos</p><p className="text-2xl font-bold text-slate-800">{totalStudents}</p></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg"><Activity size={24} /></div>
            <div><p className="text-sm text-slate-500 font-medium">Lançamentos Realizados</p><p className="text-2xl font-bold text-slate-800">{totalRecords}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-800">Destaques Positivos</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Alunos com presenças registradas e zero sinalizações negativas.</p>
            {positiveHighlights.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum aluno atende aos critérios ainda.</p>
            ) : (
              <ul className="space-y-3">
                {positiveHighlights.slice(0, 6).map(s => (
                  <li key={s.id} className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-100">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs opacity-75">{s.className}</p>
                    </div>
                    <div className="text-xs bg-emerald-200 px-2 py-1 rounded-full font-medium">
                      {s.daysPresent} aulas sem ocorrências
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-rose-600" />
              <h2 className="text-lg font-bold text-slate-800">Atenção Prioritária</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Alunos com maior volume de sinalizações negativas.</p>
            {criticalStudents.length === 0 ? (
               <p className="text-sm text-slate-400 italic">Nenhum aluno em estado crítico.</p>
            ) : (
              <ul className="space-y-4">
                {criticalStudents.map(s => (
                  <li key={s.id} className="flex flex-col gap-2 p-3 bg-rose-50 text-rose-900 rounded-lg border border-rose-100">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-xs bg-rose-200 text-rose-800 px-2 py-1 rounded-full">{s.className}</span>
                    </div>
                    <Thermometer score={s.negativeCount} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DailyEntryView = () => {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeStudents, setActiveStudents] = useState([]);
    const [dailyData, setDailyData] = useState({});
    const [behaviorModalOpen, setBehaviorModalOpen] = useState(false);
    const [currentStudentForBehavior, setCurrentStudentForBehavior] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (selectedClass) {
        // Filtra alunos da turma e ordena em ordem alfabética
        const classStudents = students
          .filter(s => s.classId === selectedClass)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          
        setActiveStudents(classStudents);
        const existingRecords = records.filter(r => r.classId === selectedClass && r.date === selectedDate);
        
        const initialData = {};
        classStudents.forEach(s => {
          const existing = existingRecords.find(r => r.studentId === s.id);
          if (existing) {
            initialData[s.id] = { present: existing.present, behaviors: existing.behaviors || [], comment: existing.comment || '', recordId: existing.id };
          } else {
            initialData[s.id] = { present: true, behaviors: [], comment: '' };
          }
        });
        setDailyData(initialData);
      } else {
        setActiveStudents([]);
        setDailyData({});
      }
    }, [selectedClass, selectedDate, students, records]);

    const handleSave = async () => {
      if (!selectedClass || !selectedDate) return;
      setSaving(true);
      try {
        for (const studentId of Object.keys(dailyData)) {
          const data = dailyData[studentId];
          const payload = {
            classId: selectedClass,
            date: selectedDate,
            studentId,
            present: data.present,
            behaviors: data.present ? data.behaviors : [],
            comment: data.comment
          };

          if (data.recordId) {
            await updateDoc(doc(dbRef('records'), data.recordId), payload);
          } else {
            await addDoc(dbRef('records'), payload);
          }
        }
        alert('Lançamentos salvos com sucesso!');
      } catch (e) {
        console.error(e);
        alert('Erro ao salvar lançamentos.');
      }
      setSaving(false);
    };

    const toggleBehavior = (behaviorId) => {
      if (!currentStudentForBehavior) return;
      setDailyData(prev => {
        const studentData = prev[currentStudentForBehavior];
        const currentBehaviors = studentData.behaviors;
        const newBehaviors = currentBehaviors.includes(behaviorId) 
          ? currentBehaviors.filter(id => id !== behaviorId)
          : [...currentBehaviors, behaviorId];
        return { ...prev, [currentStudentForBehavior]: { ...studentData, behaviors: newBehaviors } };
      });
    };

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Lançamento de Aulas</h1>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Turma</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Selecione uma turma...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aula</label>
            <input 
              type="date" 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {selectedClass && activeStudents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                    <th className="p-4 font-semibold">Aluno</th>
                    <th className="p-4 font-semibold text-center w-24">Presente</th>
                    <th className="p-4 font-semibold text-center w-40">Comportamentos</th>
                    <th className="p-4 font-semibold">Comentários (Opcional)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map(student => {
                    const data = dailyData[student.id] || { present: true, behaviors: [], comment: '' };
                    return (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-800">{student.name}</td>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            checked={data.present}
                            onChange={(e) => setDailyData(prev => ({...prev, [student.id]: {...prev[student.id], present: e.target.checked}}))}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <button
                            disabled={!data.present}
                            onClick={() => { setCurrentStudentForBehavior(student.id); setBehaviorModalOpen(true); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              !data.present ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                              data.behaviors.length > 0 ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {data.behaviors.length > 0 ? `${data.behaviors.length} Sinalizados` : 'Sinalizar'}
                          </button>
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            placeholder="Ex: Chegou atrasado..."
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                            value={data.comment}
                            disabled={!data.present}
                            onChange={(e) => setDailyData(prev => ({...prev, [student.id]: {...prev[student.id], comment: e.target.value}}))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={handleSave} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Check size={18} />
                {saving ? 'Salvando...' : 'Salvar Lançamentos'}
              </button>
            </div>
          </div>
        )}
        
        <Modal 
          isOpen={behaviorModalOpen} 
          onClose={() => { setBehaviorModalOpen(false); setCurrentStudentForBehavior(null); }}
          title={`Sinalizar: ${activeStudents.find(s => s.id === currentStudentForBehavior)?.name || ''}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
            {behaviors.map(b => {
              const isSelected = dailyData[currentStudentForBehavior]?.behaviors?.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggleBehavior(b.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected 
                      ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    <IconByName name={b.icon} className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium leading-tight">{b.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
            <button onClick={() => { setBehaviorModalOpen(false); setCurrentStudentForBehavior(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
              Concluir
            </button>
          </div>
        </Modal>
      </div>
    );
  };

  const ClassesView = () => {
    const [newClassName, setNewClassName] = useState('');
    const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
    const [newStudentName, setNewStudentName] = useState('');
    const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

    const handleAddClass = async () => {
      if (!newClassName.trim()) return;
      await addDoc(dbRef('classes'), { name: newClassName.trim() });
      setNewClassName('');
    };

    const handleDeleteClass = async (id) => {
      if(confirm('Tem certeza?')) {
        await deleteDoc(doc(dbRef('classes'), id));
        if (selectedClassForStudents === id) setSelectedClassForStudents(null);
      }
    };

    const handleAddStudent = async () => {
      if (!newStudentName.trim() || !selectedClassForStudents) return;
      await addDoc(dbRef('students'), { name: newStudentName.trim(), classId: selectedClassForStudents });
      setNewStudentName('');
    };

    const handleDeleteStudent = async (id) => {
      if(confirm('Remover aluno?')) await deleteDoc(doc(dbRef('students'), id));
    };

    // Ordenação alfabética também aplicada aqui na visualização das turmas
    const classStudents = students
      .filter(s => s.classId === selectedClassForStudents)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const getStudentScore = (studentId) => {
       const studentRecords = records.filter(r => r.studentId === studentId && r.present);
       let negativeCount = 0;
       studentRecords.forEach(r => { negativeCount += (r.behaviors || []).length; });
       return negativeCount;
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Turmas e Alunos</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h2 className="font-semibold text-slate-800 mb-3">Minhas Turmas</h2>
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="Nova turma..." 
                  className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none"
                  value={newClassName} onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddClass()}
                />
                <button onClick={handleAddClass} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus size={20} /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {classes.map(c => (
                <div key={c.id} className={`flex justify-between items-center p-3 mb-1 rounded-lg cursor-pointer ${selectedClassForStudents === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'}`} onClick={() => setSelectedClassForStudents(c.id)}>
                  <span className={`font-medium ${selectedClassForStudents === c.id ? 'text-blue-800' : 'text-slate-700'}`}>{c.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            {selectedClassForStudents ? (
              <>
                <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
                  <h2 className="font-semibold text-slate-800">Alunos</h2>
                  <div className="flex gap-2 w-1/2">
                    <input 
                      type="text" placeholder="Nome..." 
                      className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none"
                      value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                    />
                    <button onClick={handleAddStudent} className="bg-slate-800 text-white px-3 py-2 text-sm rounded-lg">Add</button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classStudents.map(student => (
                      <div key={student.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-3">
                        <div className="flex justify-between">
                          <span className="font-semibold">{student.name}</span>
                          <button onClick={() => handleDeleteStudent(student.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                        </div>
                        <Thermometer score={getStudentScore(student.id)} />
                        <button onClick={() => setSelectedStudentDetail(student)} className="mt-1 w-full py-1.5 bg-slate-100 text-sm font-medium rounded-md flex items-center justify-center gap-2"><FileText size={16} /> Ver Detalhes</button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400"><p>Selecione uma turma.</p></div>
            )}
          </div>
        </div>
        <StudentDetailModal student={selectedStudentDetail} onClose={() => setSelectedStudentDetail(null)} />
      </div>
    );
  };

  const StudentDetailModal = ({ student, onClose }) => {
    const [newAction, setNewAction] = useState('');
    const [selectedActionType, setSelectedActionType] = useState('');

    if (!student) return null;

    const studentRecs = records.filter(r => r.studentId === student.id);
    const presentRecs = studentRecs.filter(r => r.present);
    const actionsForStudent = studentActions.filter(a => a.studentId === student.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let totalNegatives = 0;
    const behaviorCounts = {};
    presentRecs.forEach(r => {
      (r.behaviors || []).forEach(bId => {
        totalNegatives++;
        behaviorCounts[bId] = (behaviorCounts[bId] || 0) + 1;
      });
    });

    const handleAddAction = async () => {
      if (!selectedActionType && !newAction.trim()) return;
      const actionText = selectedActionType ? actionTypes.find(a => a.id === selectedActionType)?.text : newAction.trim();
      await addDoc(dbRef('studentActions'), { studentId: student.id, text: actionText, date: new Date().toISOString() });
      setNewAction(''); setSelectedActionType('');
    };

    return (
      <Modal isOpen={!!student} onClose={onClose} title={`Aluno: ${student.name}`}>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border text-center"><p className="text-sm">Aulas Presente</p><p className="text-2xl font-bold">{presentRecs.length} / {studentRecs.length}</p></div>
            <div className="bg-slate-50 p-4 rounded-lg border text-center"><p className="text-sm">Ocorrências</p><p className="text-2xl font-bold text-rose-600">{totalNegatives}</p></div>
            <div className="bg-slate-50 p-4 rounded-lg border flex flex-col items-center"><p className="text-sm mb-1">Status</p><Thermometer score={totalNegatives} /></div>
          </div>
          {totalNegatives > 0 && (
            <div>
              <h3 className="font-semibold mb-3 border-b pb-2">Comportamentos</h3>
              <div className="space-y-2">
                {Object.entries(behaviorCounts).sort((a,b)=>b[1]-a[1]).map(([bId, count]) => {
                  const b = behaviors.find(x => x.id === bId);
                  if(!b) return null;
                  return <div key={bId} className="flex justify-between p-2 bg-slate-50 rounded text-sm"><span>{b.text}</span><span className="font-bold bg-slate-200 px-2 rounded">{count}x</span></div>
                })}
              </div>
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-3 border-b pb-2">Histórico Relevante</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {presentRecs.filter(r => (r.behaviors?.length > 0) || r.comment).map(r => (
                <div key={r.id} className="p-3 border rounded-lg text-sm">
                  <div className="font-semibold mb-1">{new Date(r.date).toLocaleDateString('pt-BR')}</div>
                  {r.behaviors?.map(bId => <span key={bId} className="bg-rose-100 text-rose-800 text-[10px] px-1 rounded mr-1">{behaviors.find(x=>x.id===bId)?.text}</span>)}
                  {r.comment && <p className="italic mt-1">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><ShieldAlert size={18} /> Intervenções</h3>
            <div className="flex gap-2 mb-4">
              <select className="flex-1 p-2 text-sm border rounded outline-none" value={selectedActionType} onChange={e => setSelectedActionType(e.target.value)}>
                <option value="">Selecione uma ação padrão...</option>
                {actionTypes.map(a => <option key={a.id} value={a.id}>{a.text}</option>)}
              </select>
              <button onClick={handleAddAction} className="bg-blue-600 text-white px-4 rounded text-sm">Registrar</button>
            </div>
            <div className="space-y-2">
              {actionsForStudent.map(a => <div key={a.id} className="bg-white p-2 rounded border text-sm flex justify-between"><span>{a.text}</span><span className="text-slate-400 text-xs">{new Date(a.date).toLocaleDateString('pt-BR')}</span></div>)}
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  const SettingsView = () => {
    const [newBehaviorText, setNewBehaviorText] = useState('');
    const [newBehaviorIcon, setNewBehaviorIcon] = useState('AlertCircle');
    const [newActionText, setNewActionText] = useState('');

    const handleAddBehavior = async () => {
      if (!newBehaviorText.trim()) return;
      await addDoc(dbRef('behaviors'), { text: newBehaviorText.trim(), icon: newBehaviorIcon });
      setNewBehaviorText('');
    };

    const handleAddActionType = async () => {
      if (!newActionText.trim()) return;
      await addDoc(dbRef('actionTypes'), { text: newActionText.trim() });
      setNewActionText('');
    };

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-lg mb-4 border-b pb-2">Comportamentos Negativos</h2>
            <div className="flex flex-col gap-2 mb-4 bg-slate-50 p-3 rounded-lg border">
              <input type="text" placeholder="Descreva..." className="p-2 text-sm border rounded" value={newBehaviorText} onChange={e => setNewBehaviorText(e.target.value)} />
              <div className="flex gap-2 items-center">
                <select className="flex-1 p-2 text-sm border rounded" value={newBehaviorIcon} onChange={e => setNewBehaviorIcon(e.target.value)}>
                  {AVAILABLE_ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                </select>
                <button onClick={handleAddBehavior} className="bg-slate-800 text-white px-4 py-2 rounded text-sm">Add</button>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {behaviors.map(b => <div key={b.id} className="flex justify-between p-2 border rounded"><span className="text-sm">{b.text}</span><button onClick={()=>deleteDoc(doc(dbRef('behaviors'),b.id))} className="text-rose-500"><Trash2 size={16}/></button></div>)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-lg mb-4 border-b pb-2">Ações Padrão</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Nova ação..." className="flex-1 p-2 text-sm border rounded" value={newActionText} onChange={e => setNewActionText(e.target.value)} />
              <button onClick={handleAddActionType} className="bg-slate-800 text-white px-4 py-2 rounded text-sm">Add</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {actionTypes.map(a => <div key={a.id} className="flex justify-between p-3 border rounded text-sm"><span>{a.text}</span><button onClick={()=>deleteDoc(doc(dbRef('actionTypes'),a.id))} className="text-rose-500"><Trash2 size={16}/></button></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 hidden md:flex">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg"><Activity size={24} /></div>
          <span className="font-bold text-lg leading-tight">Gestão<br/>Comportamental</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><TrendingUp size={20} /> Dashboard</button>
          <button onClick={() => setActiveTab('daily')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'daily' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Calendar size={20} /> Lançamentos</button>
          <button onClick={() => setActiveTab('classes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'classes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Users size={20} /> Turmas e Alunos</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Settings size={20} /> Configurações</button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 text-sm text-slate-400 hover:text-white py-2">
             <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 flex justify-between items-center z-20 shadow-md">
         <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          <span className="font-bold text-sm">Gestão Comportamental</span>
        </div>
        <select className="bg-slate-800 border-none text-sm p-2 rounded outline-none" value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
          <option value="dashboard">Dashboard</option>
          <option value="daily">Lançamentos</option>
          <option value="classes">Turmas</option>
          <option value="settings">Config</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 pt-16 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'daily' && <DailyEntryView />}
          {activeTab === 'classes' && <ClassesView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </div>
    </div>
  );
}