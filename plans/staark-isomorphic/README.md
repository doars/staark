# `staark-isomorphic` security and performance plan

## Goals

- Ensure server-rendered HTML cannot be changed by untrusted text or attribute
  values.
- Keep rendering behavior consistent between `stringify` and `stringifyPatch`.
- Avoid introducing unnecessary allocations in the escaping path.

## Issue 1: Repeated string concatenation for large trees

**Priority:** Low

Recursive rendering repeatedly appends to a string. Modern engines optimize
many of these operations, so this should be measured before changing it.

This is measurement work, not a required rewrite. Escaping and shared-renderer
behavior are already covered by regression tests.

### Resolution

1. Add deterministic fixtures for broad sibling lists, deep nesting,
   attribute-heavy elements, escaped text, and memo-expanded views. Include
   small, medium, and large sizes without constructing fixtures while timing.
2. Compare concatenation with a private experimental fragment-array renderer.
   Both variants must return byte-identical HTML and abstract trees.
3. Warm up both variants, alternate execution order, report median and
   variability, and test the minimum supported Node version plus the current
   development version.
4. Measure memory where practical; a marginally faster implementation with a
   material memory increase is not automatically an improvement.
5. Keep concatenation unless the alternative improves the median by at least
   10% in two representative large fixtures, regresses no fixture by more than
   5%, and does not materially increase memory. Record a no-change result too.

### Verification

- Run the security regression cases against both benchmark variants.
- Check byte equality for escaped text and attributes, SVG, custom elements,
  boolean attributes, classes, styles, and memo output.
- Keep benchmark code outside published runtime entry points and bundles.

### Completion criteria

- All dynamic text and attribute output is contextually escaped.
- Both public stringify paths share the same security behavior.
- Security regression tests cover the relevant HTML contexts.
