# ReisWijzer automation loop

Doel: de gebruiker test alleen de Candidate; automatisering verzamelt signalen, valideert wijzigingen en houdt Stable beschermd.

## Releasekanalen

- `candidate/ReisWijzer.user.js` — automatisch bijgewerkte testversie.
- `stable/ReisWijzer.user.js` — alleen promoten na expliciete gebruikersgoedkeuring.

## Automatische onderdelen

1. Candidate voert runtime healthchecks, fallback-keuze en diagnose uit.
2. GitHub Actions valideert iedere wijziging aan Candidate op JavaScript-syntax, userscript-metadata en veiligheidsinvarianten.
3. Runtime-feedback wordt als gestructureerd GitHub issue vastgelegd.
4. Een code-agent gebruikt issues + `AGENTS.md` om een gerichte wijziging op een werkbranch te maken.
5. Wijzigingen gaan via PR en tests terug naar Candidate.
6. Stable blijft buiten automatische wijzigingen.

## Nog benodigde koppeling voor volledig autonome codewijzigingen

De repository heeft een code-agent nodig die op runtime-feedback kan reageren. De aanbevolen route is Codex met deze GitHub-repository als environment. Geef de agent write-to-branch/PR-toegang, maar geen automatische Stable-promotie.

Een API-sleutel hoort nooit in de userscript-code of repository. Als een GitHub Action/API-integratie wordt gebruikt, bewaar het geheim uitsluitend als GitHub Actions secret.

## Feedback-ingestie

Het userscript mag geen GitHub personal access token bevatten. Voor volledig automatische upload van browserdiagnoses is daarom een kleine beveiligde ingest-endpoint nodig (bijvoorbeeld een serverless worker/GitHub App) die alleen geschoonde runtime-feedback accepteert en daar een GitHub issue van maakt. Tot die endpoint bestaat, kan feedback handmatig via het issueformulier of via de gekoppelde code-agent worden aangeleverd.
