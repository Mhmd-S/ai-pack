# Project Rules and Conventions

## Component Structure

-   React components should be created using anonymous functions
-   Component file names should be PascalCase (e.g., `UserProfile.tsx`)
-   Components should be default exported at the end of the file
-   Example:

```tsx
const UserProfile = () => {
	return <div>{/* Component content */}</div>;
};

export default UserProfile;
```

## Data Layer Architecture

-   Use Data Access Layer (DAL) for data retrieval operations
-   Use Data Operations Layer (DOL) for data manipulation operations
-   Place data-related files in `src/lib/data/`
    -   DAL files in `src/lib/data/dal/`
    -   DTO files in `src/lib/data/dto/`

## Actions

-   Server actions should be placed in `src/actions/`
-   Actions should be used for mutations and complex operations
-   Each action file should be focused on a specific domain
-   Actions should be marked with 'use server' directive
-   Example:

```ts
'use server';

export const actionName = async (params) => {
	// Action implementation
};
```

## TypeScript Conventions

-   Use TypeScript for all files
-   Define interfaces and types in `src/lib/definitions/`
-   Use strict type checking
-   Prefer type inference where possible

## File Structure

```
src/
|── app
|   |── (private)/     # Need auth
|   |── (public)/      # Public facing, no need auth
├── actions/           # Server actions
├── lib/
│   ├── data/         # Data layer
│   │   ├── dal/      # Data Access Layer
│   │   └── dto/      # Data Transfer Objects
│   ├── definitions/  # TypeScript definitions
│   └── models/       # Database models
└── components/       # React components
```

## Naming Conventions

-   Files: PascalCase for components, camelCase for utilities
-   Functions: camelCase
-   Types/Interfaces: PascalCase
-   Constants: UPPER_SNAKE_CASE

## Code Style

-   Use 2 spaces for indentation
-   Use semicolons
-   Use single quotes for strings
-   Use arrow functions for components
-   Use async/await for asynchronous operations
-   Use proper error handling with try/catch blocks

## Best Practices

-   Keep components small and focused
-   Use composition over inheritance
-   Implement proper error boundaries
-   Use proper loading states
-   Implement proper form validation
-   Use proper authentication and authorization
-   Implement proper data fetching patterns
