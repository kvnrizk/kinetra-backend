import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('Clearing database...');

  // Delete in order of dependencies
  await prisma.setLog.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.userSetLog.deleteMany();
  await prisma.userWorkoutSession.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.planWeekWorkout.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.planWeek.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.trainerClientRelationship.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.trainerReview.deleteMany();
  await prisma.trainerVideo.deleteMany();
  await prisma.trainerGym.deleteMany();
  await prisma.trainerCertification.deleteMany();
  await prisma.trainerSpecialty.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.bodyMeasurement.deleteMany();
  await prisma.userBodyMetric.deleteMany();
  await prisma.exercisePersonalRecord.deleteMany();
  await prisma.stripePayment.deleteMany();
  await prisma.stripeSubscription.deleteMany();
  await prisma.pricingPlan.deleteMany();
  await prisma.stripeAccount.deleteMany();
  await prisma.whishPayment.deleteMany();
  await prisma.trainerPayout.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.gym.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.trainerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exerciseMuscle.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.muscle.deleteMany();

  console.log('Database cleared!');
}

async function seedMuscles() {
  console.log('Seeding muscles...');

  const musclesData = [
    // Front body muscles
    { id: 'muscle-chest', name: 'Chest', side: 'front', description: 'Pectoralis major and minor' },
    { id: 'muscle-front-delts', name: 'Front Deltoids', side: 'front', description: 'Anterior deltoid' },
    { id: 'muscle-side-delts', name: 'Side Deltoids', side: 'front', description: 'Lateral deltoid' },
    { id: 'muscle-biceps', name: 'Biceps', side: 'front', description: 'Biceps brachii' },
    { id: 'muscle-forearms', name: 'Forearms', side: 'front', description: 'Forearm flexors and extensors' },
    { id: 'muscle-abs', name: 'Abs', side: 'front', description: 'Rectus abdominis' },
    { id: 'muscle-obliques', name: 'Obliques', side: 'front', description: 'External and internal obliques' },
    { id: 'muscle-quads', name: 'Quadriceps', side: 'front', description: 'Quadriceps femoris' },
    { id: 'muscle-hip-flexors', name: 'Hip Flexors', side: 'front', description: 'Iliopsoas and related muscles' },
    { id: 'muscle-adductors', name: 'Adductors', side: 'front', description: 'Inner thigh muscles' },
    { id: 'muscle-tibialis', name: 'Tibialis Anterior', side: 'front', description: 'Front of shin' },
    // Back body muscles
    { id: 'muscle-traps', name: 'Trapezius', side: 'back', description: 'Upper, middle, and lower trapezius' },
    { id: 'muscle-rear-delts', name: 'Rear Deltoids', side: 'back', description: 'Posterior deltoid' },
    { id: 'muscle-lats', name: 'Lats', side: 'back', description: 'Latissimus dorsi' },
    { id: 'muscle-rhomboids', name: 'Rhomboids', side: 'back', description: 'Rhomboid major and minor' },
    { id: 'muscle-lower-back', name: 'Lower Back', side: 'back', description: 'Erector spinae' },
    { id: 'muscle-triceps', name: 'Triceps', side: 'back', description: 'Triceps brachii' },
    { id: 'muscle-glutes', name: 'Glutes', side: 'back', description: 'Gluteus maximus, medius, and minimus' },
    { id: 'muscle-hamstrings', name: 'Hamstrings', side: 'back', description: 'Biceps femoris, semitendinosus, semimembranosus' },
    { id: 'muscle-calves', name: 'Calves', side: 'back', description: 'Gastrocnemius and soleus' },
  ];

  // Use createMany for efficiency (single query)
  await prisma.muscle.createMany({ data: musclesData });

  console.log(`Created ${musclesData.length} muscles`);
}

