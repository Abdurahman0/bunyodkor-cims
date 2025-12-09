# Mock Data Guide - Bunyodkor CIMS

## Overview

This project uses **MSW (Mock Service Worker)** for API mocking, allowing full frontend development without a backend. MSW intercepts HTTP requests at the network level, providing realistic API responses with simulated latency.

## Quick Start

### Enable Mock API

```bash
# Edit .env.development
VITE_USE_MOCK_API=true
```

Then run the development server:

```bash
npm run dev
```

### Disable Mock API (Use Real Backend)

```bash
# Edit .env.development
VITE_USE_MOCK_API=false
```

Make sure your backend is running at the URL specified in `VITE_API_URL`.

---

## Seed Credentials

Use these credentials to login when Mock API is enabled:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | admin@bunyodkor.uz | admin123 | All permissions (*) |
| **Teacher** | teacher@bunyodkor.uz | teacher123 | students.view, groups.view, attendance.* |
| **Manager** | manager@bunyodkor.uz | manager123 | students.*, groups.*, contracts.*, transactions.* |

---

## Mock Data Features

### ✅ Fully Implemented Endpoints

#### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - User logout

#### Students
- `GET /students` - List students (pagination, search, filters)
- `GET /students/:id` - Get single student
- `POST /students` - Create student
- `PUT /students/:id` - Update student
- `DELETE /students/:id` - Delete student

#### Groups
- `GET /groups` - List groups (pagination)
- `GET /groups/:id` - Get single group
- `POST /groups` - Create group

#### Transactions
- `GET /transactions` - List transactions (pagination, filters)
- `GET /transactions/:id` - Get single transaction
- `POST /transactions` - Create transaction

### 🔄 Simulated Behaviors

- **Network Latency**: 300-800ms delays per request
- **Error Responses**: 401, 403, 404, 500 status codes
- **Token Validation**: Checks Authorization header
- **Pagination**: Full support with page, page_size, total
- **Filtering**: Search by name, status, group_id, etc.
- **Validation**: Form validation and error messages

### 📊 Data Volumes

- **Students**: 100 records
- **Groups**: 30 records
- **Transactions**: 500 records
- **Users**: 3 test accounts (admin, teacher, manager)

---

## Customizing Mock Data

### Add More Students

```typescript
// src/mocks/data/students.mock.ts
export const MOCK_STUDENTS_DB = generateMockStudents(200) // Increase count
```

### Create Custom Scenarios

```typescript
// src/mocks/data/students.mock.ts
export const MOCK_STUDENTS_DB = [
  // Specific test case
  generateMockStudent({
    first_name: 'John',
    last_name: 'Doe',
    status: 'active',
    phone: '+998901234567',
  }),
  // Generate rest
  ...generateMockStudents(99)
]
```

### Add New Endpoints

```typescript
// src/mocks/handlers/reports.handlers.ts
import { http, HttpResponse, delay } from 'msw'

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return url.replace(/\/api$/, '')
}

export const reportsHandlers = [
  http.get(`${getApiUrl()}/reports/revenue`, async () => {
    await delay(600)
    return HttpResponse.json({
      totalRevenue: 50000000,
      monthlyRevenue: 8000000,
      chartData: [
        { month: 'Jan', revenue: 5000000 },
        { month: 'Feb', revenue: 8000000 },
        // ...
      ]
    })
  })
]

// Add to src/mocks/handlers/index.ts
import { reportsHandlers } from './reports.handlers'

export const handlers = [
  ...authHandlers,
  ...studentsHandlers,
  ...groupsHandlers,
  ...transactionsHandlers,
  ...reportsHandlers, // NEW
]
```

---

## Testing Edge Cases

### Simulate Errors

```typescript
// Temporarily modify handler to return error
http.post(`${getApiUrl()}/students`, async () => {
  await delay(500)
  return HttpResponse.json(
    { detail: 'Database connection failed' },
    { status: 500 }
  )
})
```

### Simulate Slow Network

```typescript
http.get(`${getApiUrl()}/reports/heavy`, async () => {
  await delay(5000) // 5 seconds
  return HttpResponse.json(bigDataSet)
})
```

### Simulate Authentication Errors

```typescript
http.post(`${getApiUrl()}/auth/login`, async () => {
  await delay(800)
  return HttpResponse.json(
    { detail: 'Account is locked' },
    { status: 403 }
  )
})
```

