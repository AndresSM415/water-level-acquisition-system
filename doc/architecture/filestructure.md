// Root package.json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "@types/node": "^20.10.5"
  }
}
```

## What Should NOT Be Shared

While sharing types and configuration makes sense, some things should remain separate:

### Environment Variables

While you could have a root `.env` file, I actually recommend separate `.env` files for backend and frontend because they have different concerns:
```
water-monitoring/
├── backend/
│   └── .env              # DATABASE_PATH, PORT, API_KEYS
├── frontend/
│   └── .env              # VITE_API_URL, VITE_PUBLIC_KEYS
```

Your backend needs database paths, server ports, and secrets. Your frontend needs API URLs and public configuration that gets bundled into the client code (hence the VITE_ prefix which tells Vite these are safe to expose).

However, you might have a root `.env.example` file that documents what environment variables are needed:
```
water-monitoring/
├── .env.example          # Documentation of required env vars
├── backend/
│   └── .env             # Actual backend secrets (gitignored)
└── frontend/
    └── .env             # Actual frontend config (gitignored)
```

### Dependencies

Each project should have its own `package.json` with its specific dependencies:

- Backend needs: `hono`, `drizzle-orm`, `bun`, SQLite drivers
- Frontend needs: `svelte`, `vite`, `chart.js`, Tailwind

These shouldn't be mixed at the root level because they're specific to each application's runtime environment.

## Practical Monorepo Structure for Your Project

Here's what I recommend for your water monitoring system:
```
water-monitoring/
├── .gitignore                    # Ignore node_modules, .env, dist, etc.
├── .eslintrc.json               # Shared linting rules
├── .prettierrc                  # Shared code formatting
├── tsconfig.json                # Base TypeScript config
├── package.json                 # Root workspace config
├── README.md                    # Project documentation
│
├── packages/
│   ├── shared/                  # Shared types and utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── sensor.ts    # SensorReading interface
│   │       │   └── api.ts       # API request/response types
│   │       └── utils/
│   │           └── date-helpers.ts  # Shared utility functions
│   │
│   ├── backend/
│   │   ├── .env                 # Backend environment variables
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts    # Drizzle configuration
│   │   └── src/
│   │       ├── index.ts         # Server entry point
│   │       ├── db/
│   │       │   ├── schema.ts    # Drizzle schema
│   │       │   └── index.ts     # DB connection
│   │       ├── routes/
│   │       │   ├── readings.ts  # GET /api/readings
│   │       │   ├── stream.ts    # GET /api/stream (SSE)
│   │       │   └── export.ts    # GET /api/export (CSV)
│   │       └── utils/
│   │           └── query-helpers.ts
│   │
│   └── frontend/
│       ├── .env                 # Frontend environment variables
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts       # Vite configuration
│       ├── tailwind.config.js   # Tailwind configuration
│       ├── index.html
│       └── src/
│           ├── main.ts          # Entry point
│           ├── App.svelte       # Root component
│           ├── components/
│           │   ├── TankDisplay.svelte
│           │   ├── FlowMeter.svelte
│           │   ├── HoseMonitor.svelte
│           │   └── SensorChart.svelte
│           ├── lib/
│           │   ├── api.ts       # API client functions
│           │   └── sse.ts       # SSE connection handler
│           └── stores/
│               └── sensors.ts   # Svelte stores for state
│
└── sampler/                     # Your Python code (separate)
    ├── .env
    ├── requirements.txt
    └── src/
        └── ...
