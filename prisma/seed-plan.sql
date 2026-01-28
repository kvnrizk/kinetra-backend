-- =============================================
-- CREATE 4-WEEK BEGINNER PLAN FOR SARAH JOHNSON
-- =============================================

-- 1. CREATE THE PLAN
INSERT INTO "Plan" (
  id, "trainerId", "clientId", title, description,
  "durationWeeks", "isTemplate", "basePrice", currency,
  "isActive", "createdAt", "updatedAt"
) VALUES (
  'plan-beginner-001',
  'profile-trainer-test-001',
  NULL,
  'Beginner Strength Foundation',
  'A comprehensive 4-week program designed for beginners. Build a solid foundation with full body workouts, focusing on proper form and progressive overload. Perfect for those new to weight training.',
  4,
  true,
  39,
  'USD',
  true,
  NOW(),
  NOW()
);

-- 2. CREATE 4 WEEKS
INSERT INTO "PlanWeek" (id, "planId", "weekNumber", notes) VALUES
('week-001', 'plan-beginner-001', 1, 'Foundation Week - Focus on learning proper form'),
('week-002', 'plan-beginner-001', 2, 'Building Consistency - Increase confidence'),
('week-003', 'plan-beginner-001', 3, 'Progressive Overload - Start adding weight'),
('week-004', 'plan-beginner-001', 4, 'Strength Test - Push your limits');

-- 3. CREATE WORKOUTS (6 different workouts)

-- Workout 1: Full Body Fundamentals
INSERT INTO "Workout" (
  id, "trainerId", "planId", title, description,
  "isPublic", "estimatedMinutes", "orderIndex", "createdAt", "updatedAt"
) VALUES (
  'workout-full-body-fundamentals',
  'profile-trainer-test-001',
  'plan-beginner-001',
  'Full Body Fundamentals',
  'Complete full body workout hitting all major muscle groups. Great for building overall strength.',
  false,
  45,
  0,
  NOW(),
  NOW()
);

-- Workout 2: Upper Body Blast
INSERT INTO "Workout" (
  id, "trainerId", "planId", title, description,
  "isPublic", "estimatedMinutes", "orderIndex", "createdAt", "updatedAt"
) VALUES (
  'workout-upper-body-blast',
  'profile-trainer-test-001',
  'plan-beginner-001',
  'Upper Body Blast',
  'Target your chest, back, shoulders and arms with this upper body focused session.',
  false,
  40,
  1,
  NOW(),
  NOW()
);

-- Workout 3: Lower Body Power
INSERT INTO "Workout" (
  id, "trainerId", "planId", title, description,
  "isPublic", "estimatedMinutes", "orderIndex", "createdAt", "updatedAt"
) VALUES (
  'workout-lower-body-power',
  'profile-trainer-test-001',
  'plan-beginner-001',
  'Lower Body Power',
  'Build strong legs and glutes with squats, lunges and targeted leg exercises.',
  false,
  50,
  2,
  NOW(),
  NOW()
);

-- Workout 4: Push Day Essentials
INSERT INTO "Workout" (
  id, "trainerId", "planId", title, description,
  "isPublic", "estimatedMinutes", "orderIndex", "createdAt", "updatedAt"
) VALUES (
  'workout-push-day-essentials',
  'profile-trainer-test-001',
  'plan-beginner-001',
  'Push Day Essentials',
  'Focus on pushing movements - chest press, shoulder press and triceps work.',
  false,
  40,
  3,
  NOW(),
  NOW()
);

-- Workout 5: Pull Day Basics
INSERT INTO "Workout" (
  id, "trainerId", "planId", title, description,
  "isPublic", "estimatedMinutes", "orderIndex", "createdAt", "updatedAt"
) VALUES (
  'workout-pull-day-basics',
  'profile-trainer-test-001',
  'plan-beginner-001',
  'Pull Day Basics',
  'Train your back and biceps with rows, pulldowns and curls.',
  false,
  40,
  4,
  NOW(),
  NOW()
);

