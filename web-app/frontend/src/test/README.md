# Testing Guide

This directory contains the testing infrastructure for the Media Processor frontend application.

## Overview

The testing setup uses:
- **Vitest** - Fast unit test runner compatible with Vite
- **React Testing Library** - Testing utilities for React components
- **MSW (Mock Service Worker)** - API mocking for integration tests
- **Jest DOM** - Additional DOM testing matchers

## Directory Structure

```
src/test/
├── README.md                 # This file
├── setup.ts                  # Global test setup and configuration
├── mocks/
│   ├── server.ts             # MSW server setup
│   └── handlers.ts           # API endpoint mock handlers
└── utils/
    └── test-utils.tsx        # Custom render functions and utilities
```

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Utilities

### Custom Render Functions

The `test-utils.tsx` file provides enhanced render functions:

```typescript
import { render, renderWithLayout } from '../test/utils/test-utils';

// Basic render with providers
render(<Component />);

// Render with full layout (for page components)
renderWithLayout(<PageComponent />);
```

### Mock Data Factories

Use the provided factory functions to create consistent test data:

```typescript
import { 
  createMockSettings, 
  createMockFileHistoryEntry,
  createMockDatabaseHealth 
} from '../test/utils/test-utils';

const mockSettings = createMockSettings({ smb_server: 'test.local' });
```

## API Mocking

Tests use MSW to mock API calls. Mock handlers are defined in `mocks/handlers.ts`.

### Adding New Mock Endpoints

```typescript
// In mocks/handlers.ts
export const handlers = [
  // ... existing handlers
  
  http.get('/api/new-endpoint', () => {
    return HttpResponse.json({
      success: true,
      data: mockData,
    });
  }),
];
```

### Overriding Handlers in Tests

```typescript
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

// Override handler for specific test
server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json({
      success: false,
      error: 'Test error',
    });
  })
);
```

## Testing Patterns

### Component Testing

```typescript
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/utils/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);
    
    expect(screen.getByText('Button clicked')).toBeInTheDocument();
  });
});
```

### Async Testing

```typescript
it('loads data on mount', async () => {
  render(<DataComponent />);
  
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  
  // Assert data is displayed
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

### Error Testing

```typescript
it('handles API errors', async () => {
  // Override handler to return error
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json(
        { success: false, error: 'Server error' },
        { status: 500 }
      );
    })
  );
  
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });
});
```

## Coverage Thresholds

The project maintains these coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Files excluded from coverage:
- Test files and setup
- Configuration files
- Type definitions
- Build artifacts

## Writing Good Tests

### Best Practices

1. **Test behavior, not implementation**
   - Focus on what the user sees and does
   - Avoid testing internal component state

2. **Use meaningful test descriptions**
   - Describe what the test does in plain English
   - Include the expected outcome

3. **Arrange, Act, Assert pattern**
   ```typescript
   it('should update settings when form is submitted', async () => {
     // Arrange
     const user = userEvent.setup();
     render(<SettingsForm />);
     
     // Act
     await user.type(screen.getByLabelText('Server'), 'new-server');
     await user.click(screen.getByRole('button', { name: 'Save' }));
     
     // Assert
     expect(screen.getByText('Settings saved')).toBeInTheDocument();
   });
   ```

4. **Clean up after tests**
   - Tests should be independent
   - Use `beforeEach`/`afterEach` for cleanup

5. **Test edge cases**
   - Empty states
   - Error conditions
   - Loading states
   - Validation failures

### What to Test

✅ **Do test:**
- Component rendering
- User interactions
- API integration
- Error handling
- Accessibility features
- Business logic

❌ **Don't test:**
- Implementation details
- Third-party library internals
- Trivial code (getters/setters)
- Static content

## Debugging Tests

### Common Issues

1. **Tests failing due to async operations**
   - Use `waitFor` for async state changes
   - Ensure proper cleanup in `afterEach`

2. **MSW handlers not working**
   - Check handler URL matches exactly
   - Verify server is started in test setup

3. **Component not rendering**
   - Check if all required props are provided
   - Verify provider context is available

### Debug Tools

```typescript
// Add to test for debugging
import { screen } from '@testing-library/react';

// Print current DOM
screen.debug();

// Print specific element
screen.debug(screen.getByTestId('my-element'));
```

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Release builds

The CI pipeline will fail if:
- Any tests fail
- Coverage drops below thresholds
- Linting errors are found

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Common Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)