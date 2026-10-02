# DigiLab.ai Special Posts

PNG-Generator für Cover, News und Terminlisten mit vier Instagram-Formaten.

## Nutzung

Die Exportschrift gilt für Vorschau und PNG. Arial ist sofort verfügbar. Installierte Degular-Schnitte werden einzeln geprüft. Eigene OTF-, TTF-, WOFF- und WOFF2-Dateien können mit dem zugehörigen Gewicht oder als variable Schrift geladen werden. Für echte Regular-, Semibold- und Bold-Schnitte jeweils die passende Datei laden. Fehlende Schnitte können vom Browser synthetisiert werden.

Importierte Schriftdateien bleiben ausschließlich im lokalen Browserspeicher dieser Website. Sie werden nach einem Neuladen wiederhergestellt. Browserdaten löschen, ein anderer Browser oder eine andere Website-Adresse erfordern einen erneuten Import. Schriftdateien werden nicht mit der öffentlichen App veröffentlicht.

Der PNG-Export wartet auf die aktive Schrift und das Logo. Das Bild hat die gewählten Originalabmessungen. Hilfsraster und Positionsgriffe erscheinen ausschließlich in der Vorschau. Zu lange Texte werden gemeldet und blockieren den Export, bis sie gekürzt oder verkleinert wurden.

## Entwicklung

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## Veröffentlichung

Der Workflow `.github/workflows/pages.yml` baut und veröffentlicht Änderungen auf `main` über GitHub Pages. Im Repository muss unter Settings → Pages → Source „GitHub Actions“ aktiviert sein.

Relative Assetpfade unterstützen den GitHub-Projektpfad und die bestehende Netlify-Adresse.

## Prüfung

Geprüft: alle zwölf Kombinationen aus drei Vorlagen und vier Formaten, PNG-Abmessungen, Schriftimport mit Wiederherstellung nach Neuladen, Reset, Überlaufmeldung und mobile Darstellung. Die konkrete Degular-Datei wurde nicht mitgeliefert. Ihr Schriftbild muss mit den eigenen lizenzierten Dateien geprüft werden.
