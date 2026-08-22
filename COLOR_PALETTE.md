# HolaDoc Color Palette Documentation

This document describes the complete color palette used in the HolaDoc Patient Mobile application. Use these exact colors when building the web frontend to maintain visual consistency across platforms.

---

## 🎨 Primary Colors

### Main Gradient Colors

The app uses a gradient composed of three rgba values:

- **Gradient Start**: `rgba(81, 232, 239, 0.66)` - Cyan/Turquoise with 66% opacity
- **Gradient Middle**: `rgba(67, 144, 246, 0.2)` - Blue with 20% opacity
- **Gradient End**: `rgba(108, 166, 244, 0.66)` - Light Blue with 66% opacity

### Secondary Color

- **Secondary**: `#70C1E3` - Sky Blue
  - Used for: Back buttons, accent elements

---

## 📝 Text Colors

### Primary Text

- **Black Text**: `#1C1C1E` - Near Black
  - Usage: Main body text, primary content
- **Menu Item**: `black` (`#000000`)
  - Usage: Default menu items

### Secondary Text

- **Grey Text**: `#555` - Dark Grey
  - Usage: Secondary information, subtitles
- **Light Grey Text**: `#A9A9A9` - Light Grey
  - Usage: Placeholder text, disabled states
- **Icon Grey**: `#9ca3af` - Medium Grey
  - Usage: Icon default color

### Light Text

- **White Text**: `#fff` (`#FFFFFF`)
  - Usage: Text on dark/colored backgrounds
- **Selected Menu Item**: `white` (`#FFFFFF`)
  - Usage: Active menu items

---

## 🔘 Interactive Elements

### Selection States

- **Selected Item**: `#2563EB` - Bright Blue
  - Usage: Selected buttons, active states, primary CTAs

### Links

- **External Link**: `#0000EE` - Classic Blue
  - Usage: External hyperlinks

---

## 🃏 Surfaces & Backgrounds

### White Surfaces

- **White**: `#fff` (`#FFFFFF`)
  - Usage: General background, main surfaces
- **Card Item Background**: `#fff` (`#FFFFFF`)
  - Usage: Card backgrounds
- **Input Background**: `#fff` (`#FFFFFF`)
  - Usage: Input fields, form elements

### Other Surfaces

- **Tag Color**: `#d1eded` - Very Light Cyan
  - Usage: Tags, badges, pills

---

## 🎯 Semantic Colors

### Status Colors

- **Error**: `#FF0000` - Red
  - Usage: Error messages, validation errors, alerts
- **Green**: `#34B233` - Success Green
  - Usage: Success messages, confirmations, positive states

### Time of Day Indicators

- **Morning**: `#B7E4C7` - Light Green
  - Usage: Morning appointment slots
- **Afternoon**: `#FFD6A5` - Light Orange/Peach
  - Usage: Afternoon appointment slots

---

## 🖼️ UI Elements

### Borders & Dividers

- **Grey Border**: `#ccc` (`#CCCCCC`)
  - Usage: Input borders, dividers, separators

### Shadows

- **Card Item Shadow**: `#121212` - Very Dark Grey
  - Usage: Card shadows, elevation effects

### Overlays

- **Modal Overlay**: `rgba(0, 0, 0, 0.4)` - Black with 40% opacity
  - Usage: Modal backgrounds, dimmed overlays

### Special

- **Black**: `#000` (`#000000`)
  - Usage: Pure black elements when needed

---

## 🎨 Android Native Colors

These colors are used for Android-specific elements:

- **Splash Screen Background**: `#ffffff` - White
- **Icon Background**: `#ffffff` - White
- **Color Primary**: `#023c69` - Deep Navy Blue
- **Color Primary Dark**: `#ffffff` - White

---

## 💡 Implementation Guide

### CSS Variables (Recommended for Web)

```css
:root {
  /* Primary Colors */
  --gradient-start: rgba(81, 232, 239, 0.66);
  --gradient-middle: rgba(67, 144, 246, 0.2);
  --gradient-end: rgba(108, 166, 244, 0.66);
  --color-secondary: #70c1e3;

  /* Text Colors */
  --text-black: #1c1c1e;
  --text-grey: #555;
  --text-light-grey: #a9a9a9;
  --text-white: #ffffff;
  --icon-grey: #9ca3af;

  /* Interactive */
  --color-selected: #2563eb;
  --color-link: #0000ee;

  /* Surfaces */
  --bg-white: #ffffff;
  --bg-tag: #d1eded;

  /* Semantic */
  --color-error: #ff0000;
  --color-success: #34b233;
  --color-morning: #b7e4c7;
  --color-afternoon: #ffd6a5;

  /* UI Elements */
  --border-grey: #cccccc;
  --shadow-card: #121212;
  --overlay-modal: rgba(0, 0, 0, 0.4);
  --color-black: #000000;

  /* Android Specific */
  --color-primary: #023c69;
}
```

### SCSS Variables