-- Workout 6: Core & Conditioning
INSERT INTO "Workout" (
  id, "trainerId", "planId", title, description,
  "isPublic", "estimatedMinutes", "orderIndex", "createdAt", "updatedAt"
) VALUES (
  'workout-core-conditioning',
  'profile-trainer-test-001',
  'plan-beginner-001',
  'Core & Conditioning',
  'Strengthen your core and improve overall conditioning with this focused session.',
  false,
  30,
  5,
  NOW(),
  NOW()
);

-- 4. ADD EXERCISES TO WORKOUTS

-- Full Body Fundamentals (6 exercises)
INSERT INTO "WorkoutExercise" (id, "workoutId", "exerciseId", name, "orderIndex", sets, reps, "restSeconds", notes) VALUES
('we-fbf-001', 'workout-full-body-fundamentals', 'ex-bodyweight-squats', 'Bodyweight Squats', 0, 3, '12-15', 60, 'Keep chest up, knees tracking over toes'),
('we-fbf-002', 'workout-full-body-fundamentals', 'ex-push-ups', 'Push-ups', 1, 3, '8-12', 60, 'Modify on knees if needed'),
('we-fbf-003', 'workout-full-body-fundamentals', 'ex-dumbbell-rows', 'Dumbbell Rows', 2, 3, '10-12', 60, 'Squeeze shoulder blades together'),
('we-fbf-004', 'workout-full-body-fundamentals', 'ex-lunges', 'Lunges', 3, 3, '10 each leg', 60, 'Take a big step forward'),
('we-fbf-005', 'workout-full-body-fundamentals', 'ex-dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 4, 3, '10-12', 60, 'Press straight overhead'),
('we-fbf-006', 'workout-full-body-fundamentals', 'ex-planks', 'Planks', 5, 3, '30 sec', 45, 'Keep core tight, body straight');

-- Upper Body Blast (7 exercises)
INSERT INTO "WorkoutExercise" (id, "workoutId", "exerciseId", name, "orderIndex", sets, reps, "restSeconds", notes) VALUES
('we-ubb-001', 'workout-upper-body-blast', 'ex-dumbbell-bench-press', 'Dumbbell Bench Press', 0, 3, '10-12', 90, 'Control the weight down slowly'),
('we-ubb-002', 'workout-upper-body-blast', 'ex-lat-pulldown', 'Lat Pulldown', 1, 3, '10-12', 90, 'Pull to upper chest'),
('we-ubb-003', 'workout-upper-body-blast', 'ex-lateral-raises', 'Lateral Raises', 2, 3, '12-15', 60, 'Slight bend in elbows'),
('we-ubb-004', 'workout-upper-body-blast', 'ex-seated-cable-rows', 'Seated Cable Rows', 3, 3, '10-12', 90, 'Squeeze at the contraction'),
('we-ubb-005', 'workout-upper-body-blast', 'ex-dumbbell-curl', 'Dumbbell Curl', 4, 3, '10-12', 60, 'No swinging'),
('we-ubb-006', 'workout-upper-body-blast', 'ex-triceps-pushdown', 'Triceps Pushdown', 5, 3, '12-15', 60, 'Keep elbows pinned to sides'),
('we-ubb-007', 'workout-upper-body-blast', 'ex-face-pulls', 'Face Pulls', 6, 3, '15-20', 60, 'Pull to face level, rotate externally');

-- Lower Body Power (6 exercises)
INSERT INTO "WorkoutExercise" (id, "workoutId", "exerciseId", name, "orderIndex", sets, reps, "restSeconds", notes) VALUES
('we-lbp-001', 'workout-lower-body-power', 'ex-leg-press', 'Leg Press', 0, 4, '10-12', 120, 'Full range of motion'),
('we-lbp-002', 'workout-lower-body-power', 'ex-romanian-deadlifts', 'Romanian Deadlifts', 1, 3, '10-12', 90, 'Feel the stretch in hamstrings'),
('we-lbp-003', 'workout-lower-body-power', 'ex-leg-extensions', 'Leg Extensions', 2, 3, '12-15', 60, 'Squeeze at the top'),
('we-lbp-004', 'workout-lower-body-power', 'ex-hamstring-curls', 'Hamstring Curls', 3, 3, '12-15', 60, 'Control the negative'),
('we-lbp-005', 'workout-lower-body-power', 'ex-glute-bridges', 'Glute Bridges', 4, 3, '15-20', 60, 'Squeeze glutes at top'),
('we-lbp-006', 'workout-lower-body-power', 'ex-standing-calf-raises', 'Standing Calf Raises', 5, 4, '15-20', 45, 'Full stretch and contraction');

-- Push Day Essentials (6 exercises)
INSERT INTO "WorkoutExercise" (id, "workoutId", "exerciseId", name, "orderIndex", sets, reps, "restSeconds", notes) VALUES
('we-pde-001', 'workout-push-day-essentials', 'ex-dumbbell-bench-press', 'Dumbbell Bench Press', 0, 4, '8-10', 90, 'Arch back slightly, feet flat'),
('we-pde-002', 'workout-push-day-essentials', 'ex-incline-bench-press', 'Incline Bench Press', 1, 3, '10-12', 90, 'Focus on upper chest'),
('we-pde-003', 'workout-push-day-essentials', 'ex-dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 2, 3, '10-12', 90, 'Controlled movement'),
('we-pde-004', 'workout-push-day-essentials', 'ex-chest-fly', 'Chest Fly', 3, 3, '12-15', 60, 'Feel the stretch'),
('we-pde-005', 'workout-push-day-essentials', 'ex-lateral-raises', 'Lateral Raises', 4, 3, '12-15', 60, 'Lead with elbows'),
('we-pde-006', 'workout-push-day-essentials', 'ex-triceps-pushdown', 'Triceps Pushdown', 5, 3, '12-15', 60, 'Full extension');

-- Pull Day Basics (6 exercises)
INSERT INTO "WorkoutExercise" (id, "workoutId", "exerciseId", name, "orderIndex", sets, reps, "restSeconds", notes) VALUES
('we-pdb-001', 'workout-pull-day-basics', 'ex-lat-pulldown', 'Lat Pulldown', 0, 4, '8-10', 90, 'Lean back slightly'),
('we-pdb-002', 'workout-pull-day-basics', 'ex-dumbbell-rows', 'Dumbbell Rows', 1, 3, '10-12', 90, 'Pull to hip'),
('we-pdb-003', 'workout-pull-day-basics', 'ex-seated-cable-rows', 'Seated Cable Rows', 2, 3, '10-12', 90, 'Keep back straight'),
('we-pdb-004', 'workout-pull-day-basics', 'ex-face-pulls', 'Face Pulls', 3, 3, '15-20', 60, 'Great for posture'),
('we-pdb-005', 'workout-pull-day-basics', 'ex-barbell-curl', 'Barbell Curl', 4, 3, '10-12', 60, 'Strict form'),
('we-pdb-006', 'workout-pull-day-basics', 'ex-hammer-curl', 'Hammer Curl', 5, 3, '10-12', 60, 'Works brachialis');

-- Core & Conditioning (5 exercises)
INSERT INTO "WorkoutExercise" (id, "workoutId", "exerciseId", name, "orderIndex", sets, reps, "restSeconds", notes) VALUES
('we-cc-001', 'workout-core-conditioning', 'ex-planks', 'Planks', 0, 3, '45 sec', 60, 'Build up duration over time'),
('we-cc-002', 'workout-core-conditioning', 'ex-crunches', 'Crunches', 1, 3, '15-20', 45, 'Exhale on the way up'),
('we-cc-003', 'workout-core-conditioning', 'ex-russian-twists', 'Russian Twists', 2, 3, '20 total', 45, 'Keep feet elevated for challenge'),
('we-cc-004', 'workout-core-conditioning', 'ex-bicycle-crunches', 'Bicycle Crunches', 3, 3, '20 total', 45, 'Touch elbow to opposite knee'),
('we-cc-005', 'workout-core-conditioning', 'ex-glute-bridges', 'Glute Bridges', 4, 3, '15-20', 45, 'Also works lower back');

-- 5. ASSIGN WORKOUTS TO WEEKS (PlanWeekWorkout)

-- WEEK 1: Mon - Full Body, Wed - Upper Body, Fri - Lower Body
INSERT INTO "PlanWeekWorkout" (id, "planWeekId", "workoutId", "dayOfWeek", "orderIndex", notes) VALUES
('pww-w1-mon', 'week-001', 'workout-full-body-fundamentals', 1, 0, 'Start slow, focus on form'),
('pww-w1-wed', 'week-001', 'workout-upper-body-blast', 3, 0, 'Upper body focus'),
('pww-w1-fri', 'week-001', 'workout-lower-body-power', 5, 0, 'Lower body focus');

-- WEEK 2: Mon - Push, Wed - Pull, Fri - Full Body
INSERT INTO "PlanWeekWorkout" (id, "planWeekId", "workoutId", "dayOfWeek", "orderIndex", notes) VALUES
('pww-w2-mon', 'week-002', 'workout-push-day-essentials', 1, 0, 'Push movements'),
('pww-w2-wed', 'week-002', 'workout-pull-day-basics', 3, 0, 'Pull movements'),
('pww-w2-fri', 'week-002', 'workout-full-body-fundamentals', 5, 0, 'Full body to end the week');

-- WEEK 3: Mon - Upper Body, Wed - Lower Body, Fri - Push, Sat - Core
INSERT INTO "PlanWeekWorkout" (id, "planWeekId", "workoutId", "dayOfWeek", "orderIndex", notes) VALUES
('pww-w3-mon', 'week-003', 'workout-upper-body-blast', 1, 0, 'Add more weight this week'),
('pww-w3-wed', 'week-003', 'workout-lower-body-power', 3, 0, 'Progressive overload'),
('pww-w3-fri', 'week-003', 'workout-push-day-essentials', 5, 0, 'Push hard'),
('pww-w3-sat', 'week-003', 'workout-core-conditioning', 6, 0, 'Active recovery with core');

-- WEEK 4: Mon - Pull, Tue - Lower Body, Thu - Push, Sat - Full Body
INSERT INTO "PlanWeekWorkout" (id, "planWeekId", "workoutId", "dayOfWeek", "orderIndex", notes) VALUES
('pww-w4-mon', 'week-004', 'workout-pull-day-basics', 1, 0, 'Final week - give it your all'),
('pww-w4-tue', 'week-004', 'workout-lower-body-power', 2, 0, 'Test your leg strength'),
('pww-w4-thu', 'week-004', 'workout-push-day-essentials', 4, 0, 'Push your limits'),
('pww-w4-sat', 'week-004', 'workout-full-body-fundamentals', 6, 0, 'Finish strong!');

-- =============================================
-- SUMMARY
-- =============================================
-- Plan: Beginner Strength Foundation (4 weeks)
--
-- 6 Unique Workouts:
--   1. Full Body Fundamentals (6 exercises)
--   2. Upper Body Blast (7 exercises)
--   3. Lower Body Power (6 exercises)
--   4. Push Day Essentials (6 exercises)
--   5. Pull Day Basics (6 exercises)
--   6. Core & Conditioning (5 exercises)
--
-- Weekly Schedule:
--   Week 1: 3 days (Mon/Wed/Fri)
--   Week 2: 3 days (Mon/Wed/Fri)
--   Week 3: 4 days (Mon/Wed/Fri/Sat)
--   Week 4: 4 days (Mon/Tue/Thu/Sat)
--
-- Total: 36 exercises across all workouts
