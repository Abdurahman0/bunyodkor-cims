# Frontend Handoff — Backend changes of 2026-09-01

**Backend API:** `https://bunyodkor.api.cims.cognilabs.org`
**Deployed commit:** `c8a6517` — all three changes below are **already live in production**.
**Frontend repo:** `bunyodkor-fa-cims` (Vercel)

Three backend changes shipped today. Two of them need new UI. One of them can **break an existing screen** if the frontend isn't adjusted — start there.

> **Ground rule: do not redesign or restructure any existing screen.** Match the existing components, styling and layout conventions of the app. Add new UI only where this document says to add it. Where an existing screen needs a fix, make the smallest change that corrects the behaviour.

Every endpoint returns the standard envelope:

```jsonc
{ "data": { /* payload */ }, "meta": null }
// list endpoints:
{ "data": [ ... ], "meta": { "page": 1, "page_size": 20, "total": 1532, "total_pages": 77 } }
```

Errors are always `{ "detail": "<human readable message>" }`. Show `detail` to the user — the backend messages are written to be read by staff.

---

# ⚠️ TASK 1 — Contract number picker (BREAKING — do this first)

## What changed on the backend

Contract numbers used to be **seats**. A number like `20-2013C6` meant *seat 20, birth year 2013, group C6*. When a student left, their seat was freed and became a reusable "gap" that an admin picked from a list.

That is gone. Numbers are now a **running serial that is never reused**, and a contract number is **frozen for the life of the contract**.

**Why:** the contract number is the payment identifier. Payme and Click resolve a contract by that exact string, and families save it in their payment app. Reusing or rewriting a number breaks a family's ability to pay (`INVALID_ACCOUNT` → *"Shartnoma topilmadi"*).

## The breakage

These two endpoints still exist and still return **every key they used to**, but the gap fields are now **always empty**:

- `GET /contracts/available-numbers/{group_id}`
- `GET /contracts/available-numbers/{group_id}/{birth_year}`

Live response today:

```jsonc
{
  "data": {
    "group_id": 19,
    "group_name": "Зухриддинов Сирожиддин 2013 C3",
    "group_identifier": "C3",
    "birth_year": 2013,
    "capacity": 50,
    "used_count": 50,
    "gap_count": 0,                 // ← ALWAYS 0 now
    "gap_sequence_numbers": [],     // ← ALWAYS EMPTY now
    "gap_contract_numbers": [],     // ← ALWAYS EMPTY now
    "used_sequence_numbers": [1, 2, 3, /* … */ 50],
    "max_used_number": 50,
    "next_sequence_number": 51      // ← NEW field
  },
  "meta": null
}
```

**If the create-contract screen builds a number picker from `gap_contract_numbers`, staff now see an empty dropdown and will read it as "this group is full".** That is the thing to fix.

## What to do

Find every call to `available-numbers` in the frontend. If it is used to let the admin **choose** a contract number, replace that control.

Use this endpoint instead:

```http
GET /contracts/next-available/{group_id}
Authorization: Bearer <token>
```

```jsonc
{
  "data": {
    "next_number": 51,
    "contract_number": "51-2013C3",   // ← use this
    "message": "Next contract number for group '…' (C3)",
    "is_full": false,                 // ← headcount of ACTIVE contracts vs capacity
    "group_name": "Зухриддинов Сирожиддин 2013 C3",
    "group_identifier": "C3",
    "birth_year": 2013,
    "group_capacity": 50,
    "total_used": 49
  },
  "meta": null
}
```

**Replace the dropdown with a read-only display field** showing `contract_number`, pre-filled and not editable. There is no longer any choice to make — the next number is the only valid one. Keep the field in its current position in the form; only its control type changes (select → disabled text input).

- Block submission when `is_full` is `true`, and show the group-is-full message. `is_full` is now a plain headcount of ACTIVE contracts against `group_capacity`, unrelated to numbering — **a full group still returns a valid `next_number`**, so do not infer fullness from the number.
- Both `available-numbers` endpoints are marked `deprecated` in OpenAPI. Once the picker is gone, remove the calls entirely.

## Also expect this

Because numbers are frozen, **a student's contract number no longer describes the group they are in**. After a transfer you will legitimately see a student in group `C6` holding number `2-2013C3`, and a group roster containing mixed identifiers.

**This is correct and must not be "fixed" in the UI.** Do not sort, filter, group, or validate anything by parsing the letters out of a contract number. Treat the contract number as an opaque string everywhere. If any screen currently derives a group from the number, remove that logic and use `group_id` / `group_name` from the payload.

