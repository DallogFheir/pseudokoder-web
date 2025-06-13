# Pseudokoder (web)

Interpretator pseudokodu używanego na maturze z informatyki.

## Interpretator

Interpretator jest reprezentowany przez klasę `Interpreter`. Klasa ta posiada jedną publiczną metodę: `execute`. Przyjmuje ona następujące argumenty:

- `code`: kod programu jako napis
- `startingBindings`: początkowo określone zmienne, przekazane jako obiekt zawierający nazwy zmiennych jako klucze, a wartości zmiennych jako wartości; domyślnie pusty obiekt
- `ifLogOutput`: czy wyjście programu ma być logowane do konsoli, czy tylko zwracane z metody; domyślnie *false*
- `firstIndexArrays`: indeks, od którego zaczyna się indeksowanie tablic; domyślnie 1
- `firstIndexStrings`: indeks, od którego zaczyna się indeksowanie napisów; domyślnie 1

Metoda ta zwraca wyjście programu (wyrażenia wypisane przez polecenie WYPISZ) jako tablicę literałów.

Interpretator może wyrzucić 3 typy błędów:

- `SyntaxError`: błąd składni, wykryty na etapie parsowania, np. nieprawidłowa składnia bloku JEŻELI
- `RuntimeError`: błąd zaistniały na etapie wykonania programu, np. nieistnienie zmiennej
- `InternalError`: błąd wewnętrzny, wskazujący na niepoprawne działanie interpretatora

## Opis języka

Polecenia w języku oddzielane są znakiem nowej linii.

### Komentarze

Komentarz zaczyna się znakiem # i obejmuje tekst do końca linii.

```
# komentarz
i <- 1 # również komentarz
```

### Zmienne

Nazwy zmiennych mogą zawierać jedynie wielkie lub małe litery alfabetu angielskiego, cyfry lub podkreślnik. Cyfry nie mogą występować na początku nazwy zmiennej.

Przypisanie do zmiennej dokonuje się za pomocą słowa kluczowego `<-`.

```
i <- 1
```

### Literały

Język obsługuje 3 typy proste danych: liczba, napis oraz boolean.

Napisy otoczone są cudzysłowami "", a booleany przyjmują wartości PRAWDA lub FAŁSZ (bez cudzysłowów).

```
liczba <- 3.14
napis <- "hello world"
boolean <- PRAWDA
```

### Tablice

Oprócz typów prostych język obsługuje tablice. Tablice nie muszą być deklarowane, można od razu przypisywać do ich indeksów.

Domyślnie tablice indeksowane są od indeksu 1. Można to zmienić, przesyłając startowy indeks jako 3. argument do metody `execute` klasy `Interpreter`.
```
T[1] <- "pierwsza wartość"
pierwsza_wartosc <- T[1]
```

Napisy również mogą być indeksowane (jednak muszą być wcześniej zadeklarowane). W napisach można podmieniać pojedyncze znaki.

```
napis <- "kot"
napis[3] <- "ń"
```

### Operatory arytmetyczne

Dostępne są następujące operatory arytmetyczne:

- I grupa
  - `+`: dodawanie, konkatenacja napisów
  - `-`
- II grupa
  - `*`
  - `/`
  - `div`: dzielenie całkowite
  - `mod`: modulo (reszta z dzielenia)

Operatory z II grupy są "silniejsze" niż operatory z I grupy, tzn. ich operacje są wykonywane najpierw. Oprócz tego obowiązuje kolejność od lewej do prawej.

Nawiasy okrągłe są symbolami pomocniczymi, które mogą zmienić kolejność wykonywania operacji.

```
wyrazenie <- (2 + 2 * 2) div 10 mod 4
```

### Operatory porównania

Dostępne są następujące operatory porównania:

- `==`
- `!=`
- `>`
- `>=`
- `<`
- `<=`

Operatory te są "słabsze" niż operatory arytmetyczne.

```
porownanie <- 2 == 3
```

### Operatory logiczne

Dostępne są następujące operatory logiczne:

- `lub`
- `oraz`
- `nie`

Operatory te są "słabsze" od operatorów porównania oraz arytmetycznych, natomiast ich kolejność została podana od "najsłabszego" do "najsilniejszego" (tzn. operator `nie` jest najsilniejszy).

