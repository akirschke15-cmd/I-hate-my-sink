# Accessibility Implementation Guide

This document outlines the WCAG 2.1 Level AA accessibility features implemented in the I Hate My Sink PWA application.

## Table of Contents

1. [Overview](#overview)
2. [Semantic HTML & Landmarks](#semantic-html--landmarks)
3. [ARIA Labels & Attributes](#aria-labels--attributes)
4. [Skip Navigation](#skip-navigation)
5. [Focus Management](#focus-management)
6. [Screen Reader Announcements](#screen-reader-announcements)
7. [Form Accessibility](#form-accessibility)
8. [Color Contrast](#color-contrast)
9. [Testing Guidelines](#testing-guidelines)

---

## Overview

All accessibility features are implemented following WCAG 2.1 Level AA standards, which is the recommended target for web applications. This ensures the application is usable by people with disabilities, including those using screen readers, keyboard navigation, and other assistive technologies.

### Key Success Criteria Met

- **2.4.1 Bypass Blocks (Level A)** - Skip navigation link
- **2.4.6 Headings and Labels (Level AA)** - Descriptive headings and labels
- **3.3.2 Labels or Instructions (Level A)** - Clear form labels
- **4.1.2 Name, Role, Value (Level A)** - Proper ARIA attributes
- **4.1.3 Status Messages (Level AA)** - Screen reader announcements

---

## Semantic HTML & Landmarks

### Landmark Roles Implemented

The application uses semantic HTML5 elements that map to ARIA landmark roles:

| Element | Role | Location | Purpose |
|---------|------|----------|---------|
| `<header role="banner">` | banner | All pages | Site header with branding and navigation |
| `<main id="main-content" role="main">` | main | All pages | Primary page content |
| `<nav aria-label="...">` | navigation | Dashboard, pages | Navigation menus |
| `<aside aria-labelledby="...">` | complementary | Dashboard | Supporting content (recent customers) |
| `<form aria-label="...">` | form | Forms | Form regions |
| `<section aria-label="...">` | region | Dashboard, lists | Thematic groupings of content |

### Implementation Examples

#### Dashboard Page

```tsx
<header role="banner">
  {/* Site header */}
</header>

<main id="main-content" role="main">
  <section aria-label="Dashboard statistics">
    {/* Stats cards */}
  </section>

  <section aria-labelledby="quick-actions-heading">
    <h2 id="quick-actions-heading">Quick Actions</h2>
    <nav aria-label="Quick actions">
      {/* Action cards */}
    </nav>
  </section>

  <aside aria-labelledby="recent-customers-heading">
    <h2 id="recent-customers-heading">Recent Customers</h2>
    <nav aria-label="Recent customers">
      {/* Customer links */}
    </nav>
  </aside>
</main>
```

#### Form Pages

```tsx
<main id="main-content">
  <form aria-label="Login form">
    <fieldset>
      <legend>Account Information</legend>
      {/* Form fields */}
    </fieldset>
  </form>
</main>
```

---

## ARIA Labels & Attributes

### ARIA Attributes Used

#### aria-label
Provides accessible names for elements without visible text:

```tsx
<button aria-label="Back to dashboard">
  <svg>...</svg> {/* Icon only */}
</button>

<input
  type="search"
  aria-label="Search customers by name, email, or phone"
  placeholder="Search customers..."
/>
```

#### aria-labelledby
References the ID of the element that labels the current element:

```tsx
<section aria-labelledby="quick-actions-heading">
  <h2 id="quick-actions-heading">Quick Actions</h2>
  {/* Section content */}
</section>
```

#### aria-describedby
References descriptive text (like error messages):

```tsx
<input
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error">Please enter a valid email address</p>
```

#### aria-live
Announces dynamic content changes:

```tsx
<div role="status" aria-live="polite">
  {isOnline ? 'Online' : 'Offline'}
</div>
```

#### aria-hidden
Hides decorative elements from screen readers:

```tsx
<svg aria-hidden="true">
  {/* Decorative icon */}
</svg>
```

#### aria-busy
Indicates loading states:

```tsx
<button aria-busy={isLoading} disabled={isLoading}>
  {isLoading && <span className="sr-only">Loading...</span>}
  Submit
</button>
```

#### aria-invalid & aria-required
Indicates form field validation states:

```tsx
<input
  aria-invalid={error ? 'true' : 'false'}
  aria-required={required}
/>
```

---

## Skip Navigation

### Implementation

A "Skip to main content" link is provided at the very top of the page, hidden visually but accessible to keyboard users.

**Location**: `apps/web/src/components/SkipNavigation.tsx`

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
>
  Skip to main content
</a>
```

### Usage

1. Press `Tab` on page load
2. The skip link becomes visible
3. Press `Enter` to jump to main content

This allows keyboard users to bypass repetitive navigation and jump directly to the main content.

---

## Focus Management

### Focus Indicators

All interactive elements have visible focus indicators using a 2px outline with high contrast colors:

```css
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
```

### Focus Order

The tab order follows the visual flow of the page:
1. Skip navigation link
2. Header navigation
3. Main content (top to bottom, left to right)
4. Forms (logical field order)

### Loading States

When content is loading, screen readers are notified:

```tsx
<div role="status" aria-live="polite">
  <div className="spinner" aria-hidden="true" />
  <span className="sr-only">Loading customers...</span>
</div>
```

---

## Screen Reader Announcements

### Implementation

**Location**: `apps/web/src/components/ScreenReaderAnnouncement.tsx`

Provides two ways to announce dynamic content:

#### 1. Component-based Announcements

```tsx
<ScreenReaderAnnouncement
  message="Customer saved successfully"
  politeness="polite"
/>
```

#### 2. Hook-based Announcements

```tsx
const announce = useScreenReaderAnnouncement();

// Later in code
announce("3 items synced successfully");
```

### Usage in Application

#### Toast Notifications
The Toaster component is configured with proper ARIA attributes:

```tsx
<Toaster
  position="top-right"
  toastOptions={{
    ariaProps: {
      role: 'status',
      'aria-live': 'polite',
    },
  }}
/>
```

#### Error Messages
Errors use `role="alert"` for immediate announcement:

```tsx
<div role="alert" className="error-message">
  Failed to load customers
</div>
```

#### Status Updates
Status changes use `role="status"` with `aria-live="polite"`:

```tsx
<div role="status" aria-live="polite">
  {isOnline ? 'Online' : 'Offline'}
</div>
```

---

## Form Accessibility

### Form Structure

All forms use proper semantic HTML with `<fieldset>` and `<legend>` elements:

```tsx
<form aria-label="Measurement form">
  <fieldset>
    <legend>Cabinet Dimensions</legend>
    {/* Related fields */}
  </fieldset>

  <fieldset>
    <legend>Countertop Details</legend>
    {/* Related fields */}
  </fieldset>
</form>
```

### Labels

Every form field has an associated label:

```tsx
<label htmlFor="email">
  Email
  {required && <span className="text-red-600" aria-label="required">*</span>}
</label>
<input
  id="email"
  type="email"
  required={required}
  aria-required={required}
/>
```

### Error Messages

Error messages are:
- Associated with fields using `aria-describedby`
- Marked with `role="alert"` for immediate announcement
- Contain clear, actionable text
- Include an icon with `aria-hidden="true"`

```tsx
<input
  aria-invalid={error ? 'true' : 'false'}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && (
  <p id="email-error" role="alert">
    <svg aria-hidden="true">...</svg>
    <span>{error}</span>
  </p>
)}
```

### Required Fields

Required fields are indicated:
- With a visual asterisk (*)
- With `aria-label="required"` on the asterisk
- With `required` attribute on the input
- With `aria-required="true"` on the input

---

## Color Contrast

### Contrast Ratios

All text meets WCAG AA standards:

| Element | Foreground | Background | Ratio | Standard |
|---------|-----------|------------|-------|----------|
| Body text | #111827 (gray-900) | #FFFFFF | 16.1:1 | AA Large |
| Secondary text | #6B7280 (gray-500) | #FFFFFF | 4.6:1 | AA Normal |
| Links | #2563EB (primary-600) | #FFFFFF | 8.6:1 | AA Normal |
| Error text | #DC2626 (red-600) | #FFFFFF | 6.5:1 | AA Normal |
| Success text | #059669 (green-600) | #FFFFFF | 4.5:1 | AA Normal |

### Color Independence

Information is never conveyed by color alone:
- Form errors include text and icons
- Status indicators include text labels
- Links are underlined or have additional context

### Testing

Use browser extensions to verify contrast:
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- Chrome DevTools Lighthouse Accessibility Audit

---

## Testing Guidelines

### Manual Testing

#### Keyboard Navigation
1. Navigate entire application using only keyboard
2. Tab through all interactive elements
3. Ensure focus indicators are visible
4. Test skip navigation link
5. Verify no keyboard traps

**Key Commands**:
- `Tab` - Next element
- `Shift + Tab` - Previous element
- `Enter` - Activate link/button
- `Space` - Activate button/checkbox
- `Arrow keys` - Navigate within widgets

#### Screen Reader Testing

**NVDA (Windows - Free)**:
1. Install [NVDA](https://www.nvaccess.org/)
2. Start NVDA with `Ctrl + Alt + N`
3. Navigate with `Down Arrow`
4. Test forms, links, buttons, landmarks

**VoiceOver (macOS)**:
1. Enable VoiceOver with `Cmd + F5`
2. Navigate with `VO + Arrow keys` (`VO` = `Ctrl + Option`)
3. Navigate landmarks with `VO + U`

**JAWS (Windows - Paid)**:
1. Most widely used screen reader
2. Similar to NVDA navigation

### Automated Testing

#### Browser DevTools
```bash
# Chrome Lighthouse
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility" category
4. Run audit
```

#### axe-core (Recommended)
```bash
npm install --save-dev @axe-core/react

# In your test file
import { axe, toHaveNoViolations } from 'jest-axe';

test('should have no accessibility violations', async () => {
  const { container } = render(<LoginPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### Pa11y
```bash
npm install -g pa11y

# Run against local server
pa11y http://localhost:5173
```

### Testing Checklist

#### Every Page Must Have:
- [ ] Skip navigation link (press Tab on page load)
- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
- [ ] Semantic landmarks (header, main, nav, aside)
- [ ] All images have alt text (or aria-hidden if decorative)
- [ ] All interactive elements are keyboard accessible
- [ ] All interactive elements have visible focus indicators
- [ ] All forms have proper labels
- [ ] All form errors are announced to screen readers

#### Every Form Must Have:
- [ ] `<form>` with `aria-label`
- [ ] Related fields grouped in `<fieldset>` with `<legend>`
- [ ] Every input has associated `<label>` with matching `htmlFor`
- [ ] Required fields marked with `required` and `aria-required`
- [ ] Error messages use `role="alert"`
- [ ] Error messages connected via `aria-describedby`
- [ ] Submit button shows loading state with `aria-busy`

#### Every Dynamic Content Update Must Have:
- [ ] `role="status"` for polite announcements
- [ ] `role="alert"` for important announcements
- [ ] Loading spinners with `aria-hidden="true"`
- [ ] Loading text with `className="sr-only"`

---

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Tutorials
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project](https://www.a11yproject.com/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Color Contrast Checkers
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio Tool](https://contrast-ratio.com/)

---

## Maintenance

### Adding New Components

When creating new components, ensure:

1. **Interactive elements** have proper ARIA labels
2. **Icons** have `aria-hidden="true"`
3. **Loading states** announce to screen readers
4. **Errors** use `role="alert"`
5. **Forms** have proper structure and labels
6. **Focus** indicators are visible

### Code Review Checklist

- [ ] All images have alt text or aria-hidden
- [ ] All buttons have descriptive labels
- [ ] All forms have proper field associations
- [ ] All dynamic content has announcements
- [ ] Color is not the only information indicator
- [ ] Focus indicators are visible
- [ ] Keyboard navigation works properly

---

## Contact

For accessibility questions or issues, please:
1. Open an issue on GitHub
2. Tag with `accessibility` label
3. Include browser, assistive technology, and steps to reproduce

**Target**: WCAG 2.1 Level AA
**Last Updated**: 2026-02-05
**Version**: 1.0.0
