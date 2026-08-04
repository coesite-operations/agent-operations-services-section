---
title: "Note on the kernel offices of a software node micro-enterprise"
date-created: 2026-07-15
type: note
subject: the roster of offices inside a node micro-enterprise's kernel, derived from Huawei's IPD as adopted from IBM
sources: Huawei Product Security Baseline whitepaper; IPD体系缩略语 glossary; 《华为研发》(张利华); Cambridge UP, The Management Transformation of Huawei, ch. 3
status: drafted-for-canonization
---

This note maps the offices of a node micro-enterprise's kernel before any of them are seated.

It exists because the firm has a hull and no kernel. The Rendanheyi library defines the node micro-enterprise, its three rights, its chain-group contract, and its market exposure — twenty-one terms, well researched. The Huidu Guanli library defines direction, law, technique, and positional power, plus four Huawei governance offices — the spiritual leader, the rotating chairman, the mentor, the internal lecturer. Between them they say what a node *is* and who rules the firm. Neither says who does the engineering work inside a node, and the tree confirms it: `IPMT`, `PDT`, `LPDT`, `PQA`, `CMO`, `RMT` return zero defining nodes. The offices that exist at ecosystem scope today — `scribe`, `triage`, `witness`, `registrar-of-the-record` — were derived from a session's own felt process rather than from any firm, which is why none of them carries a name a working engineer would recognize.

The correction is not to invent fewer offices. It is to stop inventing them. Every function those four reach for is a real office at Huawei with a real name, a real reporting line, and a real published constraint. This note names them.

## 1. Where the kernel comes from

Huawei bought its kernel. Ren Zhengfei brought IBM in beginning in 1998 to install Integrated Product Development (集成产品开发) at a cost in the billions, for one sentence: 把天才个人的能力，沉淀成组织的流程，让平庸的人按流程也能打胜仗 — *sediment the genius individual's capability into the organization's process, so that mediocre people following the process can still win battles.*

That sentence is this note's whole warrant. A firm whose capability lives in one person's judgment has no kernel; it has a person. The offices below are what that capability looks like once it has been sedimented into positions that outlive whoever stands in them.

The accompanying discipline is 流程不是咨询顾问发明的，是从企业自己打过的胜仗里"固化"出来的 — process is not invented by the consultant; it is hardened out of the battles the firm itself already won. IBM did not airdrop a foreign process into Huawei. It made Huawei's own tacit successes explicit. This note is bound by the same rule in the other direction: it names offices already proved at a real firm rather than offices this firm wishes it had.

## 2. The spine

IPD organizes work into phases separated by decision checkpoints, with technical reviews inside them:

**Charter → Concept → Plan → Develop → Qualify → Launch → Lifecycle**

Huawei's own product security whitepaper confirms the gate structure directly: decision checkpoints **CDCP** (concept), **PDCP** (plan), **ADCP** (availability), with technical reviews **TR1** in Concept, **TR2/TR3** in Plan, **TR4/TR4A/TR5** in Develop, **TR6** in Qualify, then general availability.

The load-bearing distinction, and the one this firm most needs, is **DCP versus TR**:

- A **technical review** asks *is this technically sound*. Its verdict is advisory — pass, pass-with-risk, fail.
- A **decision checkpoint** asks *is this worth more money*. Its verdict is binding.

A TR is input to a DCP. A DCP cannot open until its TR has passed. **The body that judges soundness cannot fund, and the body that funds does not judge soundness.** That separation is the kernel's central structure and every office below sits on one side of it.

## 3. The roster

Huawei names the separation itself: **三权分立** — 技术部门制定规则 (rules), 研发团队按规则推进 (execution), 质量部门监督流程 (supervision). Each office is tagged by which it holds.

### The deciding line — funds and kills; does not build

