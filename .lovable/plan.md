# Rich membership and editable collaborations

## What will be built

- Expand **Spaceos** to say it is designed for satellites and will be offered to major spacecraft and satellite companies.
- Turn the Collaborations & Projects page into an admin-curated cloud list while preserving all five existing entries and links.
- Add admin controls to create and remove collaborations, including title, category, description, link, action label, and optional dates/status.
- Add a hidden NASA interaction: after five presses on the NASA collaboration card, a spacecraft crosses a star-filled overlay and reveals **SSRA × NASA** underneath.
- Restore and complete the **Rich as hell!** membership tier:
  - Unlock for 20,000 space tokens.
  - Award 150 free space tokens once per day.
  - Display a Rich badge and membership status.
  - Support both signed-in members and guest accounts.
  - Add a clear Rich tier section and claim control on the Pro page.
- Keep existing Pro access and balances intact.

## Technical details

- Add a public-read, admin-write collaboration table through a migration, with explicit grants, row-level security, and seeded rows for the existing five collaborations.
- Fetch collaborations through a public server function; perform all changes through the existing authenticated admin console action layer.
- Add Rich membership fields and security-definer database functions for atomic unlock and daily rewards, preventing repeated claims or negative balances.
- Update account identity/wallet data so Rich status and daily rewards refresh immediately.
- Add the spacecraft sequence as a self-contained animated component with reduced-motion support and no external media dependency.
- Update route metadata and verify the collaboration page, NASA five-press sequence, Rich unlock/reward states, admin form, desktop/mobile layouts, and current build logs.

## Assumptions

- “Rich subscription” uses the previously specified 20,000-token unlock, 150-token daily reward, and Rich badge.
- Collaborations remain editorial public content; only authenticated console admins can change them.
- The spacecraft reveal is a playful on-page effect and does not navigate away from the collaboration page.