---

# TASK 2 — Student transfer between groups (NEW UI)

## What changed on the backend

Previously there was **no way** to move a student between groups. `PATCH /students/{id}` rejected any `group_id` change, and the only workaround (terminate the contract, then clone it) created a **duplicate student record** — leaving the student's payments and attendance stranded on the old row, showing them as a large debtor, and locking them out of the turnstile.

There is now a proper transfer that moves the student in place. Nothing is duplicated; payments, attendance, gate logs, parents and debt all stay attached; and the contract number does not change.

## New endpoint

```http
POST /students/{student_id}/transfer
Authorization: Bearer <token>
Content-Type: application/json
```

```jsonc
// request
{
  "target_group_id": 80,
  "reason": "Moved up an age group"   // optional, free text
}
```

```jsonc
// 200 response
{
  "data": {
    "student_id": 28,
    "contract_id": 20,
    "from_group_id": 19,
    "to_group_id": 80,
    "contract_number": "2-2013C3",   // UNCHANGED by design — see Task 1
    "birth_year": 2013,
    "message": "Student moved to group 80. Contract 2-2013C3 is unchanged."
  },
  "meta": null
}
```

**Permission required:** `contracts:edit`. Hide the control entirely for users without it.

### Error responses — all show `detail` to the user

| Status | When |
|---|---|
| `400` | Student is already in that group |
| `400` | Student has no active contract to transfer |
| `400` | Target group is not ACTIVE |
| `404` | Student not found |
| `404` | Target group not found |
| `409` | Student has more than one active contract (data anomaly — staff must resolve it) |
| `409` | Target group is at full capacity |
| `403` | Read-only account (see Task 3) |

## UI to add

Add a **"Transfer to another group"** action on the student detail screen, alongside the existing actions there. Do not restructure that screen — add one button in the existing action group, styled like its neighbours.

Clicking it opens a modal:

1. **Current group** — read-only, for confirmation.
2. **Target group** — a group selector. Populate from `GET /groups`. Exclude the student's current group. A group whose active-contract count has reached its capacity should be disabled with a "full" hint (use `GET /groups/{id}/capacity` → `active_contracts` / `capacity`, or filter after selection and let the 409 surface).
3. **Reason** — optional free-text input.
4. **Confirm / Cancel.**

**Transfers across birth years are allowed** — a 2013 player may move into a 2012 group. Do not filter the group list by birth year.

After a successful transfer, refresh the student detail view and show a success message. It is worth explicitly reassuring the user that the contract number is unchanged, e.g. *"Student moved to {group}. Contract number {n} is unchanged."* — staff have been trained to expect renumbering.

## Existing screen to fix

`PATCH /students/{id}` still refuses a `group_id` change, but its error message now points at the new endpoint:

> `Cannot change a student's group here. Use POST /students/{student_id}/transfer, which also moves the active contract and keeps payment and attendance history intact.`

If the student edit form exposes a group field, either remove it from that form (preferred — transfers now have a dedicated flow) or leave it disabled with a hint pointing at the transfer action. Do not send `group_id` in a `PATCH /students/{id}` body.

---

# TASK 3 — CEO read-only role (NEW UI BEHAVIOUR)

## What changed on the backend

A new **CEO** role can read every academy screen but cannot modify anything. Enforcement is server-side and absolute: **any** non-`GET` request from a read-only account is refused with

```json
{ "detail": "This account is read-only and cannot modify data" }
```

and HTTP `403`. That covers all 129 routes and any added later.

## 🚨 The one thing you must get right

`GET /auth/me` for a read-only user returns this:

```jsonc
{
  "data": {
    "user": {
      "id": 60,
      "full_name": "Bunyodkor Rahbari",
      "phone": "+998911234567",
      "is_super_admin": false,
      "roles": [
        { "id": 8, "name": "CEO", "is_read_only": true, "description": "…", "created_at": "…" }
      ]
    },
    "permissions": [
      "students:view", "students:edit", "students:manage",
      "contracts:view", "contracts:edit",
      "finance:transactions:cancel", "users:manage", "roles:manage",
      /* … 23 codes total … */
    ],
    "is_read_only": true          // ← BRANCH ON THIS
  }
}
```

**The `permissions` array deliberately contains write permissions** (`students:edit`, `contracts:edit`, `finance:transactions:cancel`, `users:manage`, …). That is intentional — it is what lets the CEO *open* every screen, including ones gated behind manage-level permissions.

