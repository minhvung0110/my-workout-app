import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Play, 
  Check, 
  Clock, 
  History, 
  ChevronRight, 
  Dumbbell, 
  ArrowLeft,
  Trophy,
  Timer
} from 'lucide-react';
import { Exercise, Routine, WorkoutSession, SetLog, HistoricalSet } from './types';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: any) => {
  const variants: any = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

export default function App() {
  const [view, setView] = useState<'home' | 'create-routine' | 'active-session' | 'summary'>('home');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Session State
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [stopwatch, setStopwatch] = useState(0); // Total session time
  const [restTimer, setRestTimer] = useState(0); // Rest between sets
  const [exerciseStartTime, setExerciseStartTime] = useState<number>(0);
  const [historicalSet, setHistoricalSet] = useState<HistoricalSet | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [routRes, exRes] = await Promise.all([
        fetch('/api/routines'),
        fetch('/api/exercises')
      ]);
      setRoutines(await routRes.json());
      setExercises(await exRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = (routine: Routine) => {
    setActiveRoutine(routine);
    const newSession: WorkoutSession = {
      routineId: routine._id,
      startTime: new Date().toISOString(),
      totalDuration: 0,
      exercises: routine.exercises.map(ex => ({
        exerciseId: ex._id,
        sets: [],
        duration: 0
      }))
    };
    setSession(newSession);
    setStopwatch(0);
    setRestTimer(0);
    setCurrentExerciseIdx(0);
    setExerciseStartTime(Date.now());
    setView('active-session');
    
    // Start timers
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setStopwatch(prev => prev + 1);
      setRestTimer(prev => prev + 1);
    }, 1000);

    fetchHistory(routine.exercises[0]._id, 0);
  };

  const fetchHistory = async (exerciseId: string, setIndex: number) => {
    try {
      const res = await fetch(`/api/history/${exerciseId}/${setIndex}`);
      const data = await res.json();
      setHistoricalSet(data);
    } catch (err) {
      setHistoricalSet(null);
    }
  };

  const logSet = (weight: number, reps: number) => {
    if (!session) return;

    const newSession = { ...session };
    const currentEx = newSession.exercises[currentExerciseIdx];
    
    const newSet: SetLog = {
      weight,
      reps,
      restTime: restTimer,
      timestamp: new Date().toISOString()
    };

    currentEx.sets.push(newSet);
    setSession(newSession);
    
    // Reset rest timer as per requirement
    setRestTimer(0);

    // Fetch history for next set
    fetchHistory(currentEx.exerciseId, currentEx.sets.length);
  };

  const finishExercise = () => {
    if (!session) return;
    const duration = Math.floor((Date.now() - exerciseStartTime) / 1000);
    const newSession = { ...session };
    newSession.exercises[currentExerciseIdx].duration = duration;
    
    if (currentExerciseIdx < activeRoutine!.exercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1);
      setExerciseStartTime(Date.now());
      setSession(newSession);
      fetchHistory(activeRoutine!.exercises[currentExerciseIdx + 1]._id, 0);
    } else {
      finishWorkout(newSession);
    }
  };

  const finishWorkout = async (finalSession: WorkoutSession) => {
    clearInterval(timerRef.current);
    const endTime = new Date().toISOString();
    const completedSession = {
      ...finalSession,
      endTime,
      totalDuration: stopwatch
    };
    
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completedSession)
      });
      setSession(completedSession);
      setView('summary');
    } catch (err) {
      console.error("Error saving session:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Dumbbell className="w-6 h-6" />
            <span>GYMFLOW</span>
          </div>
          {view === 'active-session' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm font-mono bg-zinc-100 px-3 py-1 rounded-full">
                <Timer className="w-4 h-4" />
                {formatTime(stopwatch)}
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Your Routines</h1>
                  <p className="text-zinc-500">Choose a workout to start your session</p>
                </div>
                <Button onClick={() => setView('create-routine')}>
                  <Plus className="w-4 h-4" /> New Routine
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {routines.map(routine => (
                  <Card key={routine._id} className="group cursor-pointer hover:border-zinc-400 transition-colors">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold">{routine.name}</h3>
                        <Button variant="ghost" className="p-2" onClick={() => startWorkout(routine)}>
                          <Play className="w-5 h-5 fill-current" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {routine.exercises.slice(0, 3).map((ex, i) => (
                          <div key={i} className="text-sm text-zinc-500 flex items-center gap-2">
                            <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                            {ex.name}
                          </div>
                        ))}
                        {routine.exercises.length > 3 && (
                          <div className="text-xs text-zinc-400">+{routine.exercises.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'create-routine' && (
            <RoutineCreator 
              exercises={exercises} 
              onCancel={() => setView('home')} 
              onSave={() => { fetchData(); setView('home'); }} 
            />
          )}

          {view === 'active-session' && session && activeRoutine && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 hover:bg-zinc-100 rounded-full">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold">{activeRoutine.name}</h2>
                  <p className="text-zinc-500">Exercise {currentExerciseIdx + 1} of {activeRoutine.exercises.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-zinc-900">
                        {activeRoutine.exercises[currentExerciseIdx].name}
                      </h3>
                      <div className="text-sm font-mono text-zinc-400">
                        Rest: {formatTime(restTimer)}
                      </div>
                    </div>

                    <SetLogger 
                      onLog={logSet} 
                      historicalSet={historicalSet}
                      setIndex={session.exercises[currentExerciseIdx].sets.length}
                    />

                    <div className="mt-8 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Logged Sets</h4>
                      {session.exercises[currentExerciseIdx].sets.map((set, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-zinc-400">SET {i + 1}</span>
                            <span className="font-mono font-bold">{set.weight}kg × {set.reps}</span>
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {set.restTime}s rest
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={finishExercise} className="w-full md:w-auto h-12 px-8">
                      {currentExerciseIdx === activeRoutine.exercises.length - 1 ? 'Finish Workout' : 'Next Exercise'}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="p-4 bg-zinc-900 text-white border-none">
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4">Session Stats</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-2xl font-mono font-bold">{formatTime(stopwatch)}</div>
                        <div className="text-[10px] uppercase opacity-50">Total Time</div>
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-bold">
                          {session.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0)}kg
                        </div>
                        <div className="text-[10px] uppercase opacity-50">Total Volume</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Upcoming</h4>
                    <div className="space-y-3">
                      {activeRoutine.exercises.slice(currentExerciseIdx + 1).map((ex, i) => (
                        <div key={i} className="text-sm flex items-center gap-2 text-zinc-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                          {ex.name}
                        </div>
                      ))}
                      {currentExerciseIdx === activeRoutine.exercises.length - 1 && (
                        <div className="text-sm italic text-zinc-400">No more exercises</div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'summary' && session && (
            <WorkoutSummary session={session} exercises={exercises} onDone={() => setView('home')} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components ---

function RoutineCreator({ exercises, onCancel, onSave }: any) {
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const toggleExercise = (id: string) => {
    setSelectedExercises(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!name || selectedExercises.length === 0) return;
    await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, exercises: selectedExercises })
    });
    onSave();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
      <Card className="p-8 space-y-6">
        <h2 className="text-2xl font-bold">Create Routine</h2>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-500 uppercase">Routine Name</label>
          <input 
            type="text" 
            placeholder="e.g. Push Day" 
            className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        
        <div className="space-y-4">
          <label className="text-sm font-bold text-zinc-500 uppercase">Select Exercises</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
            {exercises.map((ex: any) => (
              <div 
                key={ex._id}
                onClick={() => toggleExercise(ex._id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  selectedExercises.includes(ex._id) 
                    ? 'border-zinc-900 bg-zinc-900 text-white' 
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <span className="text-sm font-medium">{ex.name}</span>
                {selectedExercises.includes(ex._id) && <Check className="w-4 h-4" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Save Routine</Button>
        </div>
      </Card>
    </motion.div>
  );
}

function SetLogger({ onLog, historicalSet, setIndex }: any) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const handleLog = () => {
    if (!weight || !reps) return;
    onLog(parseFloat(weight), parseInt(reps));
    setWeight('');
    setReps('');
  };

  return (
    <div className="space-y-6">
      {historicalSet && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
          <History className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase mb-1">Previous Week (Set {setIndex + 1})</div>
            <div className="text-sm text-amber-800">
              Last time you did <span className="font-bold">{historicalSet.weight}kg × {historicalSet.reps}</span>. 
              Rest time was {historicalSet.restTime}s.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Weight (kg)</label>
          <input 
            type="number" 
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full p-4 text-2xl font-mono font-bold rounded-xl border border-zinc-200 focus:border-zinc-900 outline-none"
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Reps</label>
          <input 
            type="number" 
            value={reps}
            onChange={e => setReps(e.target.value)}
            className="w-full p-4 text-2xl font-mono font-bold rounded-xl border border-zinc-200 focus:border-zinc-900 outline-none"
            placeholder="0"
          />
        </div>
      </div>
      <Button onClick={handleLog} className="w-full h-14 text-lg">
        Log Set {setIndex + 1}
      </Button>
    </div>
  );
}

function WorkoutSummary({ session, exercises, onDone }: any) {
  const totalVolume = session.exercises.reduce((acc: number, ex: any) => 
    acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.weight * s.reps), 0), 0
  );

  const allSets = session.exercises.flatMap((ex: any) => ex.sets);
  const avgRest = allSets.length > 0 
    ? Math.round(allSets.reduce((acc: number, s: any) => acc + s.restTime, 0) / allSets.length)
    : 0;

  const heaviestEx = session.exercises.reduce((prev: any, current: any) => {
    const maxPrev = Math.max(...prev.sets.map((s: any) => s.weight), 0);
    const maxCurr = Math.max(...current.sets.map((s: any) => s.weight), 0);
    return maxCurr > maxPrev ? current : prev;
  });

  const heaviestExName = exercises.find((e: any) => e._id === heaviestEx.exerciseId)?.name || 'N/A';
  const heaviestWeight = Math.max(...heaviestEx.sets.map((s: any) => s.weight), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-zinc-900 text-white rounded-full mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Workout Complete!</h1>
        <p className="text-zinc-500">Great session. Here's how you performed today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <div className="text-3xl font-mono font-bold">{Math.floor(session.totalDuration / 60)}m</div>
          <div className="text-xs font-bold text-zinc-400 uppercase mt-1">Total Time</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-mono font-bold">{avgRest}s</div>
          <div className="text-xs font-bold text-zinc-400 uppercase mt-1">Avg Rest</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-mono font-bold">{totalVolume}kg</div>
          <div className="text-xs font-bold text-zinc-400 uppercase mt-1">Total Volume</div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Heaviest Lift</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{heaviestExName}</div>
            <div className="text-sm text-zinc-500">Max weight lifted</div>
          </div>
          <div className="text-4xl font-mono font-bold">{heaviestWeight}kg</div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-400 uppercase">Exercise Breakdown</h3>
        {session.exercises.map((ex: any, i: number) => {
          const exName = exercises.find((e: any) => e._id === ex.exerciseId)?.name;
          const exVolume = ex.sets.reduce((acc: number, s: any) => acc + (s.weight * s.reps), 0);
          return (
            <div key={i} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl">
              <div>
                <div className="font-bold">{exName}</div>
                <div className="text-xs text-zinc-500">{ex.sets.length} sets • {Math.floor(ex.duration / 60)}m {ex.duration % 60}s</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold">{exVolume}kg</div>
                <div className="text-[10px] text-zinc-400 uppercase">Volume</div>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={onDone} className="w-full h-14 text-lg">Back to Home</Button>
    </motion.div>
  );
}