| Office | Hanzi | What it answers for |
|---|---|---|
| **Investment Review Board** (IRB) | 产品投资评审委员会 | Investment above the product line. Chaired historically by Xu Zhijun. |
| **Integrated Portfolio Management Team** (IPMT) | 集成组合管理团队 | Go / no-go / redirect at each DCP. Issues the Charter (任务书) to the PDT and appraises its performance. Two tiers: C-IPMT (company), PL-IPMT (product line). |
| **Requirements Management Team** (RMT) | 需求管理团队 | Major requirements and requirement changes. Composed of the product management head plus market, R&D, manufacturing, service, finance, and quality reps. |
| **Change Control Board** (CCB) | 变更控制委员会 | Changes to baselined work. **Chaired by the LPDT**, with reps from R&D, market, procurement, manufacturing, quality, finance. |

### The building line — builds; cannot certify itself

| Office | Hanzi | What it answers for |
|---|---|---|
| **Product Development Team Leader** (LPDT) | PDT经理 | Running the PDT under 经理负责制. Owns appraisal of project members; the functional managers own capability-building and staffing. Major technical choices still require core-group consensus — the LPDT cannot overrule the domain reps. |
| **Product Development Team** (PDT) | 产品开发团队 | The cross-functional core group (核心组): marketing (MKTPDT), R&D (RDPDT), finance (FPDT), manufacturing (MNFPDT), procurement (PROPDT), technical support (TSPDT), plus SE and PQA. Around it sits the 扩展组, pulled in on demand. |
| **System Engineer** (SE) | 系统工程师 | The architecture and the 总体方案 carried into TR3. |
| **Requirements Analysis Team** (RAT) | 需求分析团队 | Analysis of incoming requirements, and decisions on routine ones. Led by the product manager. |
| **Requirements Implementation Team** (RIT) | 需求实现团队 | Realizing accepted requirements. Drawn from PDT core members. |
| **Technology Development Team** (TDT) | 技术开发团队 | Technology developed ahead of, and separately from, any one product. |

### The checking line — certifies; cannot build and cannot fund

| Office | Hanzi | What it answers for |
|---|---|---|
| **Product Quality Assurance** (PQA) | 产品质量保证 | Quality planning, **organizing** TR reviews, process audit (过程审计), the quality report (质量月报), and an independent quality opinion at every DCP and TR. Organizes the review; never decides it. |
| **Pilot Department** (中试部) | 中试部 | Independent pre-production verification. Founded 1995; comprises 试制部 and 测试中心. Runs the **SDV → SIT → SVT** ladder and "对产品的最终质量负责" — answers for the product's final quality. |
| **Independent Cyber Security Lab** (ICSL) | — | Verifies a release against the Security Baseline from the customer's perspective. |

### The recording line — fixes what is true; settles nothing

| Office | Hanzi | What it answers for |
|---|---|---|
| **Configuration Management Officer** (CMO) | 配置管理员 | The baseline and what is in it. Which items are open to whom, and that a change reached the record through the CCB rather than around it. |
| **Version Manager** (版本经理) | 版本经理 | The released version. Nearer a coordinating project manager at Huawei than a Western release engineer. |
| **Technology Management Group** (TMG) | 技术管理组 | Reuse, standards, and the 技术货架 — the technology shelf. |

## 4. The two structures worth stealing first

Most of the roster is ordinary once written down. Two parts are not, and both bear directly on this firm's actual failure mode.

**PQA's position.** PQA sits *inside* the PDT as a core team member and reports *into the quality organization, not R&D*: 独立于研发团队…确保质量保证工作独立、客观、公正，不受研发进度、成本压力的干扰 — independent, objective, impartial, and undisturbed by schedule or cost pressure. It is embedded enough to see the work and structurally unable to be paid for the work coming out well.

Sources conflict here and the conflict is worth recording rather than resolving: one account gives PQA a *dual* reporting line, to the LPDT and to the quality department, which partly undercuts the independence the other accounts claim for it. The dual line is probably the practice and the independence probably the ideal. This firm should copy the ideal and know it is copying an ideal.

**The GSPO veto.** Huawei's own whitepaper states that where ICSL finds a release fails the Baseline, *the GSPO has the right to veto its release*. This is the one place a checking body holds a hard block over a building line, published by the firm itself. It is the sharpest attested example of certify-versus-do in the corpus, and it is the model for any office here that must be able to stop a thing it did not make.

