# Przygotowanie danych treningowych

Zobacz najpierw `docs/MODEL-TRAINING.md` w katalogu głównym repo - tam jest pełny, sfazowany opis
obu ścieżek (Teachable Machine vs `scripts/train-model/train.py`). Ten plik dotyczy tylko
opcjonalnego kroku wstępnego dla ścieżki B (własny trening).

## `fetch-reference-images.mjs`

```bash
node scripts/prepare-dataset/fetch-reference-images.mjs --limit 40
```

Pobiera z Wikimedia Commons kandydatów na zdjęcia treningowe dla każdego gatunku ze
`src/data/species.json`, do `scripts/prepare-dataset/raw/<species-id>/` (razem z `source.json` -
licencja i link źródłowy każdego zdjęcia).

**To NIE jest gotowy zbiór treningowy.** Zdjęcia z automatycznego wyszukiwania po nazwie łacińskiej
bywają błędnie skategoryzowane, przedstawiają nie ten gatunek, nie ten etap rozwoju, albo są
ilustracjami/rysunkami zamiast zdjęć. Przy grzybach trujących vs jadalnych pomyłka w danych
treningowych to kwestia bezpieczeństwa użytkownika apki, nie tylko jakości modelu - **każde
zdjęcie trzeba ręcznie obejrzeć** przed użyciem.

## Krok ręczny (obowiązkowy)

1. Przejrzyj `scripts/prepare-dataset/raw/<species-id>/*.jpg` per gatunek.
2. Usuń: zdjęcia złej jakości, nie tego gatunku, rysunki/ilustracje, zdjęcia z wodoznakami
   zasłaniającymi grzyba, duplikaty.
3. Warto dodać własne zdjęcia z wypraw (fotografowane w różnych warunkach oświetlenia/tła) -
   realny model będzie działał lepiej na zdjęciach podobnych do tych robionych telefonem w lesie
   niż na fotografiach studyjnych z encyklopedii.
4. Przenieś zaakceptowane zdjęcia do `dataset/<species-id>/` (katalog root repo, ignorowany przez
   git - patrz `.gitignore`), po jednym podkatalogu na `id` ze `species.json`.
5. Rekomendowane minimum: 80-150 zdjęć na gatunek, zróżnicowane pod względem kąta, oświetlenia,
   tła i etapu rozwoju grzyba. Mniej niż ~30/gatunek prawdopodobnie da model zbyt niepewny, by był
   użyteczny.

Gdy `dataset/` jest gotowy, uruchom `scripts/train-model/train.py` (patrz
`docs/MODEL-TRAINING.md`).
