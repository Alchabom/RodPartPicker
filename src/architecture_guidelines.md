# Architecture & Directory Structure Guide

This repository follows a **Feature-Based Architecture** (Domain-Driven Design principles applied to React). This structure is designed to promote scalability, high cohesion, low coupling, and clear boundaries between domain logic and shared code.

---

## 1. Directory Tree

```text
Capstone(rodpartpicker)/
├── public/
├── src/
│   ├── assets/             # Static assets (images, icons, vectors)
│   ├── components/         # Shared, domain-agnostic UI components (Button, Modal, Input)
│   ├── features/           # Feature domain modules
│   │   └── userProfile/    # User Profile domain module
│   │       ├── api/        # Data fetching functions & API calls for this feature
│   │       ├── components/ # Feature-specific React components
│   │       ├── hooks/      # Custom React hooks specific to this feature
│   │       ├── styles/     # Styles isolated strictly to this feature
│   │       ├── types/      # TypeScript types and interfaces for this feature
│   │       ├── utils/      # Domain-specific pure helper functions
│   │       └── index.ts    # Public API export (Barrel file)
│   ├── hooks/              # Reusable, global React hooks (e.g., useDebounce, useAuth)
│   ├── lib/                # Third-party SDK configurations & client wrappers (Axios, Firebase)
│   ├── routes/             # Router setup and page route definitions
│   ├── styles/             # Global styles, variables, typography, and CSS resets
│   ├── types/              # Global TypeScript types and ambient type declarations
│   ├── utils/              # Global pure helper functions (formatting, calculations)
│   ├── App.css             # Root application styles
│   ├── App.tsx             # Root application component
│   ├── index.css           # Global baseline CSS / CSS reset imports
│   └── main.tsx            # React application entry point
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 2. Global Directories Breakdown

| Directory | Purpose | What Belongs Here | What DOES NOT Belong Here |
| :--- | :--- | :--- | :--- |
| `src/components/` | Shared UI primitives. | Universal components like `<Button>`, `<Modal>`, `<Card>`, `<Spinner>`. | Domain-specific components like `<ProfileAvatar>` or `<RodPartList>`. |
| `src/hooks/` | Reusable global stateful logic. | Broadly applicable React hooks like `useLocalStorage`, `useMediaQuery`, `useTheme`. | Hooks tied to specific business domains like `useProfileData`. |
| `src/lib/` | External library abstractions. | Configured instances for third-party libraries (`axios` instance, Supabase client, Analytics initialization). | Business logic or component code. |
| `src/styles/` | Global design system foundation. | Global CSS variables, color tokens, typography defaults, and browser reset files (`reset.css`, `variables.css`). | Component-specific or domain-specific layout styling. |
| `src/types/` | Global TypeScript definitions. | Cross-cutting types like `UserSession`, global API response interfaces (`PaginatedResponse<T>`), or ambient declaration files (`env.d.ts`). | Feature-specific payload types or form state types. |
| `src/utils/` | Global stateless helper functions. | Pure JS/TS functions with zero React dependencies or side effects (e.g., `formatCurrency()`, `calculateTax()`, `slugify()`). | Stateful logic, React components, or domain-specific business rules. |

---

## 3. Feature Directory Architecture (`src/features/*`)

Every feature module inside `src/features/` represents an isolated vertical slice of the application domain.

### Feature Internal Layout

Taking `src/features/userProfile/` as an example:

```text
src/features/userProfile/
├── api/        # Endpoint functions (e.g., fetchUserProfile, updateAvatar)
├── components/ # UI exclusive to user profile (e.g., ProfileCard, PasswordChangeForm)
├── hooks/      # State management hooks (e.g., useUserProfile, useAvatarUpload)
├── styles/     # CSS/SCSS modules exclusive to profile UI elements
├── types/      # Domain interfaces (e.g., UserProfile, ProfileSettings, UserRole)
├── utils/      # Domain-specific helpers (e.g., validateProfileBio, formatJoinDate)
└── index.ts    # Barrel file defining the module's public API
```

---

## 4. Architectural Rules & Best Practices

### Rule 1: The Public API Pattern (Barrel Files)
Each feature directory **must** expose its public API via an `index.ts` barrel file at its root. Other parts of the application should only import from `src/features/<featureName>`, never directly from deep nested files inside the feature.

#### Good practice:
```typescript
// Importing via public API
import { ProfileCard, useUserProfile } from '@/features/userProfile';
```

#### Bad practice:
```typescript
// Reaching into feature internals
import { ProfileCard } from '@/features/userProfile/components/ProfileCard';
import { useUserProfile } from '@/features/userProfile/hooks/useUserProfile';
```

### Rule 2: Feature Isolation & Boundaries
- Features **may** import from global directories (`src/components`, `src/hooks`, `src/utils`, `src/lib`, `src/types`).
- Features **must not** directly import internal code from another feature directory.
- If two features need to share code, lift that shared logic into the global `src/` directory.

```text
[ Feature A ] ───► [ Global Shared Code (src/*) ] ◄─── [ Feature B ]
      │                                                     │
      └──────────────── X (NOT ALLOWED) X ─────────────────┘
```

### Rule 3: Co-location First
Keep code as close to where it is used as possible. 
1. If a component/hook/utility is used in only **one file**, keep it in that file.
2. If it is used across **one feature**, put it in `src/features/<featureName>/`.
3. Only move it to `src/` (global) when it is required by **two or more distinct features**.

---

## 5. Barrel File Example (`src/features/userProfile/index.ts`)

```typescript
// Export main container / page components
export { UserProfileView } from './components/UserProfileView';
export { ProfileCard } from './components/ProfileCard';

// Export hooks needed by external features or routes
export { useUserProfile } from './hooks/useUserProfile';

// Export public types
export type { UserProfile, ProfileFormValues } from './types';
```