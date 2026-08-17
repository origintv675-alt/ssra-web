# Full test pass: Tormentor + admin console

Goal: verify the whole haunt sequence end to end in a real browser against the running site, plus the password gates and the recent fixes (25s chase, no click-blocking, targeting only one visitor).

## What gets tested

1. Admin gates
   - Unleashing the tormentor with a wrong password is rejected; only `SCARE1hide` works.
   - Shutdown window with a wrong password is rejected; only `SHUTD0wN` works.
   - Non-admin visitors cannot reach the admin actions.

2. Targeting isolation
   - Target one browser session; a second, separate browser session on the same machine/IP stays completely normal (no darkness, no HUD).

3. The sequence, in order
   - Darkness + red RUN text + countdown appears, lasts ~25s.
   - During the chase the page is still clickable and navigable between pages.
   - Hand shoves in and cracks the glass panel.
   - Face peeks from the darkness.
   - "SITE OFFLINE" cut appears.

4. Ruined aftermath
   - After reload, the target's site is pitch dark, canvases/3D scenes gone, animations frozen, skulls/organs/blood/cracked panels present.
   - Persists across navigation and reloads for that visitor only.

5. The trap
   - Target navigates away from the page they hid on, then returns to it: IP ban fires and the severed-connection screen shows.
   - Confirm the ban row exists in the database and that a fresh session from a different identity is unaffected.

6. Cleanup
   - Clear the test haunt, unban the test IP/account so nothing is left blocked.

## Technical notes

- Driven with Playwright headless (two independent browser contexts for target vs bystander), screenshots at each stage saved under `/tmp/browser/haunt-test/`.
- Stage progression checked both visually and via the `haunts` row (`stage`, `ruined`, `left_origin`, `banned`) and `banned_ips`.
- Timings measured from the countdown start to assert the ~25s window.
- No product code changes are part of this plan; if a test fails I report the failure and propose the fix separately.