Operatory `lub` oraz `oraz` podlegają *short-circuit evaluation*, tzn. jeśli pierwsze wyrażenie w klauzuli `lub` jest prawdziwe/w klauzuli `oraz` jest fałszywe, to drugie wyrażenie nie jest już ewaluowane.

```
prawda <- nie FAŁSZ
nie_wyrzuca_bledu <- FAŁSZ oraz nieistniejaca_zmienna
```

### Blok kodu

Bloki kodu oznaczane są tym samym poziomem wcięcia. Wcięcie to 4 spacje.

```
jeżeli n > 2 to
    # to jest blok kodu
    wypisz n
```

### Instrukcja WYPISZ

Instrukcja WYPISZ rozpoczyna się od słowa kluczowego `wypisz`, po czym następuje wyrażenie. Wyrażenie to zostanie dodane do wyjścia programu oraz ewentualnie (jeśli włączona jest opcja `ifLogOutput`) zalogowana do konsoli.

```
wypisz "Hello world"
```

### Instrukcja warunkowa

Instrukcja warunkowa rozpoczyna się słowem kluczowym `jeżeli`, po czym następuje wyrażenie, które musi ewaluować do wartości booleanowskiej, następnie słowo kluczowe `to` oraz blok kodu.

Po bloku kodu może, ale nie musi, wystąpić słowo kluczowe `w przeciwnym razie`, a po nim blok kodu, który zostanie wykonany, jeśli warunek instrukcji warunkowej nie został spełniony.

```
jeżeli n > 10 to
    wypisz "n jest większe od 10"
w przeciwnym razie
    wypisz "n jest mniejsze lub równe 10"
```

### Pętla dopóki

Pętla *dopóki* rozpoczyna się słowem kluczowym `dopóki`, po czym następuje wyrażenie, które musi ewaluować do wartości booleanowskiej, następnie słowo kluczowe `wykonuj` oraz blok kodu.

```
dopóki n > 10 wykonuj
    wypisz n
    n <- n - 1
```

### Pętla dla

Pętla *dla* rozpoczyna się słowem kluczowym `dla`, po którym następuje deklaracja zmiennej sterującej, słowo kluczowe `=`, wyrażenie reprezentujące początkową wartość zmiennej sterującej, przecinek, wyrażenie reprezentujące drugą wartość zmiennej sterującej, przecinek, trzy kropki, wyrażenie reprezentujące końcową wartość zmiennej sterującej, słowo kluczowe `wykonuj` oraz blok kodu.

Pętla przypisuje zmiennej sterującej kolejne wartości, dodając do wartości początkowej krok (różnicę między drugą wartością a wartością początkową), aż do osiągnięcia wartości końcowej.

```
# pętla z krokiem 1
dla i = 1, 2, ..., 10 wykonuj
    wypisz i

# pętla z krokiem 10
dla j = 10, 20, ..., 100 wykonuj
    wypisz j
```

### Funkcje

Funkcja rozpoczyna się słowem kluczowym `funkcja`, po którym następuje nazwa funkcji (która musi być legalną nazwą zmiennej), następnie nawiasy, a w nich lista parametrów oddzielonych przecinkami (lub puste nawiasy, jeśli funkcja nie przyjmuje parametrów), a następnie blok kodu.

Funkcje tworzą zasięg zmiennych: wszystkie zmienne zadeklarowane w ciele funkcji (w tym nowe tablice) nie będą dostępne poza funkcją.

Funkcja może zwracać wartości. Dokonuje się tego za pomocą słowa kluczowego `zwróć`, po którym następuje wyrażenie, które funkcja zwróci (lub nic, jeżeli funkcja ma nic nie zwracać, a słowo `zwróć` służy tylko do wcześniejszego wyjścia z funkcji).

Funkcja może również rekurencyjnie wywoływać siebie samą. Maksymalny rozmiar stosu to 999.

```
funkcja dodaj(a, b)
    zwróć a + b

suma <- dodaj(1, 2)
```

### Wbudowane funkcje

Następujące funkcje są wbudowane w język:

- `sufit(liczba)`: zaokrągla liczbę w górę do najbliższej liczby całkowitej
- `podloga(liczba)`: zaokrągla liczbę w dół do najbliższej liczby całkowitej
- `dl(tablica)`: zwraca długość tablicy lub napisu
- `napis(liczba)`: zwraca liczbę jako napis

```
wypisz sufit(3.14)
wypisz podloga(3.14)
wypisz dl(napis(123))
```

