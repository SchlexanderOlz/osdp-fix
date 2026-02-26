# osdp-fix – Zusammenfassung


**osdp-fix ist eine Chrome-Extension, das die Verschlagwortung und das Übersetzen von Artikeln im OSDP automatisch übernimmt und dadurch Zeit spart sowie die Tag-Qualität vereinheitlicht.**

## Funktionalität

### Wofür die Anwendung genutzt wird
Statt dass Tags manuell ausgewählt werden, schlägt das Tool passende Tags vor und setzt sie direkt im System. Weiters wird die Translate Funktion vom OSDP repariert.

**Nutzen:**
- Vereinfachtes Auswerten von Webseiten
- Weniger manuelle Fehler bei der Tag-Auswahl
- Praktischeres Übersetzen von Texten

### Was die Anwendung konkret macht
Beim Klick auf „Run“ im Browser:
1. Liest das Tool Überschrift und Inhalt des aktuellen Artikels.
2. Vergleicht den Text mit den verfügbaren Tags im System.
3. Nutzt ein KI-Modell (ChatGPT/Openai), um die relevantesten Tags zu bestimmen.
4. Markiert diese Tags automatisch im OSDP.

### So soll es benutzt werden
1. Chrome-Erweiterung laden/aktivieren.
2. API-Schlüssel einmalig hinterlegen.
3. Im OSDP einen Artikel anlegen.
4. Auf das Erweiterungs-Icon klicken.
5. „Run“ drücken.
6. Vorgeschlagene/gesetzte Tags kurz prüfen und ggf. ergänzen.

### Wichtige Hinweise
- Das Tool ist **auf das OSDP** zugeschnitten (kein universelles Plugin).
- Es ist als **Assistenz- und Automatisierungswerkzeug** gedacht, nicht als vollständiger Ersatz der Kontrolle.



## Technische Umsetzung

### Tags

Die Ermittlung relevanter Tags erfolgt durch Auswertung der Elemente `Title`, `Subtitle`, `Content` sowie aller auf der Seite verfügbaren Tags auf [https://osdp.zentdok.at/#/newsEditor](https://osdp.zentdok.at/#/newsEditor).

Die Browser Extension liest diese Inhalte aus und sendet sie über einen **HTTP POST Request** an die OpenAI API unter `https://api.openai.com/v1/responses`. Die Anfrage enthält einen Prompt, der ChatGPT anweist, die relevanten Tags im **JSON-Format** zurückzugeben. Das zurückgelieferte JSON wird anschließend von der Extension geparst, validiert und die Tags automatisch im UI des Editors gesetzt.

**API-Zugang:**

* Der Request benötigt einen **API-Key**, der auf [platform.openai.com](https://platform.openai.com) erstellt werden muss.
* Der Key funktioniert nur mit gekauften Token auf der Plattform.

---

### Translate

Die Übersetzungsfunktion wird hierdurch vollständig **client-seitig** realisiert. Dazu wird eine Funktion an den „Translate“-Button gebunden, die beim Klick folgende Schritte ausführt:

1. Auslesen der Elemente `Title`, `Subtitle` und `Content`.
2. Versand der Inhalte an die **Google Translate API** unter `https://translate.googleapis.com/translate_a/single` per HTTP Request. (Source Language wird automatisch erkannt)
3. Empfang der Übersetzung und Einfügen des Ergebnisses in die entsprechenden Felder des Editors.

