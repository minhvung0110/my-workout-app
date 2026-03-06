import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// --- Models ---
const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String, // e.g., Chest, Back
});

const routineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }],
});

const setSchema = new mongoose.Schema({
  weight: Number,
  reps: Number,
  restTime: Number, // seconds rested before this set
  timestamp: { type: Date, default: Date.now },
});

const workoutSessionSchema = new mongoose.Schema({
  routineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine' },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  totalDuration: Number, // seconds
  exercises: [{
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
    sets: [setSchema],
    duration: Number, // seconds for this specific exercise
  }],
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const Routine = mongoose.model('Routine', routineSchema);
const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI;
  if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
      .then(() => console.log("Connected to MongoDB"))
      .catch(err => console.error("MongoDB connection error:", err));
  } else {
    console.warn("MONGODB_URI not found in environment variables. Database features will not work.");
  }

  // --- API Routes ---

  // Exercises
  app.get("/api/exercises", async (req, res) => {
    try {
      const exercises = await Exercise.find();
      res.json(exercises);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  app.post("/api/exercises", async (req, res) => {
    try {
      const exercise = new Exercise(req.body);
      await exercise.save();
      res.json(exercise);
    } catch (err) {
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  // Routines
  app.get("/api/routines", async (req, res) => {
    try {
      const routines = await Routine.find().populate('exercises');
      res.json(routines);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch routines" });
    }
  });

  app.post("/api/routines", async (req, res) => {
    try {
      const routine = new Routine(req.body);
      await routine.save();
      res.json(routine);
    } catch (err) {
      res.status(500).json({ error: "Failed to create routine" });
    }
  });

  // Sessions
  app.post("/api/sessions", async (req, res) => {
    try {
      const session = new WorkoutSession(req.body);
      await session.save();
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: "Failed to save session" });
    }
  });

  // History for specific exercise set
  app.get("/api/history/:exerciseId/:setIndex", async (req, res) => {
    try {
      const { exerciseId, setIndex } = req.params;
      const idx = parseInt(setIndex);
      
      // Find the most recent session containing this exercise
      const sessions = await WorkoutSession.find({
        "exercises.exerciseId": exerciseId
      })
      .sort({ startTime: -1 })
      .limit(5); // Look back at last few sessions

      if (!sessions || sessions.length === 0) {
        return res.json(null);
      }

      // Find the specific set in the previous sessions
      // For simplicity, we look for the same exercise and same set index
      for (const session of sessions) {
        const exerciseData = session.exercises.find(e => e.exerciseId.toString() === exerciseId);
        if (exerciseData && exerciseData.sets[idx]) {
          return res.json({
            weight: exerciseData.sets[idx].weight,
            reps: exerciseData.sets[idx].reps,
            restTime: exerciseData.sets[idx].restTime,
            date: session.startTime
          });
        }
      }

      res.json(null);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Seed initial exercises if empty
  const seedExercises = async () => {
    const count = await Exercise.countDocuments();
    if (count === 0) {
      const defaults = [
        { name: "Bench Press", category: "Chest" },
        { name: "Squat", category: "Legs" },
        { name: "Deadlift", category: "Back" },
        { name: "Overhead Press", category: "Shoulders" },
        { name: "Barbell Row", category: "Back" },
        { name: "Pull Ups", category: "Back" },
        { name: "Dips", category: "Chest" },
      ];
      await Exercise.insertMany(defaults);
      console.log("Seeded default exercises");
    }
  };
  if (MONGODB_URI) seedExercises();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
