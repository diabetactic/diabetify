# Product Guidelines

## Design Principles

- **Supportive & Encouraging:** The application should feel like a companion for health management. Leverage existing patterns like the `StreakCard` and positive feedback messages to reinforce good habits.
- **Child-Centric UX:** Since the pilot group includes kids with Type 1 Diabetes, maintain the established pattern of large touch targets (e.g., the 'Quick Actions' buttons) and clear, colorful icons.
- **Accessibility First:** Continue to prioritize high contrast and clear typography. Ensure all new interactive elements include `aria-label` attributes for screen readers, following the existing codebase standards.

## Visual Identity

- **Gamification:** Expand on the existing gamification elements (like streaks). Consider adding more celebratory visual feedback (animations, confetti) when milestones are reached.
- **Modern & Clean:** Adhere to the project's established styling stack: Tailwind CSS and DaisyUI. Use the custom `diabetactic` theme variables to ensure consistency.
- **Adaptive Theming:** Ensure all new UI components seamlessly support both Light and Dark modes, testing against the `variables.scss` tokens.

## Tone and Voice

- **Empowering:** Use language that empowers children to take control of their health without feeling overwhelmed.
- **Simple & Clear:** Avoid overly clinical jargon where possible; prioritize clarity for both kids and parents.
- **Consistent:** Maintain a friendly, supportive tone across all notifications, tooltips, and dashboard messages.

## User Experience Standards

- **Offline-First Reliability:** Clearly communicate synchronization status using the existing `sync-status` and `error-banner` components. Users must trust that their data is safe even when offline.
- **Efficiency:** Critical actions (like logging a reading or opening the bolus calculator) should remain accessible via prominent FABs or Quick Action buttons to minimize friction.
- **Feedback Loops:** Provide immediate feedback for every interaction, whether it's a visual state change (e.g., button loading spinners) or a success message.
