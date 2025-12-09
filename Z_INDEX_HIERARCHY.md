# Z-Index Hierarchy - Bunyodkor Academy

All z-index values across the application have been standardized to ensure proper layering.

## Z-Index Layers (from lowest to highest)

| Layer | Z-Index | Component | Purpose |
|-------|---------|-----------|---------|
| **Developer Tools** | z-[9970] - z-[9972] | DevTools toggle, backdrop, panel | Development environment tools |
| **Sidebar (Mobile)** | z-[9980] - z-[9985] | Mobile sidebar overlay & sidebar | Navigation sidebar on mobile |
| **Language Dropdown** | z-[9990] - z-[9991] | Language selector backdrop & dropdown | Language selection |
| **Profile Dropdown** | z-[9992] - z-[9993] | Profile dropdown backdrop & menu | User profile menu |
| **Dialogs** | z-[9995] - z-[9996] | Dialog backdrop & content | Modal dialogs (roles, users, students, etc.) |
| **Import Dialog** | z-[9997] - z-[9998] | Import dialog backdrop & content | File import functionality |
| **Notifications** | z-[9998] - z-[9999] | Notifications backdrop & dropdown | Notification center |

## Fixed Components

### 1. NotificationsDropdown.tsx
- **Changed from:** `absolute` positioning with `z-50`
- **Changed to:** `fixed` positioning with dynamic placement
- **Backdrop:** `z-[9998]`
- **Dropdown:** `z-[9999]`
- **Result:** Now appears above all other elements including inputs

### 2. Dialog Component (dialog.tsx)
- **Backdrop:** `z-50` → `z-[9995]`
- **Dialog Container:** `z-50` → `z-[9996]`
- **Result:** All dialogs now have consistent high z-index

### 3. ImportDialog.tsx
- **Backdrop:** Already fixed at `z-[9997]`
- **Dialog:** Already fixed at `z-[9998]`
- **Result:** Import dialogs appear above regular dialogs

### 4. DashboardLayout.tsx
#### Mobile Sidebar
- **Overlay:** `z-40` → `z-[9980]`
- **Sidebar:** `z-50` → `z-[9985]`

#### Language Dropdown
- **Backdrop:** `z-40` → `z-[9990]`
- **Dropdown:** `z-50` → `z-[9991]`

#### Profile Dropdown
- **Backdrop:** `z-40` → `z-[9992]`
- **Dropdown:** `z-50` → `z-[9993]`

### 5. DevTools.tsx
- **Toggle Button:** `z-50` → `z-[9970]`
- **Backdrop:** `z-40` → `z-[9971]`
- **Panel:** `z-50` → `z-[9972]`

## Benefits of This Hierarchy

1. **No More Conflicts:** Notifications and dropdowns always appear above inputs and other elements
2. **Predictable Layering:** Clear hierarchy from base UI to top-level overlays
3. **Easy Maintenance:** Documented z-index values make future updates simpler
4. **Consistent UX:** All overlays and modals follow the same stacking rules

## Usage Guidelines

When adding new components:
- **Base UI elements:** No z-index needed
- **Dropdowns/Popovers:** Use z-[9990] range
- **Modal Dialogs:** Use z-[9995] - z-[9996]
- **Special Overlays (Import, Notifications):** Use z-[9997] - z-[9999]
- **Always use backdrop z-index 1 less than the content**