```scss
// Primary Colors
$gradient-start: rgba(81, 232, 239, 0.66);
$gradient-middle: rgba(67, 144, 246, 0.2);
$gradient-end: rgba(108, 166, 244, 0.66);
$color-secondary: #70c1e3;

// Text Colors
$text-black: #1c1c1e;
$text-grey: #555;
$text-light-grey: #a9a9a9;
$text-white: #ffffff;
$icon-grey: #9ca3af;

// Interactive
$color-selected: #2563eb;
$color-link: #0000ee;

// Surfaces
$bg-white: #ffffff;
$bg-tag: #d1eded;

// Semantic
$color-error: #ff0000;
$color-success: #34b233;
$color-morning: #b7e4c7;
$color-afternoon: #ffd6a5;

// UI Elements
$border-grey: #cccccc;
$shadow-card: #121212;
$overlay-modal: rgba(0, 0, 0, 0.4);
$color-black: #000000;

// Android Specific
$color-primary: #023c69;
```

### JavaScript/TypeScript Object

```javascript
export const COLORS = {
  main: [
    "rgba(81, 232, 239, 0.66)",
    "rgba(67, 144, 246, 0.2)",
    "rgba(108, 166, 244, 0.66)",
  ],
  secondary: "#70C1E3",
  white: "#fff",
  selectedItem: "#2563EB",
  selectedMenuItem: "white",
  menuItem: "black",
  lightGreyText: "#A9A9A9",
  cardItemBackground: "#fff",
  cardItemShadow: "#121212",
  blackText: "#1C1C1E",
  greyText: "#555",
  whiteText: "#fff",
  inputBackground: "#fff",
  iconGrey: "#9ca3af",
  error: "#FF0000",
  externalLink: "#0000EE",
  morning: "#B7E4C7",
  afternoon: "#FFD6A5",
  black: "#000",
  greyBorder: "#ccc",
  tagColor: "#d1eded",
  green: "#34B233",
  modalOverlay: "rgba(0,0,0,0.4)",
};
```

### Tailwind CSS Configuration

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        "hola-secondary": "#70C1E3",
        "hola-selected": "#2563EB",
        "hola-primary": "#023c69",
        "hola-success": "#34B233",
        "hola-error": "#FF0000",
        "hola-morning": "#B7E4C7",
        "hola-afternoon": "#FFD6A5",
        "hola-tag": "#d1eded",
        "text-main": "#1C1C1E",
        "text-grey": "#555",
        "text-light-grey": "#A9A9A9",
        "icon-grey": "#9ca3af",
        "border-grey": "#CCCCCC",
      },
      backgroundImage: {
        "hola-gradient":
          "linear-gradient(135deg, rgba(81, 232, 239, 0.66), rgba(67, 144, 246, 0.2), rgba(108, 166, 244, 0.66))",
      },
    },
  },
};
```

---

## 🎨 Usage Examples

### Gradient Background

```css
.hero-section {
  background: linear-gradient(
    135deg,
    rgba(81, 232, 239, 0.66),
    rgba(67, 144, 246, 0.2),
    rgba(108, 166, 244, 0.66)
  );
}
```

### Primary Button

```css
.primary-button {
  background-color: #2563eb; /* selectedItem */
  color: #ffffff; /* whiteText */
  border: none;
}

.primary-button:disabled {
  opacity: 0.5;
}
```

### Card Component

```css
.card {
  background-color: #ffffff; /* cardItemBackground */
  border: 1px solid #cccccc; /* greyBorder */
  box-shadow: 0 2px 8px rgba(18, 18, 18, 0.1); /* cardItemShadow */
}
```

### Input Field

```css
.input-field {
  background-color: #ffffff; /* inputBackground */
  border: 1px solid #cccccc; /* greyBorder */
  color: #1c1c1e; /* blackText */
}

.input-field::placeholder {
  color: #a9a9a9; /* lightGreyText */
}

.input-field.error {
  border-color: #ff0000; /* error */
}
```

---

## 📱 Design Notes

1. **Gradient Usage**: The main gradient is typically used for hero sections, headers, and primary brand elements.

2. **Accessibility**: Ensure proper contrast ratios when using these colors:

   - `#1C1C1E` (blackText) on `#FFFFFF` (white) meets WCAG AAA standards
   - `#2563EB` (selectedItem) on `#FFFFFF` (white) meets WCAG AA standards
   - Always test text on colored backgrounds for readability

3. **Consistency**: Use the exact hex/rgba values provided to maintain brand consistency across mobile and web platforms.

4. **Dark Mode**: This palette is designed for light mode. If implementing dark mode, consult with the design team for appropriate dark theme variants.

---

## 📊 Color Palette Summary

| Purpose            | Color       | Hex/RGBA                    |
| ------------------ | ----------- | --------------------------- |
| Primary Gradient 1 | Cyan        | `rgba(81, 232, 239, 0.66)`  |
| Primary Gradient 2 | Blue        | `rgba(67, 144, 246, 0.2)`   |
| Primary Gradient 3 | Light Blue  | `rgba(108, 166, 244, 0.66)` |
| Secondary          | Sky Blue    | `#70C1E3`                   |
| Primary Action     | Bright Blue | `#2563EB`                   |
| Primary Text       | Near Black  | `#1C1C1E`                   |
| Secondary Text     | Dark Grey   | `#555`                      |
| Error              | Red         | `#FF0000`                   |
| Success            | Green       | `#34B233`                   |
| Morning Slot       | Light Green | `#B7E4C7`                   |
| Afternoon Slot     | Peach       | `#FFD6A5`                   |

---

**Last Updated**: January 13, 2026  
**Version**: 1.0  
**Mobile App Source**: `/src/styles/theme.js`
