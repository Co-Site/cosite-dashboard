# TOC-Erweiterung: Fork oder öffentliche API?

Begründung für die Team-Diskussion: wie der Transparenz-Slider im TOC umgesetzt werden soll, was mich (Claude, der die
Umsetzung gemacht hat) jeweils zu einer Lösung bewogen hat, und wo ich dabei falsch lag.
Einordnung in die übrigen Entscheidungen: [DashboardDecisions.md](./DashboardDecisions.md), Abschnitt 9.

## Kurzfassung

Unter jedem WMS-Layer im TOC soll ein Transparenz-Slider stehen. `@open-pioneer/toc` bietet dafür keinen vorgesehenen
Platz. Es gibt zwei funktionierende Varianten: einen Fork des TOC (Branch `dashboard`) und eine Erweiterung des
unveränderten TOC über seine öffentliche API (Branch `toc-native`). Ich empfehle `toc-native`, weil sie ohne eigene
Kopie des TOC auskommt. Ihre Risiken sind bekannt und betreffen die heutige Konfiguration nicht. Die Entscheidung liegt
beim Team.

## Ausgangslage

- Ziel: Slider direkt unter dem Namen jedes WMS-Layers, damit man die Transparenz ohne Umweg einstellen kann.
- `@open-pioneer/toc` 1.5.0 hat für Inhalte pro Layer:
    - **keinen Prop** (`showTools`, `collapsibleGroups`, `onReady` … passen alle nicht),
    - **keine Children** (`Toc` nimmt keine an),
    - **keine exportierten Unterkomponenten**: `LayerList`, `LayerItem`, `LayerItemMenu` und der interne Kontext sind
      nicht exportiert, die `package.json` gibt nur `"."` frei. Selbst über einen Vite-Alias ließe sich nichts
      austauschen, weil `Toc` fest `LayerList` und diese fest `LayerItem` rendert.
- Bei React-Funktionskomponenten gibt es keine Vererbung. Von außen erweitern kann man nur über Props, Children,
  Kontext oder Referenzen auf die gerenderten Elemente.

## Warum ich zuerst geforkt habe

- Ich habe Props, Children und exportierte Unterkomponenten geprüft und nichts gefunden.
- Das Einhängen von Inhalt ins fertige DOM hatte ich nur als „Einträge über CSS-Klassen suchen und per Portal
  befüllen“ gedacht. Das habe ich als fragil verworfen: Man hätte selbst beobachten müssen, wann der TOC Einträge neu
  rendert (`MutationObserver`), und wäre von internen Klassen abhängig gewesen.
- **Übersehen habe ich die imperative API**: `onReady` liefert eine `TocApi`, deren Einträge (`TocItem`) ihr
  DOM-Element als `htmlElement` bereitstellen. Ich habe sie nicht als Erweiterungspunkt erkannt, weil die TOC-Doku sie
  fürs Scrollen und Auf-/Zuklappen beschreibt.
- Der Fork versprach einen sauberen, typisierten Prop und eine sichere Platzierung des Sliders im Eintrag. Deshalb habe
  ich ihn umgesetzt: `src/packages/toc` als `@cosite/toc`, übernommen aus dem Upstream-Tag `@open-pioneer/toc@1.5.0`
  (Commit `cb6feb5`).
- Verlauf auf dem Fork: Auf Wunsch zuerst als Schnittstelle im ⋮-Menü (`58c94ff`). Dort wurde der Slider übersehen,
  deshalb direkt unter den Layernamen verschoben (`5c52ad7`).

## Was die Neubewertung ausgelöst hat

- Die Vorgabe „kein Fork, kein Patch, kein Pull Request“ und die Frage, warum man die bestehende Komponente nicht
  erweitern kann.
- Das Kosten-Nutzen-Verhältnis des Forks: **23 kopierte Dateien für 55 geänderte Zeilen in 4 Dateien**. Bei jedem
  Update von `@open-pioneer/toc` muss die neue Version übernommen und die Änderung von Hand wieder eingespielt werden.
  Eure eigene Doku ([WaysToPatchAPackage.md](./WaysToPatchAPackage.md)) rät, das jeweils „weniger mächtige“ Mittel zu
  wählen.
- Beim erneuten Lesen des TOC-Quellcodes fiel auf: `TocItem.htmlElement` ist nicht nur öffentlich, sondern
  **reaktiv**. Damit entfällt genau das, was ich am DOM-Ansatz für fragil gehalten hatte.

## Warum die API-Lösung trägt

Umsetzung: `src/apps/dashboard/toc/TocItemExtensions.tsx` (76 Zeilen), Commits `22b279a` und `9dc52cb` auf
`toc-native`.

- **Öffentliche, dokumentierte Schnittstelle:** `onReady` → `TocApi.getItems()` → `TocItem.htmlElement`. Kein Zugriff auf
  interne Module, kein Suchen über Klassen.
- **Reaktiv:** `htmlElement` ist ein `reactive()`, die Einträge liegen in einer `reactiveMap`. Rendert der TOC einen
  Eintrag neu oder entfernt ihn, wird das gemeldet, und der Slider hängt sich am neuen Element an. Ein
  `MutationObserver` ist nicht nötig.
