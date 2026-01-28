-- First, clear existing exercises (optional - comment out if you want to keep existing)
DELETE FROM "WorkoutExercise";
DELETE FROM "Exercise";
DELETE FROM "Muscle";

-- =============================================
-- SEED MUSCLES
-- =============================================
INSERT INTO "Muscle" (id, name, side, description) VALUES
-- Front body muscles
('muscle-chest', 'Chest', 'front', 'Pectoralis major and minor'),
('muscle-front-delts', 'Front Deltoids', 'front', 'Anterior deltoid'),
('muscle-side-delts', 'Side Deltoids', 'front', 'Lateral deltoid'),
('muscle-biceps', 'Biceps', 'front', 'Biceps brachii'),
('muscle-forearms', 'Forearms', 'front', 'Forearm flexors and extensors'),
('muscle-abs', 'Abs', 'front', 'Rectus abdominis'),
('muscle-obliques', 'Obliques', 'front', 'External and internal obliques'),
('muscle-quads', 'Quadriceps', 'front', 'Quadriceps femoris'),
('muscle-hip-flexors', 'Hip Flexors', 'front', 'Iliopsoas and related muscles'),
('muscle-adductors', 'Adductors', 'front', 'Inner thigh muscles'),
('muscle-tibialis', 'Tibialis Anterior', 'front', 'Front of shin'),
-- Back body muscles
('muscle-traps', 'Trapezius', 'back', 'Upper, middle, and lower trapezius'),
('muscle-rear-delts', 'Rear Deltoids', 'back', 'Posterior deltoid'),
('muscle-lats', 'Lats', 'back', 'Latissimus dorsi'),
('muscle-rhomboids', 'Rhomboids', 'back', 'Rhomboid major and minor'),
('muscle-lower-back', 'Lower Back', 'back', 'Erector spinae'),
('muscle-triceps', 'Triceps', 'back', 'Triceps brachii'),
('muscle-glutes', 'Glutes', 'back', 'Gluteus maximus, medius, and minimus'),
('muscle-hamstrings', 'Hamstrings', 'back', 'Biceps femoris, semitendinosus, semimembranosus'),
('muscle-calves', 'Calves', 'back', 'Gastrocnemius and soleus'),
('muscle-neck', 'Neck', 'back', 'Sternocleidomastoid and neck extensors')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, side = EXCLUDED.side, description = EXCLUDED.description;

-- =============================================
-- SEED EXERCISES
-- =============================================

