# Security Specification for FinTrack

## 1. Data Invariants
- A transaction MUST have a valid `ownerId` matching the authenticated user's UID.
- A transaction MUST have an `amount` that is a positive number.
- `type` MUST be either 'income' or 'expense'.
- `date` MUST be a string in YYYY-MM-DD format (captured via server logic where possible or validated strictly).
- Users can only read and write their own transactions.
- `createdAt` is immutable after creation.
- `updatedAt` must be updated to the server time on every update.

## 2. The "Dirty Dozen" Payloads
1. **Identity Theft**: Create a transaction with `ownerId` set to a different user's UID.
2. **Shadow Field**: Add `isVerified: true` to a transaction payload.
3. **Negative Money**: Set `amount` to -100.
4. **Huge ID**: Use a 2KB string as a transaction ID.
5. **Type Poisoning**: Set `type` to "refund".
6. **Immutable Breach**: Attempt to update `createdAt` after the document is created.
7. **Orphaned Update**: Update a transaction's `ownerId` to someone else to "transfer" or hide it.
8. **Malicious Date**: Set `date` to "invalid-date-string".
9. **Resource Exhaustion**: Send a 1MB string in the `description`.
10. **Unauthenticated Write**: Attempt to create a document without being signed in.
11. **Email Spoofing**: (If using email checks) Attempt to access data using an unverified email.
12. **Cross-User Leak**: Attempt to `get` a transaction document ID belonging to another user.

## 3. The Test Runner
(A `firestore.rules.test.ts` file will be generated to verify these cases once the environment supports it, but for now we follow the rules implementation logic.)
