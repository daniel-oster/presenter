# Presenter

Önskelistor för barnen, med jultema och publicerade med GitHub Pages.

| Sida | Fil | Adress |
|---|---|---|
| Startsida | `index.html` | `https://daniel-oster.github.io/presenter/` |
| Annabelles önskelista | `annabelle/index.html` | `https://daniel-oster.github.io/presenter/annabelle/` |
| Sarahs önskelista | `sarah/index.html` | `https://daniel-oster.github.io/presenter/sarah/` |

Allt är vanlig HTML utan byggsteg. Barnen sätter stjärnor på sina favoriter (sparas bara i deras egen webbläsare) och kopierar valen som text till ett sms.

## Vinterscenen

`assets/vinter.js` ritar scenen på canvas: soluppgång över snöklädda åkrar, röda stugor med rök ur skorstenen, granar, tomtenissar (en med lykta, en med kälke), en räv, en vinterhare, fåglar och fallande snö.

- `Vinter.scene(canvas, { horizon, band, bigSnow, seed })` ritar scenen. `band: true` används för det smala bandet överst på listsidorna. `seed` ändrar var granarna står.
- `Vinter.snow(canvas, { density })` låter det snöa över en hel sida.

Scenen pausar när fliken är dold och visar en stillbild för den som har valt minskad rörelse i sitt system.

## Ändra en lista

Varje lista styrs av `GROUPS`-arrayen i sidans `<script>`. Lägg till, ta bort eller ändra en rad där (`id`, `name`, `desc`, `url`, `label`, och för Sarah ev. `tag`), committa och pusha. Pages publicerar om inom någon minut.

## Lägga till en ny lista

Kopiera en av mapparna, till exempel `annabelle/` till `annabelle-fodelsedag/`, byt rubrik och `GROUPS`, och lägg till ett kort på startsidan.

## Synlighet

Repot är publikt eftersom GitHub Pages kräver det på gratiskontot, så sidorna går att öppna för alla som har länken. Sidorna ber sökmotorer att inte indexera dem (`noindex`). Lägg inte in priser, adresser eller annat som inte ska synas.
