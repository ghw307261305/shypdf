// German (de) tool-page SEO content. Structure must match content/en.ts.
import type { ToolContent } from './en';

const content: Record<string, ToolContent> = {
  'merge-pdf': {
    seoTitle: 'PDF zusammenfügen online – kostenlos, ohne Upload | ShyPDF',
    sections: [
      { h: 'PDFs verbinden, ohne sie irgendwohin zu schicken', p: [
        'Die meisten Online-Tools zum Zusammenfügen laden deine Dokumente auf einen Server, verbinden sie dort und schicken das Ergebnis zurück. ShyPDF erledigt das stattdessen direkt im Browser-Tab. Die ausgewählten PDFs werden von deiner Festplatte in den Arbeitsspeicher gelesen, auf deinem eigenen Gerät zusammengefügt und landen anschließend direkt in deinem Download-Ordner.',
        'Das passt gut zu den Unterlagen, die man am häufigsten zusammenfügen muss: unterschriebene Verträge, Kontoauszüge, Steuerformulare, medizinische Unterlagen und gescannte Ausweise – Dateien, die man ungern einem Dritten überlässt, nur um sie aneinanderzuheften.' ] },
      { h: 'Die richtige Reihenfolge', p: [
        'Zusammengefügt wird in der Reihenfolge der Karten auf dem Bildschirm. Eine Karte lässt sich per Drag-and-drop verschieben, auf dem Smartphone mit den Tasten ‹ ›. Sind deine Dateien nummeriert, hilft „Nach Name sortieren“ (datei2 kommt dabei vor datei10). Du brauchst aus einer Datei nur einzelne Seiten? Dann schick sie zuerst durch „PDF teilen“ und füge danach die Teile zusammen.',
        'Jede Ausgangsdatei erhält im fertigen Dokument ein Lesezeichen auf oberster Ebene. So kann man in der Seitenleiste des PDF-Programms zwischen den ursprünglichen Dateien springen. Wer lieber eine leere Gliederung möchte, entfernt das Häkchen bei „Lesezeichen für jede Datei hinzufügen“.' ] },
    ],
    faq: [
      { q: 'Verschlechtert das Zusammenfügen die Qualität meiner PDFs?', a: 'Nein. Die Seiten werden unverändert in die neue Datei kopiert – Text bleibt Text, und Bilder werden nicht neu komprimiert. Ist das Ergebnis zu groß für eine E-Mail, schick es anschließend durch „PDF komprimieren“.' },
    ],
  },
  'split-pdf': {
    seoTitle: 'PDF teilen online – Seiten extrahieren, ohne Upload | ShyPDF',
    sections: [
      { h: 'Genau die Seiten herauslösen, die du brauchst', p: [
        'Seitenbereiche gibst du so ein wie im Druckdialog: 1-3, 5, 8-10. Aus jedem durch Komma getrennten Teil wird ein eigenes PDF. Dieses Beispiel ergibt also drei Dateien – die Seiten 1–3, die Seite 5 und die Seiten 8–10. Um ein einzelnes Kapitel aus einem langen Bericht zu ziehen, genügt ein einziger Bereich.',
        'Für die häufigsten Fälle gibt es Modi, die ganz ohne Tippen auskommen: „Eine Datei pro Seite“ zerlegt das Dokument in Einzelseiten, und die Optionen für ungerade und gerade Seiten sind praktisch, um Scans aus einem einseitigen Scanner in Ordnung zu bringen.' ] },
      { h: 'Was du zurückbekommst', p: [
        'Entstehen beim Teilen mehrere Dateien, werden sie zu einem einzigen zip-Download gebündelt, damit dein Browser nicht bei jeder Datei einzeln nachfragt. Bei höchstens sechs Dateien kannst du sie auch einzeln herunterladen. Die Seiten werden ohne erneute Komprimierung kopiert, die Qualität entspricht also exakt dem Original.',
        'Das Teilen läuft vollständig in deinem Browser ab. Das Dokument wird nie hochgeladen – und das zählt gerade dann, wenn du es nur teilst, um eine einzelne harmlose Seite aus einer sensiblen Datei weiterzugeben.' ] },
    ],
  },
  'rotate-pdf': {
    seoTitle: 'PDF drehen online – kostenlos, ohne Upload | ShyPDF',
    sections: [
      { h: 'Seitlich liegende und kopfstehende Seiten dauerhaft korrigieren', p: [
        'Wer im PDF-Programm nur die Ansicht dreht, ändert lediglich, was er selbst sieht; die nächste Person bekommt beim Öffnen wieder dieselbe quer liegende Seite. ShyPDF ändert die Drehung, die in der Datei selbst gespeichert ist. Die Korrektur ist damit dauerhaft und gilt in jedem PDF-Programm und auch beim Drucken.',
        'Du kannst alle Seiten auf einmal drehen – oder „Ausgewählte Seiten“ wählen und Bereiche wie 2, 5-7 eingeben, um nur die Tabellen im Querformat oder die Seiten zu drehen, die falsch herum durch den Scanner gelaufen sind.' ] },
      { h: 'Kein Qualitätsverlust, kein Upload', p: [
        'Beim Drehen wird nur die Ausrichtungseinstellung der jeweiligen Seite aktualisiert. Nichts wird gerendert oder neu komprimiert: Text bleibt markierbar, und Bilder bleiben genauso scharf wie zuvor. Alles passiert in deinem Browser – die Datei wird nie an einen Server geschickt.',
        'Du möchtest Seiten einzeln drehen und sie dabei sehen? „PDF organisieren“ zeigt jede Seite als Miniatur mit eigener Drehen-Taste.' ] },
    ],
  },
  'organize-pdf': {
    seoTitle: 'PDF organisieren – Seiten sortieren & löschen | ShyPDF',
    sections: [
      { h: 'Ein PDF neu ordnen – mit Blick auf die Seiten', p: [
        '„PDF organisieren“ zeigt jede Seite als Miniatur. Zieh die Seiten in eine neue Reihenfolge, entferne mit × alles Überflüssige – leere Scannerseiten, ein Deckblatt, einen Anhang – und dreh einzelne Seiten mit ↻. Auf dem Smartphone verschieben die Tasten ‹ › eine Seite jeweils um eine Position.',
        'Wenn die Reihenfolge stimmt, schreibt „PDF speichern“ eine neue Datei, die genau diese Seiten in genau dieser Reihenfolge enthält. Deine Originaldatei wird nicht verändert.' ] },
      { h: 'Von Grund auf privat', p: [
        'Die Miniaturen werden auf deinem eigenen Gerät gerendert, das neue PDF ebenfalls. Nichts wird hochgeladen – du kannst also bedenkenlos auch Dokumente mit persönlichen oder vertraulichen Informationen aufräumen. Große Dokumente funktionieren ebenfalls: Miniaturen werden erst bei Bedarf gezeichnet, eine Datei mit Hunderten Seiten braucht daher nur ein paar Sekunden länger, bis sie erscheint.' ] },
    ],
  },
  'add-page-numbers': {
    seoTitle: 'Seitenzahlen zu PDF hinzufügen – ohne Upload | ShyPDF',
    sections: [
      { h: 'Nummerierung, die zum tatsächlichen Aufbau von Dokumenten passt', p: [
        'Berichte und Abschlussarbeiten beginnen mit der Zählung selten auf dem ersten Blatt. Mit „Start auf Seite“ überspringst du Deckblatt oder Inhaltsverzeichnis, mit „Erste Seitenzahl“ legst du fest, welche Zahl auf der ersten nummerierten Seite steht – zum Beispiel Start auf Seite 3 mit der Zahl 1. Als Position stehen alle vier Ecken sowie die Mitte des oberen oder unteren Rands zur Wahl, und über den Randabstand sorgst du dafür, dass die Zahl vorhandenen Fußzeilen nicht in die Quere kommt.',
        'Als Formate gibt es einfache Zahlen, „1 / 10“, „- 1 -“ und „Seite 1“ sowie chinesische Formate. Die Schriftgröße lässt sich von 6 bis 48 pt einstellen.' ] },
      { h: 'Funktioniert mit jedem PDF, bleibt auf deinem Gerät', p: [
        'Die Zahlen werden über den Inhalt jeder Seite gezeichnet. Das funktioniert deshalb mit gescannten Dokumenten genauso wie mit PDFs, die aus Word oder Google Docs exportiert wurden. Die Datei wird in deinem Browser verarbeitet und nie hochgeladen. Du willst mehrere Dokumente zu einem verbinden? Dann füge sie zuerst zusammen und nummeriere anschließend das Ergebnis, damit die Zählung durch die gesamte Datei läuft.' ] },
    ],
  },
  'add-watermark': {
    seoTitle: 'Wasserzeichen zu PDF hinzufügen – ohne Upload | ShyPDF',
    sections: [
      { h: 'Entwürfe, Kopien und vertrauliche Dokumente kennzeichnen', p: [
        'Gib einen beliebigen Text ein – VERTRAULICH, ENTWURF, den Namen eines Kunden, „Kopie nur für den Visumantrag“ – und ShyPDF stempelt ihn auf jede Seite. Du wählst zwischen einem einzelnen, zentrierten Wasserzeichen und einer Kachelung über die ganze Seite und stellst Größe, Winkel, Farbe und Deckkraft so ein, dass es sichtbar ist, ohne den Inhalt darunter zu verdecken.',
        'Ein gekacheltes, halbtransparentes Wasserzeichen mit dem Namen des Empfängers ist ein praktischer Weg, der Weiterverwendung eines Ausweis-Scans oder eines Vertrags an unerwünschter Stelle vorzubeugen.' ] },
      { h: 'Jede Sprache, kein Upload', p: [
        'Der Text wird mit den Schriftarten deines Geräts gezeichnet. Schriften wie Chinesisch, Japanisch, Arabisch oder Kyrillisch funktionieren deshalb ebenso wie lateinischer Text. Weil alles in deinem Browser abläuft, wird das Dokument, das du schützen möchtest, dabei auch niemandem hochgeladen.' ] },
    ],
  },
  'jpg-to-pdf': {
    seoTitle: 'JPG in PDF umwandeln – kostenlos, ohne Upload | ShyPDF',
    sections: [
      { h: 'Aus Fotos und Scans wird ein ordentliches PDF', p: [
        'Wähle JPG-, PNG- oder WebP-Bilder aus – Handyfotos von Belegen, gescannte Seiten, Screenshots –, und ShyPDF setzt jedes Bild auf eine eigene Seite eines einzigen PDFs. Die Seitenreihenfolge legst du vor dem Umwandeln fest, indem du die Karten ziehst.',
        'Mit „Wie Bild“ behält jedes Bild seine natürliche Größe. Mit A4 oder Letter bekommst du einheitliche Seiten, in die das Bild eingepasst wird – meist genau das, was ein Bewerbungsportal oder ein Drucker erwartet. Die Ausrichtung kann sich nach dem jeweiligen Bild richten oder fest auf Hochformat oder Querformat gestellt werden.' ] },
      { h: 'Deine Fotos bleiben auf deinem Gerät', p: [
        'Fotos von Dokumenten enthalten oft genau das, was man nicht hochladen sollte: Unterschriften, Adressen, Ausweisnummern. Hier läuft die Umwandlung in deinem Browser, und die Bilder verlassen dein Gerät nie. Setz das Häkchen bei „Bilder komprimieren“, wenn das fertige PDF klein genug für eine E-Mail sein muss.' ] },
    ],
    faq: [
      { q: 'Kann ich HEIC-Fotos vom iPhone umwandeln?', a: 'Nicht direkt. Wandle sie zuerst in JPG um: Auf dem iPhone passiert das meist automatisch, wenn du dir ein Foto selbst per E-Mail schickst. Oder stell unter Einstellungen → Kamera → Formate „Maximale Kompatibilität“ ein, damit neue Fotos als JPG gespeichert werden.' },
    ],
  },
  'pdf-to-jpg': {
    seoTitle: 'PDF in JPG umwandeln – kostenlos, ohne Upload | ShyPDF',
    sections: [
      { h: 'PDF-Seiten als Bilder speichern', p: [
        'Jede Seite deines PDFs wird als JPG- oder PNG-Bild gerendert. JPG eignet sich für Fotos und Scans, bei denen es auf die Dateigröße ankommt; PNG für Seiten mit scharfem Text, Diagrammen oder Screenshots, bei denen du saubere Kanten möchtest. Lass das Seitenfeld leer, um alles umzuwandeln, oder gib Bereiche wie 1-3, 5 ein, um nur bestimmte Seiten zu exportieren.',
        'Wähle die Auflösung passend zum Verwendungszweck: 96 dpi für Web und Chat-Apps, 150 dpi für die allgemeine Nutzung am Bildschirm, 300 dpi für den Druck. Höhere Auflösungen erzeugen größere Dateien, und das Rendern dauert länger.' ] },
      { h: 'Lokal gerendert', p: [
        'Die Seiten zeichnet dein eigener Browser – mit derselben Open-Source-Engine (PDF.js), die auch hinter der PDF-Anzeige in Firefox steckt. Das PDF wird nie hochgeladen. Wandelst du mehr als eine Seite um, werden die Bilder zu einem einzigen zip-Download gebündelt.' ] },
    ],
  },
  'compress-pdf': {
    seoTitle: 'PDF komprimieren online – kostenlos, ohne Upload | ShyPDF',
    sections: [
      { h: 'Zwei Modi, weil PDFs aus unterschiedlichen Gründen groß sind', p: [
        'Der Modus „Leicht“ baut die interne Struktur der Datei neu auf und entfernt überflüssige Daten. Text bleibt markierbar und durchsuchbar, und sichtbar ändert sich nichts; typisch sind Einsparungen von 5–30 %. Für Dokumente, die aus Word, Google Docs oder Design-Programmen exportiert wurden, ist das der richtige erste Versuch.',
        'Der Modus „Stark“ rendert jede Seite als JPEG-Bild und baut aus diesen Bildern ein neues PDF. Bei gescannten Dokumenten und Dateien mit vielen Fotos ist das sehr wirksam – oft wird die Datei um mehr als 50 % kleiner –, aber der Text ist danach nicht mehr markierbar. Heb dein Original also auf. Wähle 72, 110 oder 150 dpi, je nachdem, ob das Ergebnis nur am Bildschirm lesbar sein oder auch gedruckt werden soll.' ] },
      { h: 'Ehrlich beim Ergebnis', p: [
        'ShyPDF zeigt die Größe vorher und nachher an. Würde die Komprimierung die Datei nicht kleiner machen – das kommt bei bereits optimierten PDFs vor –, bekommst du das Original zurück statt einer größeren „komprimierten“ Kopie.',
        'Alles läuft in deinem Browser, und die Datei wird nie hochgeladen. So bringst du einen Kontoauszug oder einen Vertrag unter das Größenlimit für E-Mail-Anhänge, ohne ihn einem Komprimierungsdienst anzuvertrauen.' ] },
    ],
    faq: [
      { q: 'Wie klein muss ein PDF für den E-Mail-Versand sein?', a: 'Gmail akzeptiert Anhänge bis 25 MB, Outlook.com bis 20 MB. Viele Firmen-Mailserver setzen jedoch niedrigere Grenzen, häufig 10 MB. Ist die Datei im Modus „Stark“ mit 110 dpi noch zu groß, versuch es mit 72 dpi – oder teile das Dokument und verschicke es in mehreren Teilen.' },
    ],
  },
  'unlock-pdf': {
    seoTitle: 'PDF entsperren – bekanntes Passwort entfernen | ShyPDF',
    sections: [
      { h: 'Für deine eigenen Dokumente, wenn das Passwort im Weg ist', p: [
        'Banken, Lohnabrechnungsdienste und Behördenportale verschicken Auszüge und Bescheide oft als passwortgeschützte PDFs. Für den Versand ist das sinnvoll, danach aber lästig: Du musst das Passwort jedes Mal neu eintippen und kannst die Datei nicht mit anderen zusammenfügen. Gib das Passwort einmal ein, und ShyPDF speichert eine Kopie, die sich ganz normal öffnen lässt.',
        'Manche PDFs lassen sich ohne Passwort öffnen, sperren aber Drucken, Kopieren oder Bearbeiten. Wenn dir ein solches Dokument gehört oder dich sein Eigentümer gebeten hat, daran zu arbeiten, kann ShyPDF eine Kopie ohne diese Einschränkungen speichern. Du wirst gebeten zu bestätigen, dass du dazu berechtigt bist.' ] },
      { h: 'Was dieses Tool nicht tut', p: [
        'ShyPDF ermittelt, errät oder rekonstruiert keine Passwörter. Wenn sich eine Datei nur mit Passwort öffnen lässt und du es nicht hast, kann dieses Tool nicht helfen. Es ist dafür gedacht, den Schutz von Dokumenten zu entfernen, die du verändern darfst – nicht dafür, den Schutz fremder Werke zu entfernen.',
        'Das eingegebene Passwort und das Dokument selbst bleiben auf deinem Gerät: Die Entschlüsselung übernimmt in deinem Browser qpdf, eine seit Langem etablierte Open-Source-PDF-Bibliothek, kompiliert zu WebAssembly. Nichts wird hochgeladen.' ] },
    ],
  },
  'protect-pdf': {
    seoTitle: 'PDF mit Passwort schützen – AES-256, ohne Upload | ShyPDF',
    sections: [
      { h: 'Ein PDF verschlüsseln, bevor du es verschickst', p: [
        'Legst du ein Passwort zum Öffnen fest, wird das Dokument mit AES-256 verschlüsselt; ohne das Passwort kann es niemand lesen, egal mit welchem PDF-Programm. Gib das Passwort über einen anderen Kanal weiter als die Datei – das PDF zum Beispiel per E-Mail und das Passwort per SMS.',
        'Außerdem kannst du Drucken, Kopieren oder Bearbeiten einschränken. Wichtig zu wissen, was das bedeutet: Berechtigungseinschränkungen werden von den PDF-Programmen durchgesetzt, nicht durch eine Verschlüsselung des Inhalts. Betrachte sie deshalb als klare Willenserklärung, nicht als starken Schutz. Für alles Sensible solltest du ein Passwort zum Öffnen verwenden.' ] },
      { h: 'Das Passwort verlässt deinen Browser nie', p: [
        'Bei einem Dienst mit Upload wandern sowohl dein vertrauliches Dokument als auch das Passwort, das es schützt, auf den Server von jemand anderem. Hier übernimmt die Verschlüsselung auf deinem Gerät qpdf, eine Open-Source-PDF-Bibliothek, kompiliert zu WebAssembly – weder die Datei noch das Passwort werden irgendwohin gesendet.',
        'Ein vergessenes Passwort lässt sich nicht wiederherstellen – weder von dir noch von uns, denn wir bekommen es nie zu sehen. Bewahre es in einem Passwortmanager auf.' ] },
    ],
    faq: [
      { q: 'Was macht ein gutes PDF-Passwort aus?', a: 'Am wichtigsten ist die Länge. Vier oder fünf zufällige Wörter oder mindestens 14 zufällige Zeichen aus einem Passwortmanager sind weit stärker als ein kurzes Passwort mit Sonderzeichen. Vermeide Geburtstage und Ausweisnummern – die probiert ein Angreifer als Erstes aus.' },
    ],
  },
};

export default content;
