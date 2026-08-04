---
name: Kexin (可信) — Trustworthiness
slug: kexin
type: term
defines: kexin
description: "Trustworthiness as an engineering property ranked above features and schedule — security, resilience, privacy, safety, reliability and availability, built in rather than tested in."
hanzi: 可信
pinyin: kěxìn
aliases: "[\"trustworthiness\", \"trustworthy\", \"kexin\"]"
domain: engineering
part-of: huidu-guanli
tradition: huawei
provenance:
  recorded-by: rom-keldar/phase2-huidu-guanli
  recorded-on: 2026-07-14
---
Kexin (可信), "trustworthiness," names a property of an engineered system: that it can be relied upon to behave as it is supposed to, including when it is attacked, when parts of it fail, and when it is handling information whose exposure would harm someone.

As an engineering program the term decomposes into a small set of named attributes.
Security — the system resists deliberate attack.
Resilience — it continues operating, perhaps degraded, when parts of it fail or are compromised, and recovers afterward.
Privacy — it holds information under the terms it was given under, and does not leak or repurpose it.
Safety — its failures do not injure people or property.
Reliability and availability — it does what it is meant to, and is there when needed.
A system is trustworthy only if it holds all of these; the set is a conjunction, and a system strong on five and negligent on the sixth is untrustworthy, since an adversary or an accident selects the weakest.

The concept's organizational content is a priority ordering, and this is where it does its real work.
Huawei's central case is the program announced by Ren Zhengfei in 2018, in a company-wide letter directing a comprehensive rebuilding of the company's software engineering capability and practice, backed by a multi-billion-dollar commitment over several years.
Its decisive instruction was that trustworthiness ranks above feature delivery and above schedule: when they conflict, features are cut and dates slip, and the trustworthiness requirement does not.
The letter's accompanying admission — that the company had been prioritizing speed and function, had accumulated the corresponding debt, and would now accept the cost of paying it down — is part of the concept, because the ordering means nothing until an organization has actually paid for it in shipped scope.

The mechanism is that trustworthiness cannot be added late.
It is a property of a system's architecture, and architecture is chosen early and is expensive to revisit, so a system not designed to be secure and resilient cannot be made so by testing it harder or by patching it afterward — testing reveals defects, it does not install a property the design lacks.
This is why the concept is stated as a ranking rather than as a goal.
Every organization wants trustworthy systems; what distinguishes one that achieves it is having decided in advance which value yields when trustworthiness and shipping conflict, since that conflict occurs constantly and is otherwise settled each time by whoever is under the most pressure.
The associated discipline is correspondingly unglamorous — code that is simple enough to be reviewed, dependencies that are known, interfaces that are specified, and engineering practice that is uniform rather than heroic.

The concept's boundaries matter.
Kexin is not quality in the general sense of a product being good; it concerns a specific set of properties, and a delightful product that leaks its users' data is high-quality and untrustworthy.
It is not compliance or certification, which are evidence about trustworthiness and are routinely obtained by systems that lack it.
It is not marketing trust or brand reputation — those are beliefs held about the system, whereas kexin is a fact about it, and the two can diverge in both directions.
And it is not a testing activity: it is an architectural property, and an organization that locates it in a verification stage at the end has already failed to obtain it.
