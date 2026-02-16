
# Fix: Global Impact "2,400,000+" Overflow

## Problem
The "2,400,000+" text in the Hours Volunteered card overflows its grid cell. The current styling uses `whitespace-nowrap` with `text-2xl sm:text-3xl md:text-4xl`, which doesn't account for the character length of large numbers in a 4-column (or 2-column on mobile) grid.

## Solution
Modify `src/components/GlobalImpact.tsx` to:

1. **Remove `whitespace-nowrap`** -- this forces the number onto one line even when it doesn't fit.
2. **Use adaptive font sizing** based on the value's magnitude:
   - Values >= 1,000,000: use `text-xl sm:text-2xl md:text-3xl`
   - Values >= 10,000: use `text-2xl sm:text-3xl md:text-4xl`
   - Smaller values: use `text-3xl sm:text-4xl md:text-5xl`
3. **Add `overflow-hidden` and `min-w-0`** to the card as safety nets to prevent any remaining overflow from breaking the grid.

## Technical Details

**File: `src/components/GlobalImpact.tsx`**

- Line 32: Replace the static className with a dynamic one that checks `stat.value` to pick the right text size class.
- Remove `whitespace-nowrap` from the number container.
- Add `min-w-0` to the card div to ensure CSS grid respects boundaries.

This is a single-file, 2-line change that fixes the overflow without affecting the other three stat cards.
