export interface Exercise {
  _id: string;
  name: string;
  category: string;
}

export interface Routine {
  _id: string;
  name: string;
  exercises: Exercise[];
}

export interface SetLog {
  weight: number;
  reps: number;
  restTime: number;
  timestamp: string;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  duration: number; // seconds
}

export interface WorkoutSession {
  _id?: string;
  routineId: string;
  startTime: string;
  endTime?: string;
  totalDuration: number;
  exercises: ExerciseLog[];
}

export interface HistoricalSet {
  weight: number;
  reps: number;
  restTime: number;
  date: string;
}
