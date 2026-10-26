# Account lifecycle rollout and legacy review

This is a local implementation and migration plan. It authorizes no production write, account deletion, rules deployment, or restriction change.

## Canonical ownership

The Admin Web server `/api/accounts/lifecycle` verifies Firebase tokens against current Auth records. It creates fresh student profiles, initiates self-deletion, and applies staff restrictions. Clients cannot select a deletion origin. Administrator operations require the current permitted Firestore role, a verified email, a matching signed OTP session, and an active account; permanent removal requires System Administrator role. Student deletion requires verified institutional email and login within five minutes. Registration retains the existing verification and OTP onboarding gates; an unverified new Auth user can initialize a profile but cannot use protected backend services.

`account_lifecycle/{SHA256(normalized institutional email)}` is server-only, with UID, state, and updatedAt. Email hashes are pseudonymous personal data, not anonymous data. Retain them only for the documented restriction/identity purpose; owner approval of retention duration and deletion policy is required before rollout. No raw email or credential belongs in logs or migration output.

States: ACTIVE, SELF_DELETE_PENDING, SELF_DELETED, ADMIN_REMOVED, ADMIN_DISABLED. Unknown states fail closed. Only a server-completed SELF_DELETED state permits a different UID to create a fresh profile. A new UID never inherits the old user's profile, onboarding, resume pointers, preferences, or subcollection access. Existing active profiles can recover idempotently. The backend checks current profile restrictions and the email registry on every protected student request, including tokens for deleted or replacement Auth identities.

## Ordered deletion and failure behavior

1. Transactionally record SELF_DELETE_PENDING and replace the own profile with a protected self-origin tombstone.
2. Delete the existing four user-owned Firestore subcollections through Admin SDK, then delete the old Auth identity.
3. Transactionally mark SELF_DELETED only if the pending state still belongs to that UID. A concurrent administrator restriction wins.
4. Local photo/resume cleanup and logout follow successful server completion.

Any server failure returns an error and keeps registration blocked. Retrying while the Auth identity exists is idempotent at the server boundary. If Auth deletion succeeds but finalization fails, or the client loses access after the tombstone appears, an owner must inspect the pending record and complete recovery with trusted tooling. There is no claim of automatic client recovery in that case. Do not clear a pending state merely because the client reports success. Existing server/storage retention outside the four previously deleted user subcollections is not expanded by this change; review retained global/storage data against the project's privacy policy before release.

## Required legacy migration (not executed)

Older self and admin deletions both erased email and origin. A removed record alone cannot establish voluntary deletion. Never infer SELF_DELETED from `isDeleted`, a missing Auth user, a display name, or client input.

1. Back up with established restricted administrative procedures. Perform a read-only inventory in a non-production rehearsal first.
2. Link active, disabled, and removed profiles to authoritative Auth email/UID only when that link still exists. Index known active/disabled restrictions before enabling new registration.
3. Use trusted audit evidence to classify administrator removals and restrictions. Ambiguous records require manual owner review; do not silently allow recreation.
4. Email-less tombstones whose Auth identity is gone cannot be mapped reliably. Reconcile with separately retained trusted records or leave general new enrollment closed. Do not manufacture an email or removal reason.
5. Only after every potentially restricted legacy identity is protected, an authorized owner may set server-only `account_lifecycle_control/migration.legacyReviewComplete = true`. This defaults to absent/false and blocks unknown new identities. Explicit trusted SELF_DELETED identities can recreate without that general flag.
6. Rehearse rules using the Firebase emulator and test Auth/Firestore failure injection, then deploy route/backend/rules/mobile together under separate authorization. Old mobile builds directly creating/deleting profiles will be incompatible with the new rules; plan a controlled client rollout.

No migration executor is supplied: resolving ambiguous historical identity requires owner evidence and a retention decision, not an automatic destructive script.

## Acceptance evidence and privileged metadata

The isolated acceptance run uses project `demo-airis-acceptance` and exact loopback Auth/Firestore hosts. It exercises the actual lifecycle handler, SDK deletion/recreation, client rules, transaction retries and post-Auth finalization failure. Synthetic owner recovery verifies Auth absence, pending UID, and the self-origin deleted profile before a guarded emulator-only transaction; this does not authorize production repair or make client recovery automatic.

Rules now reserve both `role` and `assignedProgram` to trusted server administration. Emulator reproduction showed that allowing staff to edit those fields would let a coordinator promote their role or reassign their own program before invoking lifecycle actions. Ordinary own-profile updates and authorized staff reads remain covered. No current UI writer for privileged role/program assignment was found; do not add a direct-client writer as a rollout shortcut.

The Python acceptance launcher supplies anonymous credentials only after asserting the exact demo project and loopback emulator hosts. It is a test bootstrap, not a production credential fallback, and must not be used as the deployment entry point. Real Google OAuth consent and native provider interaction remain distinct from Auth-emulator Google credential simulation and the mobile provider-aware regression tests.

## Current owner rollout decision

The owner confirmed that neither the retention period nor the legacy-identity review has been formally approved/completed. Retain the fail-closed registration gate. Do not set `legacyReviewComplete=true`, enable general new enrollment, or describe general registration as fully live until both requirements are addressed. Existing authorized-account access and explicitly trusted lifecycle transitions remain subject to the server checks above.
