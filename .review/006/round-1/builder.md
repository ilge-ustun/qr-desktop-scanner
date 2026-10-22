The project page now shows the app's ready popover as a live HTML/CSS copy in front of the warning card, with its scan bar sweeping. It's one commit, `9b3dc01`, on `story/006`, and the tree is clean apart from `.review-out/`.

**What changed in `site/index.html`**
- **Order:** `.shots` holds the warning `<img>` first, unchanged, and the popover last, so it paints in front. The page no longer refers to `ready.png`; the file stays in the repo.
- **The popover:** one `div` with `role="img"` and the old alt text as its label. Its two parts are `aria-hidden`, and nothing inside can take focus. It has the title, the ⇧⌘2 chip, the viewfinder with corners, the `scanline` bar, the two-line prompt, Scan and the hint.
- **Styling:** copied from `src/styles.css`, with every rule scoped under `.popover` so the page and the copy can't restyle each other. The app's `--paper` becomes the page's `--sheet`. The chip is in Sometype Mono; the title, prompt, Scan and hint are in Silkscreen.
- **Layout:** the two sides are swapped. The warning image is held left at -3deg, and the popover right, 22% lower, at 4deg, with `overflow: hidden`.
- **Motion:** the bar uses the app's `sweep` (2.8s ease-in-out, infinite), and nothing else animates. The reduced-motion block adds the app's `animation: none !important`.

**Tests**
- **New test:** `src/__tests__/siteReadyPopover.test.ts`, 16 tests for AC1–AC4. It reads the page's rules through jsdom's CSSOM.
  - On the original page 10 of them failed, with every AC failing somewhere. Now all 16 pass, and the full vitest suite passes (74 tests).
  - `tsc --noEmit` and eslint are clean on it. I didn't run the cargo commands.
  - The test is stricter than the story in a few places. Hiding checks also cover ancestors. An animating rule must match only the scan bar. It also fails on any `<script>` or SVG animation element, and on `preserve-3d`.
- **Mutations:** I tried all 37 "Goes red when" changes against their AC's test, and every one went red. The four tdd patches are in `.review-out/mutations/`, made from the final commit:
  - AC1: popover moved behind the warning image
  - AC2: Scan drawn as a `<button>`
  - AC3: animation removed from the scan bar
  - AC4: the grid-cell rule matching only `img`

  Each turns its selector red and applies cleanly.

**For the human check.** I rendered the page in a local headless Chromium. That isn't Safari, and it isn't evidence.
- **The URL will fail one check.** The human-verification list says the warning card's label, bit.ly and URL stay uncovered. The label and bit.ly do. The URL doesn't: only "http://bit.ly/3" shows, and the rest is under the popover. This follows from AC4's exact layout: the popover's corner sits about 40% across and 30% down the warning card, and the URL is lower and runs further right. Keeping the URL clear would need a different layout, which would be a change to the story.
- **The popover is narrower and taller than the screenshot was.** The hero column is about 380px at desktop, so the popover is about 274px wide using the app's pixel sizes. The app's sheet is 354px wide.
- **Phone width (375px):** everything fits, but the title and the chip nearly touch. I removed an 8px header gap I had added; the app has none.
- **Motion:** halfway through the cycle the bar is near the bottom of the viewfinder. With reduced motion on, it stands still behind the prompt, as in the app.

Out of scope and not changed: the comment at the top of the page's `<style>` still says "tilted screenshots".
