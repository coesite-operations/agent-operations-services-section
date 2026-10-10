---
name: specifications
description: Specifies §1 abstract.
title: "Specifications"
status: draft
version: "2026.05.14.specifications"
date: 2026-05-14
authors: [emsenn, claude-opus-4-7]
references:
  emsenn2026-05-14:
    class: report
    authors: ["Sennhauser, Morgan"]
    year: 2026
    title: "Order to restructure work/governance/ staff and encode preferences as RFC specifications"
    institution: "561 polity"
    note: "Verbal directive issued 2026-05-14"
---

# Specifications

## §1 Abstract

This document specifies what a *specification* is within the 561 substrate, scoped to Rom Keldar's rules.
A specification is a normative document, written in RFC-2119 language, that declares what some named substrate object MUST, SHOULD, or MAY contain or do.
Specifications are derivation sources for other records; they do not themselves perform work.

## §2 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## §3 Form

A specification file MUST:

1. Carry frontmatter with `type: specification`, a `version:` string, a `date:`, and an `authors:` list.
2. Cite at least one source in `references:` when the spec is derived from an authoritative order, prior art, or external standard.
3. Use RFC-2119 keywords (MUST, SHOULD, MAY, ...) in the body wherever a requirement, recommendation, or permission is asserted.

A specification file SHOULD:

1. Open with a §1 Abstract section stating the spec's scope in one paragraph.
2. Include a §2 Conformance section referencing RFC 2119.
3. Use section-numbered headings (§3, §4, ...) so requirements can be cited stably.

A specification file MAY:

1. Carry `status: draft | stable | deprecated`.
2. Include `supersedes:` and `derives-from:` lists in frontmatter.
3. Include §N What this specification does not decide, scoping out related concerns.

## §4 Citation of authoritative orders

When a specification encodes a directive from a named principal (e.g., emsenn), the file MUST carry that directive in `references:` frontmatter with a citekey of form `<surname><YYYY-MM-DD>` and a `note:` indicating it was a verbal or written order with the date issued.
Body text invoking the directive SHOULD do so as `[Author YYYY-MM-DD]` so the binding is visible in prose.

## §5 Acceptance

A specification is **conformant** if it satisfies all MUST clauses of §3 and §4.
A specification is **stable** when its `status:` is set to `stable` and it has not been superseded.

## §6 What this specification does not decide

- The substantive content of any particular spec.
- The location of specifications outside `work/governance/.../rules/specifications/`.
- The promotion process from `draft` to `active`.

This specification derives from [emsenn 2026-05-14], which directed the encoding of substrate-structure preferences as RFC-style specifications.
