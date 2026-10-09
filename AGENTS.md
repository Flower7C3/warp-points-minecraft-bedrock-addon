# warp-points

Warp point system: create, edit, delete, teleport. **67 icons across 7
categories**: buildings (20), resources (11), special (10), villages (7),
landscapes (7), waterscapes (7), cityscapes (5).
Authors: Flower7C3 + Hajsori (original add-on author).
Namespace `warps:`. Version 3.7.4 — the highest major in the set.

## Entry point

All logic in `BP/scripts/warps.js` (~3800 lines). Manifest entry is
`scripts/main.js`; check which file the manifest actually points at before
assuming `warps.js` is the entry.

## Commands

```
warps:warp_add     (alias wa)  name, translation_pattern, sign_mode,
                                 sign_material, icon, location
warps:warp_remove
warps:warp_tp      (alias wtp)
```
`warp_add` takes **six** parameters, not five — `icon` is fifth and the
location sixth. The `/warps add <name> <icon> <x> <y> <z>` form in the README
does not match the code.

Admin tag `warpsAdmin` (`WARPS_ADMIN_TAG`) allows editing every warp regardless
of owner or visibility.

Warps live in world dynamic property `warps:data`.

## Features

- Filter by category; sort by distance or alphabetically.
- Distance and direction arrows relative to **the player's view direction**,
  not world north, with yaw conversion for Bedrock.
- Sign generation from warp names — no explicit length cap in code. The real
  limits are `MAX_DYNAMIC_PROP_LENGTH = 32000` and a 50-character name limit.
  **The "512 characters" in the README is not implemented anywhere.**
- Translations `pl_PL` and `en_US`. `en_US` has **one key more** than `pl_PL`
  (`warps:field.sign_type.label`), so they are not aligned.

## Conventions

- Subpacks in BP: `tests_disabled` (memory_tier 0) and `tests_enabled`
  (memory_tier 1) — the only project using subpacks, implementing the
  `has_test_workflow` flag.
- Module versions: script `[3,7,3]`, data `[1,0,0]`, resources `[1,0,0]`.
- `package.json` is named `minecraft-scripting-samples` (Mojang template
  leftover, not the project name).
- README has a "Recent changes" section of 7 bugfix bullets — treat it as a
  changelog and update it for significant fixes.

## Known issues

- ⚠️ **`warps:data` is shared with the `vehicles` add-on** (the taxi looks up
  warp names there). Changing the format here breaks that, and vice versa.
- **The README is out of date**: it declares Bedrock 1.17.0+ with server
  2.1.0 / server-ui 2.0.0; the manifest has 1.26.20 with 2.10.0 / 2.2.0.
- **There is no `config.json` in this project.** (Earlier notes claiming a
  `bridge` namespace mismatch were wrong — there is no config to mismatch.)
- `verify_all.py` deliberately omits `verify_translations` and `verify_textures`
  because the test subpacks would break them.
- This `minecraft_check.py` variant has the corrected `minecraft:icon`
  handling (`isinstance(icon_data, dict)`) that the others lack.
- `.nvmrc` here is `v20.20.0`; `projects/.nvmrc` is `20`. Different values.