-- CHEST EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-barbell-bench-press', 'Barbell Bench Press', 'muscle-chest', 'barbell', 'intermediate'),
('ex-dumbbell-bench-press', 'Dumbbell Bench Press', 'muscle-chest', 'dumbbell', 'beginner'),
('ex-incline-bench-press', 'Incline Bench Press', 'muscle-chest', 'barbell', 'intermediate'),
('ex-decline-bench-press', 'Decline Bench Press', 'muscle-chest', 'barbell', 'intermediate'),
('ex-chest-fly', 'Chest Fly', 'muscle-chest', 'dumbbell', 'beginner'),
('ex-push-ups', 'Push-ups', 'muscle-chest', 'bodyweight', 'beginner'),
('ex-cable-crossovers', 'Cable Crossovers', 'muscle-chest', 'cable', 'intermediate'),
('ex-pec-deck', 'Pec Deck Machine', 'muscle-chest', 'machine', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- BACK EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-pull-ups', 'Pull-ups', 'muscle-lats', 'bodyweight', 'intermediate'),
('ex-chin-ups', 'Chin-ups', 'muscle-lats', 'bodyweight', 'intermediate'),
('ex-lat-pulldown', 'Lat Pulldown', 'muscle-lats', 'cable', 'beginner'),
('ex-barbell-rows', 'Barbell Rows', 'muscle-lats', 'barbell', 'intermediate'),
('ex-dumbbell-rows', 'Dumbbell Rows', 'muscle-lats', 'dumbbell', 'beginner'),
('ex-t-bar-rows', 'T-Bar Rows', 'muscle-lats', 'barbell', 'intermediate'),
('ex-seated-cable-rows', 'Seated Cable Rows', 'muscle-lats', 'cable', 'beginner'),
('ex-deadlifts', 'Deadlifts', 'muscle-lower-back', 'barbell', 'advanced'),
('ex-face-pulls', 'Face Pulls', 'muscle-rear-delts', 'cable', 'beginner'),
('ex-back-extensions', 'Back Extensions', 'muscle-lower-back', 'bodyweight', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- SHOULDER EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-overhead-barbell-press', 'Overhead Barbell Press', 'muscle-front-delts', 'barbell', 'intermediate'),
('ex-dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'muscle-front-delts', 'dumbbell', 'beginner'),
('ex-lateral-raises', 'Lateral Raises', 'muscle-side-delts', 'dumbbell', 'beginner'),
('ex-front-raises', 'Front Raises', 'muscle-front-delts', 'dumbbell', 'beginner'),
('ex-rear-delt-fly', 'Rear Delt Fly', 'muscle-rear-delts', 'dumbbell', 'beginner'),
('ex-arnold-press', 'Arnold Press', 'muscle-front-delts', 'dumbbell', 'intermediate'),
('ex-shrugs', 'Shrugs', 'muscle-traps', 'dumbbell', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- BICEPS EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-barbell-curl', 'Barbell Curl', 'muscle-biceps', 'barbell', 'beginner'),
('ex-dumbbell-curl', 'Dumbbell Curl', 'muscle-biceps', 'dumbbell', 'beginner'),
('ex-hammer-curl', 'Hammer Curl', 'muscle-biceps', 'dumbbell', 'beginner'),
('ex-concentration-curl', 'Concentration Curl', 'muscle-biceps', 'dumbbell', 'beginner'),
('ex-preacher-curl', 'Preacher Curl', 'muscle-biceps', 'barbell', 'beginner'),
('ex-cable-curl', 'Cable Curl', 'muscle-biceps', 'cable', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- TRICEPS EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-triceps-dips', 'Triceps Dips', 'muscle-triceps', 'bodyweight', 'intermediate'),
('ex-close-grip-bench-press', 'Close-Grip Bench Press', 'muscle-triceps', 'barbell', 'intermediate'),
('ex-triceps-pushdown', 'Triceps Pushdown', 'muscle-triceps', 'cable', 'beginner'),
('ex-overhead-triceps-extension', 'Overhead Triceps Extension', 'muscle-triceps', 'dumbbell', 'beginner'),
('ex-skull-crushers', 'Skull Crushers', 'muscle-triceps', 'barbell', 'intermediate'),
('ex-triceps-kickbacks', 'Triceps Kickbacks', 'muscle-triceps', 'dumbbell', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- QUADRICEPS EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-barbell-squats', 'Barbell Squats', 'muscle-quads', 'barbell', 'intermediate'),
('ex-dumbbell-squats', 'Dumbbell Squats', 'muscle-quads', 'dumbbell', 'beginner'),
('ex-bodyweight-squats', 'Bodyweight Squats', 'muscle-quads', 'bodyweight', 'beginner'),
('ex-leg-press', 'Leg Press', 'muscle-quads', 'machine', 'beginner'),
('ex-lunges', 'Lunges', 'muscle-quads', 'bodyweight', 'beginner'),
('ex-step-ups', 'Step-Ups', 'muscle-quads', 'bodyweight', 'beginner'),
('ex-leg-extensions', 'Leg Extensions', 'muscle-quads', 'machine', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- HAMSTRINGS EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-romanian-deadlifts', 'Romanian Deadlifts', 'muscle-hamstrings', 'barbell', 'intermediate'),
('ex-hamstring-curls', 'Hamstring Curls', 'muscle-hamstrings', 'machine', 'beginner'),
('ex-glute-ham-raises', 'Glute-Ham Raises', 'muscle-hamstrings', 'bodyweight', 'advanced'),
('ex-good-mornings', 'Good Mornings', 'muscle-hamstrings', 'barbell', 'intermediate')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- GLUTES EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-hip-thrusts', 'Hip Thrusts', 'muscle-glutes', 'barbell', 'intermediate'),
('ex-glute-bridges', 'Glute Bridges', 'muscle-glutes', 'bodyweight', 'beginner'),
('ex-bulgarian-split-squats', 'Bulgarian Split Squats', 'muscle-glutes', 'dumbbell', 'intermediate'),
('ex-cable-kickbacks', 'Cable Kickbacks', 'muscle-glutes', 'cable', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- CALVES EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-standing-calf-raises', 'Standing Calf Raises', 'muscle-calves', 'machine', 'beginner'),
('ex-seated-calf-raises', 'Seated Calf Raises', 'muscle-calves', 'machine', 'beginner'),
('ex-donkey-calf-raises', 'Donkey Calf Raises', 'muscle-calves', 'machine', 'intermediate')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- CORE / ABS EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-crunches', 'Crunches', 'muscle-abs', 'bodyweight', 'beginner'),
('ex-planks', 'Planks', 'muscle-abs', 'bodyweight', 'beginner'),
('ex-russian-twists', 'Russian Twists', 'muscle-obliques', 'bodyweight', 'beginner'),
('ex-hanging-leg-raises', 'Hanging Leg Raises', 'muscle-abs', 'bodyweight', 'intermediate'),
('ex-bicycle-crunches', 'Bicycle Crunches', 'muscle-abs', 'bodyweight', 'beginner'),
('ex-ab-rollouts', 'Ab Rollouts', 'muscle-abs', 'other', 'intermediate')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- FOREARMS EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-wrist-curls', 'Wrist Curls', 'muscle-forearms', 'dumbbell', 'beginner'),
('ex-reverse-wrist-curls', 'Reverse Wrist Curls', 'muscle-forearms', 'dumbbell', 'beginner'),
('ex-farmers-walk', 'Farmer''s Walk', 'muscle-forearms', 'dumbbell', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- NECK EXERCISES
INSERT INTO "Exercise" (id, name, "primaryMuscleId", equipment, difficulty) VALUES
('ex-neck-flexion-extension', 'Neck Flexion/Extension', 'muscle-neck', 'bodyweight', 'beginner'),
('ex-lateral-neck-raises', 'Lateral Neck Raises', 'muscle-neck', 'bodyweight', 'beginner')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "primaryMuscleId" = EXCLUDED."primaryMuscleId", equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty;

-- =============================================
-- SUMMARY
-- =============================================
-- Total: 21 Muscles, 62 Exercises
--
-- Chest: 8 exercises
-- Back: 10 exercises
-- Shoulders: 7 exercises
-- Biceps: 6 exercises
-- Triceps: 6 exercises
-- Quadriceps: 7 exercises
-- Hamstrings: 4 exercises
-- Glutes: 4 exercises
-- Calves: 3 exercises
-- Core/Abs: 6 exercises
-- Forearms: 3 exercises
-- Neck: 2 exercises
