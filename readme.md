src/
├── config/               # env, settings
├── shared/               # utils, types, constants, errors
├── features/
│   ├── job-listing/
│   │   ├── domain/           # Entities, Value-Objects
│   │   ├── application/      # Use-cases (CreateJob, ListJobs…)
│   │   ├── infrastructure/   # Mongoose schemas, repos
│   │   └── presentation/     # Controllers + routes
│   ├── employer/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── student/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── index.ts              # app bootstrap & manual wiring
