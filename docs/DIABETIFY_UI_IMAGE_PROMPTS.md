# Diabetactic UI Image Generation Prompts

Short, implementation-ready prompts for generating assets that match Diabetactic’s medical, calm, mobile-first UI. Use consistent style:

- Clean, flat/semiflat vector style
- Soft rounded shapes
- Accessible color palette (teals/blues + accent, high contrast, WCAG-friendly)
- Inclusive, friendly, non-alarming; no needles or gore
- Transparent or subtle backgrounds; must work in light and dark themes
- Optimized for mobile resolutions

---

## 1. Brand & Logo System

1.1 Primary Logo (SVG)

- "Minimal, modern logo for a diabetes management app named 'Diabetactic', clean geometric symbol plus wordmark, soft rounded corners, medical tech style, teal and deep blue palette, flat vector, no gradients, works on light and dark backgrounds, high legibility at small sizes"

  1.2 Monochrome Variants

- "Monochrome version of the Diabetactic logo symbol only, flat vector, solid single color, optimized for small sizes and favicons, works on both light and dark backgrounds"

  1.3 App Icon

- "App icon for Diabetactic, square with rounded corners, centered simplified logo symbol, flat vector, teal and deep blue on white or very dark navy, high contrast, iOS and Android compatible"

---

## 2. Backgrounds & Decorative Shapes

2.1 Auth / Onboarding Background

- "Subtle abstract background for a medical mobile app auth screen, soft waves and circles, teal and blue on very light background, low contrast, no text, no photos, leave center area clean for forms"

  2.2 Main Dashboard Background Strip

- "Thin top-strip abstract background for a health dashboard, soft gradient-free waves, light teal accents on transparent background, designed to sit behind a header bar without distracting from text"

  2.3 Modal / Panel Accent Shapes

- "Small abstract corner shapes for cards and side panels, flat vector, teal and muted blue shapes with rounded edges, transparent background, suitable as non-distracting decorative overlays"

---

## 3. Onboarding & Welcome

3.1 Welcome Hero – Track Glucose

- "Hero illustration for a diabetes app welcome screen, person checking glucose data on a smartphone, stylized flat vector, inclusive and gender-neutral, teal/blue palette, clean white background, no device branding"

  3.2 Welcome Hero – Connect with Care Team

- "Hero illustration showing a patient and doctor connected via app, chat bubbles and health icons, flat vector, inclusive, calm, teal and blue tones, transparent or white background"

  3.3 Welcome Hero – Stay Organized

- "Hero illustration of a tidy calendar with glucose icons and reminders, flat vector, minimal, teal and blue accents, suitable above call-to-action buttons"

Generate each hero in:

- 1920x1080 (web/landscape)
- 1080x1920 (mobile portrait)
- With safe margins for overlaying text.

---

## 4. Auth & Account States

4.1 Secure Login

- "Illustration for secure login screen, shield and lock combined with a smartphone, flat vector, teal/blue, friendly not scary, transparent background"

  4.2 Account Pending / Under Review

- "Illustration for 'account pending review', clipboard or document with hourglass/checkmark, calm teal/blue palette, flat, transparent background"

  4.3 Verification Email Sent

- "Illustration for 'check your email', open envelope with subtle medical cross icon, flat vector, teal/blue palette, transparent background"

---

## 5. Empty States & Feedback

5.1 No Glucose Readings Yet

- "Empty state illustration: empty chart with a plus icon, gentle prompt to add first reading, flat vector, teal/blue, transparent background"

  5.2 No Connected Devices

- "Empty state: disconnected wearable/CGM icon and cable, hint to connect device, flat vector, simple, teal/blue, transparent background"

  5.3 Not Enough Data for Trends

- "Empty state: simplified chart with dotted line and info icon, 'need more data' concept, flat vector, teal/blue, transparent background"

  5.4 No Appointments Scheduled

- "Empty state: clean calendar page with plus icon, inviting, flat vector, teal/blue, transparent background"

  5.5 No Alerts / All Good

- "Positive state: small shield with checkmark and soft sparkles, flat vector, teal/blue, transparent background"

---

## 6. Data & Charts (Decorative)

6.1 Chart Accent Overlay

- "Minimal abstract line graph wave, 2-3 smooth lines in teal/blue on transparent background, flat vector, meant as subtle decorative overlay behind real charts"

  6.2 Metrics Icons

- "Set of small flat vector icons for glucose, time-in-range, averages, and trends, outlined or filled, teal/blue palette, designed for 24x24px"

---

## 7. Appointments & Care Team

7.1 Doctor / Clinician Avatars

- "Set of 8 diverse doctor and nurse portraits for a medical app, flat vector or semi-flat, circular crops, inclusive across gender and ethnicity, soft teal/blue clothing accents, neutral background"

  7.2 Care Team Group

- "Illustration of a small medical team standing together with a smartphone interface in the background, flat vector, teal/blue, friendly, transparent or white background"

  7.3 Appointment Created Confirmation

- "Illustration for successful appointment booking: calendar with checkmark and subtle medical cross, flat vector, teal/blue, transparent background"

---

## 8. Profile & User Identity

8.1 User Avatars

- "Set of neutral user avatar silhouettes and minimal portraits, circular, flat vector, teal/blue accents, high legibility at 40-64px, transparent background"

  8.2 Profile & Preferences

- "Small illustration: user card with sliders and a gear icon to represent profile settings, flat vector, teal/blue, transparent background"

---

## 9. Settings, Privacy, and Theme

9.1 Settings Icons

- "Icon set for mobile app settings: gear, bell, language globe, shield, theme (sun/moon), flat vector, stroke-consistent, teal/blue palette, optimized for 24x24px"

  9.2 Privacy / Security Illustration

- "Illustration: shield, lock, and anonymized user icon representing data privacy, flat vector, teal/blue, transparent background"

  9.3 Theme Selector

- "Illustration: half sun half moon inside a rounded rectangle switch, flat vector, teal/blue with small yellow accent, transparent background"

---

## 10. Technical Constraints (For the Model)

- Generate SVG where possible (logos, icons, simple illustrations).
- Use PNG or WebP for complex hero art; keep backgrounds clean or transparent.
- Avoid text inside images so layouts remain fully translatable.
- Ensure assets remain readable on both light and dark backgrounds.
- Keep file sizes small and shapes simple to fit a performance-sensitive mobile app.
