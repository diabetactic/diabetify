# Remediation Plan: Issue #5 - Profile Page Components at 0% Unit Test Coverage

## 1. Summary

**Severity**: **Medium**

The test coverage report shows that several components related to the "Profile" and "Welcome" pages have 0% unit test coverage. While these pages might be covered by E2E tests, the lack of unit tests means that their individual logic, data bindings, and edge cases are not being tested in isolation. This makes them brittle and prone to regressions.

**Affected Areas**:
-   Profile page components
-   Welcome page

## 2. Root Cause Analysis

-   **Testing Strategy**: The team may have relied exclusively on E2E tests for these "simpler" pages, which is a common but risky practice. E2E tests are slower, less specific, and can miss component-level edge cases.
-   **Development Practice**: The components may have been created without an accompanying `.spec.ts` file, or the file was created but no tests were written.
-   **Difficult-to-Test Code**: The components might be tightly coupled to services, the DOM, or Capacitor plugins, making them difficult to test without proper mocking.

## 3. Remediation Steps

The goal is to add foundational unit tests for the uncovered components, focusing on verifying their core responsibilities.

### Step 1: Identify All Uncovered Components

First, get a precise list of all `.ts` files with 0% coverage.

**Actions**:
1.  **Generate a Coverage Report**:
    ```bash
    pnpm run test:coverage
    ```
2.  **Analyze the Report**: Open the generated `coverage/lcov-report/index.html` file in a browser. Navigate to the `src/app/profile` and other relevant directories to find the files with 0% line, branch, and function coverage.

### Step 2: Create a Test Plan for a Single Component

Start with one component, for example, `profile.page.ts`. A good unit test suite for an Angular component should cover three main areas:

1.  **Class Logic**: Test the public methods on the component's TypeScript class in isolation.
2.  **Component Rendering**: Test how the component renders its template based on its inputs (`@Input`) and internal state.
3.  **User Interaction**: Test how the component responds to user events (e.g., button clicks) and whether it emits the correct outputs (`@Output`).

### Step 3: Write the Unit Tests for `profile.page.ts`

**File to Create/Edit**: `src/app/profile/profile.page.spec.ts`

**Actions**:
1.  **Set up the `TestBed`**: Configure an Angular `TestBed` to create the component for testing. Provide mocks for all its dependencies (services, etc.).
    ```typescript
    import { TestBed, ComponentFixture } from '@angular/core/testing';
    import { ProfilePage } from './profile.page';
    import { ProfileService } from '../core/services/profile.service';
    import { Router } from '@angular/router';

    // Create mock services
    const mockProfileService = { /* mock methods here */ };
    const mockRouter = { /* mock methods here */ };

    describe('ProfilePage', () => {
      let component: ProfilePage;
      let fixture: ComponentFixture<ProfilePage>;

      beforeEach(async () => {
        await TestBed.configureTestingModule({
          imports: [ProfilePage], // For standalone components
          providers: [
            { provide: ProfileService, useValue: mockProfileService },
            { provide: Router, useValue: mockRouter }
          ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProfilePage);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });

      it('should create', () => {
        expect(component).toBeTruthy();
      });

      // Add more tests here
    });
    ```
2.  **Test Class Methods**: If `ProfilePage` has methods like `onEditProfile()` or `logout()`, call them directly and assert that they call the appropriate services. Use `vi.spyOn` from Vitest to spy on service methods.
    ```typescript
    it('should navigate to the edit profile page when onEditProfile is called', () => {
      const routerSpy = vi.spyOn(mockRouter, 'navigate');
      component.onEditProfile();
      expect(routerSpy).toHaveBeenCalledWith(['/profile/edit']);
    });
    ```
3.  **Test Template Rendering**: Test that the user's information (e.g., name, email) is correctly displayed in the template when provided.
    ```typescript
    it('should display the user name from the profile service', () => {
      // Assuming profile service returns a profile object
      mockProfileService.getProfile = () => ({ name: 'John Doe' });
      fixture.detectChanges(); // Trigger change detection

      const element = fixture.nativeElement.querySelector('[data-testid="user-name"]');
      expect(element.textContent).toContain('John Doe');
    });
    ```
4.  **Test User Interactions**: Simulate a button click and verify the outcome.
    ```typescript
    it('should call the logout method on the auth service when the logout button is clicked', () => {
      const authSpy = vi.spyOn(mockAuthService, 'logout');
      const logoutButton = fixture.nativeElement.querySelector('[data-testid="logout-button"]');
      logoutButton.click();
      expect(authSpy).toHaveBeenCalled();
    });
    ```

### Step 4: Repeat for All Uncovered Components

Systematically repeat Step 3 for all other components identified in Step 1. Prioritize components with more complex logic over simple, display-only components.

### Step 5: Verify Coverage Improvement

After adding tests, regenerate the coverage report to confirm that the coverage for the targeted files has increased significantly from 0%.

**Actions**:
1.  **Run Tests with Coverage**:
    ```bash
    pnpm run test:coverage
    ```
2.  **Check Report**: Verify that the coverage is no longer 0% and meets a reasonable threshold (e.g., >70%).

## 4. Recommended Priority

**Medium**. This is a technical debt item. While not a user-facing bug, it represents a risk to future development. It should be addressed after the high-priority issues are resolved. A good approach would be to schedule this work over several sprints, improving coverage component by component.