---

## Developer Tools Panel

When running in development mode, you'll see a **database icon** in the bottom-right corner.

Click it to:
- View current API mode (Mock vs Real)
- See test credentials
- Get quick info about mock data

---

## API Request Flow

### With Mock API Enabled

```
User Action → API Client → MSW Intercepts → Mock Handler → Fake Data Generated → Response
```

### With Real API

```
User Action → API Client → Real Backend → Database → Response
```

The beauty of MSW is that **your frontend code doesn't change** - it always uses the same `apiClient` from `src/lib/api-client.ts`.

---

## Console Logging

When Mock API is enabled in development, you'll see logs like:

```
🔵 [MOCK API] POST /auth/login
🟢 [MOCK API] Response: { access_token: "mock_token_1_...", ... }
```

This helps you understand which requests are being mocked.

---

## Production Build

Mock API is **automatically disabled** in production builds. The MSW worker won't be initialized, and your app will connect directly to the real backend.

```bash
npm run build
```

Environment variables from `.env.production` are used, which sets:
```
VITE_USE_MOCK_API=false
```

---

## Troubleshooting

### Issue: "Failed to fetch" errors

**Solution**: Check that MSW is initialized correctly in `src/main.tsx` and the service worker file exists in `/public/mockServiceWorker.js`.

### Issue: Mock API not working

**Solution**:
1. Verify `VITE_USE_MOCK_API=true` in `.env.development`
2. Check browser console for MSW initialization message
3. Clear browser cache and reload

### Issue: Token expired errors

**Solution**: Logout and login again. Mock tokens are valid for the session but stored in localStorage, which may cause issues if you switch between mock and real APIs.

### Issue: Can't connect to real backend

**Solution**: Make sure:
1. Backend is running
2. `VITE_API_URL` points to correct backend URL
3. `VITE_USE_MOCK_API=false` in `.env.development`
4. CORS is configured on backend

---

## File Structure

```
src/
├── mocks/
│   ├── browser.ts                 # MSW worker setup
│   ├── handlers/
│   │   ├── index.ts               # Combine all handlers
│   │   ├── auth.handlers.ts       # Auth endpoints
│   │   ├── students.handlers.ts   # Student endpoints
│   │   ├── groups.handlers.ts     # Group endpoints
│   │   └── transactions.handlers.ts
│   └── data/
│       ├── auth.mock.ts           # User data & credentials
│       ├── students.mock.ts       # Student data generator
│       ├── groups.mock.ts         # Group data generator
│       └── transactions.mock.ts   # Transaction data generator
├── lib/
│   └── api-client.ts              # Axios instance (works with both)
└── main.tsx                       # MSW initialization
```

---

## Best Practices

1. **Always test with Mock API first** - Faster iteration, no backend dependency
2. **Test with Real API before deploying** - Ensure integration works
3. **Use realistic data** - Faker.js generates real-looking data
4. **Simulate errors** - Test error handling in your UI
5. **Keep mock handlers in sync** - Update when backend API changes
6. **Document new endpoints** - Add to this guide when creating new handlers

---

## FAQ

**Q: Do I need a backend to develop?**
A: No! With Mock API enabled, you can develop the entire frontend offline.

**Q: Will mock data persist across reloads?**
A: Mock data is stored in memory during the session. Creating/updating records will persist until you refresh the page.

**Q: How do I add a new mock endpoint?**
A:
1. Create data generator in `src/mocks/data/`
2. Create handler in `src/mocks/handlers/`
3. Add handler to `src/mocks/handlers/index.ts`

**Q: Can I use both mock and real APIs at the same time?**
A: Not recommended. Choose one mode per session. MSW is configured with `onUnhandledRequest: 'bypass'`, so unmocked requests will go to the real backend, but this can cause confusion.

**Q: How do I know which API mode I'm using?**
A:
- Check the DevTools panel (database icon in bottom-right)
- Look for MSW console logs (blue dots)
- Login page shows "Mock API Active" banner

---

## Next Steps

Now that you understand the mock data system:

1. **Explore the codebase**: Check `src/mocks/` to see how it works
2. **Login and test**: Use `admin@bunyodkor.uz / admin123`
3. **Develop features**: Build UI components without waiting for backend
4. **Add more mock data**: Customize data generators for your needs
5. **Switch to real API**: When backend is ready, flip the env var

Happy coding! 🚀
