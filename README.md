# SkyView Digital — Rebuild

Robocze repozytorium dla pełnego rebuildu strony SkyView Digital, kierunek
**„Golden Hour nad Bałtykiem"**. To repozytorium na koncie `GRKarol` — nie
oryginalne `dronmarketingweb/skyviewdigital.github.io`. Docelowo zawartość
trzeba przenieść do oryginalnego repo albo przełączyć domenę na to repo.

## Kontekst

- Brief kreatywny (diagnoza starej strony, paleta, treść, otwarte pytania):
  https://claude.ai/code/artifact/cbc74182-bbff-4b6c-9362-e8f79689b56e
- Zaakceptowany kierunek wizualny (prototyp hero):
  https://claude.ai/code/artifact/3cc960bb-48c6-459b-9fbc-4cc41e0e2fed

## Stan budowy

Zbudowane i działające:
- Pełna strona (`index.html`) w nowym systemie wizualnym — bez Tailwind CDN,
  bez `!important`, jeden plik `css/style.css` z tokenami kolorów.
- Hero generowany na canvasie (niebo, sylwetka wybrzeża, reakcja na kursor),
  kinetyczny nagłówek, licznik wysokości, scrollowany pasek usług.
- Sekcje: Efekt WOW, Filozofia, Trasy lotu (cennik, przemianowane z
  Essentials/Growth/Enterprise), konfigurator usług, widget realnej pogody
  (Open-Meteo, Trójmiasto), Wartości, FAQ (jedna wersja, bez duplikatu),
  Rezerwacja, Stopka.
- System rezerwacji Firebase (`js/booking-system.js`, `js/firebase-config.js`)
  przeniesiony 1:1 z oryginału — logika bez zmian, tylko nowy wygląd.
- Naprawione względem oryginału: martwa ścieżka tła hero, placeholder wideo
  Google zamiast prawdziwego materiału, martwe linki mailowe (odkodowano
  prawdziwy adres z obfuskacji Cloudflare: `dron.marketingweb@gmail.com`).

## Do zrobienia / wymaga Twojej decyzji

Patrz sekcja „Do potwierdzenia z Tobą" w briefie — najważniejsze:

1. **Adres i zasięg** — stopka ma „Kłobuck, Polska" (zgodnie z tym, co było
   opublikowane), a hero/SEO celują w Trójmiasto. Do ustalenia.
2. **Prawdziwy materiał wideo/zdjęciowy** — sekcja „Efekt WOW" ma świadomy,
   podpisany placeholder zamiast fałszywego demo. Podmień na realne ujęcia.
3. **Funkcje z briefu, których jeszcze nie ma**: scroll-driven „wznoszenie"
   na prawdziwym materiale, suwak ziemia/powietrze, interaktywna mapa
   realizacji — wszystkie wymagają Twoich zdjęć/wideo, żeby nie kłamać w
   portfolio.
4. **Domena docelowa** i **GitHub Pages** — trzeba włączyć Pages w
   ustawieniach tego repo (Settings → Pages → branch `main`), a docelowo
   zdecydować, czy to repo staje się właściwym, czy zawartość wraca do
   `dronmarketingweb/skyviewdigital.github.io`.

## Struktura

```
index.html
css/style.css
js/site.js            – hero canvas, nav, FAQ, konfigurator, pogoda
js/booking-system.js  – system rezerwacji (bez zmian z oryginału)
js/firebase-config.js – konfiguracja Firebase (bez zmian z oryginału)
images/                – logo
```