## 5. What the four current offices were reaching for

| Seated today | Is actually | Note |
|---|---|---|
| `triage` | **RMT** / **RAT** | The three-layer RMT/RAT/RIT structure with tiered decision authority — routine requirements to RAT, major and changed to RMT, strategic to IPMT — is what `triage` was groping toward with one flat office. |
| `witness` | **PQA**, with **中试部** for verification | `witness`'s immunity — that it cannot be given the work it attests — is PQA's 独立于研发团队, arrived at independently and named worse. |
| `registrar-of-the-record` | **CMO**, with **CCB** for change authority | The office does not decide what the record should say; that is exactly CMO's real position. |
| `scribe` | **content-librarian**, already seated | Not a kernel office at all. A duplicate of an ecosystem office seated the same day. |

`triage`, `witness`, and `registrar-of-the-record` each found a real function and named it in private vocabulary. `scribe` found a function that was already seated and seated it twice.

## 6. Corrections to what this firm currently believes

**There is no SRMT.** The requirements body is RMT, with RAT and RIT beneath it. Nothing named SRMT exists at Huawei or in IPD.

**SAS is not a Huawei document.** In Huawei's corpus SAS is Serial Attached SCSI. There is no System Architecture Specification artifact. The architecture layer is carried by **总体方案** inside the TR3 package, with 系统设计说明书 sitting *inside* that umbrella rather than being separately gated. The Infography [renamed later to MetroPlat] specification set already handles this honestly — it explicitly declines to claim conformance to any Huawei-internal template, and names its review by function because the public literature is inconsistent about review numbering. That instinct was right.

**UCP has no source.** The Unified Capabilities Pipeline appears in no researched material in this tree and in nothing found outside it. It is either this firm's own coinage or a misremembering. It should be either derived and defined or dropped.

**Huawei has no SEPG.** Despite CMM L5 at four institutes between 2001 and 2004, no Huawei-named engineering process group exists in any source. The function lives in 质量运营部 and PQA.

**Configuration Librarian is not a Huawei role.** It is generic CMMI. The CMO covers it.

**The Chinese CM and CCB literature is contaminated.** Most circulating duty lists for CMO and CCB are verbatim from the 系统集成项目管理工程师 certification syllabus and are evidence about a Chinese IT exam, not about Huawei. Huawei's CCB — chaired by the LPDT, with commercial representation — is a different body from the syllabus's Configuration Control Board, and the difference is the genuine tell.

## 7. What this note does not settle

The register shift is real and should not be flattened: the product-level IPD vocabulary (Charter, OR, TR, DCP, BB, SDV) and the software-level chain (SRS, HL, LL) are two vocabularies operating one layer apart. SRS and PQA are absent from the IPD glossary because that glossary sits one level up, not because they are fake.

Sources are consistent on which gate reviews which document and thin on named author and reviewer per document. The defensible structure is: **PDT authors → TR teams organized by PQA check → IPMT decides at DCP.** A finer per-document assignment would be fabrication.

Most of this roster rests on one consultancy-authored book and its recyclers rather than on Huawei publications. Only the stage chain, the gates, OR, ICSL, the GSPO veto, the CMM results, and IRB are attested by Huawei or by the press directly. The roster is good enough to seat offices from and should be revisited against 《华为能，你也能：IPD重构产品研发》(刘劲松, 胡必刚, 北京大学出版社 2015, ISBN 9787301259740), which is where nearly all of it originates.

Finally, this is the kernel of a node micro-enterprise, and the Rendanheyi library says a node's income must pass through its internal customer to an end user under a chain-group contract. The huidu-guanli note's §5.3 instead frames the software and mathematics units as 中央研究院 and 根技术 — a central research institute that does not directly earn. The two framings are not reconciled anywhere, and seating these offices does not reconcile them. The kernel says how the work is done. It does not say who pays for it.