**Therefore: if the app decides whether to render an edit/delete button purely from `permissions`, the CEO will see every write control in the system and every click will 403.**

The rule is:

```ts
const canWrite = (perm: string) => !me.is_read_only && me.permissions.includes(perm);
```

Apply `is_read_only` as a **global gate that runs before every permission check**. Concretely:

- Hide (do not merely disable) every create / edit / delete / terminate / assign / import / upload control.
- Hide "Add student", "Add group", "Add contract", "Manual transaction", "Mark attendance", "Transfer", "Terminate", "Archive", "Backup now" and every bulk action.
- Keep all navigation, lists, detail views, reports and exports fully visible — the CEO is meant to see everything.
- Consider a small persistent badge in the header, e.g. **"Read-only"**, so the user understands why controls are absent.

Do not build a hardcoded list of CEO-specific rules. Any role may be flagged read-only in future; `is_read_only` is the only signal.

## Two screens the CEO is deliberately blocked from

These return `403` for a read-only user even though they are `GET`s, because they are infrastructure rather than academy data:

- `GET /settings/system`
- `GET /backup/status`

Hide those nav entries when `is_read_only` is true, rather than letting them 403.

## Roles admin screen

`RoleRead` gained a field, returned by `GET /roles` and inside `/auth/me`:

```jsonc
{ "id": 8, "name": "CEO", "description": "…", "is_read_only": true, "created_at": "…" }
```

If there is a roles management screen, show this as a read-only indicator (a badge or a disabled checkbox). **It is not editable** — `RoleCreate` and `RoleUpdate` do not accept it, by design, so that a read-only role cannot be edited into a writable one through the API. Do not add a form control that tries to set it.

## Test account

```
URL:      https://bunyodkor.api.cims.cognilabs.org
Email:    bunyodkor_ceo@cognilabs.org
Phone:    +998911234567
Password: bunyodkorceo123
```

Log in as this account and walk the whole app. **Every screen should be reachable and every write control should be absent.** If you can see a button that produces a 403, that is a bug in this task.

---

# Backend changes needing NO frontend work

Listed so you know why behaviour shifted, and so nobody "fixes" them.

- **Capacity is now a headcount.** A group is full when it holds `capacity` ACTIVE contracts. It used to be computed per birth year, which allowed a 25-seat group to hold 25 players of *every* birth year. `GET /groups/{id}/capacity` is unchanged in shape.
- **Numbers are never reused.** A departed student's number is retired permanently. `next_number` only ever moves forward.
- **Group Excel export** (`GET /groups/{id}/export-students`) now prints the contract number as stored, instead of rebuilding it from group + sequence. Terminated contracts correctly show their `-T-` suffix, and transferred students show the number they actually hold. Same file format, same columns.
- **The turnstile no longer 500s.** A student with two overlapping active contracts used to crash `POST /gate/callback`; it now returns a normal allow/deny.
- **Duplicate-clone protection.** `POST /contracts/clone-from-terminated` now returns `409` if that terminated contract was already cloned. Previously a double-click created a duplicate student and doubled their debt. If any screen calls this endpoint, make sure the button is disabled while the request is in flight, and surface the `409` message rather than treating it as a crash.
- **Concurrency conflicts return `409`, not `500`.** Contract creation and cloning now report "that number was just taken" as a conflict. On a `409` from those endpoints, re-fetch `next-available` and let the user retry.

---

# Suggested order of work

1. **Task 1** — fix the number picker. This is the only change that breaks something currently working.
2. **Task 3** — the `is_read_only` gate. Cheap, and the CEO account is already live and in use.
3. **Task 2** — the transfer UI. Purely additive.

## Definition of done

- [ ] Create-contract flow works with no gap picker; number is displayed read-only from `next-available`.
- [ ] No frontend code parses group information out of a contract number.
- [ ] Logged in as the CEO account: every screen reachable, zero write controls visible, no 403 reachable by clicking.
- [ ] `settings/system` and `backup/status` nav hidden for read-only users.
- [ ] Transfer action present on the student screen, gated on `contracts:edit`, with all error `detail`s surfaced.
- [ ] Transfer works across birth years.
- [ ] No existing screen restructured; visual diff limited to the areas named above.

## Verifying against the live API

The backend is deployed and stable — you can develop straight against `https://bunyodkor.api.cims.cognilabs.org`. Use the CEO account for read-only testing. **For write testing, use a staff account — do not perform test transfers on real students**, since a transfer changes live group membership. If you need a throwaway student, ask the backend side to set one up rather than moving a real one.