- **Bleibt Teil der App:** Angehängt wird ein eigenes `<div class="toc-layer-item-extra">` als letztes Kind des
  Eintrags (`<li class="toc-layer-item layer-<id>">`). Der Slider wird per React-`createPortal` hineingerendert und hat
  damit Zugriff auf Chakra, Übersetzungen und App-Zustand.
- **Upstream-Updates kommen einfach mit.** Der TOC selbst ist unverändert.
- **Im Browser geprüft:** genau ein Slider, pixelgenau am Titel ausgerichtet, funktionsfähig nach Slider-Bedienung,
  Gruppe ein/aus, Sprachwechsel, TOC-Panel ein/aus und Layer aus/an. Keine Konsolenfehler.

## Risiken der API-Lösung

| #   | Problem                                                                                                                                                                                                                            | Heute betroffen?                                                                                              | Mögliche Absicherung (nicht umgesetzt)                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | **Position nur am Ende des Eintrags.** Hat ein Eintrag sichtbare Kinder (Gruppe, WMS mit mehreren angezeigten Layern), steht der Slider unter den Kindern statt unter dem Titel.                                                   | Nein: Der DWD-Layer hat nur einen, ausgeblendeten Sublayer. Ein WMS mit mehreren `wms.layers` wäre betroffen. | Container direkt hinter die Titelzeile (`.toc-layer-item-content`) einfügen                |
| 2   | **Fremdes Element im TOC-Markup.** React lässt unbekannte Kinder in Ruhe, hängt neue eigene Kinder aber ans Ende, also hinter unseren Container.                                                                                   | Nein                                                                                                          | wie 1                                                                                      |
| 3   | **Markup nicht garantiert.** Laut TOC-README ist nur die Klasse `layer-<id>` garantiert, nicht der innere Aufbau. `htmlElement` ist offiziell „z. B. zum Scrollen“ gedacht. Ein Update kann den Slider verschieben (kein Absturz). | Nein: Version bleibt 1.5.0, bis jemand bewusst aktualisiert (`resolutionMode: lowest-direct`)                 | Bei Versionssprung Slider im Browser prüfen; Warnung in der Konsole bei fehlender Struktur |
| 4   | **Einrückung fest eingestellt.** Setzt `collapsibleGroups` und die aktuellen Chakra-Größen voraus.                                                                                                                                 | Nein                                                                                                          | Einrückung aus der tatsächlichen Titelposition messen                                      |
| 5   | **Keine automatischen Tests** für die Position. Sichtbar nur im Browser.                                                                                                                                                           | –                                                                                                             | Browser-Test vor TOC-Updates                                                               |
| 6   | **Neu-Rendern / Neu-Mounten** des TOC.                                                                                                                                                                                             | Geprüft, funktioniert. Der Slider-Wert hängt an der Deckkraft des Kartenlayers und bleibt erhalten.           | –                                                                                          |
| 7   | **Bedienung.** Ein Klick auf den Slider schaltet den Layer nicht um, keine Konflikte mit Tastaturbedienung.                                                                                                                        | Geprüft, unkritisch                                                                                           | –                                                                                          |
| 8   | **Shadow DOM.** Portal in den Shadow Root der App.                                                                                                                                                                                 | Geprüft, funktioniert                                                                                         | –                                                                                          |

## Wann der Fork doch besser wäre

- Inhalte sollen **mitten** in einen Eintrag, z. B. in die Titelzeile neben den Namen oder ins ⋮-Menü.
- Erweitert werden sollen auch **Einträge mit sichtbaren Kindern** (Gruppen, WMS mit mehreren Layern).
- Es sind **weitere, tiefere Anpassungen** am TOC geplant. Dann lohnt sich die eigene Kopie eher.
- Upstream-Updates verschieben die Platzierung **wiederholt**, sodass die API-Lösung ständig nachgebessert werden muss.

## Kriterien für die Team-Entscheidung

- **Pflegeaufwand gegen Kontrolle:** Fork = volle Kontrolle, aber Abgleich bei jedem Update. API = kein Abgleich, aber
  Platzierung nur am Ende des Eintrags.
- **Was ist am TOC noch geplant?** Bleibt es bei Inhalten unter dem Titel von Einträgen ohne Kinder, reicht die API-Lösung.
- **Wie oft wird `@open-pioneer/toc` aktualisiert?** Häufige Updates sprechen gegen den Fork.
- **Wie viel DOM-Einhängen in fremde Komponenten ist im Team akzeptiert?**

## Selbstkritik

Ich hätte die imperative API (`onReady` / `TocApi`) prüfen müssen, bevor ich geforkt habe. Dann wäre der Umweg über
Fork und Rückbau vermeidbar gewesen. Beide Varianten liegen jetzt nebeneinander (`dashboard` mit Fork, `toc-native`
ohne). Die Entscheidung kann also anhand von lauffähigem Code getroffen werden, der andere Branch wird danach verworfen.