async function seedExercises() {
  console.log('Seeding exercises...');

  const exercises = [
    // CHEST
    { id: 'ex-barbell-bench-press', name: 'Barbell Bench Press', primaryMuscleId: 'muscle-chest', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-dumbbell-bench-press', name: 'Dumbbell Bench Press', primaryMuscleId: 'muscle-chest', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-incline-dumbbell-press', name: 'Incline Dumbbell Press', primaryMuscleId: 'muscle-chest', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-cable-fly', name: 'Cable Fly', primaryMuscleId: 'muscle-chest', equipment: 'cable', difficulty: 'beginner' },
    { id: 'ex-push-up', name: 'Push-Up', primaryMuscleId: 'muscle-chest', equipment: 'bodyweight', difficulty: 'beginner' },
    { id: 'ex-dips', name: 'Dips (Chest)', primaryMuscleId: 'muscle-chest', equipment: 'bodyweight', difficulty: 'intermediate' },

    // BACK
    { id: 'ex-deadlift', name: 'Conventional Deadlift', primaryMuscleId: 'muscle-lower-back', equipment: 'barbell', difficulty: 'advanced' },
    { id: 'ex-barbell-row', name: 'Barbell Row', primaryMuscleId: 'muscle-lats', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-pull-up', name: 'Pull-Up', primaryMuscleId: 'muscle-lats', equipment: 'bodyweight', difficulty: 'intermediate' },
    { id: 'ex-lat-pulldown', name: 'Lat Pulldown', primaryMuscleId: 'muscle-lats', equipment: 'cable', difficulty: 'beginner' },
    { id: 'ex-seated-cable-row', name: 'Seated Cable Row', primaryMuscleId: 'muscle-lats', equipment: 'cable', difficulty: 'beginner' },
    { id: 'ex-dumbbell-row', name: 'Single-Arm Dumbbell Row', primaryMuscleId: 'muscle-lats', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-face-pull', name: 'Face Pull', primaryMuscleId: 'muscle-rear-delts', equipment: 'cable', difficulty: 'beginner' },

    // SHOULDERS
    { id: 'ex-overhead-press', name: 'Overhead Press', primaryMuscleId: 'muscle-front-delts', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', primaryMuscleId: 'muscle-front-delts', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-lateral-raise', name: 'Lateral Raise', primaryMuscleId: 'muscle-side-delts', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-front-raise', name: 'Front Raise', primaryMuscleId: 'muscle-front-delts', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-reverse-fly', name: 'Reverse Fly', primaryMuscleId: 'muscle-rear-delts', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-shrugs', name: 'Barbell Shrugs', primaryMuscleId: 'muscle-traps', equipment: 'barbell', difficulty: 'beginner' },

    // ARMS
    { id: 'ex-barbell-curl', name: 'Barbell Curl', primaryMuscleId: 'muscle-biceps', equipment: 'barbell', difficulty: 'beginner' },
    { id: 'ex-dumbbell-curl', name: 'Dumbbell Curl', primaryMuscleId: 'muscle-biceps', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-hammer-curl', name: 'Hammer Curl', primaryMuscleId: 'muscle-biceps', equipment: 'dumbbell', difficulty: 'beginner' },
    { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', primaryMuscleId: 'muscle-triceps', equipment: 'cable', difficulty: 'beginner' },
    { id: 'ex-skull-crushers', name: 'Skull Crushers', primaryMuscleId: 'muscle-triceps', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-overhead-tricep-extension', name: 'Overhead Tricep Extension', primaryMuscleId: 'muscle-triceps', equipment: 'dumbbell', difficulty: 'beginner' },

    // LEGS
    { id: 'ex-back-squat', name: 'Barbell Back Squat', primaryMuscleId: 'muscle-quads', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-front-squat', name: 'Front Squat', primaryMuscleId: 'muscle-quads', equipment: 'barbell', difficulty: 'advanced' },
    { id: 'ex-leg-press', name: 'Leg Press', primaryMuscleId: 'muscle-quads', equipment: 'machine', difficulty: 'beginner' },
    { id: 'ex-lunges', name: 'Lunges', primaryMuscleId: 'muscle-quads', equipment: 'bodyweight', difficulty: 'beginner' },
    { id: 'ex-bulgarian-split-squat', name: 'Bulgarian Split Squat', primaryMuscleId: 'muscle-quads', equipment: 'dumbbell', difficulty: 'intermediate' },
    { id: 'ex-leg-extension', name: 'Leg Extension', primaryMuscleId: 'muscle-quads', equipment: 'machine', difficulty: 'beginner' },
    { id: 'ex-leg-curl', name: 'Lying Leg Curl', primaryMuscleId: 'muscle-hamstrings', equipment: 'machine', difficulty: 'beginner' },
    { id: 'ex-romanian-deadlift', name: 'Romanian Deadlift', primaryMuscleId: 'muscle-hamstrings', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-hip-thrust', name: 'Barbell Hip Thrust', primaryMuscleId: 'muscle-glutes', equipment: 'barbell', difficulty: 'intermediate' },
    { id: 'ex-calf-raise', name: 'Standing Calf Raise', primaryMuscleId: 'muscle-calves', equipment: 'machine', difficulty: 'beginner' },

    // CORE
    { id: 'ex-plank', name: 'Plank', primaryMuscleId: 'muscle-abs', equipment: 'bodyweight', difficulty: 'beginner' },
    { id: 'ex-crunches', name: 'Crunches', primaryMuscleId: 'muscle-abs', equipment: 'bodyweight', difficulty: 'beginner' },
    { id: 'ex-leg-raises', name: 'Hanging Leg Raise', primaryMuscleId: 'muscle-abs', equipment: 'bodyweight', difficulty: 'intermediate' },
    { id: 'ex-cable-crunch', name: 'Cable Crunch', primaryMuscleId: 'muscle-abs', equipment: 'cable', difficulty: 'beginner' },
    { id: 'ex-russian-twist', name: 'Russian Twist', primaryMuscleId: 'muscle-obliques', equipment: 'bodyweight', difficulty: 'beginner' },
  ];

  // Use createMany for efficiency (single query)
  await prisma.exercise.createMany({ data: exercises });

  console.log(`Created ${exercises.length} exercises`);
}

async function main() {
  console.log('Starting database seed...\n');

  // Step 1: Clear everything
  await clearDatabase();

  // Step 2: Seed reference data
  await seedMuscles();
  await seedExercises();

  // Step 3: Create Admin account
  console.log('\nCreating Admin account...');
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'kevin.rizk14@gmail.com',
      password: hashedPassword,
      role: 'ADMIN',
      fullName: 'Kevin Rizk',
      country: 'Lebanon',
      city: 'Jounieh',
    },
  });
  console.log('Admin created:', admin.email);

  // Step 4: Create Trainer Kevin Saroufim
  console.log('\nCreating Trainer Kevin Saroufim...');
  const trainerPassword = await bcrypt.hash('Trainer123!', 10);

  const trainer = await prisma.user.create({
    data: {
      email: 'kevin.saroufim@kinetra.com',
      password: trainerPassword,
      role: 'TRAINER',
      fullName: 'Kevin Saroufim',
      gender: 'male',
      country: 'Lebanon',
      city: 'Jounieh',
      phoneNumber: '+961 70 123456',
      trainerProfile: {
        create: {
          headline: 'Professional Fitness Coach',
          bio: 'Certified personal trainer with 8+ years of experience. Specialized in strength training, body recomposition, and athletic performance. Based in Jounieh, available for in-person and online coaching.',
          yearsExperience: 8,
          remoteAvailable: true,
          acceptsInGym: true,
          baseCity: 'Jounieh',
          baseCountry: 'Lebanon',
          sessionPriceMin: 30,
          sessionPriceMax: 80,
          currency: 'USD',
          avgRating: 4.9,
          totalReviews: 52,
          isVerified: true,
          instagramHandle: '@kevinsaroufim_fit',
          specialties: {
            create: [
              { specialty: 'Strength Training' },
              { specialty: 'Muscle Building' },
              { specialty: 'Weight Loss' },
              { specialty: 'Athletic Performance' },
            ],
          },
          certifications: {
            create: [
              { name: 'ISSA Certified Personal Trainer', issuer: 'ISSA', issuedAt: new Date('2016-03-15') },
              { name: 'Strength & Conditioning Specialist', issuer: 'NSCA', issuedAt: new Date('2018-07-01') },
            ],
          },
        },
      },
    },
    include: {
      trainerProfile: true,
    },
  });

  console.log('Trainer created:', trainer.fullName);

  // Step 5: Create 3 Plans with Weeks and Workouts
  console.log('\nCreating training plans...');

  const trainerProfileId = trainer.trainerProfile!.id;

  // PLAN 1: Push Day Program
  const pushPlan = await prisma.plan.create({
    data: {
      trainerId: trainerProfileId,
      title: 'Push Power Program',
      description: '4-week program focused on chest, shoulders, and triceps. Build upper body pushing strength.',
      durationWeeks: 4,
      isTemplate: true,
      basePrice: 49,
      currency: 'USD',
      isActive: true,
      weeks: {
        create: [1, 2, 3, 4].map(weekNum => ({
          weekNumber: weekNum,
          notes: `Week ${weekNum} - ${weekNum <= 2 ? 'Foundation' : 'Progressive overload'}`,
        })),
      },
    },
    include: { weeks: true },
  });

  // Create Push workout
  const pushWorkout = await prisma.workout.create({
    data: {
      trainerId: trainerProfileId,
      title: 'Push Day A',
      description: 'Primary push workout - chest, shoulders, triceps',
      estimatedMinutes: 60,
      isPublic: false,
      exercises: {
        create: [
          { exerciseId: 'ex-barbell-bench-press', orderIndex: 0, sets: 4, reps: '6-8', restSeconds: 180, name: 'Barbell Bench Press' },
          { exerciseId: 'ex-incline-dumbbell-press', orderIndex: 1, sets: 3, reps: '8-10', restSeconds: 120, name: 'Incline Dumbbell Press' },
          { exerciseId: 'ex-dumbbell-shoulder-press', orderIndex: 2, sets: 3, reps: '8-10', restSeconds: 120, name: 'Dumbbell Shoulder Press' },
          { exerciseId: 'ex-lateral-raise', orderIndex: 3, sets: 3, reps: '12-15', restSeconds: 60, name: 'Lateral Raise' },
          { exerciseId: 'ex-cable-fly', orderIndex: 4, sets: 3, reps: '12-15', restSeconds: 60, name: 'Cable Fly' },
          { exerciseId: 'ex-tricep-pushdown', orderIndex: 5, sets: 3, reps: '10-12', restSeconds: 60, name: 'Tricep Pushdown' },
          { exerciseId: 'ex-overhead-tricep-extension', orderIndex: 6, sets: 3, reps: '10-12', restSeconds: 60, name: 'Overhead Tricep Extension' },
        ],
      },
    },
  });

  // Add workout to all weeks (Mon, Wed, Fri)
  for (const week of pushPlan.weeks) {
    await prisma.planWeekWorkout.createMany({
      data: [
        { planWeekId: week.id, workoutId: pushWorkout.id, dayOfWeek: 1, orderIndex: 0 }, // Monday
        { planWeekId: week.id, workoutId: pushWorkout.id, dayOfWeek: 3, orderIndex: 0 }, // Wednesday
        { planWeekId: week.id, workoutId: pushWorkout.id, dayOfWeek: 5, orderIndex: 0 }, // Friday
      ],
    });
  }

  console.log('Created: Push Power Program');

  // PLAN 2: Pull Day Program
  const pullPlan = await prisma.plan.create({
    data: {
      trainerId: trainerProfileId,
      title: 'Pull Strength Program',
      description: '4-week program focused on back and biceps. Build a strong, wide back.',
      durationWeeks: 4,
      isTemplate: true,
      basePrice: 49,
      currency: 'USD',
      isActive: true,
      weeks: {
        create: [1, 2, 3, 4].map(weekNum => ({
          weekNumber: weekNum,
          notes: `Week ${weekNum} - ${weekNum <= 2 ? 'Volume focus' : 'Intensity focus'}`,
        })),
      },
    },
    include: { weeks: true },
  });

  const pullWorkout = await prisma.workout.create({
    data: {
      trainerId: trainerProfileId,
      title: 'Pull Day A',
      description: 'Primary pull workout - back and biceps',
      estimatedMinutes: 65,
      isPublic: false,
      exercises: {
        create: [
          { exerciseId: 'ex-deadlift', orderIndex: 0, sets: 4, reps: '5', restSeconds: 180, name: 'Conventional Deadlift' },
          { exerciseId: 'ex-barbell-row', orderIndex: 1, sets: 4, reps: '6-8', restSeconds: 120, name: 'Barbell Row' },
          { exerciseId: 'ex-lat-pulldown', orderIndex: 2, sets: 3, reps: '8-10', restSeconds: 90, name: 'Lat Pulldown' },
          { exerciseId: 'ex-seated-cable-row', orderIndex: 3, sets: 3, reps: '10-12', restSeconds: 90, name: 'Seated Cable Row' },
          { exerciseId: 'ex-face-pull', orderIndex: 4, sets: 3, reps: '15-20', restSeconds: 60, name: 'Face Pull' },
          { exerciseId: 'ex-barbell-curl', orderIndex: 5, sets: 3, reps: '10-12', restSeconds: 60, name: 'Barbell Curl' },
          { exerciseId: 'ex-hammer-curl', orderIndex: 6, sets: 3, reps: '10-12', restSeconds: 60, name: 'Hammer Curl' },
        ],
      },
    },
  });

  for (const week of pullPlan.weeks) {
    await prisma.planWeekWorkout.createMany({
      data: [
        { planWeekId: week.id, workoutId: pullWorkout.id, dayOfWeek: 2, orderIndex: 0 }, // Tuesday
        { planWeekId: week.id, workoutId: pullWorkout.id, dayOfWeek: 4, orderIndex: 0 }, // Thursday
        { planWeekId: week.id, workoutId: pullWorkout.id, dayOfWeek: 6, orderIndex: 0 }, // Saturday
      ],
    });
  }

  console.log('Created: Pull Strength Program');

  // PLAN 3: Leg Day Program
  const legPlan = await prisma.plan.create({
    data: {
      trainerId: trainerProfileId,
      title: 'Leg Development Program',
      description: '4-week program for complete lower body development. Quads, hamstrings, and glutes.',
      durationWeeks: 4,
      isTemplate: true,
      basePrice: 49,
      currency: 'USD',
      isActive: true,
      weeks: {
        create: [1, 2, 3, 4].map(weekNum => ({
          weekNumber: weekNum,
          notes: `Week ${weekNum} - ${weekNum % 2 === 1 ? 'Quad dominant' : 'Hip dominant'}`,
        })),
      },
    },
    include: { weeks: true },
  });

  const legWorkout = await prisma.workout.create({
    data: {
      trainerId: trainerProfileId,
      title: 'Leg Day A',
      description: 'Complete leg workout - quads, hamstrings, glutes, calves',
      estimatedMinutes: 75,
      isPublic: false,
      exercises: {
        create: [
          { exerciseId: 'ex-back-squat', orderIndex: 0, sets: 4, reps: '6-8', restSeconds: 180, name: 'Barbell Back Squat' },
          { exerciseId: 'ex-romanian-deadlift', orderIndex: 1, sets: 4, reps: '8-10', restSeconds: 120, name: 'Romanian Deadlift' },
          { exerciseId: 'ex-leg-press', orderIndex: 2, sets: 3, reps: '10-12', restSeconds: 120, name: 'Leg Press' },
          { exerciseId: 'ex-bulgarian-split-squat', orderIndex: 3, sets: 3, reps: '10-12', restSeconds: 90, name: 'Bulgarian Split Squat' },
          { exerciseId: 'ex-leg-curl', orderIndex: 4, sets: 3, reps: '10-12', restSeconds: 60, name: 'Lying Leg Curl' },
          { exerciseId: 'ex-leg-extension', orderIndex: 5, sets: 3, reps: '12-15', restSeconds: 60, name: 'Leg Extension' },
          { exerciseId: 'ex-calf-raise', orderIndex: 6, sets: 4, reps: '12-15', restSeconds: 60, name: 'Standing Calf Raise' },
        ],
      },
    },
  });

  for (const week of legPlan.weeks) {
    await prisma.planWeekWorkout.createMany({
      data: [
        { planWeekId: week.id, workoutId: legWorkout.id, dayOfWeek: 1, orderIndex: 0 }, // Monday
        { planWeekId: week.id, workoutId: legWorkout.id, dayOfWeek: 4, orderIndex: 0 }, // Thursday
      ],
    });
  }

  console.log('Created: Leg Development Program');

  // Summary
  console.log('\n========================================');
  console.log('Database seeded successfully!');
  console.log('========================================');
  console.log('\nAccounts Created:');
  console.log('  ADMIN:   kevin.rizk14@gmail.com / Admin123!');
  console.log('  TRAINER: kevin.saroufim@kinetra.com / Trainer123!');
  console.log('\nTrainer Template Plans (available for purchase):');
  console.log('  1. Push Power Program (4 weeks, $49)');
  console.log('  2. Pull Strength Program (4 weeks, $49)');
  console.log('  3. Leg Development Program (4 weeks, $49)');
  console.log('\nWorkflow to test:');
  console.log('  1. Register new client account');
  console.log('  2. Complete onboarding');
  console.log('  3. Browse trainers -> find Kevin Saroufim');
  console.log('  4. Select a plan -> pay -> get access');
  console.log('  5. View workouts in Plans tab');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
