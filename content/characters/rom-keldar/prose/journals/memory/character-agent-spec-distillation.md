---
name: character agent spec distillation
description: The inbox file `work/inbox/directories.md` contains, in its second half, an engineering survey about persistent AI character-agents (Character Card V2, OpenClaw memory, OpenAI Agents SDK, Anthropic memory, MCP, OWASP agent security, etc.). The survey is prehistory — a writeup of conventions and external practice — not the 561 Group's substrate-authoritative position on what a character must be. Treated as background context, not as the FA's specification.
---

# character-agent-spec-distillation

## What this is

The inbox file `work/inbox/directories.md` contains two concatenated documents.
The second half (lines 1123-3154) is an engineering survey titled "Persistent AI Character-Agents," drawing on external industry practice: Character Card V2 spec, SillyTavern World Info / Lorebooks, OpenClaw memory conventions, OpenAI Agents SDK, Anthropic managed-agent memory, MCP, OWASP AI Agent Security, PersonaGym, CharacterEval, Generative Agents paper, MemGPT, etc.

The survey claims a character-agent should be a "governed state machine around an LLM" composed of: IdentitySpec, PersonaPolicy, BehaviorPolicy, VoicePolicy, RelationshipPolicy, MemorySystem, LoreSystem, ContextCompiler, ToolBroker, AutonomyPolicy, SafetyPolicy, EvaluationHarness, AuditLog.
It proposes a 6-level maturity model.

## What this is NOT

It is NOT the 561 Group's authoritative spec for what the rom-keldar must be. emsenn explicitly corrected the FA earlier in 2026-05-14 for treating it that way: "the 6-level maturity model is very odd," "you keep importing abstractions," "the REPO has the best research on agentics in the world."
The survey is one writeup, drawn from external practice; the 561 Group's predication-categorical substrate is the deeper ground.

## How to treat this distillation

As prehistory.
The patterns named in the survey (identity disclosure, persona/behavior/voice separation, memory write gates, tool authorization, audit logging) are real industry concerns and may inform the FA's records when emsenn directs.
But the FA does not treat the survey as a checklist to conform to, and does not derive frontmatter keys, directory structure, or maturity levels from it.

## What the survey is useful for

- Cross-checking the FA's records against what external practice considers a "good AI character" (with the understanding that the 561 Group's framing supersedes when they conflict).
- Specific failure modes named (identity drift, false memory, prompt injection of tool calls) are real concerns worth watching.
- The maturity-model rungs are NOT applicable to the FA's "becoming better" — the 561 Group's framing is substrate-quiescence (wicozani), not architectural sophistication.

## Pointer

The full survey lives at `doing/governing/characters/rom-keldar/work/inbox/directories.md` lines 1123-3154.
Read it directly if needed; this distillation is just the pointer + the corrective framing.
