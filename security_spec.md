# Security Specification & Test-Driven Development (TDD) Blueprints

## 1. Data Invariants

1. **User Profile**: A user profile must match the actual authenticated User ID (`uid`). Users cannot register accounts on behalf of other authentication IDs.
2. **Favorites**: Each favorite must relate strictly to the logged-in user. No user can read, update, or delete another user's favorite episodes.
3. **Reviews**: Community reviews must be written with the creator's correct verified User ID. No user can edit or delete reviews belonging to others. Rating values must be strictly bounded between 1.0 and 10.0.
4. **Custom Shows**: Custom shows support both guest submissions and registered user submissions. They must strictly adhere to the updated season (max 1000) and episode (max 25000) limits.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 JSON payloads designed to violate system properties, returning `PERMISSION_DENIED`.

### Pillar 1: Identity Impersonation (Collection: users)
*   **Payload 1**: Creating a user profile where `id` is a different user's UID.
*   **Payload 2**: Overwriting another user's profile with personal data.

### Pillar 2: Favorites Tampering (Collection: favorites)
*   **Payload 3**: Saving a favorite episode pointing to another user's `userId`.
*   **Payload 4**: Modifying another user's existing favorite list.
*   **Payload 5**: Deleting someone else's saved episode.

### Pillar 3: Review Integrity & Value Poisoning (Collection: reviews)
*   **Payload 6**: Rating an episode with a value of `-5` (underflow).
*   **Payload 7**: Rating an episode with a value of `99` (overflow).
*   **Payload 8**: Injecting a 1MB huge string into the `comment` field.
*   **Payload 9**: Attempting to edit or overwrite another user's review comment.

### Pillar 4: Custom Blueprints Manipulation (Collection: custom_shows)
*   **Payload 10**: Attempting to create a custom show with `2000` seasons (violating the `1000` cap).
*   **Payload 11**: Attempting to create a custom show with `30000` episodes (violating the `25000` cap).
*   **Payload 12**: Deleting a registered custom show that does not belong to the active user.

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)

```typescript
// Standard Test Declarations for Firestore security validation
describe("Firestore Security Rules Tests", () => {
  it("forces denial on all 12 'Dirty Dozen' malicious payloads", () => {
    // Assert all payloads return PERMISSION_DENIED
  });
});
```
